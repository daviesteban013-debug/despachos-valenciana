import { getDbClient } from '../config/db.js';

export class StockInsuficienteError extends Error {
  constructor(mensaje, detalles) {
    super(mensaje);
    this.name = 'StockInsuficienteError';
    this.statusCode = 409;
    this.detalles = detalles; // Array de { sku, bodegaId, solicitado, disponible }
  }
}

/**
 * Servicio Único de Descuento de Inventario
 * Invocado tanto por Venta Mostrador (al confirmar sello) como por WMS (al despachar).
 * 
 * Garantiza:
 * 1. Concurrencia segura mediante bloqueo pesimista `SELECT ... FOR UPDATE` a nivel de fila.
 * 2. Transacción Todo o Nada: si un ítem falla por stock, nada se descuenta (ROLLBACK).
 * 3. Restricción estricta de no permitir saldos negativos (CHECK cantidad >= 0).
 * 
 * @param {Object} params
 * @param {Array<{ sku: string, bodegaId: number, cantidad: number, nombre?: string }>} params.items
 * @param {'venta_mostrador' | 'despacho_domicilio'} params.origen
 * @param {string} params.referenciaId - Número de factura (ej: 'FE-80291') o código de orden (ej: 'ORD-501')
 * @param {number} [params.delayArtificialMs=0] - Para pruebas de concurrencia y estrés de candados
 */
export async function descontarInventario({ items, origen, referenciaId, delayArtificialMs = 0 }) {
  if (!items || items.length === 0) {
    throw new Error('La lista de ítems a descontar no puede estar vacía.');
  }

  // Ordenar determinísticamente por sku y bodegaId para prevenir interbloqueos (deadlocks)
  const itemsOrdenados = [...items].sort((a, b) => {
    if (a.sku === b.sku) return a.bodegaId - b.bodegaId;
    return a.sku.localeCompare(b.sku);
  });

  const pgClient = await getDbClient();
  if (!pgClient) throw new Error('Base de datos no disponible');

  try {
    await pgClient.query('BEGIN');

    const faltantes = [];
    const filasBloqueadas = [];

    for (const item of itemsOrdenados) {
      // Bloqueo pesimista FOR UPDATE a nivel de fila dentro de la transacción
      const res = await pgClient.query(
        `SELECT id, sku, bodega_id, cantidad 
         FROM inventario_por_bodega 
         WHERE sku = $1 AND bodega_id = $2 
         FOR UPDATE`,
        [item.sku, item.bodegaId]
      );

      if (res.rows.length === 0) {
        faltantes.push({
          sku: item.sku,
          bodegaId: item.bodegaId,
          solicitado: item.cantidad,
          disponible: 0,
          motivo: 'No existe registro de inventario en la bodega especificada'
        });
        continue;
      }

      const fila = res.rows[0];
      if (fila.cantidad < item.cantidad) {
        faltantes.push({
          sku: item.sku,
          bodegaId: item.bodegaId,
          solicitado: item.cantidad,
          disponible: fila.cantidad,
          motivo: 'Stock insuficiente'
        });
      } else {
        filasBloqueadas.push({ ...fila, cantidadADescontar: item.cantidad });
      }
    }

    // Si falta stock en algún ítem, ABORTAR transacción completa (Todo o Nada)
    if (faltantes.length > 0) {
      await pgClient.query('ROLLBACK');
      throw new StockInsuficienteError(
        `No es posible descontar inventario para ${referenciaId}. Uno o más ítems no tienen stock suficiente en la bodega solicitada.`,
        faltantes
      );
    }

    // Descontar cada ítem
    for (const f of filasBloqueadas) {
      await pgClient.query(
        `UPDATE inventario_por_bodega 
         SET cantidad = cantidad - $1, actualizado_en = NOW() 
         WHERE sku = $2 AND bodega_id = $3`,
        [f.cantidadADescontar, f.sku, f.bodega_id]
      );
    }

    // Opcional: retardo artificial si se especificó en pruebas
    if (delayArtificialMs > 0) {
      await new Promise((r) => setTimeout(r, delayArtificialMs));
    }

    await pgClient.query('COMMIT');

    console.info(`✅ [INVENTARIO DESCONTADO - PG] Origen: ${origen}, Ref: ${referenciaId}, Ítems: ${items.length}`);
    return {
      exito: true,
      origen,
      referenciaId,
      descontados: itemsOrdenados.map((it) => ({ sku: it.sku, bodegaId: it.bodegaId, cantidad: it.cantidad }))
    };
  } catch (error) {
    await pgClient.query('ROLLBACK');
    throw error;
  } finally {
    pgClient.release();
  }
}
