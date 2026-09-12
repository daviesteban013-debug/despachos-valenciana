import { dbMemoria } from '../config/db.js';
import {
  procesarImportacionExcel,
  resolverDiferenciaInventario,
  generarExcelPruebaBuffer
} from '../services/importacionExcelService.js';

// GET /api/inventario?seccion=...&sku=...&buscar=...
export async function listarInventario(req, res) {
  try {
    const { seccion, sku, buscar } = req.query;

    let resultado = [];

    // Mapear cada producto con su stock total y desglose por bodega
    for (const [s, prod] of dbMemoria.productos.entries()) {
      // Filtro por SKU exacto
      if (sku && s.toUpperCase() !== sku.toUpperCase()) {
        continue;
      }

      // Filtro por sección/categoría
      if (seccion && seccion !== 'todas' && prod.categoria_slug !== seccion) {
        continue;
      }

      // Filtro por búsqueda de texto (nombre, SKU, descripción)
      if (buscar) {
        const q = buscar.toLowerCase();
        const coincide =
          prod.nombre.toLowerCase().includes(q) ||
          prod.sku.toLowerCase().includes(q) ||
          (prod.descripcion && prod.descripcion.toLowerCase().includes(q));
        if (!coincide) continue;
      }

      // Desglose por bodega
      const desgloseBodegas = dbMemoria.bodegas.map((b) => {
        const stockFila = dbMemoria.obtenerStockFila(prod.sku, b.id);
        return {
          bodega_id: b.id,
          codigo_bodega: b.codigo,
          nombre_bodega: b.nombre,
          seccion_slug: b.seccion_slug,
          cantidad: stockFila ? stockFila.cantidad : 0
        };
      });

      const stockTotal = desgloseBodegas.reduce((acc, b) => acc + b.cantidad, 0);

      resultado.push({
        ...prod,
        stock_total: stockTotal,
        stockTotal: stockTotal,
        stock: stockTotal,
        desglose_bodegas: desgloseBodegas
      });
    }

    // Ordenar alfabéticamente por SKU
    resultado.sort((a, b) => a.sku.localeCompare(b.sku));

    return res.json({
      total: resultado.length,
      productos: resultado
    });
  } catch (error) {
    console.error('Error listando inventario:', error);
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/inventario/:sku
export async function detalleProducto(req, res) {
  try {
    const { sku } = req.params;
    const prod = dbMemoria.productos.get(sku.toUpperCase());

    if (!prod) {
      return res.status(404).json({ error: `Producto con SKU "${sku}" no encontrado.` });
    }

    const desgloseBodegas = dbMemoria.bodegas.map((b) => {
      const stockFila = dbMemoria.obtenerStockFila(prod.sku, b.id);
      return {
        bodega_id: b.id,
        nombre_bodega: b.nombre,
        seccion_slug: b.seccion_slug,
        cantidad: stockFila ? stockFila.cantidad : 0
      };
    });

    const stockTotal = desgloseBodegas.reduce((acc, b) => acc + b.cantidad, 0);

    return res.json({
      ...prod,
      stock_total: stockTotal,
      desglose_bodegas: desgloseBodegas
    });
  } catch (error) {
    console.error('Error obteniendo detalle de producto:', error);
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/inventario/importar (Solo rol admin)
export async function importarExcel(req, res) {
  try {
    const rol = req.headers['x-user-role'] || req.body?.rol || 'admin';
    if (rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador para importar inventario.' });
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
      return res.status(400).json({ error: 'No se recibió ningún archivo Excel (.xlsx).' });
    }

    const resultado = await procesarImportacionExcel(buffer, nombreArchivo, req.headers['x-user-name'] || 'admin');
    return res.json(resultado);
  } catch (error) {
    console.error('Error importando Excel:', error);
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/inventario/importar-demo (Generador de prueba con 1 click)
export async function importarDemoExcel(req, res) {
  try {
    const rol = req.headers['x-user-role'] || 'admin';
    if (rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }

    const bufferPrueba = generarExcelPruebaBuffer();
    const resultado = await procesarImportacionExcel(bufferPrueba, 'ERP_Valenciana_Simulado.xlsx', 'admin_demo');
    return res.json(resultado);
  } catch (error) {
    console.error('Error procesando importación demo:', error);
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/inventario/diferencias (Solo rol admin)
export async function listarDiferencias(req, res) {
  try {
    const rol = req.headers['x-user-role'] || 'admin';
    if (rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden ver diferencias de inventario.' });
    }

    const pendientes = dbMemoria.diferencias.filter((d) => d.estado === 'pendiente');
    const historial = dbMemoria.diferencias.filter((d) => d.estado !== 'pendiente');
    const importaciones = [...dbMemoria.importaciones].reverse();

    return res.json({
      pendientes,
      historial,
      importaciones
    });
  } catch (error) {
    console.error('Error listando diferencias:', error);
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/inventario/diferencias/:id/resolver (Solo rol admin)
export async function resolverDiferencia(req, res) {
  try {
    const rol = req.headers['x-user-role'] || 'admin';
    if (rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden resolver diferencias.' });
    }

    const { id } = req.params;
    const { accion } = req.body; // 'aplicar' | 'descartar'

    if (!accion || !['aplicar', 'descartar'].includes(accion)) {
      return res.status(400).json({ error: 'Debe especificar la acción: "aplicar" o "descartar".' });
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
    return res.status(400).json({ error: error.message });
  }
}
