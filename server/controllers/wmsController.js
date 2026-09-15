import { dbMemoria } from '../config/db.js';
import { 
  registrarDespachoEnPlantilla, 
  exportarPlantillaBuffer, 
  calibrarPlantillaReferencia
} from '../services/onedriveExcelService.js';
import { FLOTA_VEHICULOS } from '../config/flota.js';

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
    direccion_entrega: 'Av 5 # 10-45',
    jornada: 'AM',
    estado_actual: 'PENDIENTE',
    prioridad: 1,
    transportadora: 'Flota Propia',
    vehiculo_placa: 'WDO-069 ANDERSON',
    valor_total: 5840000,
    observaciones: '',
    fecha_despacho: new Date().toISOString().slice(0,10),
    bahia_asignada: 'Bodega A-01',
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
    direccion_entrega: 'Calle 15 # 2-30',
    jornada: 'PM',
    estado_actual: 'PENDIENTE',
    prioridad: 2,
    transportadora: 'Flota Propia',
    vehiculo_placa: 'TJP-653 GRIS',
    valor_total: 3950000,
    observaciones: '',
    fecha_despacho: new Date().toISOString().slice(0,10),
    bahia_asignada: 'Bodega A-02',
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
    direccion_entrega: 'Zona Industrial Lote 4',
    jornada: 'AM',
    estado_actual: 'PENDIENTE',
    prioridad: 1,
    transportadora: 'Flota Propia',
    vehiculo_placa: 'A20BB5E JEFERSON',
    valor_total: 8200000,
    observaciones: 'Entregar antes de mediodía',
    fecha_despacho: new Date().toISOString().slice(0,10),
    bahia_asignada: 'Bodega B-01',
    incidencia_activa: {
      tipo: 'FALTANTE',
      descripcion: 'Faltante reportado durante verificación física en muelle.',
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
    direccion_entrega: 'Av 10 Los Patios',
    jornada: 'PM',
    estado_actual: 'DESPACHADO',
    prioridad: 3,
    transportadora: 'Flota Propia',
    vehiculo_placa: 'WDP-097 JESUS',
    valor_total: 1250000,
    observaciones: '',
    fecha_despacho: new Date().toISOString().slice(0,10),
    bahia_asignada: 'Bodega B-03',
    hora_salida: new Date(Date.now() - 30 * 60000).toISOString(),
    despachado_por: 'Líder Despachos',
    incidencia_activa: null,
    sync_onedrive: {
      estado: 'SINCRONIZADO',
      fecha: new Date(Date.now() - 30 * 60000).toISOString(),
      placa: 'WDP-097 JESUS',
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

// POST /api/despachos
export async function crearDespacho(req, res) {
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
    
    if (!FLOTA_VEHICULOS.map(v => v.trim()).includes((vehiculo_placa || '').trim())) {
      return res.status(400).json({ error: `Vehículo no válido: "${vehiculo_placa}".` });
    }
    
    if (jornada !== 'AM' && jornada !== 'PM') {
      return res.status(400).json({ error: 'jornada debe ser "AM" o "PM".' });
    }

    const id = `dsp-${Date.now().toString().slice(-6)}`;
    const nuevoDespacho = {
      id,
      codigo_orden: codigo_orden || id.toUpperCase(),
      codigo_factura_erp: codigo_factura_erp || '',
      cliente_nombre,
      direccion_entrega,
      jornada,
      estado_actual: 'PENDIENTE',
      vehiculo_placa,
      bodega_id: bodega_id || null,
      valor_total: Number(valor_total) || 0,
      observaciones: observaciones || '',
      fecha_despacho: fecha_despacho || new Date().toISOString().slice(0, 10),
      incidencia_activa: null,
      sync_onedrive: null,
      items: items || []
    };

    dbMemoria.despachos.set(id, nuevoDespacho);
    return res.status(201).json(nuevoDespacho);
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

      if (!FLOTA_VEHICULOS.map(v => v.trim()).includes(placaAsignada)) {
        return res.status(400).json({
          error: `Vehículo "${placaAsignada}" inválido. Solo se permite una de las 4 opciones: ${FLOTA_VEHICULOS.join(', ')}`,
          placasPermitidas: FLOTA_VEHICULOS
        });
      }

      despacho.estado_actual = 'DESPACHADO';
      despacho.vehiculo_placa = placaAsignada;
      despacho.hora_salida = new Date().toISOString();
      despacho.despachado_por = usuario;

      // Automatización: registrar fila en la hoja de esa placa en OneDrive
      try {
        const resExcel = await registrarDespachoEnPlantilla({
          vehiculo: placaAsignada,
          numeroFactura: despacho.codigo_factura_erp || despacho.codigo_orden,
          clienteNombre: despacho.cliente_nombre,
          direccion: despacho.direccion_entrega || despacho.zona_entrega,
          jornada: despacho.jornada || 'AM',
          fechaDespacho: despacho.fecha_despacho,
          valorFactura: despacho.valor_total || 0,
          observaciones: despacho.observaciones
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

    const placa = (despacho.vehiculo_placa || '').trim().toUpperCase();
    if (!placa || !FLOTA_VEHICULOS.map(v => v.trim()).includes(placa)) {
      return res.status(400).json({ error: `Vehículo no válido o no asignado: "${placa}".` });
    }

    try {
      const resExcel = await registrarDespachoEnPlantilla({
        vehiculo: placa,
        numeroFactura: despacho.codigo_factura_erp || despacho.codigo_orden,
        clienteNombre: despacho.cliente_nombre,
        direccion: despacho.direccion_entrega || despacho.zona_entrega,
        jornada: despacho.jornada || 'AM',
        fechaDespacho: despacho.fecha_despacho,
        valorFactura: despacho.valor_total || 0,
        observaciones: despacho.observaciones
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
