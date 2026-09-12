import { dbMemoria } from '../config/db.js';
import { descontarInventario, StockInsuficienteError } from '../services/descuentoInventarioService.js';

// Inicializar algunas órdenes de despacho de demostración para el WMS
const ORDENES_DEMO = [
  {
    id: 'ORD-801',
    codigo_orden: 'ORD-801',
    codigo_factura_erp: 'FE-90111',
    cliente_nombre: 'Constructora Capital S.A.S.',
    estado_actual: 'LISTO', // Listo para cargar al camión
    prioridad: 1,
    transportadora: 'Flota Propia Valenciana',
    items: [
      { sku: 'MAT-001', nombre: 'Cemento Gris 50kg Argos', cantidad: 10, bodegaId: 1 },
      { sku: 'PIN-001', nombre: 'Esmalte Sintético Rojo Galón', cantidad: 3, bodegaId: 2 }
    ]
  },
  {
    id: 'ORD-802',
    codigo_orden: 'ORD-802',
    codigo_factura_erp: 'FE-90112',
    cliente_nombre: 'Obras y Estructuras Metálicas SAS',
    estado_actual: 'PACKING',
    prioridad: 2,
    transportadora: 'Coordinadora',
    items: [
      { sku: 'HER-001', nombre: 'Taladro Percutor DeWalt', cantidad: 2, bodegaId: 3 },
      { sku: 'ELE-001', nombre: 'Cable THHN #12 Rojo Rollo', cantidad: 2, bodegaId: 5 }
    ]
  }
];

// Cargar órdenes en memoria si no existen
ORDENES_DEMO.forEach((o) => {
  if (!dbMemoria.despachos.has(o.id)) {
    dbMemoria.despachos.set(o.id, { ...o });
  }
});

// GET /api/despachos
export async function listarDespachos(req, res) {
  try {
    const despachos = Array.from(dbMemoria.despachos.values());
    return res.json(despachos);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /api/despachos/:id/estado
// NOTA DE NEGOCIO (OPCIÓN B): Descuento directo en el instante en que pasa a 'DESPACHADOS'.
// No se implementa reserva en 'COLA' ni 'PICKING'.
export async function cambiarEstadoDespacho(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado, usuario = 'Líder de Muelle' } = req.body;

    let despacho = dbMemoria.despachos.get(id);
    if (!despacho) {
      for (const d of dbMemoria.despachos.values()) {
        if (d.codigo_orden === id) {
          despacho = d;
          break;
        }
      }
    }

    if (!despacho) {
      return res.status(404).json({ error: `Orden de despacho con ID "${id}" no encontrada.` });
    }

    // ========================================================================
    // TRANSICIÓN A 'DESPACHADOS': DISPARA EL DESCUENTO ATÓMICO DE INVENTARIO
    // ========================================================================
    if (nuevoEstado === 'DESPACHADO' || nuevoEstado === 'DESPACHADOS') {
      try {
        // Descontar inventario usando el mismo servicio compartido con Facturación
        await descontarInventario({
          items: despacho.items.map((it) => ({
            sku: it.sku,
            bodegaId: it.bodegaId,
            cantidad: it.cantidad,
            nombre: it.nombre
          })),
          origen: 'despacho_domicilio',
          referenciaId: despacho.codigo_orden
        });
      } catch (errStock) {
        if (errStock instanceof StockInsuficienteError) {
          // La orden no puede despacharse si no hay stock suficiente en la bodega física
          return res.status(409).json({
            error: `Bloqueo de Despacho: No es posible despachar ${despacho.codigo_orden} por stock insuficiente.`,
            detalles: errStock.detalles,
            estadoActual: despacho.estado_actual
          });
        }
        throw errStock;
      }

      despacho.estado_actual = 'DESPACHADO';
      despacho.hora_salida = new Date().toISOString();
      despacho.despachado_por = usuario;

      return res.json({
        mensaje: `Orden ${despacho.codigo_orden} despachada con éxito. Inventario descontado del servidor físico.`,
        despacho
      });
    }

    // Otras transiciones operativas (COLA, PICKING, PACKING, LISTO, INCIDENCIA)
    despacho.estado_actual = nuevoEstado;
    return res.json(despacho);
  } catch (error) {
    console.error('Error actualizando estado de despacho WMS:', error);
    return res.status(500).json({ error: error.message });
  }
}
