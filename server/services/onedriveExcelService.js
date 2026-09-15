import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FLOTA_VEHICULOS } from '../config/flota.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Encabezados reales requeridos por tesorería (8 columnas)
export const ENCABEZADOS_COLUMNAS = [
  { header: 'Nombre del cliente', key: 'cliente_nombre', width: 30 },
  { header: 'Dirección', key: 'direccion', width: 30 },
  { header: 'AM', key: 'am', width: 5 },
  { header: 'PM', key: 'pm', width: 5 },
  { header: 'Número de Factura', key: 'numero_factura', width: 22 },
  { header: 'Valor de la factura', key: 'valor_factura', width: 22 },
  { header: 'Observaciones', key: 'observaciones', width: 35 },
  { header: 'Firma de Recibido', key: 'firma', width: 25 }
];

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
 * Escribe el membrete corporativo (4 filas) al inicio de una hoja.
 */
function escribirMembreteCorporativo(worksheet) {
  // Configurar las columnas primero para tener anchos y keys disponibles
  worksheet.columns = ENCABEZADOS_COLUMNAS;

  // Fila 1: Título principal
  const row1 = worksheet.getRow(1);
  row1.getCell(1).value = 'CONTROL DE DESPACHO A CLIENTES';
  row1.getCell(1).font = { bold: true, size: 16 };
  row1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(1, 1, 1, 8);
  row1.height = 30;

  // Fila 2: Versión
  const row2 = worksheet.getRow(2);
  row2.getCell(1).value = 'Versión: 1';
  row2.getCell(1).font = { italic: true, size: 10 };
  row2.getCell(1).alignment = { horizontal: 'right' };
  worksheet.mergeCells(2, 1, 2, 8);

  // Fila 3 y 4 en blanco para separación
  worksheet.getRow(3).height = 15;
  worksheet.getRow(4).height = 15;
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
    
    escribirMembreteCorporativo(sheet);
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
 * Obtiene el token de acceso de Microsoft Graph si las variables de entorno de Azure AD existen
 */
async function obtenerGraphAccessToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return null;
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error autenticando con Azure AD (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Obtiene el buffer del archivo Excel actual
 */
export async function obtenerBufferPlantilla() {
  const token = await obtenerGraphAccessToken();

  if (token) {
    const driveId = process.env.ONEDRIVE_DRIVE_ID;
    const userId = process.env.ONEDRIVE_USER_ID;
    const filePath = process.env.ONEDRIVE_FILE_PATH || '/Plantillas/Plantilla_Despachos_Vehiculos.xlsx';

    let graphUrl = '';
    if (driveId) {
      graphUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${filePath}:/content`;
    } else if (userId) {
      graphUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/root:${filePath}:/content`;
    } else {
      graphUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/content`;
    }

    const res = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 404) {
      console.log('ℹ️ Archivo no encontrado en OneDrive. Creando plantilla base...');
      const workbook = await crearPlantillaBase();
      const buffer = await workbook.xlsx.writeBuffer();
      await subirBufferPlantilla(buffer, token);
      return buffer;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error descargando Excel desde OneDrive Graph API (${res.status}): ${errText}`);
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  // Fallback local
  await asegurarPlantillaLocal();
  return fs.readFileSync(LOCAL_TEMPLATE_PATH);
}

/**
 * Sube o guarda el buffer del archivo Excel modificado
 */
export async function subirBufferPlantilla(buffer, tokenOverride = null) {
  const token = tokenOverride || await obtenerGraphAccessToken();

  if (token) {
    const driveId = process.env.ONEDRIVE_DRIVE_ID;
    const userId = process.env.ONEDRIVE_USER_ID;
    const filePath = process.env.ONEDRIVE_FILE_PATH || '/Plantillas/Plantilla_Despachos_Vehiculos.xlsx';

    let graphUrl = '';
    if (driveId) {
      graphUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${filePath}:/content`;
    } else if (userId) {
      graphUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/root:${filePath}:/content`;
    } else {
      graphUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/content`;
    }

    const res = await fetch(graphUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      body: buffer
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error subiendo Excel a OneDrive Graph API (${res.status}): ${errText}`);
    }

    return { destino: 'OneDrive Cloud via Graph API' };
  }

  // Fallback local
  await asegurarPlantillaLocal();
  fs.writeFileSync(LOCAL_TEMPLATE_PATH, buffer);
  return { destino: 'Servidor Local (Modo Simulación Fallback)' };
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
    // Verificar validez y formatear localmente
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
    // 1. Obtener buffer actual (OneDrive o local)
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
      escribirMembreteCorporativo(worksheet);
    } else {
      // Asegurar configuración de columnas en caso de cargar archivo existente
      if (!worksheet.columns || worksheet.columns.length === 0) {
        worksheet.columns = ENCABEZADOS_COLUMNAS;
      }
    }

    // 4. Buscar si existe el bloque para esta fecha
    let filaSubtotalExistente = -1;
    let sumaActualSubtotal = 0;
    
    // Recorremos buscando la fila que diga "Fecha: DD/MM/YYYY" en la celda 1
    // y luego buscando su correspondiente "SUBTOTAL"
    let enBloque = false;
    for (let r = 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const val1 = String(row.getCell(1).value || '').trim();
      
      if (val1.includes(`Fecha: ${fechaBloqueStr}`)) {
        enBloque = true;
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
      // INSERCIÓN EN BLOQUE EXISTENTE
      // Insertamos una fila *antes* de la fila del subtotal
      worksheet.spliceRows(filaSubtotalExistente, 0, rowData);
      
      // Aplicar formato a la fila insertada
      const newRow = worksheet.getRow(filaSubtotalExistente);
      newRow.getCell(3).alignment = { horizontal: 'center' };
      newRow.getCell(4).alignment = { horizontal: 'center' };
      
      const valorCell = newRow.getCell(6);
      valorCell.numFmt = '"$"#,##0';
      valorCell.alignment = { horizontal: 'right' };

      // Actualizar el valor numérico (evitando fórmulas complejas y dependencias del motor de Excel)
      const nuevaSuma = Number(sumaActualSubtotal) + valorNumerico;
      const subRow = worksheet.getRow(filaSubtotalExistente + 1);
      
      // El subtotal está en la col 6
      const subCell = subRow.getCell(6);
      subCell.value = nuevaSuma;
      subCell.numFmt = '"$"#,##0';
      subCell.font = { bold: true };
      subRow.commit();
      newRow.commit();
      
    } else {
      // CREACIÓN DE BLOQUE NUEVO (Al final)
      const lastRow = worksheet.rowCount;
      const nextStart = lastRow > 4 ? lastRow + 2 : 5; // Dejar espacio si ya hay bloques
      
      // Fila de Fecha y Vehículo
      const titleRow = worksheet.getRow(nextStart);
      titleRow.getCell(1).value = `Fecha: ${fechaBloqueStr}`;
      titleRow.getCell(5).value = `Vehículo: ${vehiculoNormalizado}`;
      titleRow.font = { bold: true };
      titleRow.commit();
      
      // Fila de Encabezados
      const headerRow = worksheet.getRow(nextStart + 1);
      headerRow.values = [
        'Nombre del cliente',
        'Dirección',
        'AM',
        'PM',
        'Número de Factura',
        'Valor de la factura',
        'Observaciones',
        'Firma de Recibido'
      ];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE11D24' } // Rojo Valenciana
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;
      headerRow.commit();
      
      // Fila de Datos
      const dataRow = worksheet.getRow(nextStart + 2);
      dataRow.values = rowData;
      dataRow.getCell(3).alignment = { horizontal: 'center' };
      dataRow.getCell(4).alignment = { horizontal: 'center' };
      const valCell = dataRow.getCell(6);
      valCell.numFmt = '"$"#,##0';
      valCell.alignment = { horizontal: 'right' };
      dataRow.commit();
      
      // Fila de Subtotal
      const subRow = worksheet.getRow(nextStart + 3);
      subRow.getCell(1).value = 'SUBTOTAL';
      subRow.getCell(1).font = { bold: true };
      subRow.getCell(1).alignment = { horizontal: 'right' };
      const subValCell = subRow.getCell(6);
      subValCell.value = valorNumerico;
      subValCell.numFmt = '"$"#,##0';
      subValCell.font = { bold: true };
      subRow.commit();
    }

    // 6. Generar buffer actualizado
    const updatedBuffer = await workbook.xlsx.writeBuffer();

    // 7. Guardar en OneDrive o archivo local
    const resultadoGuardado = await subirBufferPlantilla(Buffer.from(updatedBuffer));

    console.log(`✅ Fila agregada en hoja [${vehiculoNormalizado}]: Factura ${numeroFactura}, Valor $${valorNumerico.toLocaleString('es-CO')} (${resultadoGuardado.destino})`);

    return {
      success: true,
      placa: vehiculoNormalizado, // Mantenemos el campo de retorno por compatibilidad 
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
