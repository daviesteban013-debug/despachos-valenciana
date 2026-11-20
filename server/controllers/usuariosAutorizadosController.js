import { ApiError } from '../middlewares/errorHandler.js';
import { esAdmin, accesosDeEntorno } from '../middlewares/wmsAuth.js';
import {
  UsuariosError,
  listarUsuarios,
  guardarUsuario,
  cambiarRol as cambiarRolUsuario,
  quitarUsuario
} from '../services/usuariosAutorizadosService.js';

// Todas las rutas: solo administradores (rol decidido en el servidor)
const soloAdmin = (fn) => async (req, res, next) => {
  const email = String(req.user?.email || '').toLowerCase();
  if (!esAdmin(email)) {
    return next(new ApiError(403, 'Solo un administrador puede gestionar los usuarios.'));
  }
  try {
    await fn(req, res, email);
  } catch (err) {
    if (err instanceof UsuariosError) return next(new ApiError(err.statusCode, err.message));
    console.error('[USUARIOS] Error:', err);
    return next(new ApiError(500, err.message));
  }
};

// GET /api/usuarios-autorizados
export const listar = soloAdmin(async (req, res, email) => {
  res.json({ usuarios: await listarUsuarios(), entorno: accesosDeEntorno(), yo: email });
});

// POST /api/usuarios-autorizados  { email, rol }
export const agregar = soloAdmin(async (req, res, email) => {
  const usuario = await guardarUsuario(req.body || {}, email);
  console.info(`[USUARIOS] ${email} ${usuario.nuevo ? 'agregó' : 'actualizó'} ${usuario.email} como ${usuario.rol}`);
  res.status(usuario.nuevo ? 201 : 200).json(usuario);
});

// PATCH /api/usuarios-autorizados/:email  { rol }
export const cambiarRol = soloAdmin(async (req, res, email) => {
  const usuario = await cambiarRolUsuario(req.params.email, req.body?.rol, email);
  console.info(`[USUARIOS] ${email} cambió el rol de ${usuario.email} a ${usuario.rol}`);
  res.json(usuario);
});

// DELETE /api/usuarios-autorizados/:email
export const quitar = soloAdmin(async (req, res, email) => {
  const r = await quitarUsuario(req.params.email, email);
  console.info(`[USUARIOS] ${email} quitó el acceso de ${r.email}`);
  res.json({ ok: true, ...r });
});
