import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { requireWmsAuth } from './middlewares/wmsAuth.js';
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
  syncExcelDirecto
} from './controllers/wmsController.js';
import {
  importarKardex,
  obtenerFactura,
  buscarFacturas,
  estadisticasKardex,
  limpiarKardex
} from './controllers/kardexController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de Servidor HTTP y WebSockets (Socket.io)
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*', // Permitir Vercel y Localhost
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
  }
});

io.on('connection', (socket) => {
  console.log('🔗 Cliente conectado a WebSockets:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Configuración de Multer para carga de archivos Excel en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // Hasta 15MB
});

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-name']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ----------------------------------------------------------------------------
// RUTAS DE SALUD Y AUDITORÍA
// ----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    servicio: 'La Valenciana FERREHOGAR - API Backend',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV || 'production-cloud',
    conexion_db: process.env.DATABASE_URL ? 'Tunel VPN WireGuard/Tailscale a PostgreSQL' : 'Motor Relacional Integrado'
  });
});

// ----------------------------------------------------------------------------
// RUTAS DE GESTIÓN DE INVENTARIO
// ----------------------------------------------------------------------------
app.get('/api/inventario', listarInventario);
app.get('/api/inventario/diferencias', listarDiferencias);
app.post('/api/inventario/diferencias/:id/resolver', resolverDiferencia);
app.post('/api/inventario/importar', upload.single('archivo'), importarExcel);
app.post('/api/inventario/importar-demo', importarDemoExcel);
app.get('/api/inventario/:sku', detalleProducto);

// ----------------------------------------------------------------------------
// RUTAS DE FACTURACIÓN Y MOSTRADOR
// ----------------------------------------------------------------------------
app.get('/api/facturas', listarFacturas);
app.post('/api/facturas', crearFactura);
app.patch('/api/facturas/:id/estado', cambiarEstadoFactura);

// ----------------------------------------------------------------------------
// RUTAS DE WMS DESPACHO A DOMICILIO (MODELO SIMPLIFICADO 2 ESTADOS + ONEDRIVE)
// ----------------------------------------------------------------------------
// Aplicar seguridad JWT a todas las rutas WMS
app.use('/api/despachos', requireWmsAuth);
app.use('/api/devoluciones', requireWmsAuth);
app.get('/api/despachos', listarDespachos);
app.post('/api/despachos', crearDespacho);
app.get('/api/despachos/exportar-plantilla', exportarPlantillaExcel);
app.patch('/api/despachos/:id/estado', cambiarEstadoDespacho);
app.post('/api/despachos/:id/reintentar-sync', reintentarSincronizacionDrive);
app.post('/api/despachos/:id/incidencia', gestionarIncidenciaDespacho);
app.post('/api/despachos/cargar-plantilla-referencia', upload.single('archivo'), cargarPlantillaReferenciaController);

// Ruta especial: sync Excel directo SIN depender de PostgreSQL
// No usa requireWmsAuth para que funcione incluso en modo offline
app.post('/api/despachos/sync-excel-directo', syncExcelDirecto);

// Rutas Logística Inversa (Devoluciones)
app.get('/api/devoluciones', listarDevoluciones);
app.patch('/api/devoluciones/:id/procesar', procesarDevolucion);

// ----------------------------------------------------------------------------
// RUTAS DE KARDEX ERP (IMPORTACIÓN Y BÚSQUEDA DE FACTURAS)
// Permite cargar el Excel de ventas del ERP y buscar facturas por número
// para pre-llenar el modal de creación de despachos automáticamente.
// ----------------------------------------------------------------------------
app.post('/api/kardex/importar', upload.single('archivo'), importarKardex);
app.get('/api/kardex/buscar', buscarFacturas);
app.get('/api/kardex/estadisticas', estadisticasKardex);
app.delete('/api/kardex/limpiar', limpiarKardex);
app.get('/api/kardex/factura/:numero', obtenerFactura);


// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error no capturado en API:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Error interno en el servidor de inventario.',
    detalles: err.detalles || null
  });
});

// Iniciar servidor si se ejecuta directamente
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor API corriendo en puerto ${PORT}`);
    console.log(`📡 WebSockets inicializados exitosamente`);
    console.log(`📡 Endpoints WMS Seguros en http://localhost:${PORT}/api/despachos`);
  });
}

export default app;
