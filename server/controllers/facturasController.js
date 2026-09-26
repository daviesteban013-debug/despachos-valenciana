import { ApiError } from '../middlewares/errorHandler.js';
import { getDbClient } from '../config/db.js';
import { descontarInventario, StockInsuficienteError } from '../services/descuentoInventarioService.js';

const SECCION_A_BODEGA = {
  materiales_construccion: 1,
  pinturas: 2,
  herramienta_electrica: 3,
  plomeria: 4,
  electrico: 5,
  jardin_exteriores: 6,
  ferreteria_general: 7
};

export async function listarFacturas(req, res, next) {
  const client = await getDbClient();
  if (!client) return next(new ApiError(500, 'BD no disponible'));

  try {
    const { rows: facturas } = await client.query('SELECT * FROM facturas ORDER BY created_at DESC');
    const { rows: items } = await client.query('SELECT * FROM factura_items');
    const { rows: historial } = await client.query('SELECT * FROM factura_historial ORDER BY timestamp ASC');

    const resultado = facturas.map(f => {
      return {
        ...f,
        numeroFactura: f.numero_factura,
        items: items.filter(i => i.factura_id === f.id),
        historial: historial.filter(h => h.factura_id === f.id)
      };
    });

    return res.json(resultado);
  } catch (error) {
    return next(new ApiError(500, error.message));
  } finally {
    client.release();
  }
}

export async function crearFactura(req, res, next) {
  const client = await getDbClient();
  if (!client) return next(new ApiError(500, 'BD no disponible'));

  try {
    const { numeroFactura, cliente, items, cajero = 'Facturación' } = req.body;

    if (!numeroFactura || !cliente || !items || items.length === 0) {
      return next(new ApiError(400, 'Número de factura, cliente e ítems son obligatorios.'));
    }

    await client.query('BEGIN');

    const { rows: facRows } = await client.query(`
      INSERT INTO facturas (numero_factura, cliente, cajero, estado)
      VALUES ($1, $2, $3, 'pendiente') RETURNING *
    `, [numeroFactura, cliente, cajero]);
    
    const fac = facRows[0];
    fac.numeroFactura = fac.numero_factura;
    fac.items = [];
    fac.historial = [];

    for (const it of items) {
      const bodegaId = it.bodega_id || SECCION_A_BODEGA[it.seccion] || 1;
      const { rows: itemRows } = await client.query(`
        INSERT INTO factura_items (factura_id, sku, nombre, cantidad, seccion, bodega_id)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `, [fac.id, it.sku || 'SKU-GEN', it.nombre, Number(it.cantidad), it.seccion, bodegaId]);
      fac.items.push(itemRows[0]);
    }

    const { rows: histRows } = await client.query(`
      INSERT INTO factura_historial (factura_id, estado, detalle)
      VALUES ($1, 'pendiente', $2) RETURNING *
    `, [fac.id, `Factura generada por ${cajero}. Enviada a Vitrina.`]);
    fac.historial.push(histRows[0]);

    await client.query('COMMIT');
    return res.status(201).json(fac);
  } catch (error) {
    await client.query('ROLLBACK');
    return next(new ApiError(500, error.message));
  } finally {
    client.release();
  }
}

export async function cambiarEstadoFactura(req, res, next) {
  const client = await getDbClient();
  if (!client) return next(new ApiError(500, 'BD no disponible'));

  let lockAcquired = false;

  try {
    await client.query('BEGIN');

    const { rows: facRows } = await client.query(`
      SELECT * FROM facturas WHERE id::text = $1 OR numero_factura = $1 LIMIT 1 FOR UPDATE
    `, [id]);

    if (facRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Factura con ID "${req.params.id}" no encontrada.` });
    }

    const fac = facRows[0];
    fac.numeroFactura = fac.numero_factura;

    const { rows: itemsRows } = await client.query('SELECT * FROM factura_items WHERE factura_id = $1', [fac.id]);
    fac.items = itemsRows;

    const { nuevoEstado, usuario = 'Caja', motivoFaltante } = req.body;
    const esPasoASello = nuevoEstado === 'entregada' || nuevoEstado === 'ENTREGADA Y SELLADA' || nuevoEstado === 'Sello verificado';

    if (esPasoASello) {
      if (fac.sellada || fac.estado === 'ENTREGADA Y SELLADA') {
        await client.query('ROLLBACK');
        return res.status(200).json({
          mensaje: `Factura ${fac.numeroFactura} ya fue sellada previamente. Operación idempotente.`,
          factura: fac,
          yaSellada: true
        });
      }

      if (fac.estado !== 'lista_sello') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Solo facturas en estado "lista_sello" pueden pasar a "entregada". Estado actual: "${fac.estado}".`
        });
      }

      const itemsADescontar = fac.items.map((it) => ({
        sku: it.sku,
        bodegaId: it.bodega_id || 1,
        cantidad: it.cantidad,
        nombre: it.nombre
      }));

      try {
        await descontarInventario({
          items: itemsADescontar,
          origen: 'venta_mostrador',
          referenciaId: fac.numeroFactura
        });
      } catch (errStock) {
        await client.query('ROLLBACK');
        if (errStock instanceof StockInsuficienteError) {
          const apiErr = new ApiError(409, errStock.message);
          apiErr.detalles = errStock.detalles;
          return next(apiErr);
        }
        throw errStock;
      }

      const { rows: updateRows } = await client.query(`
        UPDATE facturas 
        SET estado = 'ENTREGADA Y SELLADA', sellada = TRUE, fecha_sello = NOW(), fecha_entrega_final = NOW(), sello_confirmado_por = $1, updated_at = NOW() 
        WHERE id = $2 RETURNING *
      `, [usuario, fac.id]);
      
      await client.query(`
        INSERT INTO factura_historial (factura_id, estado, detalle)
        VALUES ($1, 'ENTREGADA Y SELLADA', $2)
      `, [fac.id, `Sello físico verificado por ${usuario}. Inventario descontado con éxito.`]);

      await client.query('COMMIT');
      return res.json({
        mensaje: `Factura ${fac.numeroFactura} sellada y entregada. Inventario descontado.`,
        factura: { ...updateRows[0], numeroFactura: updateRows[0].numero_factura }
      });
    }

    if (nuevoEstado === 'en_vitrina') {
      const { rows: updateRows } = await client.query(`
        UPDATE facturas SET estado = 'en_vitrina', operario_vitrina = $1, updated_at = NOW() WHERE id = $2 RETURNING *
      `, [usuario, fac.id]);
      
      await client.query(`
        INSERT INTO factura_historial (factura_id, estado, detalle) VALUES ($1, 'en_vitrina', $2)
      `, [fac.id, `Alistamiento iniciado por ${usuario}.`]);

      await client.query('COMMIT');
      return res.json({ ...updateRows[0], numeroFactura: updateRows[0].numero_factura });
    }

    if (nuevoEstado === 'lista_sello') {
      const { rows: updateRows } = await client.query(`
        UPDATE facturas SET estado = 'lista_sello', updated_at = NOW() WHERE id = $1 RETURNING *
      `, [fac.id]);
      
      await client.query(`
        INSERT INTO factura_historial (factura_id, estado, detalle) VALUES ($1, 'lista_sello', $2)
      `, [fac.id, `Vitrina confirmó entrega completa física. Esperando sello en Facturación.`]);

      await client.query('COMMIT');
      return res.json({ ...updateRows[0], numeroFactura: updateRows[0].numero_factura });
    }

    if (nuevoEstado === 'faltante') {
      const { rows: updateRows } = await client.query(`
        UPDATE facturas SET estado = 'faltante', motivo_faltante = $1, updated_at = NOW() WHERE id = $2 RETURNING *
      `, [motivoFaltante || 'Faltante de stock reportado por Vitrina', fac.id]);
      
      await client.query(`
        INSERT INTO factura_historial (factura_id, estado, detalle) VALUES ($1, 'faltante', $2)
      `, [fac.id, `FALTANTE REPORTADO: ${motivoFaltante || 'Faltante de stock reportado por Vitrina'}. Factura congelada fuera de flujo.`]);

      await client.query('COMMIT');
      return res.json({ ...updateRows[0], numeroFactura: updateRows[0].numero_factura });
    }

    await client.query('ROLLBACK');
    return res.status(400).json({ error: `Estado "${nuevoEstado}" no reconocido.` });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error actualizando estado de factura:', error);
    return next(new ApiError(500, error.message));
  } finally {
    if (client) client.release();
  }
}
