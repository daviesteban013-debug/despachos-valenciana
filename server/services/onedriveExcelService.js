import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Las 4 placas fijas e invariables de la flota Valenciana
export const PLACAS_FLOTA = ['WRO-482', 'STZ-910', 'ENV-301', 'MC-441'];

// Encabezados base informados (a validar contra plantilla física antes de producción)
export const ENCABEZADOS_COLUMNAS = [
  { header: 'Número de factura', key: 'numero_factura', width: 22 },
  { header: 'Fecha', key: 'fecha', width: 20 },
  { header: 'Valor de la factura', key: 'valor_factura', width: 22 }
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
 * Inicializa un libro ExcelJS con las 4 hojas fijas correspondientes a la flota
 */
export async function crearPlantillaBase() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'La Valenciana FERREHOGAR - WMS Despachos';
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const placa of PLACAS_FLOTA) {
    const sheet = workbook.addWorksheet(placa, {
      views: [{ showGridLines: true }]
    });

    sheet.columns = ENCABEZADOS_COLUMNAS;

    // Estilo elegante para el encabezado
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE11D24' } // Rojo Valenciana
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 26;

    headerRow.commit();
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
    console.log(`📁 Plantilla Excel inicializada localmente con 4 hojas en: ${LOCAL_TEMPLATE_PATH}`);
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
 * Obtiene el buffer del archivo Excel actual:
 * - Desde OneDrive vía Microsoft Graph API si hay credenciales
 * - O desde el archivo local en modo fallback
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
      // El archivo no existe aún en OneDrive, crear nuevo y subirlo
      console.log('ℹ️ Archivo no encontrado en OneDrive. Creando plantilla base de 4 hojas...');
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
 * Registra automáticamente un despacho en la hoja correspondiente a la placa del vehículo.
 * Ejecuta a través de la cola secuencial en memoria para evitar condiciones de carrera.
 * 
 * @param {Object} params
 * @param {string} params.placa - Una de las 4 placas fijas ('WRO-482', 'STZ-910', 'ENV-301', 'MC-441')
 * @param {string} params.numeroFactura - Código o número de factura ERP
 * @param {string|Date} [params.fecha] - Fecha del despacho (por defecto now)
 * @param {number} params.valorFactura - Valor total de la factura
 */
export async function registrarDespachoEnPlantilla({ placa, numeroFactura, fecha = new Date(), valorFactura = 0 }) {
  if (!placa) {
    throw new Error('Debe especificar la placa del vehículo asignado para el registro en la plantilla.');
  }

  const placaNormalizada = placa.trim().toUpperCase();
  if (!PLACAS_FLOTA.includes(placaNormalizada)) {
    throw new Error(`Placa "${placaNormalizada}" no reconocida en la flota fija. Placas permitidas: ${PLACAS_FLOTA.join(', ')}`);
  }

  // Encolar la operación atómica de lectura -> adición de fila -> escritura
  return enqueue(async () => {
    // 1. Obtener buffer actual (OneDrive o local)
    const currentBuffer = await obtenerBufferPlantilla();

    // 2. Cargar con ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(currentBuffer);

    // 3. Ubicar o crear la hoja correspondiente a la placa
    let worksheet = workbook.getWorksheet(placaNormalizada);
    if (!worksheet) {
      console.warn(`⚠️ Hoja para placa ${placaNormalizada} no existía. Creándola...`);
      worksheet = workbook.addWorksheet(placaNormalizada);
    }

    // Asegurar encabezados si la hoja está vacía
    if (worksheet.rowCount === 0) {
      worksheet.columns = ENCABEZADOS_COLUMNAS;
      const headerRow = worksheet.getRow(1);
      headerRow.values = ['Número de factura', 'Fecha', 'Valor de la factura'];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE11D24' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 26;
      headerRow.commit();
    }

    // 4. Formatear valores de fila
    const fechaFormateada = typeof fecha === 'string' 
      ? fecha 
      : fecha.toISOString().replace('T', ' ').substring(0, 19);

    const valorNumerico = Number(valorFactura) || 0;

    // 5. Anexar la nueva fila por valores posicionales sin sobreescribir las existentes
    const newRow = worksheet.addRow([
      numeroFactura || 'S/F',
      fechaFormateada,
      valorNumerico
    ]);

    // Formato de celda por índice posicional (1: Factura, 2: Fecha, 3: Valor)
    const facturaCell = newRow.getCell(1);
    facturaCell.alignment = { horizontal: 'center' };

    const fechaCell = newRow.getCell(2);
    fechaCell.alignment = { horizontal: 'center' };

    const valorCell = newRow.getCell(3);
    valorCell.numFmt = '"$"#,##0';
    valorCell.alignment = { horizontal: 'right' };

    newRow.commit();

    // 6. Generar buffer actualizado
    const updatedBuffer = await workbook.xlsx.writeBuffer();

    // 7. Guardar en OneDrive o archivo local
    const resultadoGuardado = await subirBufferPlantilla(Buffer.from(updatedBuffer));

    console.log(`✅ Fila agregada en hoja [${placaNormalizada}]: Factura ${numeroFactura}, Valor $${valorNumerico.toLocaleString('es-CO')} (${resultadoGuardado.destino})`);

    return {
      success: true,
      placa: placaNormalizada,
      fila: {
        numeroFactura,
        fecha: fechaFormateada,
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

  // Validar que contenga al menos las 4 hojas de placas
  const hojasFaltantes = PLACAS_FLOTA.filter((placa) => !workbook.getWorksheet(placa));
  if (hojasFaltantes.length > 0) {
    throw new Error(`La plantilla cargada no contiene todas las hojas requeridas. Faltan: ${hojasFaltantes.join(', ')}`);
  }

  // Guardar como nueva plantilla base
  await subirBufferPlantilla(bufferArchivo);
  return {
    success: true,
    mensaje: 'Plantilla de referencia calibrada exitosamente.',
    hojasValidadas: PLACAS_FLOTA
  };
}
