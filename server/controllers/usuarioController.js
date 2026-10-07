import { ApiError } from '../middlewares/errorHandler.js';
import {
  obtenerOCrearPerfil,
  obtenerPerfil,
  guardarBorradorDespacho,
  limpiarBorradorDespacho,
  actualizarPreferencias
} from '../services/usuarioService.js';

/**
 * GET /api/usuario/perfil
 * Obtiene el perfil del usuario autenticado (incluye preferencias y borrador activo).
 */
export async function obtenerPerfilController(req, res, next) {
  try {
    const email = req.user?.email;
    if (!email) return next(new ApiError(401, 'Usuario no autenticado.'));

    let perfil = await obtenerPerfil(email);
    if (!perfil) {
      perfil = await obtenerOCrearPerfil({
        email,
        nombre: req.user.name || '',
        picture: req.user.picture || ''
      });
    }

    return res.json({
      success: true,
      perfil
    });
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
}

/**
 * GET /api/usuario/borrador
 * Obtiene el borrador activo de despacho del usuario.
 */
export async function obtenerBorradorController(req, res, next) {
  try {
    const email = req.user?.email;
    if (!email) return next(new ApiError(401, 'Usuario no autenticado.'));

    const perfil = await obtenerPerfil(email);
    return res.json({
      success: true,
      borrador: perfil?.borrador_despacho || null
    });
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
}

/**
 * PUT /api/usuario/borrador
 * Guarda o actualiza el borrador de despacho del usuario.
 */
export async function guardarBorradorController(req, res, next) {
  try {
    const email = req.user?.email;
    if (!email) return next(new ApiError(401, 'Usuario no autenticado.'));

    const borrador = req.body.borrador || req.body;
    const resultado = await guardarBorradorDespacho(email, borrador);

    return res.json({
      success: true,
      mensaje: 'Borrador guardado exitosamente.',
      borrador: resultado.borrador
    });
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
}

/**
 * DELETE /api/usuario/borrador
 * Limpia el borrador de despacho del usuario.
 */
export async function limpiarBorradorController(req, res, next) {
  try {
    const email = req.user?.email;
    if (!email) return next(new ApiError(401, 'Usuario no autenticado.'));

    await limpiarBorradorDespacho(email);

    return res.json({
      success: true,
      mensaje: 'Borrador eliminado exitosamente.'
    });
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
}

/**
 * PATCH /api/usuario/preferencias
 * Actualiza las preferencias del usuario.
 */
export async function actualizarPreferenciasController(req, res, next) {
  try {
    const email = req.user?.email;
    if (!email) return next(new ApiError(401, 'Usuario no autenticado.'));

    const preferencias = req.body.preferencias || req.body;
    const resultado = await actualizarPreferencias(email, preferencias);

    return res.json({
      success: true,
      preferencias: resultado.preferencias
    });
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
}
