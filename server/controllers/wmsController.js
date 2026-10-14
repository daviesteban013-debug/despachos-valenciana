import { randomBytes } from 'crypto';
import { ApiError } from '../middlewares/errorHandler.js';
import { getDbClient } from '../config/db.js';
import {
  registrarDespachoEnPlantilla,
  exportarPlantillaBuffer,
  calibrarPlantillaReferencia
} from '../services/plantillaExcelService.js';
import { FLOTA_VEHICULOS } from '../config/flota.js';
import { io } from '../server.js';
import { esAdmin } from '../middlewares/wmsAuth.js';
import { construirSyncCloud, sincronizarDespachoEnExcel } from '../services/syncDespachoExcelService.js';
import { fechaSqlAIso, normalizarFechaEntrada } from '../utils/fechas.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Código de orden con entropía suficiente para no chocar con el UNIQUE de
 * despachos.codigo_orden (el formato anterior solo tenía 600 valores posibles).
 */
function generarCodigoOrden() {
  const tiempo = Date.now().toString(36).toUpperCase().slice(-4);
  const aleatorio = Array.from(randomBytes(6), b => (b % 36).toString(36))
    .join('')
    .toUpperCase();
  return `PVSW-${tiempo}${aleatorio}`;
}

/**
 * Prepara una fila de despachos para el frontend: fecha de negocio como
 * 'YYYY-MM-DD' (sin corrimiento de zona horaria) y estado de sync con Excel.
 */
function normalizarDespacho(d) {
  return {
    ...d,
    fecha_despacho: fechaSqlAIso(d.fecha_despacho),
    sync_cloud: construirSyncCloud(d)
  };
}

async function obtenerDespachoConItems(client, id) {
  const { rows } = await client.query('SELECT * FROM despachos WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  const { rows: items } = await client.query('SELECT * FROM despacho_items WHERE despacho_id = $1', [id]);
  return { ...normalizarDespacho(rows[0]), items };
}

// GET /api/despachos
export async function listarDespachos(req, res, next) {
  const client = await getDbClient();
  if (!client) return next(new ApiError(500, 'Base de datos no disponible'));

  try {
    const { rows: despachos } = await client.query(
      'SELECT * FROM despachos WHERE usuario_creador = $1 ORDER BY fecha_despacho DESC, hora_salida DESC, id DESC',
      [req.user.email]
    );
    const { rows: items } = await client.query('SELECT * FROM despacho_items');
    const { rows: historial } = await client.query('SELECT * FROM historial_estados_despacho ORDER BY created_at ASC');
    const { rows: incidencias } = await client.query('SELECT * FROM incidencias_despacho WHERE resuelta = FALSE');

    const resultado = despachos.map(fila => {
      const d = normalizarDespacho(fila);
      d.items = items.filter(i => i.despacho_id === d.id);
      d.history = historial.filter(h => h.despacho_id === d.id).map(h => ({
        id: h.id,
        estado_anterior: h.estado_anterior,
        estado_nuevo: h.estado_nuevo,
        usuario_operador: h.usuario_operador,
        tiempo_estancia_seg: h.tiempo_estancia_seg,
        timestamp: h.created_at,
        nota: h.nota
      }));
      const incidencia = incidencias.find(i => i.despacho_id === d.id);
      d.incidencia_activa = incidencia ? {
        id: incidencia.id,
        tipo: incidencia.tipo,
        descripcion: incidencia.descripcion,
        reportado_por: incidencia.reportado_por,
        fecha: incidencia.fecha_reporte
      } : null;
      return d;
    });

    return res.json(resultado);
  } catch (error) {
    return next(new ApiError(500, error.message));
  } finally {
    client.release();
  }
}

// POST /api/despachos
// Idempotente por codigo_orden: si el cliente reintenta (modo offline o
// respuesta perdida) con el mismo código, se devuelve la orden ya creada.
export async function crearDespacho(req, res, next) {
  const client = await getDbClient();
  if (!client) return next(new ApiError(500, 'Base de datos no disponible'));

  const {
    codigo_orden,
    codigo_factura_erp,
    cliente_nombre,
    direccion_entrega,
    jornada,
    vehiculo_placa,
    bodega_id,
    valor_total,
    observaciones,
    fecha_despacho,
    items,
    ciudad
  } = req.body;

  const codigoCliente = typeof codigo_orden === 'string' ? codigo_orden.trim() : '';
  const codigoFinal = codigoCliente || generarCodigoOrden();

  try {
    if (!cliente_nombre || !direccion_entrega) {
      return next(new ApiError(400, 'cliente_nombre y direccion_entrega son requeridos.'));
    }
    if (codigoFinal.length > 50) {
      return next(new ApiError(400, 'codigo_orden no puede superar 50 caracteres.'));
    }

    await client.query('BEGIN');

    const { rows: dRows } = await client.query(`
      INSERT INTO despachos (
        codigo_orden, codigo_factura_erp, cliente_nombre, cliente_direccion, cliente_ciudad,
        transportadora, estado_actual, vehiculo_placa, valor_total, fecha_despacho, jornada, observaciones, usuario_creador
      ) VALUES (
        $1, $2, $3, $4, $5, 'Flota Propia', 'PENDIENTE', $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `, [
      codigoFinal,
      codigo_factura_erp || '',
      cliente_nombre,
      direccion_entrega,
      ciudad || 'Cúcuta',
      vehiculo_placa || FLOTA_VEHICULOS[0],
      valor_total || 0,
      normalizarFechaEntrada(fecha_despacho),
      jornada || 'AM',
      observaciones || '',
      req.user.email
    ]);

    const nuevoDespacho = normalizarDespacho(dRows[0]);
    nuevoDespacho.items = [];

    if (items && items.length > 0) {
      for (const it of items) {
        const { rows: iRows } = await client.query(`
          INSERT INTO despacho_items (
            despacho_id, sku, descripcion_producto, cantidad_solicitada, ubicacion_bodega
          ) VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [
          nuevoDespacho.id,
          it.sku || 'SKU-001',
          it.descripcion_producto || 'Producto Genérico',
          it.cantidad_solicitada || 1,
          it.ubicacion_bodega || 'DESPACHO'
        ]);
        nuevoDespacho.items.push(iRows[0]);
      }
    }

    await client.query('COMMIT');
    io.emit('wms_update_event', { action: 'DESPACHO_CREADO', id: nuevoDespacho.id });
    return res.status(201).json(nuevoDespacho);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});

    // Reintento de una orden que ya llegó al servidor → responder con la existente
    if (error.code === '23505' && error.constraint === 'despachos_codigo_orden_key' && codigoCliente) {
      try {
        const { rows } = await client.query('SELECT id, usuario_creador FROM despachos WHERE codigo_orden = $1', [codigoFinal]);
        const existente = rows[0];
        if (existente && (existente.usuario_creador || '').toLowerCase() === (req.user.email || '').toLowerCase()) {
          const despacho = await obtenerDespachoConItems(client, existente.id);
          return res.status(200).json({ ...despacho, idempotente: true });
        }
        return next(new ApiError(409, `El código de orden ${codigoFinal} ya está en uso por otra orden.`));
      } catch (errBusqueda) {
        return next(new ApiError(500, errBusqueda.message));
      }
    }

    // Datos inválidos o restricciones de la BD (clases 22 y 23): es un error del
    // cliente, no una caída del servidor (el frontend reintentaría para siempre).
    if (typeof error.code === 'string' && (error.code.startsWith('22') || error.code.startsWith('23'))) {
      return next(new ApiError(400, `Datos del despacho inválidos: ${error.message}`));
    }
    return next(new ApiError(500, error.message));
  } finally {
    client.release();
  }
}

// PATCH /api/despachos/:id/estado
// Idempotente: despachar dos veces la misma orden (reintentos, respuesta perdida,
// restaurar y re-despachar) NO escribe una segunda fila en el Excel.
export async function cambiarEstadoDespacho(req, res, next) {
  const { id } = req.params;
  const { nuevoEstado, vehiculoPlaca } = req.body;
  const estadoUpper = (nuevoEstado || '').toUpperCase();

  if (estadoUpper !== 'PENDIENTE' && estadoUpper !== 'DESPACHADO') {
    return next(new ApiError(400, 'Estado no permitido.'));
  }

  const client = await getDbClient();
  if (!client) return next(new ApiError(500, 'BD no disponible'));

  let despacho;
  let placaAsignada;
  try {
    await client.query('BEGIN');
    const queryStr = UUID_REGEX.test(id)
      ? 'SELECT * FROM despachos WHERE id = $1 AND usuario_creador = $2 LIMIT 1 FOR UPDATE'
      : 'SELECT * FROM despachos WHERE (codigo_orden = $1 OR codigo_factura_erp = $1) AND usuario_creador = $2 LIMIT 1 FOR UPDATE';

    const { rows: findRows } = await client.query(queryStr, [id, req.user.email]);
    if (findRows.length === 0) {
      await client.query('ROLLBACK');
      return next(new ApiError(404, 'Orden no encontrada o no tienes permisos.'));
    }
    despacho = findRows[0];

    if (estadoUpper === 'PENDIENTE') {
      // La fila ya escrita en el Excel se conserva (sync_excel_* no se toca):
      // si la orden se vuelve a despachar no se duplicará.
      const { rows } = await client.query(
        'UPDATE despachos SET estado_actual = $1, hora_salida = NULL WHERE id = $2 RETURNING *',
        ['PENDIENTE', despacho.id]
      );
      await client.query('COMMIT');
      io.emit('wms_update_event', { action: 'DESPACHO_ACTUALIZADO', id: despacho.id, estado: 'PENDIENTE' });
      return res.json({ mensaje: 'Restaurada a pendiente', despacho: normalizarDespacho(rows[0]) });
    }

    if (despacho.estado_actual === 'DESPACHADO') {
      // Ya despachada: no se cambia la placa ni la hora de salida
      placaAsignada = despacho.vehiculo_placa;
      await client.query('COMMIT');
    } else {
      placaAsignada = (vehiculoPlaca || despacho.vehiculo_placa || '').trim().toUpperCase();
      const { rows } = await client.query(`
        UPDATE despachos
        SET estado_actual = 'DESPACHADO',
            vehiculo_placa = $1,
            hora_salida = NOW(),
            sync_excel_estado = CASE WHEN sync_excel_estado = 'SINCRONIZADO' THEN 'SINCRONIZADO' ELSE 'PENDIENTE' END
        WHERE id = $2
        RETURNING *
      `, [placaAsignada, despacho.id]);
      despacho = rows[0];
      await client.query('COMMIT');
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return next(new ApiError(500, error.message));
  } finally {
    client.release();
  }

  // Escritura en Excel fuera de la transacción (no retiene conexiones del pool)
  let syncExcel;
  try {
    syncExcel = await sincronizarDespachoEnExcel(despacho.id);
  } catch (errSync) {
    syncExcel = { estado: 'ERROR_SYNC', error: errSync.message, yaRegistrado: false };
  }

  let advertencia = null;
  if (syncExcel.yaRegistrado && syncExcel.placa && syncExcel.placa !== placaAsignada) {
    advertencia = `La orden ya estaba registrada en la hoja [${syncExcel.placa}] del Excel; no se escribió en [${placaAsignada}]. Corrige el Excel manualmente si cambió de vehículo.`;
  }

  io.emit('wms_update_event', { action: 'DESPACHO_ACTUALIZADO', id: despacho.id, estado: 'DESPACHADO' });
  return res.json({
    mensaje: 'Orden despachada',
    despacho: { ...normalizarDespacho(despacho), estado_actual: 'DESPACHADO', vehiculo_placa: placaAsignada },
    syncExcel,
    advertencia
  });
}

// POST /api/despachos/:id/incidencia
export async function gestionarIncidenciaDespacho(req, res, next) {
  const client = await getDbClient();
  try {
    const { id } = req.params;
    const { accion, tipo, descripcion, solucion, usuario = 'Líder WMS' } = req.body;

    const isUUID = UUID_REGEX.test(id);
    const queryStr = isUUID
      ? 'SELECT id FROM despachos WHERE id = $1 LIMIT 1'
      : 'SELECT id FROM despachos WHERE codigo_orden = $1 LIMIT 1';

    const { rows } = await client.query(queryStr, [id]);
    if (rows.length === 0) return next(new ApiError(404, 'Orden no encontrada'));
    const dId = rows[0].id;

    if (accion === 'RESOLVER') {
      await client.query('UPDATE incidencias_despacho SET resuelta = TRUE, fecha_resolucion = NOW(), resuelto_por = $1, solucion_aplicada = $2 WHERE despacho_id = $3 AND resuelta = FALSE', [usuario, solucion, dId]);
      io.emit('wms_update_event', { action: 'INCIDENCIA_RESUELTA', id: dId });
      return res.json({ mensaje: 'Incidencia resuelta' });
    }

    await client.query('INSERT INTO incidencias_despacho (despacho_id, tipo, descripcion, reportado_por) VALUES ($1, $2, $3, $4)', [dId, tipo || 'FALTANTE', descripcion, usuario]);
    io.emit('wms_update_event', { action: 'INCIDENCIA_REPORTADA', id: dId });
    return res.json({ mensaje: 'Incidencia reportada' });
  } finally {
    if (client) client.release();
  }
}

export async function exportarPlantillaExcel(req, res, next) {
  try {
    const buffer = await exportarPlantillaBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Plantilla_Despachos_Vehiculos.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
}

export async function cargarPlantillaReferenciaController(req, res, next) {
  try {
    const resultado = await calibrarPlantillaReferencia(req.file.buffer);
    return res.json(resultado);
  } catch (error) {
    return next(new ApiError(400, error.message));
  }
}

// POST /api/despachos/:id/reintentar-sync
export async function reintentarSincronizacionDrive(req, res, next) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return next(new ApiError(400, 'Identificador de orden inválido.'));

  const client = await getDbClient();
  if (!client) return next(new ApiError(500, 'Base de datos no disponible'));

  try {
    const { rows } = await client.query(
      'SELECT id, estado_actual FROM despachos WHERE id = $1 AND usuario_creador = $2',
      [id, req.user.email]
    );
    if (rows.length === 0) return next(new ApiError(404, 'Orden no encontrada o no tienes permisos.'));
    if (rows[0].estado_actual !== 'DESPACHADO') {
      return next(new ApiError(409, 'Solo se pueden sincronizar órdenes despachadas.'));
    }
  } catch (error) {
    return next(new ApiError(500, error.message));
  } finally {
    client.release();
  }

  try {
    const syncExcel = await sincronizarDespachoEnExcel(id);
    io.emit('wms_update_event', { action: 'DESPACHO_ACTUALIZADO', id });
    if (syncExcel.estado === 'SINCRONIZADO') {
      return res.json({ mensaje: 'Sincronizado', syncExcel });
    }
    return res.status(502).json({ error: syncExcel.error || `Estado de sincronización: ${syncExcel.estado}`, syncExcel });
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
}

// GET /api/devoluciones
export async function listarDevoluciones(req, res, next) {
  const client = await getDbClient();
  try {
    const { rows } = await client.query('SELECT * FROM devoluciones');
    return res.json(rows);
  } finally {
    if (client) client.release();
  }
}

// PATCH /api/devoluciones/:id/procesar
export async function procesarDevolucion(req, res, next) {
  const client = await getDbClient();
  try {
    const { id } = req.params;
    const { accion, notas = '' } = req.body;

    const { rows } = await client.query('UPDATE devoluciones SET estado = $1, accion_destino = $2, observacion = $3 WHERE id::text = $4 RETURNING *', [
      accion === 'REINGRESO_INVENTARIO' ? 'REINGRESADO' : 'DADO_DE_BAJA',
      accion,
      notas,
      id
    ]);
    io.emit('wms_update_event', { action: 'DEVOLUCION_PROCESADA', id: rows[0].id });
    return res.json({ mensaje: 'Devolucion procesada', devolucion: rows[0] });
  } finally {
    if (client) client.release();
  }
}

// POST /api/despachos/sync-excel-directo
// Escribe en el Excel de Google Drive SIN necesitar PostgreSQL.
// Útil cuando la BD está caída pero el usuario quiere registrar la salida del camión.
// ⚠️ No queda registro en la BD: no tiene protección contra filas duplicadas.
export async function syncExcelDirecto(req, res, next) {
  try {
    const { vehiculo, numeroFactura, clienteNombre, direccion, valorFactura, jornada, observaciones, fechaDespacho, items } = req.body;

    if (!vehiculo || !numeroFactura) {
      return next(new ApiError(400, 'vehiculo y numeroFactura son obligatorios.'));
    }

    const resultado = await registrarDespachoEnPlantilla({
      vehiculo: (vehiculo || '').trim().toUpperCase(),
      numeroFactura,
      clienteNombre: clienteNombre || '',
      direccion: direccion || '',
      valorFactura: valorFactura || 0,
      jornada: jornada || 'AM',
      observaciones: observaciones || '',
      fechaDespacho: fechaDespacho || null,
      items: items || []
    });

    return res.json({
      ok: true,
      mensaje: 'Sincronizado en Excel correctamente (modo offline).',
      destino: resultado.destino
    });
  } catch (err) {
    console.error('[SYNC-EXCEL-DIRECTO] Error:', err.message);
    return next(new ApiError(500, err.message || 'Error al escribir en Excel.'));
  }
}

// DELETE /api/despachos/:id
// Solo por UUID (nunca por factura: podría borrar varias órdenes a la vez).
// El creador puede borrar sus órdenes PENDIENTES; una orden DESPACHADA (ya
// registrada en el Excel) o de otro usuario solo la borra un administrador.
export async function eliminarDespacho(req, res, next) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    return next(new ApiError(400, 'Identificador de orden inválido.'));
  }

  const client = await getDbClient();
  if (!client) return next(new ApiError(500, 'Base de datos no disponible'));

  try {
    const email = (req.user?.email || '').toLowerCase();
    const admin = esAdmin(email);

    const { rows: encontrados } = await client.query(
      'SELECT id, codigo_orden, usuario_creador, estado_actual FROM despachos WHERE id = $1',
      [id]
    );
    if (encontrados.length === 0) {
      return next(new ApiError(404, 'Orden no encontrada.'));
    }
    const despacho = encontrados[0];

    if (!admin) {
      if ((despacho.usuario_creador || '').toLowerCase() !== email) {
        return next(new ApiError(403, 'Solo puedes eliminar órdenes creadas por ti.'));
      }
      if (despacho.estado_actual === 'DESPACHADO') {
        return next(new ApiError(403, 'La orden ya fue despachada y registrada en el Excel. Solo un administrador puede eliminarla.'));
      }
    }

    const { rows } = await client.query('DELETE FROM despachos WHERE id = $1 RETURNING id, codigo_orden', [id]);
    if (rows.length === 0) {
      return next(new ApiError(404, 'Orden no encontrada.'));
    }

    console.info(`[DESPACHOS] Orden ${rows[0].codigo_orden} eliminada por ${email}${admin ? ' (admin)' : ''}.`);
    io.emit('wms_update_event', { action: 'DESPACHO_ELIMINADO', id: rows[0].id });
    return res.json({
      ok: true,
      mensaje: `Orden ${rows[0].codigo_orden} eliminada definitivamente.`,
      id: rows[0].id
    });
  } catch (error) {
    console.error('Error eliminando despacho:', error);
    return next(new ApiError(500, error.message));
  } finally {
    client.release();
  }
}
