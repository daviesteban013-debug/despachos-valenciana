import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { requireWmsAuth, esAdmin, adminEmailsConfigurados, inicializarAdminsBaseDatos } from './middlewares/wmsAuth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import {
  listarInventario,
  detalleProducto,
  importarExcel,
  listarDiferencias,
  resolverDiferencia
} from './controllers/inventarioController.js';
import {
  listarFacturas,
  crearFactura,
  cambiarEstadoFactura
} from './controllers/facturasController.js';
import {
  listarDespachos,
  crearDespacho,
  cambiarEstadoDespacho,
  exportarPlantillaExcel,
  gestionarIncidenciaDespacho,
  reintentarSincronizacionDrive,
  cargarPlantillaReferenciaController,
  listarDevoluciones,
  procesarDevolucion,
  syncExcelDirecto,
  eliminarDespacho
} from './controllers/wmsController.js';
import {
  importarKardex,
  obtenerFactura,
  buscarFacturas,
  estadisticasKardex,
  limpiarKardex
} from './controllers/kardexController.js';
import {
  listarVehiculosController,
  crearVehiculoController
} from './controllers/vehiculosController.js';
import { inicializarTablaVehiculos } from './services/vehiculosService.js';
import { inicializarColumnasDespachos } from './services/syncDespachoExcelService.js';
import {
  obtenerPerfilController,
  obtenerBorradorController,
  guardarBorradorController,
  limpiarBorradorController,
  actualizarPreferenciasController
} from './controllers/usuarioController.js';
import { inicializarTablaUsuarioPerfil, obtenerOCrearPerfil } from './services/usuarioService.js';
import { inicializarTablasCuadre } from './services/cuadreService.js';
import * as cuadre from './controllers/cuadreController.js';

dotenv.config();

// Inicialización de esquemas persistentes
inicializarTablaVehiculos();
inicializarTablaUsuarioPerfil();
inicializarColumnasDespachos();
inicializarTablasCuadre();
inicializarAdminsBaseDatos();

// ──────────────────────────────────────────────────────────────────────────────
// CORS: leer orígenes desde env. En desarrollo se agrega localhost:5173.
// ──────────────────────────────────────────────────────────────────────────────
const rawCorsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  rawCorsOrigins.push('http://localhost:5173', 'http://localhost:3000');
}
if (rawCorsOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn('[CORS] ⚠️  CORS_ORIGINS no definida en producción. Todas las peticiones cross-origin serán bloqueadas.');
}
const allowedOrigins = [...new Set(rawCorsOrigins)];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite peticiones sin Origin (curl, Postman, misma origin en SSR)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-name'],
  credentials: true
};

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN_EMAILS: lista de correos con permisos para rutas destructivas.
// Si no está definida, las rutas destructivas deniegan siempre.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Middleware: exige que el usuario ya autenticado esté en ADMIN_EMAILS.
 * Debe usarse DESPUÉS de requireWmsAuth.
 */
const requireAdminAuth = (req, res, next) => {
  if (adminEmailsConfigurados() === 0) {
    return res.status(403).json({
      error: 'Acción no disponible: ADMIN_EMAILS no está configurada. Contacta al administrador.'
    });
  }
  const email = (req.user?.email || '').toLowerCase();
  if (!esAdmin(email)) {
    console.warn(`[adminAuth] Acceso denegado (403) a ruta de admin para: ${email}`);
    return res.status(403).json({
      error: 'Tu cuenta no tiene permisos de administrador para esta operación.'
    });
  }
  next();
};

// ──────────────────────────────────────────────────────────────────────────────
// RATE LIMITING
// ──────────────────────────────────────────────────────────────────────────────
/** Límite global: 200 req / 15 minutos por IP */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' }
});

/** Límite estricto para rutas destructivas: 20 req / 15 minutos por IP */
const destructiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de operaciones destructivas alcanzado. Intenta de nuevo en 15 minutos.' }
});

// ──────────────────────────────────────────────────────────────────────────────
// APP Y HTTP SERVER
// ──────────────────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
  }
});

io.on('connection', (socket) => {
  console.log('🔗 Cliente conectado a WebSockets:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// MIDDLEWARES GLOBALES
// ──────────────────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.use(globalLimiter);

// Límite de tamaño de body razonable (evita ataques de body flooding)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Configuración de Multer para carga de archivos Excel en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // Hasta 15MB
});

// ──────────────────────────────────────────────────────────────────────────────
// WHITELIST PÚBLICA: rutas que no requieren autenticación
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    servicio: 'La Valenciana FERREHOGAR - API Backend',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV || 'production-cloud',
    conexion_db: process.env.DATABASE_URL ? 'Configurada' : 'No configurada'
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// AUTENTICACIÓN GLOBAL: todas las rutas /api/* (excepto whitelist arriba)
// ──────────────────────────────────────────────────────────────────────────────
app.use('/api', requireWmsAuth);

// Verificación de credenciales / sesión del usuario autenticado
app.get('/api/auth/verify', async (req, res) => {
  try {
    const perfil = await obtenerOCrearPerfil({
      email: req.user.email,
      nombre: req.user.name,
      picture: req.user.picture
    });

    res.json({
      ok: true,
      user: {
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture,
        preferencias: perfil.preferencias || {},
        borrador_despacho: perfil.borrador_despacho || null
      }
    });
  } catch (error) {
    console.warn('[AUTH] Error obteniendo perfil en /api/auth/verify (usando fallback seguro):', error.message);
    res.json({
      ok: true,
      user: {
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture,
        preferencias: {},
        borrador_despacho: null
      }
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// RUTAS DE PERFIL, PREFERENCIAS Y BORRADORES DE USUARIO (POSTGRESQL)
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/usuario/perfil', obtenerPerfilController);
app.get('/api/usuario/borrador', obtenerBorradorController);
app.put('/api/usuario/borrador', guardarBorradorController);
app.delete('/api/usuario/borrador', limpiarBorradorController);
app.patch('/api/usuario/preferencias', actualizarPreferenciasController);

// ──────────────────────────────────────────────────────────────────────────────
// RUTAS DE GESTIÓN DE INVENTARIO
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/inventario', listarInventario);
app.get('/api/inventario/diferencias', listarDiferencias);
app.post('/api/inventario/diferencias/:id/resolver', resolverDiferencia);
// Importación de inventario: solo administradores (ADMIN_EMAILS, validado en el controlador)
app.post('/api/inventario/importar', destructiveLimiter, upload.single('archivo'), importarExcel);
app.get('/api/inventario/:sku', detalleProducto);

// ──────────────────────────────────────────────────────────────────────────────
// RUTAS DE CUADRE DE INVENTARIO (toma física anual: conteo, reconteo y cuadre)
// Escritura de jornadas, importación y reconteos: solo ADMIN_EMAILS (validado en el controlador)
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/cuadre/permisos', cuadre.permisos);
app.get('/api/cuadre/bodegas', cuadre.bodegas);
app.get('/api/cuadre/articulos', cuadre.articulos);
app.get('/api/cuadre/jornadas', cuadre.jornadas);
app.post('/api/cuadre/jornadas', cuadre.nuevaJornada);
app.get('/api/cuadre/jornadas/:id', cuadre.jornada);
app.patch('/api/cuadre/jornadas/:id', cuadre.editarJornada);
app.post(
  '/api/cuadre/jornadas/:id/importar',
  destructiveLimiter,
  upload.fields([{ name: 'articulos', maxCount: 1 }, { name: 'existencias', maxCount: 1 }]),
  cuadre.importar
);
app.get('/api/cuadre/jornadas/:id/planillas', cuadre.planillas);
app.post('/api/cuadre/jornadas/:id/planillas', cuadre.nuevaPlanilla);
app.get('/api/cuadre/jornadas/:id/cuadre', cuadre.cuadre);
app.post('/api/cuadre/jornadas/:id/reconteos', cuadre.nuevoReconteo);
app.get('/api/cuadre/jornadas/:id/exportar', cuadre.exportar);
app.get('/api/cuadre/planillas/:id', cuadre.planilla);
app.patch('/api/cuadre/planillas/:id', cuadre.editarPlanilla);
app.post('/api/cuadre/planillas/:id/lineas', cuadre.nuevaLinea);
app.patch('/api/cuadre/lineas/:id', cuadre.editarLinea);
app.delete('/api/cuadre/lineas/:id', cuadre.borrarLinea);

// ──────────────────────────────────────────────────────────────────────────────
// RUTAS DE FACTURACIÓN Y MOSTRADOR
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/facturas', listarFacturas);
app.post('/api/facturas', crearFactura);
app.patch('/api/facturas/:id/estado', cambiarEstadoFactura);

// ──────────────────────────────────────────────────────────────────────────────
// RUTAS DE WMS DESPACHO A DOMICILIO
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/despachos', listarDespachos);
app.post('/api/despachos', crearDespacho);
app.get('/api/despachos/exportar-plantilla', exportarPlantillaExcel);
app.patch('/api/despachos/:id/estado', cambiarEstadoDespacho);
app.delete('/api/despachos/:id', destructiveLimiter, eliminarDespacho);
app.post('/api/despachos/:id/reintentar-sync', reintentarSincronizacionDrive);
app.post('/api/despachos/:id/incidencia', gestionarIncidenciaDespacho);
app.post('/api/despachos/cargar-plantilla-referencia', upload.single('archivo'), cargarPlantillaReferenciaController);

// Ruta de sync Excel: era pública "para modo offline". Ahora requiere auth + admin
// (ya está bajo el middleware global /api). El cliente siempre tiene token en sesión.
app.post('/api/despachos/sync-excel-directo', destructiveLimiter, requireAdminAuth, syncExcelDirecto);

// Rutas Logística Inversa (Devoluciones)
app.get('/api/devoluciones', listarDevoluciones);
app.patch('/api/devoluciones/:id/procesar', procesarDevolucion);

// ──────────────────────────────────────────────────────────────────────────────
// RUTAS DE GESTIÓN DE VEHÍCULOS / FLOTA WMS (SYNC EXCEL)
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/vehiculos', listarVehiculosController);
app.post('/api/vehiculos', crearVehiculoController);

// ──────────────────────────────────────────────────────────────────────────────
// RUTAS DE KARDEX ERP
// ──────────────────────────────────────────────────────────────────────────────
// Rutas de lectura: cualquier usuario autenticado
app.get('/api/kardex/buscar', buscarFacturas);
app.get('/api/kardex/estadisticas', estadisticasKardex);
app.get('/api/kardex/factura/:numero', obtenerFactura);

// Rutas de gestión de kardex: cualquier usuario autenticado en WMS
app.post('/api/kardex/importar', destructiveLimiter, upload.single('archivo'), importarKardex);
app.delete('/api/kardex/limpiar', destructiveLimiter, upload.none?.() || ((req, res, next) => next()), limpiarKardex);

// ──────────────────────────────────────────────────────────────────────────────
// ERRORES Y 404
// ──────────────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

// ──────────────────────────────────────────────────────────────────────────────
// INICIO
// ──────────────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor API corriendo en puerto ${PORT}`);
    console.log(`📡 WebSockets inicializados exitosamente`);
    console.log(`📡 Endpoints WMS Seguros en http://localhost:${PORT}/api/despachos`);
    console.log(`🔒 CORS Origins: ${allowedOrigins.join(', ') || '(ninguno en producción)'}`);
    console.log(`🔒 Admin Emails configurados: ${adminEmailsConfigurados()}`);
    inicializarTablaVehiculos().catch(e => console.warn('[VEHICULOS] Init warning:', e.message));
  });
}

export default app;
