/**
 * Configuración de estilos visuales y membretes para plantillas Excel de La Valenciana FERREHOGAR
 */

export const ANCHOS_COLUMNAS_8 = [
  { key: 'cliente', width: 34 },
  { key: 'direccion', width: 38 },
  { key: 'am', width: 6 },
  { key: 'pm', width: 6 },
  { key: 'factura', width: 18 },
  { key: 'valor', width: 20 },
  { key: 'observaciones', width: 30 },
  { key: 'firma', width: 22 }
];

export const ENCABEZADOS_TABLA_8 = [
  'Nombre del cliente',
  'Dirección',
  'AM',
  'PM',
  'Número de Factura',
  'Valor de la factura',
  'Observaciones',
  'Firma de Recibido'
];

export const ESTILOS_CELDA = {
  header: {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }, // Slate 800
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  },
  dataRowBorder: {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  },
  totalRow: {
    font: { bold: true, color: { argb: 'FF0F172A' } },
    border: {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } }
    }
  },
  formatoMonedaCop: '"$"#,##0'
};

/**
 * Inserta el membrete de calidad institucional en las primeras 4 filas de la hoja
 */
export function inyectarMembreteInstitucional(worksheet, fechaTexto, cuadrillaNombre) {
  worksheet.addRow(['Control de Despacho a Clientes', '', '', '', '', 'Versión: 1']);
  worksheet.addRow(['La Valenciana Ferre Hogar', '', '', '', '', 'Fecha de Aprobación : 01/10/2020']);
  worksheet.addRow(['Gestión Logística', '', '', '', '', 'Página 1 de 1']);

  const filaMeta = worksheet.addRow([fechaTexto, '', `Placa de Vehículo : ${cuadrillaNombre}`]);
  filaMeta.font = { bold: true };

  worksheet.addRow([]); // Fila vacía de respiro
}
