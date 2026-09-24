import * as XLSX from 'xlsx';
import { getDbClient } from '../config/db.js';

// ============================================================================
// SERVICIO DE KARDEX DE VENTAS - LA VALENCIANA FERREHOGAR
// Parsea el Excel de kardex generado por el ERP y lo indexa en PostgreSQL
// para que el operador pueda buscar una factura y pre-llenar el despacho.
// ============================================================================

// Columnas exactas del kardex (tolerantes a espacios y variaciones de nombre)
const ALIAS_COLUMNAS = {
  tipo_doc:        ['Tipo Doc', 'TipoDoc', 'Tipo Documento', 'Tipo_Doc'],
  num_factura:     ['N° Factura', 'No Factura', 'Num Factura', 'Numero Factura', 'N Factura', 'Nro Factura'],
  fecha:           ['Fecha', 'Fecha Factura', 'Fecha Doc'],
  forma_pago:      ['Forma Pago', 'FormaPago', 'Pago'],
  nit_cliente:     ['NIT/CC Cliente', 'NIT', 'CC', 'NIT Cliente', 'NIT/CC', 'Nit_Cliente'],
  codigo_producto: ['Código Producto', 'Codigo Producto', 'Código', 'Codigo', 'Cod Producto', 'ItemCode', 'SKU'],
  bodega:          ['Bodega', 'Bodega Salida', 'Cod Bodega'],
  descripcion:     ['Descripción', 'Descripcion', 'Nombre Producto', 'Producto', 'Detalle'],
  cantidad:        ['Cantidad', 'Cant', 'Qty'],
  precio_unitario: ['Precio Unitario', 'PrecioUnitario', 'Precio Unit', 'Precio'],
  valor_sin_iva:   ['Valor Sin IVA', 'ValorSinIVA', 'Valor Sin Iva', 'Subtotal'],
  iva:             ['IVA', 'Valor IVA', 'Iva'],
  precio_venta:    ['Precio Venta', 'PrecioVenta', 'Precio de Venta'],
  valor_total:     ['Valor Total', 'Total', 'ValorTotal'],
  costo_unitario:  ['Costo Unitario', 'CostoUnitario', 'Costo'],
  saldo_cantidad:  ['Saldo Cantidad', 'SaldoCantidad', 'Saldo Cant', 'Saldo'],
  saldo_valor:     ['Saldo Valor', 'SaldoValor'],
  pct_iva:         ['% IVA', '%IVA', 'Pct IVA', 'Porcentaje IVA'],
  consecutivo:     ['Consecutivo Kardex', 'Consecutivo', 'ConsKardex', 'Consec']
};

/**
 * Busca el valor de una celda usando los aliases definidos para esa columna.
 * @param {Object} fila - Objeto fila del XLSX
 * @param {string} campo - Nombre del campo en ALIAS_COLUMNAS
 * @returns {any} Valor encontrado o undefined
 */
function getCampo(fila, campo) {
  const aliases = ALIAS_COLUMNAS[campo] || [campo];
  for (const alias of aliases) {
    if (fila[alias] !== undefined && fila[alias] !== null && fila[alias] !== '') {
      return fila[alias];
    }
  }
  return undefined;
}

function limpiarNumero(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  // Quitar separadores de miles y reemplazar coma decimal
  const str = String(val).replace(/\./g, '').replace(/,/g, '.').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function limpiarTexto(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function parsearFecha(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // Fecha serial de Excel
    try {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    } catch (_) {}
  }
  const str = String(val).trim();
  // Intentar parsear dd/mm/yyyy
  const partes = str.split('/');
  if (partes.length === 3) {
    const [d, m, y] = partes;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
}

// ============================================================================
// FUNCIÓN PRINCIPAL: Procesar el Excel del kardex e insertarlo en la DB
// ============================================================================
export async function procesarKardexExcel(bufferOrPath, nombreArchivo = 'kardex.xlsx') {
  let workbook;
  if (Buffer.isBuffer(bufferOrPath)) {
    workbook = XLSX.read(bufferOrPath, { type: 'buffer', cellDates: false });
  } else {
    workbook = XLSX.readFile(bufferOrPath, { cellDates: false });
  }

  // 1. Buscar en TODAS las hojas del Excel la que contenga la tabla de datos
  let hojaSeleccionada = null;
  let headerRowIndex = -1;
  let rawDataMuestra = [];

  const numFacturaAliases = ALIAS_COLUMNAS.num_factura.map(a => a.toLowerCase());

  for (const nombreHoja of workbook.SheetNames) {
    const hojaTemp = workbook.Sheets[nombreHoja];
    const dataTemp = XLSX.utils.sheet_to_json(hojaTemp, { header: 1, defval: '' });
    
    if (dataTemp.length > 0 && rawDataMuestra.length === 0) {
      rawDataMuestra = dataTemp[0].filter(Boolean).slice(0, 3);
    }

    // Buscar en las primeras 30 filas de esta hoja
    for (let i = 0; i < Math.min(dataTemp.length, 30); i++) {
      const row = dataTemp[i];
      if (Array.isArray(row)) {
        const tieneFactura = row.some(celda => {
          if (!celda || typeof celda !== 'string') return false;
          return numFacturaAliases.some(alias => celda.toLowerCase().trim() === alias);
        });

        if (tieneFactura) {
          hojaSeleccionada = hojaTemp;
          headerRowIndex = i;
          break;
        }
      }
    }
    
    if (hojaSeleccionada) break; // Ya la encontramos, salir del loop de hojas
  }

  if (!hojaSeleccionada) {
    const muestra = rawDataMuestra.join(', ') || 'Vacío';
    throw new Error(
      `No se encontró la columna "N° Factura" en ninguna de las hojas del Excel. ` +
      `Asegúrate de exportar el kardex detallado. (Detectado en primera hoja: ${muestra})`
    );
  }

  // 2. Volver a parsear el Excel, pero usando la hoja y la fila encontradas (range)
  const filas = XLSX.utils.sheet_to_json(hojaSeleccionada, { defval: '', range: headerRowIndex });

  if (!filas || filas.length === 0) {
    throw new Error('El archivo Excel tiene cabeceras pero no tiene datos de facturas.');
  }

  const client = await getDbClient();
  if (!client) throw new Error('Base de datos no disponible');

  let filasProcesadas = 0;
  let facturasUnicas = new Set();
  let errores = [];

  try {
    await client.query('BEGIN');

    // Limpiar el kardex previo de este mismo archivo para evitar duplicados
    await client.query(
      `DELETE FROM kardex_ventas WHERE archivo_origen = $1`,
      [nombreArchivo]
    );

    const validRows = [];
    for (const fila of filas) {
      const numFactura = limpiarTexto(getCampo(fila, 'num_factura'));
      const codigoProducto = limpiarTexto(getCampo(fila, 'codigo_producto'));

      // Saltar filas sin factura o sin código de producto
      if (!numFactura || !codigoProducto) continue;

      const tipoDoc       = limpiarTexto(getCampo(fila, 'tipo_doc'));
      const fecha         = parsearFecha(getCampo(fila, 'fecha'));
      const formaPago     = limpiarTexto(getCampo(fila, 'forma_pago'));
      const nitCliente    = limpiarTexto(getCampo(fila, 'nit_cliente'));
      const bodega        = limpiarTexto(getCampo(fila, 'bodega'));
      const descripcion   = limpiarTexto(getCampo(fila, 'descripcion'));
      const cantidad      = Math.max(0, Math.round(limpiarNumero(getCampo(fila, 'cantidad'))));
      const precioUnitario = limpiarNumero(getCampo(fila, 'precio_unitario'));
      const valorSinIva   = limpiarNumero(getCampo(fila, 'valor_sin_iva'));
      const iva           = limpiarNumero(getCampo(fila, 'iva'));
      const precioVenta   = limpiarNumero(getCampo(fila, 'precio_venta'));
      const valorTotal    = limpiarNumero(getCampo(fila, 'valor_total'));
      const costoUnitario = limpiarNumero(getCampo(fila, 'costo_unitario'));
      const saldoCantidad = Math.round(limpiarNumero(getCampo(fila, 'saldo_cantidad')));
      const saldoValor    = limpiarNumero(getCampo(fila, 'saldo_valor'));
      const pctIva        = limpiarNumero(getCampo(fila, 'pct_iva'));
      const consecutivo   = limpiarTexto(getCampo(fila, 'consecutivo'));

      validRows.push([
        nombreArchivo, tipoDoc, numFactura, fecha, formaPago,
        nitCliente, codigoProducto, bodega, descripcion, cantidad,
        precioUnitario, valorSinIva, iva, precioVenta, valorTotal,
        costoUnitario, saldoCantidad, saldoValor, pctIva, consecutivo
      ]);

      facturasUnicas.add(numFactura);
    }

    // Inserción en bloques (Bulk Insert) de a 500 filas para evitar limites de parametros en Postgres
    const CHUNK_SIZE = 500;
    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE);
      
      const placeholders = [];
      const queryValues = [];
      
      let paramIndex = 1;
      for (const row of chunk) {
        const rowPlaceholders = [];
        for (const val of row) {
          rowPlaceholders.push(`$${paramIndex}`);
          queryValues.push(val);
          paramIndex++;
        }
        placeholders.push(`(${rowPlaceholders.join(',')})`);
      }

      const query = `
        INSERT INTO kardex_ventas (
          archivo_origen, tipo_doc, num_factura, fecha_factura, forma_pago,
          nit_cliente, codigo_producto, bodega, descripcion, cantidad,
          precio_unitario, valor_sin_iva, iva, precio_venta, valor_total,
          costo_unitario, saldo_cantidad, saldo_valor, pct_iva, consecutivo_kardex
        ) VALUES ${placeholders.join(',')}
      `;

      await client.query(`SAVEPOINT chunk_${i}`);
      try {
        await client.query(query, queryValues);
        await client.query(`RELEASE SAVEPOINT chunk_${i}`);
        filasProcesadas += chunk.length;
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT chunk_${i}`);
        console.warn(`[KARDEX] Chunk ${i} falló (${err.message}). Fallback individual...`);
        
        let rowIndex = 0;
        for (const row of chunk) {
          const spName = `row_${i}_${rowIndex}`;
          await client.query(`SAVEPOINT ${spName}`);
          try {
            await client.query(`
              INSERT INTO kardex_ventas (
                archivo_origen, tipo_doc, num_factura, fecha_factura, forma_pago,
                nit_cliente, codigo_producto, bodega, descripcion, cantidad,
                precio_unitario, valor_sin_iva, iva, precio_venta, valor_total,
                costo_unitario, saldo_cantidad, saldo_valor, pct_iva, consecutivo_kardex
              ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19,$20
              )
            `, row);
            await client.query(`RELEASE SAVEPOINT ${spName}`);
            filasProcesadas++;
          } catch (individualErr) {
            await client.query(`ROLLBACK TO SAVEPOINT ${spName}`);
            console.error(`[KARDEX] Fila omitida: ${individualErr.message}`, { factura: row[2], producto: row[6] });
            errores.push({ fila: `Factura ${row[2]} - Producto ${row[6]}`, error: individualErr.message });
          }
          rowIndex++;
        }
      }
    }

    await client.query('COMMIT');

    return {
      ok: true,
      filas_procesadas: filasProcesadas,
      facturas_unicas: facturasUnicas.size,
      errores: errores.length,
      detalle_errores: errores.slice(0, 10)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// BÚSQUEDA DE FACTURA: Retorna agrupado por factura → cliente + ítems
// ============================================================================
export async function buscarFacturaKardex(numFactura) {
  const client = await getDbClient();
  if (!client) throw new Error('Base de datos no disponible');

  try {
    const { rows } = await client.query(`
      SELECT *
      FROM kardex_ventas
      WHERE UPPER(TRIM(num_factura)) = UPPER(TRIM($1))
      ORDER BY id ASC
    `, [numFactura]);

    if (rows.length === 0) return null;

    // La primera fila tiene los datos de cabecera
    const cabecera = rows[0];

    // Calcular valor total de la factura (suma de todos los items)
    const valorTotalFactura = rows.reduce((acc, r) => acc + Number(r.valor_total || 0), 0);

    return {
      num_factura:  cabecera.num_factura,
      tipo_doc:     cabecera.tipo_doc,
      fecha:        cabecera.fecha_factura,
      forma_pago:   cabecera.forma_pago,
      nit_cliente:  cabecera.nit_cliente,
      bodega:       cabecera.bodega,
      valor_total:  valorTotalFactura,
      total_items:  rows.length,
      items: rows.map(r => ({
        codigo_producto: r.codigo_producto,
        descripcion:     r.descripcion,
        cantidad:        r.cantidad,
        precio_unitario: Number(r.precio_unitario),
        valor_sin_iva:   Number(r.valor_sin_iva),
        iva:             Number(r.iva),
        valor_total:     Number(r.valor_total),
        pct_iva:         Number(r.pct_iva),
        saldo_cantidad:  r.saldo_cantidad,
        bodega:          r.bodega
      }))
    };
  } finally {
    client.release();
  }
}

// ============================================================================
// AUTOCOMPLETE: Búsqueda rápida de facturas por prefijo (para el input)
// ============================================================================
export async function buscarFacturasPorPrefijo(prefijo, limite = 8) {
  const client = await getDbClient();
  if (!client) return [];

  try {
    const { rows } = await client.query(`
      SELECT DISTINCT
        num_factura,
        nit_cliente,
        fecha_factura,
        COUNT(*) as total_items,
        SUM(valor_total) as valor_total
      FROM kardex_ventas
      WHERE UPPER(num_factura) LIKE UPPER($1)
      GROUP BY num_factura, nit_cliente, fecha_factura
      ORDER BY fecha_factura DESC
      LIMIT $2
    `, [`${prefijo.trim()}%`, limite]);

    return rows.map(r => ({
      num_factura:  r.num_factura,
      nit_cliente:  r.nit_cliente,
      fecha:        r.fecha_factura,
      total_items:  parseInt(r.total_items),
      valor_total:  Number(r.valor_total)
    }));
  } finally {
    client.release();
  }
}

// ============================================================================
// ESTADÍSTICAS del kardex cargado
// ============================================================================
export async function obtenerEstadisticasKardex() {
  const client = await getDbClient();
  if (!client) return null;

  try {
    const { rows } = await client.query(`
      SELECT
        COUNT(*) AS total_lineas,
        COUNT(DISTINCT num_factura) AS total_facturas,
        COUNT(DISTINCT nit_cliente) AS total_clientes,
        MIN(fecha_factura) AS fecha_min,
        MAX(fecha_factura) AS fecha_max,
        MAX(created_at) AS ultima_importacion
      FROM kardex_ventas
    `);
    return rows[0];
  } finally {
    client.release();
  }
}
