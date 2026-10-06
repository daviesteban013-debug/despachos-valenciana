import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { requireWmsAuth } from './middlewares/wmsAuth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import {
  listarInventario,
  detalleProducto,
  importarExcel,
  importarDemoExcel,
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

dotenv.config();

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
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Middleware: exige que el usuario ya autenticado esté en ADMIN_EMAILS.
 * Debe usarse DESPUÉS de requireWmsAuth.
 */
const requireAdminAuth = (req, res, next) => {
  if (ADMIN_EMAILS.length === 0) {
    return res.status(403).json({
      error: 'Acción no disponible: ADMIN_EMAILS no está configurada. Contacta al administrador.'
    });
  }
  const email = (req.user?.email || '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) {
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
app.get('/api/auth/verify', (req, res) => {
  res.json({
    ok: true,
    user: {
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// RUTAS DE GESTIÓN DE INVENTARIO
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/inventario', listarInventario);
app.get('/api/inventario/diferencias', listarDiferencias);
app.post('/api/inventario/diferencias/:id/resolver', resolverDiferencia);
// Ruta destructiva/importación → requiere admin
app.post('/api/inventario/importar', destructiveLimiter, requireAdminAuth, upload.single('archivo'), importarExcel);
app.post('/api/inventario/importar-demo', importarDemoExcel);
app.get('/api/inventario/:sku', detalleProducto);

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
app.delete('/api/despachos/:id', eliminarDespacho);
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

// Rutas destructivas/importación → requieren admin
app.post('/api/kardex/importar', destructiveLimiter, requireAdminAuth, upload.single('archivo'), importarKardex);
app.delete('/api/kardex/limpiar', destructiveLimiter, requireAdminAuth, limpiarKardex);

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
    console.log(`🔒 Admin Emails configurados: ${ADMIN_EMAILS.length}`);
    inicializarTablaVehiculos().catch(e => console.warn('[VEHICULOS] Init warning:', e.message));
  });
}

export default app;
