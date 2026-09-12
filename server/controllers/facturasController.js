import { dbMemoria } from '../config/db.js';
import { descontarInventario, StockInsuficienteError } from '../services/descuentoInventarioService.js';

// Mapa de sección a bodega ID
const SECCION_A_BODEGA = {
  materiales_construccion: 1,
  pinturas: 2,
  herramienta_electrica: 3,
  plomeria: 4,
  electrico: 5,
  jardin_exteriores: 6,
  ferreteria_general: 7
};

// Pre-cargar factura FE-80993 para prueba de sello e inventario
const FACTURAS_DEMO = [
  {
    id: 'FAC-80993',
    numero: 'FE-80993',
    numeroFactura: 'FE-80993',
    cliente: 'Electricistas Asociados del Oriente S.A.S.',
    fecha: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    estado: 'lista_sello',
    cajero: 'Caja 01 - Carlos Mendoza',
    operarioVitrina: 'Pedro (Vitrina Mostrador)',
    items: [
      {
        id: 'it-ele-80993',
        sku: 'ELE-001',
        nombre: 'Cable Cobre THHN #12 AWG Rojo Rollo 100m',
        producto: 'Cable Cobre THHN #12 AWG Rojo Rollo 100m',
        cantidad: 10,
        seccion: 'electrico',
        bodega_id: 5
      }
    ],
    historial: [
      {
        estado: 'pendiente',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Factura generada en Caja 01'
      },
      {
        estado: 'lista_sello',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Vitrina confirmó entrega completa física. Esperando sello en Facturación.'
      }
    ]
  }
];

FACTURAS_DEMO.forEach((f) => {
  if (!dbMemoria.facturas.has(f.id)) {
    dbMemoria.facturas.set(f.id, { ...f });
  }
});

// GET /api/facturas
export async function listarFacturas(req, res) {
  try {
    const facturas = Array.from(dbMemoria.facturas.values()).reverse();
    return res.json(facturas);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/facturas
export async function crearFactura(req, res) {
  try {
    const { numeroFactura, cliente, items, cajero = 'Facturación' } = req.body;

    if (!numeroFactura || !cliente || !items || items.length === 0) {
      return res.status(400).json({ error: 'Número de factura, cliente e ítems son obligatorios.' });
    }

    const id = `FAC-${Date.now()}`;
    const nuevaFactura = {
      id,
      numeroFactura,
      cliente,
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      cajero,
      items: items.map((it, idx) => ({
        id: `it-${Date.now()}-${idx}`,
        sku: it.sku || `SKU-${idx}`,
        nombre: it.nombre,
        cantidad: Number(it.cantidad),
        seccion: it.seccion,
        bodega_id: SECCION_A_BODEGA[it.seccion] || 1
      })),
      historial: [
        {
          estado: 'pendiente',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          detalle: `Factura generada por ${cajero}. Enviada a Vitrina.`
        }
      ]
    };

    dbMemoria.facturas.set(id, nuevaFactura);
    return res.status(201).json(nuevaFactura);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /api/facturas/:id/estado
export async function cambiarEstadoFactura(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado, usuario = 'Caja', motivoFaltante } = req.body;

    let fac = dbMemoria.facturas.get(id);
    if (!fac) {
      // Buscar por numeroFactura si no se encontró por ID
      for (const f of dbMemoria.facturas.values()) {
        if (f.numeroFactura === id) {
          fac = f;
          break;
        }
      }
    }

    if (!fac) {
      return res.status(404).json({ error: `Factura con ID "${id}" no encontrada.` });
    }

    // ========================================================================
    // TRANSICIÓN A 'ENTREGADA' O 'ENTREGADA Y SELLADA': DISPARA EL DESCUENTO ATÓMICO
    // ========================================================================
    const esPasoASello = nuevoEstado === 'entregada' || nuevoEstado === 'ENTREGADA Y SELLADA' || nuevoEstado === 'Sello verificado';

    if (esPasoASello) {
      if (fac.estado !== 'lista_sello' && fac.estado !== 'ENTREGADA Y SELLADA') {
        return res.status(400).json({
          error: `Solo facturas en estado "lista_sello" pueden pasar a "entregada". Estado actual: "${fac.estado}".`
        });
      }

      // Preparar ítems para el servicio unificado de descuento
      const itemsADescontar = fac.items.map((it) => ({
        sku: it.sku || (dbMemoria.productos.get(it.sku) ? it.sku : 'MAT-001'),
        bodegaId: it.bodega_id || SECCION_A_BODEGA[it.seccion] || 1,
        cantidad: it.cantidad,
        nombre: it.nombre
      }));

      try {
        // Ejecutar descuento atómico con SELECT ... FOR UPDATE
        await descontarInventario({
          items: itemsADescontar,
          origen: 'venta_mostrador',
          referenciaId: fac.numeroFactura
        });
      } catch (errStock) {
        if (errStock instanceof StockInsuficienteError) {
          // LA TRANSACCIÓN FALLÓ: la factura se queda en lista_sello y no se descuenta nada
          return res.status(409).json({
            error: errStock.message,
            detalles: errStock.detalles,
            facturaEstado: fac.estado
          });
        }
        throw errStock;
      }

      // Si el descuento fue exitoso, confirmar estado entregada / sellada
      fac.estado = 'ENTREGADA Y SELLADA';
      fac.sellada = true;
      fac.fechaSello = new Date().toISOString();
      fac.fechaEntregaFinal = new Date().toISOString();
      fac.selloConfirmadoPor = usuario;
      fac.historial.push({
        estado: 'ENTREGADA Y SELLADA',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: `Sello físico verificado por ${usuario}. Inventario descontado con éxito.`
      });

      return res.json({
        mensaje: `Factura ${fac.numeroFactura} sellada y entregada. Inventario descontado.`,
        factura: fac
      });
    }

    // Transición a 'en_vitrina'
    if (nuevoEstado === 'en_vitrina') {
      fac.estado = 'en_vitrina';
      fac.operarioVitrina = usuario;
      fac.historial.push({
        estado: 'en_vitrina',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: `Alistamiento iniciado por ${usuario}.`
      });
      return res.json(fac);
    }

    // Transición a 'lista_sello'
    if (nuevoEstado === 'lista_sello') {
      fac.estado = 'lista_sello';
      fac.historial.push({
        estado: 'lista_sello',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: `Vitrina confirmó entrega completa física. Esperando sello en Facturación.`
      });
      return res.json(fac);
    }

    // Transición a 'faltante' (congelada)
    if (nuevoEstado === 'faltante') {
      fac.estado = 'faltante';
      fac.motivoFaltante = motivoFaltante || 'Faltante de stock reportado por Vitrina';
      fac.historial.push({
        estado: 'faltante',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: `FALTANTE REPORTADO: ${fac.motivoFaltante}. Factura congelada fuera de flujo.`
      });
      return res.json(fac);
    }

    return res.status(400).json({ error: `Estado "${nuevoEstado}" no reconocido.` });
  } catch (error) {
    console.error('Error actualizando estado de factura:', error);
    return res.status(500).json({ error: error.message });
  }
}
