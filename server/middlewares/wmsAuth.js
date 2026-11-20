import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { getDbClient } from '../config/db.js';
dotenv.config();

const cleanVal = (v) => (v || '').trim().replace(/^["']|["']$/g, '');
const GOOGLE_CLIENT_ID = cleanVal(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID);

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ─── Whitelist de autorización ─────────────────────────────────────────────
// ALLOWED_EMAIL_DOMAIN: si está definida, el email debe terminar en @<dominio>
// ALLOWED_EMAILS: lista separada por comas de correos individuales permitidos
//   (útil para contratistas externos sin dominio corporativo)
// En producción, si NINGUNA está configurada el servidor aborta el arranque.

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || '').trim().toLowerCase().replace(/^@/, '');
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const hayRestriccion = ALLOWED_DOMAIN || ALLOWED_EMAILS.length > 0;

// Administradores y usuarios autorizados. Dos fuentes que se suman:
//   - Variables de entorno: ALLOWED_EMAILS / ALLOWED_EMAIL_DOMAIN (acceso) y ADMIN_EMAILS (admin)
//   - Tabla usuarios_autorizados en la base, gestionada por los admins desde la app
//     (pestaña Usuarios del Cuadre de Inventario), con rol CONTADOR o ADMIN.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const ROLES_USUARIO = ['CONTADOR', 'ADMIN'];

let usuariosBaseDatos = new Map(); // email → rol
const REFRESCO_USUARIOS_MS = 60 * 1000;

/** Relee la tabla usuarios_autorizados (también se llama tras cada cambio desde la app). */
export async function recargarUsuariosAutorizados() {
  const db = await getDbClient();
  if (!db) return;
  try {
    const { rows } = await db.query('SELECT LOWER(email) AS email, rol FROM usuarios_autorizados');
    usuariosBaseDatos = new Map(rows.map(r => [r.email, r.rol]));
  } catch (err) {
    console.warn('[wmsAuth] No se pudo leer usuarios_autorizados:', err.message);
  } finally {
    db.release();
  }
}

/**
 * Crea la tabla usuarios_autorizados si no existe, pasa a ella los admins de la
 * tabla anterior usuarios_admin (si existe) y la relee cada minuto.
 */
export async function inicializarUsuariosAutorizados() {
  const db = await getDbClient();
  if (!db) {
    console.warn('[wmsAuth] PostgreSQL no disponible: solo se usarán las variables de entorno.');
    return;
  }
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios_autorizados (
        email VARCHAR(255) PRIMARY KEY,
        rol VARCHAR(10) NOT NULL DEFAULT 'CONTADOR' CHECK (rol IN ('CONTADOR', 'ADMIN')),
        agregado_por VARCHAR(255),
        agregado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_por VARCHAR(255),
        actualizado_en TIMESTAMPTZ
      )
    `);
    const { rows } = await db.query("SELECT to_regclass('public.usuarios_admin') IS NOT NULL AS existe");
    if (rows[0]?.existe) {
      const { rowCount } = await db.query(`
        INSERT INTO usuarios_autorizados (email, rol, agregado_por, agregado_en)
        SELECT LOWER(email), 'ADMIN', 'migración usuarios_admin', agregado_en FROM usuarios_admin
        ON CONFLICT (email) DO NOTHING
      `);
      if (rowCount > 0) console.log(`[wmsAuth] ${rowCount} admin(s) pasados de usuarios_admin a usuarios_autorizados.`);
    }
  } catch (err) {
    console.error('[wmsAuth] Error preparando usuarios_autorizados:', err.message);
  } finally {
    db.release();
  }
  await recargarUsuariosAutorizados();
  const admins = [...usuariosBaseDatos.values()].filter(r => r === 'ADMIN').length;
  console.log(`✅ Usuarios en la base: ${usuariosBaseDatos.size} (${admins} admin). ADMIN_EMAILS: ${ADMIN_EMAILS.length}.`);
  setInterval(recargarUsuariosAutorizados, REFRESCO_USUARIOS_MS).unref();
}

export const adminEmailsConfigurados = () => new Set([
  ...ADMIN_EMAILS,
  ...[...usuariosBaseDatos].filter(([, rol]) => rol === 'ADMIN').map(([email]) => email)
]).size;

/**
 * Indica si el email pertenece a un administrador (ADMIN_EMAILS o rol ADMIN en la base).
 * Sin ninguna de las dos configurada nadie es administrador.
 */
export function esAdmin(email) {
  const e = (email || '').toLowerCase();
  return Boolean(e) && (ADMIN_EMAILS.includes(e) || usuariosBaseDatos.get(e) === 'ADMIN');
}

/** Correos y dominio autorizados por variables de entorno (solo lectura desde la app). */
export function accesosDeEntorno() {
  return { correos: [...ALLOWED_EMAILS], admins: [...ADMIN_EMAILS], dominio: ALLOWED_DOMAIN || null };
}

// Fallo de arranque en producción si no hay ninguna restricción configurada.
// En desarrollo/test solo emite advertencia para no bloquear el onboarding.
if (!hayRestriccion) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '\n🚨 [wmsAuth] ARRANQUE ABORTADO: NODE_ENV=production pero ALLOWED_EMAILS y ' +
      'ALLOWED_EMAIL_DOMAIN no están definidas.\n' +
      '   Define al menos una de ellas en las variables de entorno de Railway antes de desplegar.\n'
    );
    process.exit(1);
  } else {
    console.warn(
      '\n⚠️  [wmsAuth] MODO INSEGURO (desarrollo): No hay restricción de dominio ni whitelist configurada.\n' +
      '   Cualquier cuenta de Google puede acceder al panel de logística.\n' +
      '   Define ALLOWED_EMAIL_DOMAIN y/o ALLOWED_EMAILS en el archivo .env para restringir el acceso.\n'
    );
  }
}

/**
 * Evalúa si un email está autorizado: tabla usuarios_autorizados o variables de entorno.
 * @param {string} email - Email verificado por Google (ya lowercase)
 * @returns {boolean}
 */
function emailAutorizado(email) {
  // Criterio 0: autorizado desde la app (tabla usuarios_autorizados) o admin por entorno
  if (usuariosBaseDatos.has(email) || ADMIN_EMAILS.includes(email)) return true;

  if (!hayRestriccion) return true; // sin configuración → acceso abierto (solo en desarrollo)

  // Criterio 1: whitelist individual de correos
  if (ALLOWED_EMAILS.includes(email)) return true;

  // Criterio 2: dominio corporativo
  if (ALLOWED_DOMAIN && email.endsWith(`@${ALLOWED_DOMAIN}`)) return true;

  return false;
}

export const requireWmsAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Bloqueado acceso a WMS: No se proporcionó Token Bearer');
      return res.status(401).json({ error: 'Acceso Denegado. Token requerido.' });
    }

    const token = authHeader.split(' ')[1];

    // 1. Validar el token con Google (firma + audiencia)
    const audienceList = [
      GOOGLE_CLIENT_ID,
      cleanVal(process.env.VITE_GOOGLE_CLIENT_ID),
      cleanVal(process.env.GOOGLE_CLIENT_ID)
    ].filter(Boolean);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: audienceList.length > 0 ? (audienceList.length === 1 ? audienceList[0] : audienceList) : undefined,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email_verified) {
      return res.status(401).json({ error: 'Cuenta de Google no verificada.' });
    }

    const email = (payload.email || '').toLowerCase();

    // 2. Validar autorización (dominio/whitelist)
    if (!emailAutorizado(email)) {
      console.warn(`[wmsAuth] Acceso denegado (403) a: ${email}`);
      return res.status(403).json({
        error:
          'Tu cuenta de Google no está autorizada para acceder al panel de logística de La Valenciana. ' +
          'Contacta al administrador si crees que esto es un error.'
      });
    }

    // Guardar usuario en request para uso posterior
    req.user = payload;
    next();
  } catch (error) {
    console.error('Error verificando token de Google en Backend:', error.message);
    return res.status(401).json({ 
      error: 'Token inválido o expirado.',
      details: error.message 
    });
  }
};
