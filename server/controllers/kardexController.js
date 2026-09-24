import {
  procesarKardexExcel,
  buscarFacturaKardex,
  buscarFacturasPorPrefijo,
  obtenerEstadisticasKardex
} from '../services/kardexService.js';
import { getDbClient } from '../config/db.js';

// ============================================================================
// POST /api/kardex/importar
// Recibe el archivo Excel del kardex (multipart) y lo indexa en la DB
// ============================================================================
export async function importarKardex(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Se requiere un archivo Excel (.xlsx o .xls)' });
  }

  const nombreArchivo = req.file.originalname || 'kardex.xlsx';

  try {
    const resultado = await procesarKardexExcel(req.file.buffer, nombreArchivo);
    return res.status(200).json({
      ok: true,
      mensaje: `Kardex importado: ${resultado.filas_procesadas} líneas · ${resultado.facturas_unicas} facturas únicas`,
      ...resultado
    });
  } catch (error) {
    console.error('[KARDEX] Error al importar:', error.message);
    return res.status(400).json({ error: error.message });
  }
}

// ============================================================================
// GET /api/kardex/factura/:numero
// Retorna todos los ítems de una factura específica con datos de cabecera
// ============================================================================
export async function obtenerFactura(req, res) {
  const { numero } = req.params;

  if (!numero || numero.trim().length < 1) {
    return res.status(400).json({ error: 'Número de factura requerido' });
  }

  try {
    const factura = await buscarFacturaKardex(numero.trim());

    if (!factura) {
      return res.status(404).json({
        error: `Factura "${numero}" no encontrada en el kardex.`,
        sugerencia: 'Verifique el número o importe el kardex actualizado.'
      });
    }

    return res.json(factura);
  } catch (error) {
    console.error('[KARDEX] Error buscando factura:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// GET /api/kardex/buscar?q=70058
// Autocomplete: retorna lista de facturas que empiezan con el prefijo dado
// ============================================================================
export async function buscarFacturas(req, res) {
  const q = (req.query.q || '').trim();

  if (q.length < 1) {
    return res.json([]);
  }

  try {
    const sugerencias = await buscarFacturasPorPrefijo(q, 8);
    return res.json(sugerencias);
  } catch (error) {
    console.error('[KARDEX] Error en autocomplete:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// GET /api/kardex/estadisticas
// Resumen del kardex cargado actualmente
// ============================================================================
export async function estadisticasKardex(req, res) {
  try {
    const stats = await obtenerEstadisticasKardex();
    return res.json(stats || { total_lineas: 0, total_facturas: 0 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// DELETE /api/kardex/limpiar
// Limpia todo el kardex cargado (útil antes de reimportar)
// ============================================================================
export async function limpiarKardex(req, res) {
  const client = await getDbClient();
  if (!client) return res.status(500).json({ error: 'BD no disponible' });

  try {
    const { rowCount } = await client.query('DELETE FROM kardex_ventas');
    return res.json({ ok: true, eliminadas: rowCount });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}
