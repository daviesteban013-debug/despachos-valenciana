import * as XLSX from 'xlsx';
import { getDbClient } from '../config/db.js';

export const CONFIG_IMPORTACION = {
  USAR_SKU_EXCEL_SI_EXISTE: true,
  PREFIJO_CODIGO_INTERNO: 'INT-',
  LONGITUD_CODIGO_INTERNO: 5
};

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

  const client = await getDbClient();
  if (!client) throw new Error('Base de datos no disponible');

  try {
    await client.query('BEGIN');

    // Mapear bodegas
    const { rows: bodegas } = await client.query('SELECT * FROM bodegas');
    const mapaBodegas = new Map();
    bodegas.forEach((b) => {
      mapaBodegas.set(b.id, b.id);
      mapaBodegas.set(b.codigo.toUpperCase(), b.id);
      mapaBodegas.set(b.seccion_slug.toLowerCase(), b.id);
      mapaBodegas.set(normalizarTexto(b.nombre), b.id);
    });

    // Mapear productos
    const { rows: productosRows } = await client.query('SELECT sku, nombre, descripcion, es_codigo_interno FROM productos');
    
    // Obtener la secuencia interna max si necesitamos generar nuevos (INT-00001)
    let maxSecuenciaInterna = 0;
    productosRows.forEach(p => {
      if (p.es_codigo_interno && p.sku.startsWith(CONFIG_IMPORTACION.PREFIJO_CODIGO_INTERNO)) {
        const num = parseInt(p.sku.replace(CONFIG_IMPORTACION.PREFIJO_CODIGO_INTERNO, ''), 10);
        if (!isNaN(num) && num > maxSecuenciaInterna) maxSecuenciaInterna = num;
      }
    });

    let productosNuevos = 0;
    let productosActualizados = 0;
    const diferenciasDetectadas = [];

    // Insertar el log de importacion
    const { rows: impRows } = await client.query(`
      INSERT INTO importaciones_inventario (archivo, total_filas, usuario_admin) 
      VALUES ($1, $2, $3) RETURNING id
    `, [nombreArchivo, filas.length, usuarioAdmin]);
    const importacionId = impRows[0].id;

    // Cargar TODO el inventario actual a memoria para evitar N queries SELECT
    const { rows: inventarioRows } = await client.query('SELECT sku, bodega_id, cantidad FROM inventario_por_bodega');
    const mapaInventario = new Map();
    inventarioRows.forEach(row => {
      mapaInventario.set(`${row.sku}_${row.bodega_id}`, row.cantidad);
    });

    const productosAInsertar = [];
    const productosAActualizar = [];
    const diferenciasAInsertar = [];

    for (const fila of filas) {
      const codigoRaw = fila['SKU'] || fila['Código'] || fila['Codigo'] || fila['Código Artículo'] || fila['Codigo Articulo'] || fila['ItemCode'] || '';
      const nombre = (fila['Nombre'] || fila['Descripción'] || fila['Descripcion'] || fila['Producto'] || '').toString().trim();
      const descripcion = (fila['Detalle'] || fila['Especificación'] || fila['Notas'] || nombre).toString().trim();
      const categoriaSlug = (fila['Categoría'] || fila['Categoria'] || fila['Sección'] || fila['Seccion'] || 'ferreteria_general').toString().trim().toLowerCase();
      const unidadMedida = (fila['Unidad'] || fila['Unidad Medida'] || fila['UOM'] || 'UNIDAD').toString().trim().toUpperCase();
      const precioUnitario = Number(fila['Precio'] || fila['Precio Unitario'] || fila['Valor'] || 0);
      const pesoUnitarioKg = Number(fila['Peso'] || fila['Peso Kg'] || fila['Peso Unitario'] || 0);

      const bodegaRaw = fila['Bodega'] || fila['Bodega ID'] || fila['Código Bodega'] || fila['Sección Bodega'] || 1;
      let bodegaId = mapaBodegas.get(Number(bodegaRaw)) || mapaBodegas.get(bodegaRaw.toString().trim().toUpperCase()) || mapaBodegas.get(normalizarTexto(bodegaRaw)) || 1;

      const cantidadExcel = Math.max(0, parseInt(fila['Cantidad'] || fila['Stock'] || fila['Existencias'] || 0, 10));

      if (!nombre) continue;

      let skuFinal = null;
      let esCodigoInterno = false;

      if (CONFIG_IMPORTACION.USAR_SKU_EXCEL_SI_EXISTE && codigoRaw && codigoRaw.toString().trim().length > 0) {
        skuFinal = codigoRaw.toString().trim().toUpperCase();
      } else {
        const firmaBuscada = normalizarTexto(`${nombre} ${descripcion}`);
        for (const prodExistente of productosRows) {
          const firmaExistente = normalizarTexto(`${prodExistente.nombre} ${prodExistente.descripcion}`);
          if (firmaBuscada === firmaExistente || normalizarTexto(prodExistente.nombre) === normalizarTexto(nombre)) {
            skuFinal = prodExistente.sku;
            esCodigoInterno = prodExistente.es_codigo_interno;
            break;
          }
        }
        if (!skuFinal) {
          maxSecuenciaInterna++;
          skuFinal = `${CONFIG_IMPORTACION.PREFIJO_CODIGO_INTERNO}${String(maxSecuenciaInterna).padStart(CONFIG_IMPORTACION.LONGITUD_CODIGO_INTERNO, '0')}`;
          esCodigoInterno = true;
        }
      }

      // Upsert producto en memoria (para luego ejecutar en batch/secuencial rapido)
      const pIndex = productosRows.findIndex(p => p.sku === skuFinal);
      if (pIndex >= 0) {
        productosAActualizar.push({ nombre, descripcion, unidadMedida, precioUnitario, pesoUnitarioKg, skuFinal });
      } else {
        productosAInsertar.push({ skuFinal, nombre, descripcion, categoriaSlug, unidadMedida, precioUnitario, pesoUnitarioKg, esCodigoInterno });
        productosRows.push({ sku: skuFinal, nombre, descripcion, es_codigo_interno: esCodigoInterno });
      }

      // Consultar stock actual desde el MAPA en memoria (O(1), sin viaje de red)
      const keyInventario = `${skuFinal}_${bodegaId}`;
      const cantidadSistema = mapaInventario.get(keyInventario) || 0;
      const diferencia = cantidadExcel - cantidadSistema;

      if (diferencia !== 0) {
        const bodegaNombre = bodegas.find((b) => b.id === bodegaId)?.nombre || `Bodega ${bodegaId}`;
        diferenciasAInsertar.push({
          importacionId, skuFinal, bodegaId, cantidadSistema, cantidadExcel, diferencia, nombre, bodegaNombre
        });
      }
    }

    // --- EJECUTAR LOTES (BATCH PROCESSING) ---
    
    // 1. Insertar productos nuevos en bloques
    const CHUNK_SIZE = 500;
    for (let i = 0; i < productosAInsertar.length; i += CHUNK_SIZE) {
      const chunk = productosAInsertar.slice(i, i + CHUNK_SIZE);
      const placeholders = [];
      const values = [];
      let pIdx = 1;
      chunk.forEach(p => {
        placeholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
        values.push(p.skuFinal, p.nombre, p.descripcion, p.categoriaSlug, p.unidadMedida, p.precioUnitario, p.pesoUnitarioKg, p.esCodigoInterno);
      });
      await client.query(`
        INSERT INTO productos (sku, nombre, descripcion, categoria_slug, unidad_medida, precio_unitario, peso_unitario_kg, es_codigo_interno)
        VALUES ${placeholders.join(',')}
      `, values);
    }
    productosNuevos += productosAInsertar.length;

    // 2. Actualizar productos existentes (Secuencial rápido sin transacciones internas)
    for (const p of productosAActualizar) {
      await client.query(`
        UPDATE productos 
        SET nombre = $1, descripcion = $2, unidad_medida = $3, precio_unitario = CASE WHEN $4 > 0 THEN $4 ELSE precio_unitario END, peso_unitario_kg = CASE WHEN $5 > 0 THEN $5 ELSE peso_unitario_kg END, updated_at = NOW()
        WHERE sku = $6
      `, [p.nombre, p.descripcion, p.unidadMedida, p.precioUnitario, p.pesoUnitarioKg, p.skuFinal]);
    }
    productosActualizados += productosAActualizar.length;

    // 3. Insertar diferencias en bloques y recuperar IDs para el frontend
    for (let i = 0; i < diferenciasAInsertar.length; i += CHUNK_SIZE) {
      const chunk = diferenciasAInsertar.slice(i, i + CHUNK_SIZE);
      const placeholders = [];
      const values = [];
      let pIdx = 1;
      chunk.forEach(d => {
        placeholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 'pendiente')`);
        values.push(d.importacionId, d.skuFinal, d.bodegaId, d.cantidadSistema, d.cantidadExcel, d.diferencia);
      });
      
      const { rows: insertedDifs } = await client.query(`
        INSERT INTO diferencias_inventario (importacion_id, sku, bodega_id, cantidad_sistema, cantidad_excel, diferencia, estado)
        VALUES ${placeholders.join(',')} RETURNING id, sku, bodega_id
      `, values);

      // Mapear los IDs insertados para el resumen
      insertedDifs.forEach((dbDif, idx) => {
        const memDif = chunk[idx];
        diferenciasDetectadas.push({
          id: dbDif.id,
          importacion_id: memDif.importacionId,
          sku: memDif.skuFinal,
          producto_nombre: memDif.nombre,
          bodega_id: memDif.bodegaId,
          bodega_nombre: memDif.bodegaNombre,
          cantidad_sistema: memDif.cantidadSistema,
          cantidad_excel: memDif.cantidadExcel,
          diferencia: memDif.diferencia,
          estado: 'pendiente'
        });
      });
    }

    await client.query(`
      UPDATE importaciones_inventario 
      SET productos_nuevos = $1, productos_actualizados = $2, diferencias_detectadas = $3 
      WHERE id = $4
    `, [productosNuevos, productosActualizados, diferenciasDetectadas.length, importacionId]);

    const { rows: resumenRows } = await client.query('SELECT * FROM importaciones_inventario WHERE id = $1', [importacionId]);

    await client.query('COMMIT');
    
    return {
      resumen: resumenRows[0],
      diferencias: diferenciasDetectadas
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function resolverDiferenciaInventario(diferenciaId, accion, usuarioAdmin = 'admin') {
  const client = await getDbClient();
  if (!client) throw new Error('Base de datos no disponible');

  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM diferencias_inventario WHERE id = $1 FOR UPDATE', [diferenciaId]);
    
    if (rows.length === 0) {
      throw new Error(`No se encontró la diferencia con ID ${diferenciaId}`);
    }
    
    const dif = rows[0];
    
    if (dif.estado !== 'pendiente') {
      throw new Error(`La diferencia ya fue resuelta como "${dif.estado}"`);
    }

    if (accion === 'aplicar') {
      await client.query(`
        INSERT INTO inventario_por_bodega (sku, bodega_id, cantidad, actualizado_en)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (sku, bodega_id) DO UPDATE SET cantidad = $3, actualizado_en = NOW()
      `, [dif.sku, dif.bodega_id, dif.cantidad_excel]);
      
      await client.query(`
        UPDATE diferencias_inventario SET estado = 'aplicada', resuelto_por = $1, resuelto_en = NOW() WHERE id = $2
      `, [usuarioAdmin, diferenciaId]);
    } else if (accion === 'descartar') {
      await client.query(`
        UPDATE diferencias_inventario SET estado = 'descartada', resuelto_por = $1, resuelto_en = NOW() WHERE id = $2
      `, [usuarioAdmin, diferenciaId]);
    } else {
      throw new Error(`Acción no reconocida: ${accion}`);
    }

    await client.query('COMMIT');
    const { rows: updated } = await client.query('SELECT * FROM diferencias_inventario WHERE id = $1', [diferenciaId]);
    return updated[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function generarExcelPruebaBuffer() {
  const client = await getDbClient();
  const filasExcel = [];

  try {
    const { rows: productos } = await client.query('SELECT * FROM productos LIMIT 35');
    const { rows: bodegas } = await client.query('SELECT * FROM bodegas');
    
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      const bodega = bodegas.find((b) => b.seccion_slug === p.categoria_slug) || bodegas[0];
      const { rows: stockRows } = await client.query('SELECT cantidad FROM inventario_por_bodega WHERE sku = $1 AND bodega_id = $2', [p.sku, bodega.id]);
      const stockActual = stockRows.length > 0 ? stockRows[0].cantidad : 50;

      let stockExcel = stockActual;
      if (i === 2) stockExcel = stockActual + 15;
      else if (i === 5) stockExcel = Math.max(0, stockActual - 10);
      else if (i === 8) stockExcel = stockActual + 50;

      filasExcel.push({
        'SKU': p.sku,
        'Nombre': p.nombre,
        'Descripción': p.descripcion,
        'Categoría': p.categoria_slug,
        'Unidad': p.unidad_medida,
        'Precio Unitario': Number(p.precio_unitario),
        'Peso Kg': Number(p.peso_unitario_kg),
        'Bodega': bodega.nombre,
        'Stock': stockExcel
      });
    }
  } finally {
    if (client) client.release();
  }

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
