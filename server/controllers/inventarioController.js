import { ApiError } from '../middlewares/errorHandler.js';
import { getDbClient } from '../config/db.js';
import {
  procesarImportacionExcel,
  resolverDiferenciaInventario,
  generarExcelPruebaBuffer
} from '../services/importacionExcelService.js';

// GET /api/inventario?seccion=...&sku=...&buscar=...
export async function listarInventario(req, res, next) {
  const client = await getDbClient();
  try {
    const { seccion, sku, buscar } = req.query;

    let queryArgs = [];
    let whereClauses = [];

    if (sku) {
      queryArgs.push(sku.toUpperCase());
      whereClauses.push(`p.sku = $${queryArgs.length}`);
    }
    if (seccion && seccion !== 'todas') {
      queryArgs.push(seccion);
      whereClauses.push(`p.categoria_slug = $${queryArgs.length}`);
    }
    if (buscar) {
      queryArgs.push(`%${buscar}%`);
      whereClauses.push(`(p.nombre ILIKE $${queryArgs.length} OR p.sku ILIKE $${queryArgs.length} OR p.descripcion ILIKE $${queryArgs.length})`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const { rows: productos } = await client.query(`
      SELECT p.*,
             COALESCE(SUM(s.cantidad), 0)::int AS stock_total
      FROM productos p
      LEFT JOIN inventario_por_bodega s ON p.sku = s.sku
      ${whereString}
      GROUP BY p.sku
      ORDER BY p.sku ASC
    `, queryArgs);

    const { rows: desglose } = await client.query(`
      SELECT s.sku, s.bodega_id, b.codigo AS codigo_bodega, b.nombre AS nombre_bodega, b.seccion_slug, s.cantidad AS cantidad
      FROM inventario_por_bodega s
      JOIN bodegas b ON s.bodega_id = b.id
    `);

    const resultado = productos.map(p => {
      const desg = desglose.filter(d => d.sku === p.sku).map(d => ({
        bodega_id: d.bodega_id,
        codigo_bodega: d.codigo_bodega,
        nombre_bodega: d.nombre_bodega,
        seccion_slug: d.seccion_slug,
        cantidad: d.cantidad
      }));
      
      // Asegurar que bodegas vacías aparezcan con cantidad 0 si se desea
      return {
        ...p,
        stockTotal: p.stock_total,
        stock: p.stock_total,
        desglose_bodegas: desg
      };
    });

    return res.json({
      total: resultado.length,
      productos: resultado
    });
  } catch (error) {
    console.error('Error listando inventario:', error);
    return next(new ApiError(500, error.message));
  } finally {
    if (client) client.release();
  }
}

// GET /api/inventario/:sku
export async function detalleProducto(req, res, next) {
  const client = await getDbClient();
  try {
    const { sku } = req.params;
    
    const { rows: productos } = await client.query(`
      SELECT p.*, COALESCE(SUM(s.cantidad), 0)::int AS stock_total
      FROM productos p
      LEFT JOIN inventario_por_bodega s ON p.sku = s.sku
      WHERE p.sku = $1
      GROUP BY p.sku
    `, [sku.toUpperCase()]);

    if (productos.length === 0) {
      return res.status(404).json({ error: `Producto con SKU "${sku}" no encontrado.` });
    }
    
    const prod = productos[0];

    const { rows: desglose } = await client.query(`
      SELECT s.bodega_id, b.nombre AS nombre_bodega, b.seccion_slug, s.cantidad AS cantidad
      FROM inventario_por_bodega s
      JOIN bodegas b ON s.bodega_id = b.id
      WHERE s.sku = $1
    `, [prod.sku]);

    return res.json({
      ...prod,
      desglose_bodegas: desglose
    });
  } catch (error) {
    console.error('Error obteniendo detalle de producto:', error);
    return next(new ApiError(500, error.message));
  } finally {
    if (client) client.release();
  }
}

// POST /api/inventario/importar (Solo rol admin)
export async function importarExcel(req, res, next) {
  try {
    const rol = req.headers['x-user-role'] || req.body?.rol || 'admin';
    if (rol !== 'admin') {
      return next(new ApiError(403, 'Acceso denegado. Se requiere rol de administrador para importar inventario.'));
    }

    let buffer = null;
    let nombreArchivo = 'importacion_excel.xlsx';

    if (req.file) {
      buffer = req.file.buffer;
      nombreArchivo = req.file.originalname;
    } else if (req.body?.archivoBase64) {
      buffer = Buffer.from(req.body.archivoBase64, 'base64');
      nombreArchivo = req.body.nombreArchivo || 'importacion.xlsx';
    } else {
      return next(new ApiError(400, 'No se recibió ningún archivo Excel (.xlsx).'));
    }

    const resultado = await procesarImportacionExcel(buffer, nombreArchivo, req.headers['x-user-name'] || 'admin');
    return res.json(resultado);
  } catch (error) {
    console.error('Error importando Excel:', error);
    return next(new ApiError(500, error.message));
  }
}

// POST /api/inventario/importar-demo (Generador de prueba con 1 click)
export async function importarDemoExcel(req, res, next) {
  try {
    const rol = req.headers['x-user-role'] || 'admin';
    if (rol !== 'admin') {
      return next(new ApiError(403, 'Acceso denegado. Se requiere rol de administrador.'));
    }

    const bufferPrueba = await generarExcelPruebaBuffer();
    const resultado = await procesarImportacionExcel(bufferPrueba, 'ERP_Valenciana_Simulado.xlsx', 'admin_demo');
    return res.json(resultado);
  } catch (error) {
    console.error('Error procesando importación demo:', error);
    return next(new ApiError(500, error.message));
  }
}

// GET /api/inventario/diferencias (Solo rol admin)
export async function listarDiferencias(req, res, next) {
  const client = await getDbClient();
  try {
    const rol = req.headers['x-user-role'] || 'admin';
    if (rol !== 'admin') {
      return next(new ApiError(403, 'Acceso denegado. Solo administradores pueden ver diferencias de inventario.'));
    }

    const { rows: pendientes } = await client.query("SELECT * FROM diferencias_inventario WHERE estado = 'pendiente' ORDER BY created_at DESC");
    const { rows: historial } = await client.query("SELECT * FROM diferencias_inventario WHERE estado != 'pendiente' ORDER BY resuelto_en DESC");
    const { rows: importaciones } = await client.query("SELECT * FROM importaciones_inventario ORDER BY fecha DESC");

    return res.json({
      pendientes,
      historial,
      importaciones
    });
  } catch (error) {
    console.error('Error listando diferencias:', error);
    return next(new ApiError(500, error.message));
  } finally {
    if (client) client.release();
  }
}

// POST /api/inventario/diferencias/:id/resolver (Solo rol admin)
export async function resolverDiferencia(req, res, next) {
  try {
    const rol = req.headers['x-user-role'] || 'admin';
    if (rol !== 'admin') {
      return next(new ApiError(403, 'Acceso denegado. Solo administradores pueden resolver diferencias.'));
    }

    const { id } = req.params;
    const { accion } = req.body; // 'aplicar' | 'descartar'

    if (!accion || !['aplicar', 'descartar'].includes(accion)) {
      return next(new ApiError(400, 'Debe especificar la acción: "aplicar" o "descartar".'));
    }

    const resuelta = await resolverDiferenciaInventario(
      id,
      accion,
      req.headers['x-user-name'] || 'admin'
    );

    return res.json({
      mensaje: `Diferencia ${id} resuelta como "${resuelta.estado}".`,
      diferencia: resuelta
    });
  } catch (error) {
    console.error('Error resolviendo diferencia:', error);
    return next(new ApiError(400, error.message));
  }
}
