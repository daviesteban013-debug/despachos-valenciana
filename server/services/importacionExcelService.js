import * as XLSX from 'xlsx';
import { dbMemoria } from '../config/db.js';

// ============================================================================
// CONFIGURACIÓN CLARA DE ESTRATEGIA DE LLAVE DE PRODUCTO (REQUISITO EXPLÍCITO)
// ============================================================================
export const CONFIG_IMPORTACION = {
  // Si es true, usa la columna de código/SKU del Excel siempre que venga informada
  USAR_SKU_EXCEL_SI_EXISTE: true,
  // Prefijo para códigos internos estables generados cuando el Excel no trae SKU confiable
  PREFIJO_CODIGO_INTERNO: 'INT-',
  // Longitud de dígitos con ceros a la izquierda
  LONGITUD_CODIGO_INTERNO: 5
};

// Normalizar texto para matching de productos sin SKU
function normalizarTexto(txt) {
  if (!txt) return '';
  return txt
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Procesa un archivo Excel (.xlsx) para upsert de catálogo y conciliación de stock.
 * 
 * Reglas de negocio:
 * 1. Catálogo (productos): Upsert por SKU o match de nombre+descripción.
 *    Los códigos internos generados (INT-XXXXX) son permanentes y no se regeneran.
 * 2. Stock (inventario_por_bodega): NUNCA sobrescribe ciegamente.
 *    Calcula diferencia = Excel - Sistema. Si es != 0, reporta a diferencias_inventario.
 * 3. Registra la corrida en importaciones_inventario para auditoría.
 * 
 * @param {Buffer | string} bufferOPath
 * @param {string} nombreArchivo
 * @param {string} [usuarioAdmin='admin']
 */
export async function procesarImportacionExcel(bufferOPath, nombreArchivo, usuarioAdmin = 'admin') {
  let workbook;
  if (Buffer.isBuffer(bufferOPath)) {
    workbook = XLSX.read(bufferOPath, { type: 'buffer' });
  } else {
    workbook = XLSX.readFile(bufferOPath);
  }

  const primerNombreHoja = workbook.SheetNames[0];
  const hoja = workbook.Sheets[primerNombreHoja];
  const filas = XLSX.utils.sheet_to_json(hoja);

  if (!filas || filas.length === 0) {
    throw new Error('El archivo Excel no contiene filas o está vacío.');
  }

  let productosNuevos = 0;
  let productosActualizados = 0;
  const diferenciasDetectadas = [];

  const importacionId = dbMemoria.secuenciaImportacion++;
  const fechaImportacion = new Date();

  // Mapear bodegas por código y por id para match flexible
  const mapaBodegas = new Map();
  dbMemoria.bodegas.forEach((b) => {
    mapaBodegas.set(b.id, b.id);
    mapaBodegas.set(b.codigo.toUpperCase(), b.id);
    mapaBodegas.set(b.seccion_slug.toLowerCase(), b.id);
    mapaBodegas.set(normalizarTexto(b.nombre), b.id);
  });

  // Procesar cada fila del Excel
  for (const fila of filas) {
    // Extraer campos tolerando variaciones típicas de encabezados de ERP
    const codigoRaw = fila['SKU'] || fila['Código'] || fila['Codigo'] || fila['Código Artículo'] || fila['Codigo Articulo'] || fila['ItemCode'] || '';
    const nombre = (fila['Nombre'] || fila['Descripción'] || fila['Descripcion'] || fila['Producto'] || '').toString().trim();
    const descripcion = (fila['Detalle'] || fila['Especificación'] || fila['Notas'] || nombre).toString().trim();
    const categoriaSlug = (fila['Categoría'] || fila['Categoria'] || fila['Sección'] || fila['Seccion'] || 'ferreteria_general').toString().trim().toLowerCase();
    const unidadMedida = (fila['Unidad'] || fila['Unidad Medida'] || fila['UOM'] || 'UNIDAD').toString().trim().toUpperCase();
    const precioUnitario = Number(fila['Precio'] || fila['Precio Unitario'] || fila['Valor'] || 0);
    const pesoUnitarioKg = Number(fila['Peso'] || fila['Peso Kg'] || fila['Peso Unitario'] || 0);

    // Identificación de bodega
    const bodegaRaw = fila['Bodega'] || fila['Bodega ID'] || fila['Código Bodega'] || fila['Sección Bodega'] || 1;
    let bodegaId = mapaBodegas.get(Number(bodegaRaw)) || mapaBodegas.get(bodegaRaw.toString().trim().toUpperCase()) || mapaBodegas.get(normalizarTexto(bodegaRaw)) || 1;

    // Cantidad reportada por el Excel del ERP
    const cantidadExcel = Math.max(0, parseInt(fila['Cantidad'] || fila['Stock'] || fila['Existencias'] || 0, 10));

    if (!nombre) continue; // Saltar filas en blanco

    // ------------------------------------------------------------------------
    // 1. DETERMINACIÓN DE LA LLAVE PERMANENTE (SKU)
    // ------------------------------------------------------------------------
    let skuFinal = null;
    let esCodigoInterno = false;

    if (CONFIG_IMPORTACION.USAR_SKU_EXCEL_SI_EXISTE && codigoRaw && codigoRaw.toString().trim().length > 0) {
      skuFinal = codigoRaw.toString().trim().toUpperCase();
    } else {
      // Buscar match por nombre + descripción en productos ya existentes
      const firmaBuscada = normalizarTexto(`${nombre} ${descripcion}`);
      for (const [skuExistente, prodExistente] of dbMemoria.productos.entries()) {
        const firmaExistente = normalizarTexto(`${prodExistente.nombre} ${prodExistente.descripcion}`);
        if (firmaBuscada === firmaExistente || normalizarTexto(prodExistente.nombre) === normalizarTexto(nombre)) {
          skuFinal = skuExistente;
          esCodigoInterno = prodExistente.es_codigo_interno;
          break;
        }
      }

      // Si no existe, generar un código interno permanente y estable (INT-00001)
      if (!skuFinal) {
        skuFinal = `${CONFIG_IMPORTACION.PREFIJO_CODIGO_INTERNO}${String(dbMemoria.secuenciaCodigoInterno++).padStart(CONFIG_IMPORTACION.LONGITUD_CODIGO_INTERNO, '0')}`;
        esCodigoInterno = true;
      }
    }

    // ------------------------------------------------------------------------
    // 2. UPSERT EN CATÁLOGO (PRODUCTOS)
    // ------------------------------------------------------------------------
    const productoExistente = dbMemoria.productos.get(skuFinal);
    if (productoExistente) {
      // Actualizar campos descriptivos sin tocar el SKU
      productoExistente.nombre = nombre;
      productoExistente.descripcion = descripcion;
      productoExistente.unidad_medida = unidadMedida;
      if (precioUnitario > 0) productoExistente.precio_unitario = precioUnitario;
      if (pesoUnitarioKg > 0) productoExistente.peso_unitario_kg = pesoUnitarioKg;
      productoExistente.updated_at = new Date();
      productosActualizados++;
    } else {
      // Crear nuevo producto en catálogo
      dbMemoria.productos.set(skuFinal, {
        sku: skuFinal,
        nombre,
        descripcion,
        categoria_slug: categoriaSlug,
        unidad_medida: unidadMedida,
        precio_unitario: precioUnitario,
        peso_unitario_kg: pesoUnitarioKg,
        es_codigo_interno: esCodigoInterno,
        created_at: new Date(),
        updated_at: new Date()
      });
      productosNuevos++;
    }

    // ------------------------------------------------------------------------
    // 3. CONCILIACIÓN DE STOCK (NUNCA SOBRESCRIBIR CIEGAMENTE)
    // ------------------------------------------------------------------------
    const stockFila = dbMemoria.obtenerStockFila(skuFinal, bodegaId);
    const cantidadSistema = stockFila ? stockFila.cantidad : 0;
    const diferencia = cantidadExcel - cantidadSistema;

    // Si hay diferencia, se registra para revisión de admin. NO se actualiza inventario_por_bodega.
    if (diferencia !== 0) {
      const difItem = {
        id: dbMemoria.secuenciaDiferencia++,
        importacion_id: importacionId,
        sku: skuFinal,
        producto_nombre: nombre,
        bodega_id: bodegaId,
        bodega_nombre: dbMemoria.bodegas.find((b) => b.id === bodegaId)?.nombre || `Bodega ${bodegaId}`,
        cantidad_sistema: cantidadSistema,
        cantidad_excel: cantidadExcel,
        diferencia,
        estado: 'pendiente',
        resuelto_por: null,
        resuelto_en: null
      };

      dbMemoria.diferencias.push(difItem);
      diferenciasDetectadas.push(difItem);
    }
  }

  // --------------------------------------------------------------------------
  // 4. REGISTRO DEL LOG DE IMPORTACIÓN
  // --------------------------------------------------------------------------
  const logImportacion = {
    id: importacionId,
    fecha: fechaImportacion,
    archivo: nombreArchivo,
    total_filas: filas.length,
    productos_nuevos: productosNuevos,
    productos_actualizados: productosActualizados,
    diferencias_detectadas: diferenciasDetectadas.length,
    estado: 'COMPLETADO',
    usuario_admin: usuarioAdmin
  };

  dbMemoria.importaciones.push(logImportacion);

  console.info(`📊 [IMPORTACIÓN CONCILIADA] Archivo: ${nombreArchivo}, Filas: ${filas.length}, Nuevos: ${productosNuevos}, Actualizados: ${productosActualizados}, Diferencias: ${diferenciasDetectadas.length}`);

  return {
    resumen: logImportacion,
    diferencias: diferenciasDetectadas
  };
}

/**
 * Resolver una diferencia de conciliación puntual (Rol Admin)
 * @param {number} diferenciaId
 * @param {'aplicar' | 'descartar'} accion
 * @param {string} usuarioAdmin
 */
export async function resolverDiferenciaInventario(diferenciaId, accion, usuarioAdmin = 'admin') {
  const dif = dbMemoria.diferencias.find((d) => d.id === Number(diferenciaId));
  if (!dif) {
    throw new Error(`No se encontró la diferencia de inventario con ID ${diferenciaId}`);
  }

  if (dif.estado !== 'pendiente') {
    throw new Error(`La diferencia con ID ${diferenciaId} ya fue resuelta previamente como "${dif.estado}"`);
  }

  if (accion === 'aplicar') {
    // El admin autoriza ajustar el valor del sistema al que reportó el Excel
    dbMemoria.actualizarStock(dif.sku, dif.bodega_id, dif.cantidad_excel);
    dif.estado = 'aplicada';
    dif.resuelto_por = usuarioAdmin;
    dif.resuelto_en = new Date();
    console.info(`✅ [DIFERENCIA APLICADA] SKU: ${dif.sku}, Bodega: ${dif.bodega_id} ajustado de ${dif.cantidad_sistema} a ${dif.cantidad_excel} por ${usuarioAdmin}`);
  } else if (accion === 'descartar') {
    // El admin determina que el Excel estaba desactualizado y se conserva el valor del sistema
    dif.estado = 'descartada';
    dif.resuelto_por = usuarioAdmin;
    dif.resuelto_en = new Date();
    console.info(`🚫 [DIFERENCIA DESCARTADA] SKU: ${dif.sku}, Bodega: ${dif.bodega_id} se mantiene en ${dif.cantidad_sistema} por ${usuarioAdmin}`);
  } else {
    throw new Error(`Acción no reconocida: ${accion}. Debe ser 'aplicar' o 'descartar'.`);
  }

  return dif;
}

/**
 * Genera un buffer Excel (.xlsx) de prueba con catálogo real y discrepancias inducidas para testing
 */
export function generarExcelPruebaBuffer() {
  const filasExcel = [];

  // Tomar una muestra representativa de 35 productos del catálogo
  const muestra = Array.from(dbMemoria.productos.values()).slice(0, 35);

  muestra.forEach((p, index) => {
    // Asignar a su bodega correspondiente según categoría
    const bodega = dbMemoria.bodegas.find((b) => b.seccion_slug === p.categoria_slug) || dbMemoria.bodegas[0];
    const stockActual = dbMemoria.obtenerStockFila(p.sku, bodega.id)?.cantidad || 50;

    let stockExcel = stockActual;

    // Inducir diferencias deliberadas en algunos productos para probar la conciliación
    if (index === 2) {
      stockExcel = stockActual + 15; // ERP reporta 15 más
    } else if (index === 5) {
      stockExcel = Math.max(0, stockActual - 10); // ERP reporta 10 menos
    } else if (index === 8) {
      stockExcel = stockActual + 50; // Quiebre no reportado en ERP
    }

    filasExcel.push({
      'SKU': p.sku,
      'Nombre': p.nombre,
      'Descripción': p.descripcion,
      'Categoría': p.categoria_slug,
      'Unidad': p.unidad_medida,
      'Precio Unitario': p.precio_unitario,
      'Peso Kg': p.peso_unitario_kg,
      'Bodega': bodega.nombre,
      'Stock': stockExcel
    });
  });

  // Agregar 2 productos nuevos sin SKU para probar la generación de código interno estable (INT-XXXXX)
  filasExcel.push({
    'SKU': '', // Sin SKU
    'Nombre': 'Foco Halógeno Decorativo Vintage 40W E27',
    'Descripción': 'Lámpara de filamento ámbar para iluminación ambiental cálida',
    'Categoría': 'electrico',
    'Unidad': 'UNIDAD',
    'Precio Unitario': 18500,
    'Peso Kg': 0.12,
    'Bodega': 'Eléctrico',
    'Stock': 60
  });

  filasExcel.push({
    'SKU': '', // Sin SKU
    'Nombre': 'Carretilla Jardinera Plástica Reforzada 90L',
    'Descripción': 'Tolva de polímero de alto impacto liviana para poda y jardinería',
    'Categoría': 'jardin_exteriores',
    'Unidad': 'UNIDAD',
    'Precio Unitario': 165000,
    'Peso Kg': 8.5,
    'Bodega': 'Jardín y Exteriores',
    'Stock': 20
  });

  const ws = XLSX.utils.json_to_sheet(filasExcel);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario_ERP_Valenciana');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
