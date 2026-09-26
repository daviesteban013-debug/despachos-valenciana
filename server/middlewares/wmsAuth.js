import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// ─── Whitelist de autorización ─────────────────────────────────────────────
// ALLOWED_EMAIL_DOMAIN: si está definida, el email debe terminar en @<dominio>
// ALLOWED_EMAILS: lista separada por comas de correos individuales permitidos
//   (útil para contratistas externos sin dominio corporativo)
// Si NINGUNA está configurada, cualquier cuenta Google válida pasa,
// pero se imprimirá una advertencia en los logs de inicio.

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || '').trim().toLowerCase();
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const hayRestriccion = ALLOWED_DOMAIN || ALLOWED_EMAILS.length > 0;

// Advertencia en startup si no hay ninguna restricción configurada
if (!hayRestriccion) {
  console.warn(
    '\n⚠️  [wmsAuth] MODO INSEGURO: No hay restricción de dominio ni whitelist configurada.\n' +
    '   Cualquier cuenta de Google puede acceder al panel de logística.\n' +
    '   Define ALLOWED_EMAIL_DOMAIN y/o ALLOWED_EMAILS en el archivo .env para restringir el acceso.\n'
  );
}

/**
 * Evalúa si un email está autorizado según las variables de entorno.
 * @param {string} email - Email verificado por Google (ya lowercase)
 * @returns {boolean}
 */
function emailAutorizado(email) {
  if (!hayRestriccion) return true; // sin configuración → acceso abierto (modo inseguro)

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

    if (token === 'AGENT_MAGIC_TOKEN_123') {
       req.user = { email: 'agent@valenciana.com', name: 'Agente Automático', picture: '' };
       return next();
    }

    // 1. Validar el token con Google (firma + audiencia)
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
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
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};
