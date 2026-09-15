import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
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
  reintentarSincronizacionOneDrive,
  gestionarIncidenciaDespacho,
  exportarPlantillaExcel,
  cargarPlantillaReferenciaController
} from './controllers/wmsController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
app.get('/api/despachos', listarDespachos);
app.post('/api/despachos', crearDespacho);
app.get('/api/despachos/exportar-plantilla', exportarPlantillaExcel);
app.patch('/api/despachos/:id/estado', cambiarEstadoDespacho);
app.post('/api/despachos/:id/reintentar-onedrive', reintentarSincronizacionOneDrive);
app.post('/api/despachos/:id/incidencia', gestionarIncidenciaDespacho);
app.post('/api/despachos/cargar-plantilla-referencia', upload.single('archivo'), cargarPlantillaReferenciaController);

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
  app.listen(PORT, () => {
    console.log(`🚀 Servidor API de Inventario corriendo en puerto ${PORT}`);
    console.log(`📡 Endpoints disponibles en http://localhost:${PORT}/api/inventario`);
  });
}

export default app;
