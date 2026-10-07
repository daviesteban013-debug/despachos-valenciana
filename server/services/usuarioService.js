import { getDbClient } from '../config/db.js';

/**
 * Inicializa la tabla usuario_perfil en PostgreSQL si no existe.
 */
export async function inicializarTablaUsuarioPerfil() {
  const client = await getDbClient();
  if (!client) {
    console.warn('[USUARIO] PostgreSQL no disponible al iniciar. Se omitió inicialización de usuario_perfil.');
    return;
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuario_perfil (
        email VARCHAR(255) PRIMARY KEY,
        nombre VARCHAR(200),
        avatar_url TEXT,
        preferencias JSONB DEFAULT '{"bodega_default": "01", "tema": "light"}',
        borrador_despacho JSONB DEFAULT NULL,
        ultimo_acceso TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla usuario_perfil verificada/inicializada en PostgreSQL.');
  } catch (err) {
    console.error('[USUARIO] Error inicializando tabla usuario_perfil:', err.message);
  } finally {
    client.release();
  }
}

/**
 * Obtiene o crea el perfil de usuario a partir de los datos autenticados por Google.
 */
export async function obtenerOCrearPerfil({ email, nombre = '', picture = '' }) {
  if (!email) throw new Error('El email es obligatorio para gestionar el perfil.');

  const client = await getDbClient();
  if (!client) {
    // Modo fallback sin BD
    return {
      email,
      nombre,
      avatar_url: picture,
      preferencias: { bodega_default: '01', tema: 'light' },
      borrador_despacho: null
    };
  }

  try {
    const emailNorm = email.trim().toLowerCase();
    const query = `
      INSERT INTO usuario_perfil (email, nombre, avatar_url, ultimo_acceso)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (email) DO UPDATE SET
        nombre = COALESCE(NULLIF(EXCLUDED.nombre, ''), usuario_perfil.nombre),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), usuario_perfil.avatar_url),
        ultimo_acceso = NOW()
      RETURNING email, nombre, avatar_url, preferencias, borrador_despacho, ultimo_acceso, created_at;
    `;
    const { rows } = await client.query(query, [emailNorm, nombre, picture]);
    return rows[0];
  } catch (err) {
    console.error('[USUARIO] Error en obtenerOCrearPerfil:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Obtiene el perfil de un usuario existente.
 */
export async function obtenerPerfil(email) {
  if (!email) return null;
  const client = await getDbClient();
  if (!client) return null;

  try {
    const emailNorm = email.trim().toLowerCase();
    const { rows } = await client.query(
      'SELECT email, nombre, avatar_url, preferencias, borrador_despacho, ultimo_acceso FROM usuario_perfil WHERE email = $1',
      [emailNorm]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('[USUARIO] Error consultando perfil:', err.message);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Guarda el borrador de despacho para el usuario especificado.
 */
export async function guardarBorradorDespacho(email, borrador) {
  if (!email) throw new Error('Email requerido para guardar borrador.');
  const client = await getDbClient();
  if (!client) return { success: false, offline: true };

  try {
    const emailNorm = email.trim().toLowerCase();
    const borradorConFecha = {
      ...borrador,
      updatedAt: new Date().toISOString()
    };

    await client.query(`
      INSERT INTO usuario_perfil (email, borrador_despacho, ultimo_acceso)
      VALUES ($1, $2, NOW())
      ON CONFLICT (email) DO UPDATE SET
        borrador_despacho = $2,
        ultimo_acceso = NOW();
    `, [emailNorm, JSON.stringify(borradorConFecha)]);

    return { success: true, borrador: borradorConFecha };
  } catch (err) {
    console.error('[USUARIO] Error guardando borrador:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Limpia el borrador de despacho del usuario.
 */
export async function limpiarBorradorDespacho(email) {
  if (!email) return { success: false };
  const client = await getDbClient();
  if (!client) return { success: false };

  try {
    const emailNorm = email.trim().toLowerCase();
    await client.query(
      'UPDATE usuario_perfil SET borrador_despacho = NULL WHERE email = $1',
      [emailNorm]
    );
    return { success: true };
  } catch (err) {
    console.error('[USUARIO] Error limpiando borrador:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Actualiza parcialmente las preferencias del usuario (hace merge JSONB).
 */
export async function actualizarPreferencias(email, nuevasPreferencias) {
  if (!email) throw new Error('Email requerido para actualizar preferencias.');
  const client = await getDbClient();
  if (!client) return { success: false, offline: true };

  try {
    const emailNorm = email.trim().toLowerCase();
    const { rows } = await client.query(`
      UPDATE usuario_perfil
      SET 
        preferencias = COALESCE(preferencias, '{}'::jsonb) || $2::jsonb,
        ultimo_acceso = NOW()
      WHERE email = $1
      RETURNING preferencias;
    `, [emailNorm, JSON.stringify(nuevasPreferencias)]);

    return { success: true, preferencias: rows[0]?.preferencias || nuevasPreferencias };
  } catch (err) {
    console.error('[USUARIO] Error actualizando preferencias:', err.message);
    throw err;
  } finally {
    client.release();
  }
}
