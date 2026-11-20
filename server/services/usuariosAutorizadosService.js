import { getDbClient } from '../config/db.js';
import { ROLES_USUARIO, recargarUsuariosAutorizados } from '../middlewares/wmsAuth.js';

// ============================================================================
// Gestión de usuarios autorizados (tabla usuarios_autorizados).
// Quién puede entrar a la app y con qué rol: CONTADOR o ADMIN.
// ============================================================================

export class UsuariosError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(e) || e.length > 255) throw new UsuariosError(400, 'Escribe un correo válido.');
  return e;
}

function validarRol(rol) {
  const r = String(rol || '').trim().toUpperCase();
  if (!ROLES_USUARIO.includes(r)) throw new UsuariosError(400, 'El rol debe ser CONTADOR o ADMIN.');
  return r;
}

async function conCliente(fn) {
  const client = await getDbClient();
  if (!client) throw new UsuariosError(500, 'Base de datos no disponible');
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export function listarUsuarios() {
  return conCliente(async (c) => {
    const { rows } = await c.query(`
      SELECT email, rol, agregado_por, agregado_en, actualizado_por, actualizado_en
      FROM usuarios_autorizados
      ORDER BY (rol = 'ADMIN') DESC, email
    `);
    return rows;
  });
}

/** Agrega un correo o, si ya existe, actualiza su rol. */
export async function guardarUsuario({ email, rol }, quien) {
  const e = normalizarEmail(email);
  const r = validarRol(rol || 'CONTADOR');
  if (e === quien) throw new UsuariosError(400, 'No puedes cambiar tu propio acceso.');
  const fila = await conCliente(async (c) => {
    const { rows } = await c.query(`
      INSERT INTO usuarios_autorizados (email, rol, agregado_por)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET rol = EXCLUDED.rol, actualizado_por = $3, actualizado_en = NOW()
      RETURNING email, rol, agregado_por, agregado_en, actualizado_por, actualizado_en, (xmax = 0) AS nuevo
    `, [e, r, quien]);
    return rows[0];
  });
  await recargarUsuariosAutorizados();
  return fila;
}

export async function cambiarRol(email, rol, quien) {
  const e = normalizarEmail(email);
  const r = validarRol(rol);
  if (e === quien) throw new UsuariosError(400, 'No puedes cambiar tu propio rol.');
  const fila = await conCliente(async (c) => {
    const { rows } = await c.query(`
      UPDATE usuarios_autorizados SET rol = $2, actualizado_por = $3, actualizado_en = NOW()
      WHERE email = $1
      RETURNING email, rol, agregado_por, agregado_en, actualizado_por, actualizado_en
    `, [e, r, quien]);
    if (rows.length === 0) throw new UsuariosError(404, 'Ese correo no está en la lista.');
    return rows[0];
  });
  await recargarUsuariosAutorizados();
  return fila;
}

export async function quitarUsuario(email, quien) {
  const e = normalizarEmail(email);
  if (e === quien) throw new UsuariosError(400, 'No puedes quitarte tu propio acceso.');
  await conCliente(async (c) => {
    const { rowCount } = await c.query('DELETE FROM usuarios_autorizados WHERE email = $1', [e]);
    if (rowCount === 0) throw new UsuariosError(404, 'Ese correo no está en la lista.');
  });
  await recargarUsuariosAutorizados();
  return { email: e };
}
