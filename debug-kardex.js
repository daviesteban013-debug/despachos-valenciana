import * as XLSX from 'xlsx';
import { getDbClient } from './server/config/db.js';

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
  const str = String(val).replace(/\./g, '').replace(/,/g, '.').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

async function run() {
  const client = await getDbClient();
  const workbook = XLSX.readFile('C:\\Users\\USUARIO\\Downloads\\CONTROL ENTREGAS AGOSTO 2026.xlsx', { cellDates: false });
  // find sheet
  let hojaSeleccionada = null;
  let headerRowIndex = -1;
  const numFacturaAliases = ALIAS_COLUMNAS.num_factura.map(a => a.toLowerCase());
  for (const nombreHoja of workbook.SheetNames) {
    const hojaTemp = workbook.Sheets[nombreHoja];
    const dataTemp = XLSX.utils.sheet_to_json(hojaTemp, { header: 1, defval: '' });
    for (let i = 0; i < Math.min(dataTemp.length, 30); i++) {
      const row = dataTemp[i];
      if (Array.isArray(row)) {
        if (row.some(c => typeof c === 'string' && numFacturaAliases.includes(c.toLowerCase().trim()))) {
          hojaSeleccionada = hojaTemp; headerRowIndex = i; break;
        }
      }
    }
    if (hojaSeleccionada) break;
  }
  
  if (!hojaSeleccionada) return console.log("No se encontro cabecera");
  
  const filas = XLSX.utils.sheet_to_json(hojaSeleccionada, { defval: '', range: headerRowIndex });
  
  console.log(`Filas detectadas: ${filas.length}`);
  
  for (let i = 0; i < Math.min(filas.length, 100); i++) {
    const fila = filas[i];
    const numFactura = String(getCampo(fila, 'num_factura') || '').trim();
    if (!numFactura) continue;
    
    const params = [
      'test', 'TD', numFactura, null, 'CO',
      '123', 'SKU', '1', 'Desc', Math.max(0, Math.round(limpiarNumero(getCampo(fila, 'cantidad')))),
      limpiarNumero(getCampo(fila, 'precio_unitario')), limpiarNumero(getCampo(fila, 'valor_sin_iva')), limpiarNumero(getCampo(fila, 'iva')), limpiarNumero(getCampo(fila, 'precio_venta')), limpiarNumero(getCampo(fila, 'valor_total')),
      limpiarNumero(getCampo(fila, 'costo_unitario')), Math.round(limpiarNumero(getCampo(fila, 'saldo_cantidad'))), limpiarNumero(getCampo(fila, 'saldo_valor')), limpiarNumero(getCampo(fila, 'pct_iva')), 'cons'
    ];
    
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
      `, params);
    } catch (e) {
      console.log(`Error insertando fila ${i} (Factura: ${numFactura}):`, e.message);
      console.log("Params:", params);
      break;
    }
  }
  console.log("Prueba finalizada");
  client.release();
  process.exit(0);
}
run();
