import { getDbClient } from '../config/db.js';
import { 
  registrarDespachoEnPlantilla, 
  exportarPlantillaBuffer, 
  calibrarPlantillaReferencia
} from '../services/plantillaExcelService.js';
import { FLOTA_VEHICULOS } from '../config/flota.js';
import { io } from '../server.js';

// GET /api/despachos
export async function listarDespachos(req, res) {
  const client = await getDbClient();
  if (!client) return res.status(500).json({ error: 'Base de datos no disponible' });

  try {
    const { rows: despachos } = await client.query('SELECT * FROM despachos ORDER BY created_at DESC');
    const { rows: items } = await client.query('SELECT * FROM despacho_items');
    const { rows: historial } = await client.query('SELECT * FROM historial_estados_despacho ORDER BY created_at ASC');
    const { rows: incidencias } = await client.query('SELECT * FROM incidencias_despacho WHERE resuelta = FALSE');

    const resultado = despachos.map(d => {
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
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

// POST /api/despachos
export async function crearDespacho(req, res) {
  const client = await getDbClient();
  if (!client) return res.status(500).json({ error: 'Base de datos no disponible' });

  try {
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
      items
    } = req.body;

    if (!cliente_nombre || !direccion_entrega) {
      return res.status(400).json({ error: 'cliente_nombre y direccion_entrega son requeridos.' });
    }
    
    await client.query('BEGIN');
    
    const { rows: dRows } = await client.query(`
      INSERT INTO despachos (
        codigo_orden, codigo_factura_erp, cliente_nombre, cliente_direccion, 
        transportadora, estado_actual, vehiculo_placa, valor_total, fecha_despacho, jornada, observaciones
      ) VALUES (
        $1, $2, $3, $4, 'Flota Propia', 'PENDIENTE', $5, $6, $7, $8, $9
      ) RETURNING *
    `, [
      codigo_orden || `PVSW-${Math.floor(Math.random() * 10000)}`,
      codigo_factura_erp || '',
      cliente_nombre,
      direccion_entrega,
      vehiculo_placa || FLOTA_VEHICULOS[0],
      valor_total || 0,
      fecha_despacho || new Date().toISOString(),
      jornada || 'AM',
      observaciones || ''
    ]);

    const nuevoDespacho = dRows[0];
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
    await client.query('ROLLBACK');
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

// PATCH /api/despachos/:id/estado
export async function cambiarEstadoDespacho(req, res) {
  const client = await getDbClient();
  if (!client) return res.status(500).json({ error: 'BD no disponible' });
  
  try {
    const { id } = req.params;
    const { nuevoEstado, vehiculoPlaca, usuario = 'Líder de Bodega' } = req.body;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const queryStr = isUUID 
      ? 'SELECT * FROM despachos WHERE id = $1 LIMIT 1'
      : 'SELECT * FROM despachos WHERE codigo_orden = $1 OR codigo_factura_erp = $1 LIMIT 1';
      
    const { rows: findRows } = await client.query(queryStr, [id]);
    if (findRows.length === 0) return res.status(404).json({ error: 'Orden no encontrada.' });
    const despacho = findRows[0];
    const estadoUpper = (nuevoEstado || '').toUpperCase();
    
    if (estadoUpper !== 'PENDIENTE' && estadoUpper !== 'DESPACHADO') {
      return res.status(400).json({ error: 'Estado no permitido.' });
    }

    let placaAsignada = despacho.vehiculo_placa;
    if (estadoUpper === 'DESPACHADO') {
      placaAsignada = (vehiculoPlaca || despacho.vehiculo_placa || '').trim().toUpperCase();
      await client.query('UPDATE despachos SET estado_actual = $1, vehiculo_placa = $2, hora_salida = NOW() WHERE id = $3', ['DESPACHADO', placaAsignada, despacho.id]);
      
      let sync_cloud = { estado: 'PENDIENTE', placa: placaAsignada, fecha: new Date().toISOString() };
      
      try {
        const resExcel = await registrarDespachoEnPlantilla({
          vehiculo: placaAsignada,
          numeroFactura: despacho.codigo_factura_erp || despacho.codigo_orden,
          clienteNombre: despacho.cliente_nombre,
          direccion: despacho.cliente_direccion,
          valorFactura: despacho.valor_total
        });
        sync_cloud = { estado: 'SINCRONIZADO', fecha: new Date().toISOString(), destino: resExcel.destino };
      } catch (errExcel) {
        sync_cloud = { estado: 'ERROR_SYNC', error: errExcel.message };
      }
      io.emit('wms_update_event', { action: 'DESPACHO_ACTUALIZADO', id: despacho.id, estado: 'DESPACHADO' });
      return res.json({ mensaje: 'Orden despachada', despacho: { ...despacho, estado_actual: 'DESPACHADO', vehiculo_placa: placaAsignada }, syncExcel: sync_cloud });
    }

    await client.query('UPDATE despachos SET estado_actual = $1 WHERE id = $2', ['PENDIENTE', despacho.id]);
    io.emit('wms_update_event', { action: 'DESPACHO_ACTUALIZADO', id: despacho.id, estado: 'PENDIENTE' });
    return res.json({ mensaje: 'Restaurada a pendiente', despacho: { ...despacho, estado_actual: 'PENDIENTE' } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

// POST /api/despachos/:id/incidencia
export async function gestionarIncidenciaDespacho(req, res) {
  const client = await getDbClient();
  try {
    const { id } = req.params;
    const { accion, tipo, descripcion, solucion, usuario = 'Líder WMS' } = req.body;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const queryStr = isUUID 
      ? 'SELECT id FROM despachos WHERE id = $1 LIMIT 1'
      : 'SELECT id FROM despachos WHERE codigo_orden = $1 LIMIT 1';
      
    const { rows } = await client.query(queryStr, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
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

export async function exportarPlantillaExcel(req, res) {
  try {
    const buffer = await exportarPlantillaBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Plantilla_Despachos_Vehiculos.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function cargarPlantillaReferenciaController(req, res) {
  try {
    const resultado = await calibrarPlantillaReferencia(req.file.buffer);
    return res.json(resultado);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

export async function reintentarSincronizacionDrive(req, res) {
  return res.status(500).json({ error: 'Not implemented in this migration yet' });
}

// GET /api/devoluciones
export async function listarDevoluciones(req, res) {
  const client = await getDbClient();
  try {
    const { rows } = await client.query('SELECT * FROM devoluciones');
    return res.json(rows);
  } finally {
    if (client) client.release();
  }
}

// PATCH /api/devoluciones/:id/procesar
export async function procesarDevolucion(req, res) {
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
export async function syncExcelDirecto(req, res) {
  try {
    const { vehiculo, numeroFactura, clienteNombre, direccion, valorFactura } = req.body;

    if (!vehiculo || !numeroFactura) {
      return res.status(400).json({ error: 'vehiculo y numeroFactura son obligatorios.' });
    }

    const resultado = await registrarDespachoEnPlantilla({
      vehiculo: (vehiculo || '').trim().toUpperCase(),
      numeroFactura,
      clienteNombre: clienteNombre || '',
      direccion: direccion || '',
      valorFactura: valorFactura || 0
    });

    return res.json({
      ok: true,
      mensaje: 'Sincronizado en Excel correctamente (modo offline).',
      destino: resultado.destino
    });
  } catch (err) {
    console.error('[SYNC-EXCEL-DIRECTO] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Error al escribir en Excel.' });
  }
}
