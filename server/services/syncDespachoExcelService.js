import { getDbClient } from '../config/db.js';
import { registrarDespachoEnPlantilla } from './plantillaExcelService.js';

// ============================================================================
// Sincronización idempotente de despachos con la plantilla Excel (Google Drive).
//
// El estado de la escritura se guarda en la propia fila del despacho
// (sync_excel_*), de modo que:
//   - una orden se escribe en el Excel UNA sola vez, aunque el cliente
//     reintente el PATCH, se pierda la respuesta por la red o se restaure a
//     PENDIENTE y se vuelva a despachar;
//   - un fallo de Drive queda registrado y se puede reintentar.
//
// Estados: PENDIENTE → EN_PROCESO → SINCRONIZADO | ERROR_SYNC
// ============================================================================

// Tiempo tras el cual un EN_PROCESO se considera abandonado (caída del proceso)
const MINUTOS_RECLAMO_EN_PROCESO = 5;

export async function inicializarColumnasSyncExcel() {
  const client = await getDbClient();
  if (!client) {
    console.warn('[SYNC-EXCEL] PostgreSQL no disponible al iniciar. Se omitió la migración de columnas sync_excel_*.');
    return;
  }

  try {
    await client.query(`
      ALTER TABLE despachos
        ADD COLUMN IF NOT EXISTS sync_excel_estado VARCHAR(20),
        ADD COLUMN IF NOT EXISTS sync_excel_placa VARCHAR(100),
        ADD COLUMN IF NOT EXISTS sync_excel_destino VARCHAR(150),
        ADD COLUMN IF NOT EXISTS sync_excel_error TEXT,
        ADD COLUMN IF NOT EXISTS sync_excel_fecha TIMESTAMPTZ;
    `);

    // Despachos históricos (anteriores a este control): se asumen ya escritos
    // en el Excel para no duplicarlos si alguien los restaura y re-despacha.
    // Los despachos nuevos nunca quedan DESPACHADO con sync_excel_estado NULL.
    const { rowCount } = await client.query(`
      UPDATE despachos
      SET sync_excel_estado = 'SINCRONIZADO',
          sync_excel_placa = vehiculo_placa,
          sync_excel_destino = 'Histórico (previo al control de sincronización)'
      WHERE estado_actual = 'DESPACHADO' AND sync_excel_estado IS NULL
    `);
    if (rowCount > 0) {
      console.log(`[SYNC-EXCEL] ${rowCount} despacho(s) histórico(s) marcados como ya registrados en Excel.`);
    }
    console.log('✅ Columnas sync_excel_* verificadas en despachos.');
  } catch (err) {
    console.error('[SYNC-EXCEL] Error migrando columnas sync_excel_*:', err.message);
  } finally {
    client.release();
  }
}

/**
 * Traduce las columnas sync_excel_* al objeto `sync_cloud` que consume el frontend.
 */
export function construirSyncCloud(despacho) {
  if (!despacho) return null;
  const estado = despacho.sync_excel_estado
    || (despacho.estado_actual === 'DESPACHADO' ? 'PENDIENTE' : null);
  if (!estado) return null;
  return {
    estado,
    placa: despacho.sync_excel_placa || null,
    destino: despacho.sync_excel_destino || null,
    error: despacho.sync_excel_error || null,
    fecha: despacho.sync_excel_fecha || null
  };
}

async function guardarResultadoSync(despachoId, { estado, placa = null, destino = null, error = null }) {
  const client = await getDbClient();
  if (!client) throw new Error('Base de datos no disponible para registrar el resultado de la sincronización.');
  try {
    const { rows } = await client.query(`
      UPDATE despachos
      SET sync_excel_estado = $1,
          sync_excel_placa = COALESCE($2, sync_excel_placa),
          sync_excel_destino = $3,
          sync_excel_error = $4,
          sync_excel_fecha = NOW()
      WHERE id = $5
      RETURNING *
    `, [estado, placa, destino, error, despachoId]);
    return rows[0];
  } finally {
    client.release();
  }
}

/**
 * Escribe el despacho en la hoja de su vehículo si (y solo si) aún no se ha escrito.
 * Toma el despacho con un UPDATE condicional (EN_PROCESO) para que dos peticiones
 * simultáneas no escriban la misma fila dos veces.
 *
 * @returns {Promise<{ estado, placa, destino, error, fecha, yaRegistrado: boolean }>}
 */
export async function sincronizarDespachoEnExcel(despachoId) {
  const client = await getDbClient();
  if (!client) throw new Error('Base de datos no disponible');

  let despacho;
  let items = [];
  try {
    const { rows } = await client.query(`
      UPDATE despachos
      SET sync_excel_estado = 'EN_PROCESO', sync_excel_fecha = NOW(), sync_excel_error = NULL
      WHERE id = $1
        AND estado_actual = 'DESPACHADO'
        AND (
          sync_excel_estado IS NULL
          OR sync_excel_estado IN ('PENDIENTE', 'ERROR_SYNC')
          OR (sync_excel_estado = 'EN_PROCESO' AND sync_excel_fecha < NOW() - INTERVAL '${MINUTOS_RECLAMO_EN_PROCESO} minutes')
        )
      RETURNING *
    `, [despachoId]);

    if (rows.length === 0) {
      // Ya sincronizado, en proceso por otra petición, o no está despachado
      const { rows: actual } = await client.query('SELECT * FROM despachos WHERE id = $1', [despachoId]);
      return { ...construirSyncCloud(actual[0]), yaRegistrado: actual[0]?.sync_excel_estado === 'SINCRONIZADO' };
    }

    despacho = rows[0];
    try {
      const { rows: itemRows } = await client.query(
        'SELECT sku, descripcion_producto, cantidad_solicitada, ubicacion_bodega FROM despacho_items WHERE despacho_id = $1',
        [despachoId]
      );
      items = itemRows || [];
    } catch (errItems) {
      console.warn('⚠️ No se pudieron obtener items del despacho para Excel:', errItems.message);
    }
  } finally {
    // Liberar la conexión ANTES de hablar con Drive (puede tardar varios segundos)
    client.release();
  }

  let actualizado;
  try {
    const resExcel = await registrarDespachoEnPlantilla({
      vehiculo: despacho.vehiculo_placa,
      numeroFactura: despacho.codigo_factura_erp || despacho.codigo_orden,
      clienteNombre: despacho.cliente_nombre,
      direccion: despacho.cliente_direccion,
      valorFactura: despacho.valor_total,
      jornada: despacho.jornada,
      observaciones: despacho.observaciones,
      fechaDespacho: despacho.fecha_despacho,
      items
    });
    actualizado = await guardarResultadoSync(despachoId, {
      estado: 'SINCRONIZADO',
      placa: despacho.vehiculo_placa,
      destino: resExcel.destino
    });
  } catch (errExcel) {
    console.error(`[SYNC-EXCEL] Falló la escritura de ${despacho.codigo_orden}:`, errExcel.message);
    actualizado = await guardarResultadoSync(despachoId, {
      estado: 'ERROR_SYNC',
      error: errExcel.message
    });
  }

  return { ...construirSyncCloud(actualizado), yaRegistrado: false };
}
