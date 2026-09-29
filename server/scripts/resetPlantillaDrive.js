import fs from 'fs';
import ExcelJS from 'exceljs';
import { sincronizarConGoogleDrive } from '../services/googleDriveService.js';
import dotenv from 'dotenv';
dotenv.config();

const FLOTA = ['WDO-069 ANDERSON', 'TJP-653 GRIS', 'A20BB5E JEFERSON', 'WDP-097 JESUS'];
const BORDER_STYLE = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

const FECHA_ACTUAL = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });

async function generarPlantillaVirgen() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'La Valenciana WMS';

  for (const cuadrilla of FLOTA) {
    const sheet = workbook.addWorksheet(cuadrilla, { properties: { tabColor: { argb: 'FF0284C7' } } });
    
    // Anchos de columna optimizados
    sheet.columns = [
      { width: 30 }, // A: Nombre del cliente
      { width: 35 }, // B: Dirección
      { width: 10 }, // C: AM
      { width: 10 }, // D: PM
      { width: 20 }, // E: Número de Factura
      { width: 20 }, // F: Valor de la factura
      { width: 25 }, // G: Observaciones
      { width: 20 }, // H: Firma de Recibido
    ];

    // Membrete Institucional (4 filas)
    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = 'Control de Despacho a Clientes';
    sheet.getCell('F1').value = 'Versión: 1';
    
    sheet.mergeCells('A2:E2');
    sheet.getCell('A2').value = 'La Valenciana Ferre Hogar';
    sheet.getCell('F2').value = 'Fecha de Aprobación : 01/10/2020';

    sheet.mergeCells('A3:E3');
    sheet.getCell('A3').value = 'Gestión Logística';
    sheet.getCell('F3').value = 'Página 1 de 1';

    sheet.mergeCells('A4:D4');
    sheet.getCell('A4').value = `Fecha: ${FECHA_ACTUAL}`;
    sheet.mergeCells('E4:H4');
    sheet.getCell('E4').value = `Placa de Vehículo : ${cuadrilla}`;

    // Estilos de membrete
    for (let r = 1; r <= 4; r++) {
      const row = sheet.getRow(r);
      row.font = { bold: true, name: 'Arial', size: 10 };
      row.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Encabezados en fila 6
    sheet.getRow(6).values = [
      'Nombre del cliente', 'Dirección', 'AM', 'PM', 'Número de Factura', 'Valor de la factura', 'Observaciones', 'Firma de Recibido'
    ];
    
    const hRow = sheet.getRow(6);
    hRow.font = { bold: true, name: 'Arial', size: 10, color: { argb: 'FFFFFFFF' } };
    hRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    for (let i = 1; i <= 8; i++) {
      const cell = hRow.getCell(i);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B5394' } };
      cell.border = BORDER_STYLE;
    }

    // Filas vacías listas para diligenciamiento (Filas 7, 8, 9)
    for (let i = 7; i <= 9; i++) {
      const row = sheet.getRow(i);
      row.values = ['', '', '', '', '', 0, '', ''];
      for (let c = 1; c <= 8; c++) {
        row.getCell(c).border = BORDER_STYLE;
      }
      row.getCell(6).numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';
    }

    // Fila de Subtotal
    sheet.mergeCells('A11:E11');
    const totalLabelCell = sheet.getCell('A11');
    totalLabelCell.value = 'TOTAL GENERAL DESPACHADO';
    totalLabelCell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF000000' } };
    totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    totalLabelCell.border = BORDER_STYLE;

    const totalValueCell = sheet.getCell('F11');
    totalValueCell.value = { formula: 'SUM(F7:F9)', result: 0 };
    totalValueCell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF000000' } };
    totalValueCell.numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';
    totalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    totalValueCell.border = BORDER_STYLE;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  console.log('Subiendo plantilla virgen a Google Drive...');
  
  const targetName = process.env.NOMBRE_ARCHIVO_EXCEL || 'CONTROL ENTREGAS AGOSTO 2026.xlsx';
  try {
    const res = await sincronizarConGoogleDrive(buffer, targetName);
    console.log(`✅ Plantilla virgen subida con éxito: ${res.destino}`);
  } catch(err) {
    console.error('Error subiendo plantilla a Drive:', err);
  }
}

generarPlantillaVirgen().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
