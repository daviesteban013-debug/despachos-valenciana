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
  scopes: ['https://www.googleapis.com/auth/drive.file']
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Convierte un Buffer binario en un Readable Stream para la API de Google Drive
 */
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

/**
 * Busca si el archivo Excel ya existe en la carpeta configurada
 */
export async function buscarArchivoEnDrive(nombreArchivo = process.env.NOMBRE_ARCHIVO_EXCEL) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID no está configurado en .env');
  }

  const res = await drive.files.list({
    q: `'${folderId}' in parents and name = '${nombreArchivo}' and trashed = false`,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive'
  });

  return res.data.files && res.data.files.length > 0 ? res.data.files[0] : null;
}

/**
 * Descarga el buffer actual del archivo Excel desde Google Drive
 */
export async function descargarExcelDesdeDrive(fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data);
}

/**
 * Sube o actualiza el archivo Excel en Google Drive (Operación Upsert Atómica)
 */
export async function sincronizarConGoogleDrive(bufferExcel, nombreArchivo = process.env.NOMBRE_ARCHIVO_EXCEL) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID no está definido en variables de entorno');
    }

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: bufferToStream(bufferExcel)
    };

    const archivoExistente = await buscarArchivoEnDrive(nombreArchivo);

    if (archivoExistente) {
      // Si ya existe, actualizar el contenido binario preservando el ID
      const updateRes = await drive.files.update({
        fileId: archivoExistente.id,
        media: media,
        fields: 'id, name, webViewLink, modifiedTime'
      });

      console.log(`[DRIVE-SYNC] Archivo actualizado exitosamente: ${archivoExistente.id}`);
      return {
        success: true,
        fileId: updateRes.data.id,
        webViewLink: updateRes.data.webViewLink,
        accion: 'ACTUALIZADO'
      };
    } else {
      // Si no existe, crearlo en la carpeta designada
      const createRes = await drive.files.create({
        requestBody: {
          name: nombreArchivo,
          parents: [folderId]
        },
        media: media,
        fields: 'id, name, webViewLink, modifiedTime'
      });

      console.log(`[DRIVE-SYNC] Archivo creado exitosamente en Google Drive: ${createRes.data.id}`);
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
