import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo de credenciales de la Cuenta de Servicio
const keyFilePath = path.resolve(__dirname, '../config/google-service-account.json');

const auth = new google.auth.GoogleAuth({
  keyFile: keyFilePath,
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Convierte un Buffer binario en un Readable Stream nativo para Google Drive API
 */
function bufferToStream(buffer) {
  return Readable.from(buffer);
}

/**
 * Busca de forma flexible el archivo Excel dentro de la carpeta
 */
export async function buscarArchivoEnDrive(nombreArchivo = process.env.NOMBRE_ARCHIVO_EXCEL) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID no está configurado en .env');
  }

  const nombreLimpio = (nombreArchivo || '').replace(/['"]+/g, '').trim().toLowerCase();

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, webViewLink, mimeType)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  const archivos = res.data.files || [];
  console.log(`[DRIVE-DEBUG] Archivos visibles en la carpeta (${archivos.length}):`, archivos.map(a => a.name));

  if (archivos.length === 0) return null;

  // 1. Buscar coincidencia por nombre
  let match = archivos.find(a => a.name.replace(/['"]+/g, '').trim().toLowerCase() === nombreLimpio);

  // 2. Si no coincide exacto, buscar cualquier archivo Excel o con palabra clave
  if (!match) {
    match = archivos.find(a =>
      a.name.toLowerCase().includes('control') ||
      a.name.toLowerCase().includes('plantilla') ||
      a.name.endsWith('.xlsx')
    );
  }

  return match || archivos[0];
}

/**
 * Descarga el buffer del archivo Excel actual desde Google Drive
 */
export async function descargarExcelDesdeDrive(fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data);
}

/**
 * Sube o actualiza el archivo Excel en Google Drive (Upsert)
 */
export async function sincronizarConGoogleDrive(bufferExcel, nombreArchivo = process.env.NOMBRE_ARCHIVO_EXCEL) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID no está definido');
    }

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: bufferToStream(bufferExcel)
    };

    const archivoExistente = await buscarArchivoEnDrive(nombreArchivo);

    if (archivoExistente) {
      const updateRes = await drive.files.update({
        fileId: archivoExistente.id,
        media: media,
        fields: 'id, name, webViewLink, modifiedTime',
        supportsAllDrives: true
      });

      console.log(`[DRIVE-SYNC] Archivo actualizado con éxito: ${archivoExistente.name} (${archivoExistente.id})`);
      return {
        success: true,
        fileId: updateRes.data.id,
        webViewLink: updateRes.data.webViewLink,
        accion: 'ACTUALIZADO'
      };
    } else {
      const createRes = await drive.files.create({
        requestBody: {
          name: (nombreArchivo || 'CONTROL ENTREGAS AGOSTO 2026.xlsx').replace(/['"]+/g, ''),
          parents: [folderId]
        },
        media: media,
        fields: 'id, name, webViewLink, modifiedTime',
        supportsAllDrives: true
      });

      console.log(`[DRIVE-SYNC] Archivo creado con éxito en Drive: ${createRes.data.id}`);
      return {
        success: true,
        fileId: createRes.data.id,
        webViewLink: createRes.data.webViewLink,
        accion: 'CREADO'
      };
    }
  } catch (error) {
    console.error('[DRIVE-SYNC-ERROR] Error al sincronizar con Google Drive:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}