import { dbMemoria } from '../config/db.js';
import { 
  registrarDespachoEnPlantilla, 
  exportarPlantillaBuffer, 
  calibrarPlantillaReferencia,
  PLACAS_FLOTA 
} from '../services/onedriveExcelService.js';

// ============================================================================
// DOMINIO WMS: MODELO SIMPLIFICADO DE 2 ESTADOS (PENDIENTE / DESPACHADO)
// NOTA CRÍTICA DE ARQUITECTURA:
// Este controlador NUNCA descuenta inventario_por_bodega.
// El control de stock de despachos a domicilio se gestiona exclusivamente por la
// contadora a través de la plantilla Excel automatizada en OneDrive.
// El único punto del sistema que descuenta inventario es Facturación (Venta Mostrador)
// al confirmar el sello físico de la factura.
// ============================================================================

// Inicializar órdenes demo en modelo de 2 estados
const ORDENES_DEMO = [
  {
    id: 'dsp-101',
    codigo_orden: 'PVSW-6307',
    codigo_factura_erp: 'FE-80297',
    cliente_nombre: 'Ferretería La Campana S.A.S.',
    estado_actual: 'PENDIENTE',
    prioridad: 1,
    transportadora: 'Flota Propia',
    vehiculo_placa: 'WRO-482',
    valor_total: 5840000,
    peso_total_kg: 324.5,
    bultos_total: 12,
    bahia_asignada: 'Bodega A-01',
    horario_corte: new Date(Date.now() + 25 * 60000).toISOString(),
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { sku: 'MAT-001', nombre: 'Cemento Gris 50kg Argos', cantidad: 10 },
      { sku: 'PIN-001', nombre: 'Esmalte Sintético Rojo Galón', cantidad: 3 }
    ]
  },
  {
    id: 'dsp-102',
    codigo_orden: 'PVSW-6308',
    codigo_factura_erp: 'FE-80298',
    cliente_nombre: 'Obras y Estructuras Metálicas SAS',
    estado_actual: 'PENDIENTE',
    prioridad: 2,
    transportadora: 'Flota Propia',
    vehiculo_placa: 'STZ-910',
    valor_total: 3950000,
    peso_total_kg: 180.0,
    bultos_total: 6,
    bahia_asignada: 'Bodega A-02',
    horario_corte: new Date(Date.now() + 60 * 60000).toISOString(),
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { sku: 'HER-001', nombre: 'Taladro Percutor DeWalt', cantidad: 2 },
      { sku: 'ELE-001', nombre: 'Cable THHN #12 Rojo Rollo', cantidad: 4 }
    ]
  },
  {
    id: 'dsp-103',
    codigo_orden: 'PVSW-6309',
    codigo_factura_erp: 'FE-80299',
    cliente_nombre: 'Construcciones del Norte SAS',
    estado_actual: 'PENDIENTE',
    prioridad: 1,
    transportadora: 'Flota Propia',
    vehiculo_placa: 'ENV-301',
    valor_total: 8200000,
    peso_total_kg: 740.0,
    bultos_total: 24,
    bahia_asignada: 'Bodega B-01',
    horario_corte: new Date(Date.now() + 15 * 60000).toISOString(),
    incidencia_activa: {
      tipo: 'DIVERGENCIA_PESO',
      descripcion: 'Báscula registró +4% sobrepeso en bultos de varilla. Pendiente re-pesaje.',
      fecha: new Date().toISOString()
    },
    sync_onedrive: null,
    items: [
      { sku: 'MAT-002', nombre: 'Varilla Corrugada 1/2 pulg 6m', cantidad: 20 }
    ]
  },
  {
    id: 'dsp-104',
    codigo_orden: 'PVSW-6310',
    codigo_factura_erp: 'FE-80300',
    cliente_nombre: 'Pinturas y Acabados Los Patios',
    estado_actual: 'DESPACHADO',
    prioridad: 3,
    transportadora: 'Flota Propia',
    vehiculo_placa: 'MC-441',
    valor_total: 1250000,
    peso_total_kg: 65.0,
    bultos_total: 4,
    bahia_asignada: 'Bodega B-03',
    horario_corte: new Date(Date.now() - 40 * 60000).toISOString(),
    hora_salida: new Date(Date.now() - 30 * 60000).toISOString(),
    despachado_por: 'Líder Despachos',
    incidencia_activa: null,
    sync_onedrive: {
      estado: 'SINCRONIZADO',
      fecha: new Date(Date.now() - 30 * 60000).toISOString(),
      placa: 'MC-441',
      error: null
    },
    items: [
      { sku: 'PIN-002', nombre: 'Pintura Blanca Tipo 1 Balde', cantidad: 2 }
    ]
  }
];

// Cargar órdenes en memoria
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
// Transición estricta de 2 estados: PENDIENTE <-> DESPACHADO
// NO DESCUENTA INVENTARIO en ningún caso.
export async function cambiarEstadoDespacho(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado, vehiculoPlaca, usuario = 'Líder de Bodega' } = req.body;

    let despacho = dbMemoria.despachos.get(id);
    if (!despacho) {
      for (const d of dbMemoria.despachos.values()) {
        if (d.codigo_orden === id || d.codigo_factura_erp === id) {
          despacho = d;
          break;
        }
      }
    }

    if (!despacho) {
      return res.status(404).json({ error: `Orden de despacho con ID o código "${id}" no encontrada.` });
    }

    const estadoUpper = (nuevoEstado || '').toUpperCase();
    if (estadoUpper !== 'PENDIENTE' && estadoUpper !== 'DESPACHADO') {
      return res.status(400).json({
        error: `Estado no permitido: "${nuevoEstado}". El modelo WMS solo acepta "PENDIENTE" o "DESPACHADO".`
      });
    }

    // Si la transición es a DESPACHADO, validar vehículo de flota fija
    if (estadoUpper === 'DESPACHADO') {
      const placaAsignada = (vehiculoPlaca || despacho.vehiculo_placa || '').trim().toUpperCase();

      if (!placaAsignada) {
        return res.status(400).json({
          error: 'Debe asignar un vehículo de la flota antes de despachar.',
          placasPermitidas: PLACAS_FLOTA
        });
      }

      if (!PLACAS_FLOTA.includes(placaAsignada)) {
        return res.status(400).json({
          error: `Placa "${placaAsignada}" inválida. Solo se permite una de las 4 placas fijas: ${PLACAS_FLOTA.join(', ')}`,
          placasPermitidas: PLACAS_FLOTA
        });
      }

      despacho.estado_actual = 'DESPACHADO';
      despacho.vehiculo_placa = placaAsignada;
      despacho.hora_salida = new Date().toISOString();
      despacho.despachado_por = usuario;

      // Automatización: registrar fila en la hoja de esa placa en OneDrive
      try {
        const resExcel = await registrarDespachoEnPlantilla({
          placa: placaAsignada,
          numeroFactura: despacho.codigo_factura_erp || despacho.codigo_orden,
          fecha: despacho.hora_salida,
          valorFactura: despacho.valor_total || 0
        });

        despacho.sync_onedrive = {
          estado: 'SINCRONIZADO',
          fecha: new Date().toISOString(),
          placa: placaAsignada,
          destino: resExcel.destino,
          error: null
        };
      } catch (errExcel) {
        console.error('⚠️ Error escribiendo en OneDrive (operación no bloqueante):', errExcel.message);
        // IMPORTANTE: No se revierte el despacho. La orden queda como DESPACHADO, pero se marca pendiente de sync
        despacho.sync_onedrive = {
          estado: 'PENDIENTE',
          error: errExcel.message,
          placa: placaAsignada,
          intentos: 1,
          ultimo_intento: new Date().toISOString()
        };
      }

      return res.json({
        mensaje: `Orden ${despacho.codigo_orden} marcada como DESPACHADO.`,
        despacho,
        syncExcel: despacho.sync_onedrive
      });
    }

    // Regresar a PENDIENTE
    despacho.estado_actual = 'PENDIENTE';
    return res.json({
      mensaje: `Orden ${despacho.codigo_orden} restaurada a PENDIENTE.`,
      despacho
    });
  } catch (error) {
    console.error('Error en transición de estado WMS:', error);
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/despachos/:id/reintentar-onedrive
// Reintenta la sincronización con OneDrive si anteriormente falló
export async function reintentarSincronizacionOneDrive(req, res) {
  try {
    const { id } = req.params;
    let despacho = dbMemoria.despachos.get(id);
    if (!despacho) {
      for (const d of dbMemoria.despachos.values()) {
        if (d.codigo_orden === id || d.codigo_factura_erp === id) {
          despacho = d;
          break;
        }
      }
    }

    if (!despacho) {
      return res.status(404).json({ error: `Orden "${id}" no encontrada.` });
    }

    if (despacho.estado_actual !== 'DESPACHADO') {
      return res.status(400).json({ error: 'Solo se pueden sincronizar órdenes que ya estén en estado DESPACHADO.' });
    }

    const placa = despacho.vehiculo_placa;
    if (!placa || !PLACAS_FLOTA.includes(placa)) {
      return res.status(400).json({ error: `Placa no válida o no asignada: "${placa}".` });
    }

    try {
      const resExcel = await registrarDespachoEnPlantilla({
        placa,
        numeroFactura: despacho.codigo_factura_erp || despacho.codigo_orden,
        fecha: despacho.hora_salida || new Date().toISOString(),
        valorFactura: despacho.valor_total || 0
      });

      despacho.sync_onedrive = {
        estado: 'SINCRONIZADO',
        fecha: new Date().toISOString(),
        placa,
        destino: resExcel.destino,
        error: null
      };

      return res.json({
        mensaje: `Sincronización reintentada con éxito para la orden ${despacho.codigo_orden}.`,
        despacho,
        syncExcel: despacho.sync_onedrive
      });
    } catch (err) {
      despacho.sync_onedrive = {
        estado: 'PENDIENTE',
        error: err.message,
        placa,
        intentos: ((despacho.sync_onedrive?.intentos) || 1) + 1,
        ultimo_intento: new Date().toISOString()
      };

      return res.status(502).json({
        error: `Fallo al sincronizar con OneDrive: ${err.message}`,
        syncExcel: despacho.sync_onedrive
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/despachos/:id/incidencia
// Gestiona novedades/incidencias como bandera sin sacar la orden del flujo (PENDIENTE / DESPACHADO)
export async function gestionarIncidenciaDespacho(req, res) {
  try {
    const { id } = req.params;
    const { accion, tipo, descripcion, solucion, usuario = 'Líder WMS' } = req.body;

    let despacho = dbMemoria.despachos.get(id);
    if (!despacho) {
      for (const d of dbMemoria.despachos.values()) {
        if (d.codigo_orden === id || d.codigo_factura_erp === id) {
          despacho = d;
          break;
        }
      }
    }

    if (!despacho) {
      return res.status(404).json({ error: `Orden "${id}" no encontrada.` });
    }

    const nowIso = new Date().toISOString();

    if (accion === 'RESOLVER') {
      despacho.incidencia_activa = null;
      despacho.historial_incidencias = [
        ...(despacho.historial_incidencias || []),
        { tipo: 'RESOLUCION', solucion, usuario, fecha: nowIso }
      ];
      return res.json({ mensaje: 'Incidencia resuelta.', despacho });
    }

    // Registrar incidencia
    despacho.incidencia_activa = {
      tipo: tipo || 'NOVEDAD_GENERAL',
      descripcion: descripcion || 'Novedad registrada en despacho',
      reportado_por: usuario,
      fecha: nowIso
    };

    despacho.historial_incidencias = [
      ...(despacho.historial_incidencias || []),
      { tipo, descripcion, usuario, fecha: nowIso }
    ];

    return res.json({ mensaje: 'Incidencia reportada como bandera sobre la orden.', despacho });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/despachos/exportar-plantilla
// Permite descargar bajo demanda una copia del archivo Excel actual con las 4 hojas
export async function exportarPlantillaExcel(req, res) {
  try {
    const buffer = await exportarPlantillaBuffer();

    const nombreArchivo = `Plantilla_Despachos_Vehiculos_${new Date().toISOString().substring(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
  } catch (error) {
    console.error('Error exportando plantilla Excel:', error);
    return res.status(500).json({ error: `Error exportando plantilla: ${error.message}` });
  }
}

// POST /api/despachos/cargar-plantilla-referencia
// Permite cargar el archivo Excel real de la tesorera para calibración antes de producción
export async function cargarPlantillaReferenciaController(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Debe adjuntar un archivo Excel en el campo "archivo".' });
    }

    const resultado = await calibrarPlantillaReferencia(req.file.buffer);
    return res.json(resultado);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
