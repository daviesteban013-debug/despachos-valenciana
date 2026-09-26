import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FLOTA_VEHICULOS } from '../config/flota.js';
import { 
  buscarArchivoEnDrive, 
  descargarExcelDesdeDrive, 
  sincronizarConGoogleDrive 
} from './googleDriveService.js';
import {
  ANCHOS_COLUMNAS_8,
  ENCABEZADOS_TABLA_8,
  ESTILOS_CELDA,
  inyectarMembreteInstitucional
} from './excelStyles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta de almacenamiento local para modo simulación / fallback y desarrollo offline
const DATA_DIR = path.resolve(__dirname, '../data');
const LOCAL_TEMPLATE_PATH = path.join(DATA_DIR, 'plantilla_despachos_vehiculos.xlsx');

// Cola secuencial asíncrona para evitar condiciones de carrera (evitar sobrescrituras en despachos simultáneos)
let writeQueue = Promise.resolve();

function enqueue(task) {
  const result = writeQueue.then(
    () => task(),
    () => task()
  );
  writeQueue = result.catch(() => {});
  return result;
}

/**
 * Inicializa un libro ExcelJS con las 4 hojas fijas correspondientes a la flota
 */
export async function crearPlantillaBase() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'La Valenciana FERREHOGAR - WMS Despachos';
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const placa of FLOTA_VEHICULOS) {
    const sheet = workbook.addWorksheet(placa, {
      views: [{ showGridLines: true }]
    });
    
    sheet.columns = ANCHOS_COLUMNAS_8;
    // Utilizamos la nueva función inyectarMembreteInstitucional
    const todayStr = new Date().toLocaleDateString('es-CO');
    inyectarMembreteInstitucional(sheet, `Fecha: ${todayStr}`, placa);
  }

  return workbook;
}

/**
 * Asegura la existencia del archivo local base si se corre en modo fallback
 */
export async function asegurarPlantillaLocal() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LOCAL_TEMPLATE_PATH)) {
    const workbook = await crearPlantillaBase();
    await workbook.xlsx.writeFile(LOCAL_TEMPLATE_PATH);
    console.log(`📁 Plantilla Excel inicializada localmente con ${FLOTA_VEHICULOS.length} hojas en: ${LOCAL_TEMPLATE_PATH}`);
  }
}

/**
 * Obtiene el buffer del archivo Excel actual desde Google Drive
 */
export async function obtenerBufferPlantilla() {
  try {
    const archivoExistente = await buscarArchivoEnDrive();
    
    if (archivoExistente) {
      return await descargarExcelDesdeDrive(archivoExistente.id);
    } else {
      console.log('ℹ️ Archivo no encontrado en Google Drive. Creando plantilla base...');
      const workbook = await crearPlantillaBase();
      const buffer = await workbook.xlsx.writeBuffer();
      await subirBufferPlantilla(buffer);
      return buffer;
    }
  } catch (error) {
    console.warn(`⚠️ No se pudo obtener buffer desde Google Drive (${error.message}). Usando fallback local...`);
    // Fallback local
    await asegurarPlantillaLocal();
    return fs.readFileSync(LOCAL_TEMPLATE_PATH);
  }
}

/**
 * Sube o guarda el buffer del archivo Excel modificado en Google Drive
 */
export async function subirBufferPlantilla(buffer) {
  const resSync = await sincronizarConGoogleDrive(buffer);
  
  if (resSync.success) {
    return { destino: 'Google Drive Cloud' };
  } else {
    console.warn(`⚠️ Error sincronizando con Drive (${resSync.error}). Usando fallback local...`);
    // Fallback local
    await asegurarPlantillaLocal();
    fs.writeFileSync(LOCAL_TEMPLATE_PATH, buffer);
    return { destino: 'Servidor Local (Modo Simulación Fallback)' };
  }
}

/**
 * Registra automáticamente un despacho en la hoja correspondiente al vehículo,
 * agrupando por fecha y con fila de subtotal dinámica.
 */
export async function registrarDespachoEnPlantilla({ 
  vehiculo, 
  numeroFactura, 
  clienteNombre, 
  direccion, 
  jornada, 
  valorFactura, 
  observaciones, 
  fechaDespacho 
}) {
  if (!vehiculo) {
    throw new Error('Debe especificar el vehículo asignado para el registro en la plantilla.');
  }

  const vehiculoNormalizado = vehiculo.trim();
  if (!FLOTA_VEHICULOS.map(v => v.trim()).includes(vehiculoNormalizado)) {
    throw new Error(`Vehículo "${vehiculoNormalizado}" no reconocido en la flota. Vehículos permitidos: ${FLOTA_VEHICULOS.join(', ')}`);
  }

  // Formato de fecha para el bloque (DD/MM/YYYY)
  let fechaBloqueStr = '';
  if (fechaDespacho) {
    const d = new Date(fechaDespacho);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      fechaBloqueStr = `${day}/${month}/${year}`;
    }
  }
  if (!fechaBloqueStr) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    fechaBloqueStr = `${day}/${month}/${year}`;
  }

  // Encolar la operación atómica
  return enqueue(async () => {
    // 1. Obtener buffer actual (Google Drive o local)
    const currentBuffer = await obtenerBufferPlantilla();

    // 2. Cargar con ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(currentBuffer);

    // 3. Ubicar o crear la hoja correspondiente
    let worksheet = null;
    workbook.eachSheet((s) => {
      if (s.name.trim() === vehiculoNormalizado) {
        worksheet = s;
      }
    });

    if (!worksheet) {
      console.warn(`⚠️ Hoja para vehículo ${vehiculoNormalizado} no existía. Creándola...`);
      worksheet = workbook.addWorksheet(vehiculoNormalizado, { views: [{ showGridLines: true }] });
      worksheet.columns = ANCHOS_COLUMNAS_8;
      inyectarMembreteInstitucional(worksheet, `Fecha: ${fechaBloqueStr}`, vehiculoNormalizado);
    } else {
      if (!worksheet.columns || worksheet.columns.length === 0) {
        worksheet.columns = ANCHOS_COLUMNAS_8;
      }
    }

    // 4. Buscar si existe el bloque para esta fecha
    let filaSubtotalExistente = -1;
    let filaInicioBloque = -1;
    let sumaActualSubtotal = 0;
    let enBloque = false;
    for (let r = 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const val1 = String(row.getCell(1).value || '').trim();
      
      if (val1.includes(`Fecha: ${fechaBloqueStr}`)) {
        enBloque = true;
        filaInicioBloque = r + 2; // La fila de datos empieza despus del header
      } else if (enBloque && val1.toUpperCase() === 'SUBTOTAL') {
        filaSubtotalExistente = r;
        sumaActualSubtotal = row.getCell(6).result || row.getCell(6).value || 0; // Col 6: valor_factura
        break; // Encontramos el final del bloque
      }
    }

    const valorNumerico = Number(valorFactura) || 0;
    const esAM = jornada === 'AM' ? 'X' : '';
    const esPM = jornada === 'PM' ? 'X' : '';
    
    const rowData = [
      clienteNombre || 'S/N',
      direccion || 'S/D',
      esAM,
      esPM,
      numeroFactura || 'S/F',
      valorNumerico,
      observaciones || '',
      '' // Firma
    ];

    if (filaSubtotalExistente > -1) {
      worksheet.spliceRows(filaSubtotalExistente, 0, rowData);
      
      const newRow = worksheet.getRow(filaSubtotalExistente);
      
      // Aplicar dataRowBorder
      newRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = ESTILOS_CELDA.dataRowBorder;
      });
      newRow.getCell(3).alignment = { horizontal: 'center' };
      newRow.getCell(4).alignment = { horizontal: 'center' };
      
      const valorCell = newRow.getCell(6);
      valorCell.numFmt = ESTILOS_CELDA.formatoMonedaCop;
      valorCell.alignment = { horizontal: 'right' };

      const subRow = worksheet.getRow(filaSubtotalExistente + 1);
      
      // MANTENER INTACTA LA FORMULA
      const subCell = subRow.getCell(6);
      subCell.value = { formula: `SUM(F${filaInicioBloque}:F${filaSubtotalExistente})` };
      subCell.numFmt = ESTILOS_CELDA.formatoMonedaCop;
      
      subRow.commit();
      newRow.commit();
      
    } else {
      const lastRow = worksheet.rowCount;
      const nextStart = lastRow > 4 ? lastRow + 2 : 6;
      
      const titleRow = worksheet.getRow(nextStart);
      titleRow.getCell(1).value = `Fecha: ${fechaBloqueStr}`;
      titleRow.getCell(5).value = `Vehículo: ${vehiculoNormalizado}`;
      titleRow.font = { bold: true };
      titleRow.commit();
      
      const headerRow = worksheet.getRow(nextStart + 1);
      headerRow.values = ENCABEZADOS_TABLA_8;
      
      // Aplicar estilo de header
      headerRow.eachCell({ includeEmpty: false }, (cell) => {
        cell.font = ESTILOS_CELDA.header.font;
        cell.fill = ESTILOS_CELDA.header.fill;
        cell.alignment = ESTILOS_CELDA.header.alignment;
        cell.border = ESTILOS_CELDA.header.border;
      });
      headerRow.height = 20;
      headerRow.commit();
      
      const dataRow = worksheet.getRow(nextStart + 2);
      dataRow.values = rowData;
      dataRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = ESTILOS_CELDA.dataRowBorder;
      });
      dataRow.getCell(3).alignment = { horizontal: 'center' };
      dataRow.getCell(4).alignment = { horizontal: 'center' };
      const valCell = dataRow.getCell(6);
      valCell.numFmt = ESTILOS_CELDA.formatoMonedaCop;
      valCell.alignment = { horizontal: 'right' };
      dataRow.commit();
      
      const subRow = worksheet.getRow(nextStart + 3);
      subRow.getCell(1).value = 'SUBTOTAL';
      subRow.getCell(1).font = ESTILOS_CELDA.totalRow.font;
      subRow.getCell(1).alignment = { horizontal: 'right' };
      
      // Aplicar borde de subtotal a toda la fila o a celdas clave
      subRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = ESTILOS_CELDA.totalRow.border;
      });

      const subValCell = subRow.getCell(6);
      // MANTENER INTACTA LA FORMULA
      subValCell.value = { formula: `SUM(F${nextStart + 2}:F${nextStart + 2})` };
      subValCell.numFmt = ESTILOS_CELDA.formatoMonedaCop;
      subValCell.font = ESTILOS_CELDA.totalRow.font;
      subRow.commit();
    }

    // 6. Generar buffer actualizado
    const updatedBuffer = await workbook.xlsx.writeBuffer();

    // 7. Guardar en Google Drive o archivo local
    const resultadoGuardado = await subirBufferPlantilla(Buffer.from(updatedBuffer));

    console.log(`✅ Fila agregada en hoja [${vehiculoNormalizado}]: Factura ${numeroFactura}, Valor $${valorNumerico.toLocaleString('es-CO')} (${resultadoGuardado.destino})`);

    return {
      success: true,
      placa: vehiculoNormalizado, 
      vehiculo: vehiculoNormalizado,
      fila: {
        numeroFactura,
        fecha: fechaBloqueStr,
        valorFactura: valorNumerico
      },
      destino: resultadoGuardado.destino,
      totalFilasHoja: worksheet.rowCount
    };
  });
}

/**
 * Exporta el archivo Excel completo en buffer para descarga directa
 */
export async function exportarPlantillaBuffer() {
  return await obtenerBufferPlantilla();
}

/**
 * Permite cargar la plantilla real de tesorería para calibrar columnas y estructura antes de producción
 */
export async function calibrarPlantillaReferencia(bufferArchivo) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bufferArchivo);

  // Validar que contenga al menos las 4 hojas de la flota
  const hojasFaltantes = FLOTA_VEHICULOS.filter(v => {
    let encontrada = false;
    workbook.eachSheet((s) => {
      if (s.name.trim() === v.trim()) encontrada = true;
    });
    return !encontrada;
  });

  if (hojasFaltantes.length > 0) {
    throw new Error(`La plantilla cargada no contiene todas las hojas requeridas. Faltan: ${hojasFaltantes.join(', ')}`);
  }

  // Guardar como nueva plantilla base
  await subirBufferPlantilla(bufferArchivo);
  return {
    success: true,
    mensaje: 'Plantilla de referencia calibrada exitosamente.',
    hojasValidadas: FLOTA_VEHICULOS
  };
}
