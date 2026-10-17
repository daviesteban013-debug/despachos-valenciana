import { ApiError } from '../middlewares/errorHandler.js';
import { esAdmin } from '../middlewares/wmsAuth.js';
import {
  CuadreError,
  listarBodegas,
  buscarArticulos,
  listarJornadas,
  obtenerJornada,
  crearJornada,
  actualizarJornada,
  importarArticulos,
  importarExistencias,
  listarPlanillas,
  crearPlanilla,
  obtenerPlanilla,
  actualizarPlanilla,
  agregarLinea,
  actualizarLinea,
  eliminarLinea,
  obtenerCuadre,
  crearReconteo,
  exportarCuadreExcel
} from '../services/cuadreService.js';

// Usuario autenticado (Google) con su rol decidido en el servidor
function usuarioDe(req) {
  const email = String(req.user?.email || '').toLowerCase();
  return { email, nombre: req.user?.name || email, esAdmin: esAdmin(email) };
}

function idNumerico(valor, nombre = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new CuadreError(400, `${nombre} inválido.`);
  return n;
}

function exigirAdmin(req) {
  if (!usuarioDe(req).esAdmin) {
    throw new CuadreError(403, 'Solo un administrador puede hacer esta operación.');
  }
}

// Envuelve cada controlador: errores de negocio → su código HTTP
const manejar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof CuadreError) return next(new ApiError(err.statusCode, err.message));
    if (typeof err.code === 'string' && (err.code.startsWith('22') || err.code.startsWith('23'))) {
      return next(new ApiError(400, `Datos inválidos: ${err.message}`));
    }
    console.error('[CUADRE] Error:', err);
    return next(new ApiError(500, err.message));
  }
};

export const permisos = manejar(async (req, res) => {
  const u = usuarioDe(req);
  res.json({ email: u.email, nombre: u.nombre, es_admin: u.esAdmin });
});

export const bodegas = manejar(async (req, res) => {
  res.json(await listarBodegas());
});

export const articulos = manejar(async (req, res) => {
  res.json(await buscarArticulos(req.query.q, req.query.limite));
});

export const jornadas = manejar(async (req, res) => {
  res.json(await listarJornadas());
});

export const jornada = manejar(async (req, res) => {
  res.json(await obtenerJornada(idNumerico(req.params.id)));
});

export const nuevaJornada = manejar(async (req, res) => {
  exigirAdmin(req);
  res.status(201).json(await crearJornada(req.body || {}, usuarioDe(req).email));
});

export const editarJornada = manejar(async (req, res) => {
  exigirAdmin(req);
  res.json(await actualizarJornada(idNumerico(req.params.id), req.body || {}));
});

// POST /api/cuadre/jornadas/:id/importar  (multipart: articulos y/o existencias)
export const importar = manejar(async (req, res) => {
  exigirAdmin(req);
  const id = idNumerico(req.params.id);
  const archivoArticulos = req.files?.articulos?.[0];
  const archivoExistencias = req.files?.existencias?.[0];
  if (!archivoArticulos && !archivoExistencias) {
    throw new CuadreError(400, 'Adjunta el Excel de artículos y/o el de existencias del TNS.');
  }
  const resultado = {};
  // Los artículos van primero: las existencias se validan contra ellos
  if (archivoArticulos) resultado.articulos = await importarArticulos(archivoArticulos.buffer);
  if (archivoExistencias) {
    resultado.existencias = await importarExistencias(id, archivoExistencias.buffer, archivoExistencias.originalname);
  }
  res.json(resultado);
});

export const planillas = manejar(async (req, res) => {
  res.json(await listarPlanillas(idNumerico(req.params.id)));
});

export const nuevaPlanilla = manejar(async (req, res) => {
  res.status(201).json(await crearPlanilla(idNumerico(req.params.id), req.body || {}, usuarioDe(req)));
});

export const planilla = manejar(async (req, res) => {
  res.json(await obtenerPlanilla(idNumerico(req.params.id)));
});

export const editarPlanilla = manejar(async (req, res) => {
  res.json(await actualizarPlanilla(idNumerico(req.params.id), req.body || {}, usuarioDe(req)));
});

export const nuevaLinea = manejar(async (req, res) => {
  res.status(201).json(await agregarLinea(idNumerico(req.params.id), req.body || {}, usuarioDe(req)));
});

export const editarLinea = manejar(async (req, res) => {
  res.json(await actualizarLinea(idNumerico(req.params.id), req.body || {}, usuarioDe(req)));
});

export const borrarLinea = manejar(async (req, res) => {
  res.json(await eliminarLinea(idNumerico(req.params.id), usuarioDe(req)));
});

export const cuadre = manejar(async (req, res) => {
  res.json(await obtenerCuadre(idNumerico(req.params.id), req.query));
});

export const nuevoReconteo = manejar(async (req, res) => {
  exigirAdmin(req);
  res.status(201).json(await crearReconteo(idNumerico(req.params.id), req.body || {}, usuarioDe(req)));
});

export const exportar = manejar(async (req, res) => {
  const { buffer, nombre } = await exportarCuadreExcel(idNumerico(req.params.id));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  res.send(buffer);
});
