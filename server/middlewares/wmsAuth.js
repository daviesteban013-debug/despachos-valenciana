import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

export const requireWmsAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Bloqueado acceso a WMS: No se proporcionó Token Bearer');
      return res.status(401).json({ error: 'Acceso Denegado. Token requerido.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Validar el token con Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email_verified) {
      return res.status(401).json({ error: 'Cuenta de Google no verificada.' });
    }

    // Guardar usuario en request para uso posterior
    req.user = payload;
    
    next();
  } catch (error) {
    console.error('Error verificando token de Google en Backend:', error.message);
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};
