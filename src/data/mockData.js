// ============================================================================
// DATA MOCK WMS: LA VALENCIANA FERREHOGAR
// Dominio: Ferretería, Materiales de Construcción y Hogar
// ============================================================================

import { FLOTA_VEHICULOS } from './flota';

export const MOCK_BODEGAS = [
  { id: '00', codigo: '00', nombre: '00 - Patio Materiales Pesados (Atalaya)', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 6 },
  { id: '01', codigo: '01', nombre: '01 - Principal (Cúcuta Centro)', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 8 },
  { id: '02', codigo: '02', nombre: '02 - Almacén Central (Zona Franca)', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 12 },
  { id: '03', codigo: '03', nombre: '03 - Bodega Los Patios', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 6 },
  { id: '04', codigo: '04', nombre: '04 - Bodega El Zulia', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 4 }
];

export const MOCK_VEHICULOS_RUTAS = [
  {
    id: 'rt-101',
    codigo_ruta: 'RUTA-ATALAYA-01',
    zona: 'Atalaya Occidental',
    vehiculo: {
      placa: FLOTA_VEHICULOS[0],
      tipo: 'CAMION_NHR',
      modelo: 'Chevrolet NHR Turbo 4.5T',
      capacidad_kg: 4500
    },
    conductor: {
      nombre: 'Carlos Restrepo',
      cedula: '1.090.458.120',
      telefono: '+57 312 458 9021'
    },
    bahia_default: 'Bodega A-01',
    estado: 'EN_CURSO'
  },
  {
    id: 'rt-102',
    codigo_ruta: 'RUTA-PATIOS-CENTRO',
    zona: 'Los Patios & Centro',
    vehiculo: {
      placa: FLOTA_VEHICULOS[1],
      tipo: 'CAMIONETA',
      modelo: 'Chevrolet D-Max 1.8T',
      capacidad_kg: 1800
    },
    conductor: {
      nombre: 'Andrés Morales',
      cedula: '88.245.190',
      telefono: '+57 315 782 3341'
    },
    bahia_default: 'Bodega A-02',
    estado: 'PLANEADA'
  },
  {
    id: 'rt-103',
    codigo_ruta: 'RUTA-SALADO-IND',
    zona: 'Zona Industrial El Salado',
    vehiculo: {
      placa: FLOTA_VEHICULOS[2],
      tipo: 'CAMION_DUTRO',
      modelo: 'Hino Dutro 7.5T',
      capacidad_kg: 7500
    },
    conductor: {
      nombre: 'Jairo Peña',
      cedula: '13.489.120',
      telefono: '+57 320 119 4480'
    },
    bahia_default: 'Bodega B-01',
    estado: 'PLANEADA'
  },
  {
    id: 'rt-104',
    codigo_ruta: 'RUTA-EXPRESS-MOTO',
    zona: 'Reparto Express Urbano',
    vehiculo: {
      placa: FLOTA_VEHICULOS[3],
      tipo: 'MOTOCARRO',
      modelo: 'Motocarro Piaggio 500kg',
      capacidad_kg: 500
    },
    conductor: {
      nombre: 'Mateo Vargas',
      cedula: '1.093.812.301',
      telefono: '+57 310 992 5167'
    },
    bahia_default: 'Bodega B-03',
    estado: 'EN_CURSO'
  }
];

const now = new Date();
const addMinutes = (mins) => new Date(now.getTime() + mins * 60000).toISOString();
const subMinutes = (mins) => new Date(now.getTime() - mins * 60000).toISOString();

export const INITIAL_DESPACHOS = [
  {
    id: 'dsp-101',
    codigo_orden: 'PVSW-6307',
    codigo_factura_erp: 'FE-80297',
    cliente_nombre: 'Ferretería La Campana S.A.S.',
    cliente_codigo: 'CL-9004128',
    zona_entrega: 'Atalaya Occidental',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-101',
    vehiculo_placa: FLOTA_VEHICULOS[0],
    estado_actual: 'COLA',
    prioridad: 1, // Urgente
    bahia_asignada: 'Bodega A-01',
    numero_guia: 'GUIA-VAL-0918',
    valor_total: 5840000,
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { id: 'it-1', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 6, cantidad_auditada: 6, ubicacion_bodega: 'P06-E01-N1', unidad: 'BUL' },
      { id: 'it-2', sku: 'SKU-VAR-12', descripcion_producto: 'Varilla Corrugada 1/2" x 6m Diaco W60', cantidad_solicitada: 4, cantidad_auditada: 4, ubicacion_bodega: 'P08-E02-N1', unidad: 'UND' },
      { id: 'it-3', sku: 'SKU-DIS-COR', descripcion_producto: 'Caja Discos Corte Metal 4.5" DeWalt (x10)', cantidad_solicitada: 2, cantidad_auditada: 2, ubicacion_bodega: 'P02-E01-N4', unidad: 'UND' }
    ],
    history: [
      { id: 'h-101', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'ERP Servintec', tiempo_estancia_seg: 180, timestamp: subMinutes(30), nota: `Pedido comercial aprobado con despacho en Camión NHR ${FLOTA_VEHICULOS[0]}` }
    ]
  },
  {
    id: 'dsp-102',
    codigo_orden: 'PVSW-6310',
    codigo_factura_erp: '1M-56752',
    cliente_nombre: 'Constructora Viviendas del Norte',
    cliente_codigo: 'CL-8001923',
    zona_entrega: 'Zona Industrial El Salado',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-103',
    vehiculo_placa: FLOTA_VEHICULOS[2],
    estado_actual: 'COLA',
    prioridad: 2, // Normal
    bahia_asignada: 'Bodega B-01',
    numero_guia: 'GUIA-VAL-448190',
    valor_total: 7920000,
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { id: 'it-4', sku: 'SKU-IMP-COR', descripcion_producto: 'Manto Asfáltico Fibra Vidrio 3mm x 10m', cantidad_solicitada: 5, cantidad_auditada: 5, ubicacion_bodega: 'P06-E03-N2', unidad: 'ROL' },
      { id: 'it-5', sku: 'SKU-PIN-PIN', descripcion_producto: 'Pintura Acrílica Viniltex Blanco Galón Pintuco', cantidad_solicitada: 3, cantidad_auditada: 3, ubicacion_bodega: 'P04-E02-N1', unidad: 'GAL' }
    ],
    history: [
      { id: 'h-102', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'ERP Servintec', tiempo_estancia_seg: 300, timestamp: subMinutes(45), nota: `Factura crédito radicada para Hino Dutro ${FLOTA_VEHICULOS[2]}` }
    ]
  },
  {
    id: 'dsp-103',
    codigo_orden: 'PVSW-6314',
    codigo_factura_erp: 'FE-80305',
    cliente_nombre: 'Depósito & Ferretería El Diamante',
    cliente_codigo: 'CL-7009412',
    zona_entrega: 'Los Patios & Centro',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-102',
    vehiculo_placa: FLOTA_VEHICULOS[1],
    estado_actual: 'COLA',
    prioridad: 3, // Consolidado
    bahia_asignada: 'Bodega A-02',
    numero_guia: 'GUIA-VAL-0922',
    valor_total: 2450000,
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { id: 'it-6', sku: 'SKU-CER-YAL', descripcion_producto: 'Cerradura Sobreponer Yale Clásica Derecha 110', cantidad_solicitada: 15, cantidad_auditada: 15, ubicacion_bodega: 'P02-E04-N3', unidad: 'UND' },
      { id: 'it-7', sku: 'SKU-LLV-STE', descripcion_producto: 'Juego Llaves Boca Fija Stanley 8-24mm', cantidad_solicitada: 6, cantidad_auditada: 6, ubicacion_bodega: 'P02-E03-N2', unidad: 'JGO' }
    ],
    history: [
      { id: 'h-103', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'ERP Servintec', tiempo_estancia_seg: 120, timestamp: subMinutes(20), nota: `Pedido consolidado programado en D-Max ${FLOTA_VEHICULOS[1]}` }
    ]
  },
  {
    id: 'dsp-104',
    codigo_orden: 'PVSW-6299',
    codigo_factura_erp: 'FE-80280',
    cliente_nombre: 'Ingeniería y Diseños Frontera',
    cliente_codigo: 'CL-9002241',
    zona_entrega: 'Atalaya Occidental',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-101',
    vehiculo_placa: FLOTA_VEHICULOS[0],
    estado_actual: 'COLA',
    prioridad: 1, // Urgente
    bahia_asignada: 'Bodega A-01',
    numero_guia: 'GUIA-VAL-0915',
    valor_total: 8650000,
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { id: 'it-8', sku: 'SKU-TAL-DEW', descripcion_producto: 'Taladro Percutor Inalámbrico 20V Max DeWalt DCD778', cantidad_solicitada: 4, cantidad_auditada: 4, ubicacion_bodega: 'P01-E03-N2', unidad: 'UND' },
      { id: 'it-9', sku: 'SKU-TUB-PVC', descripcion_producto: 'Tubo PVC Sanitario 3" x 3m Pavco', cantidad_solicitada: 25, cantidad_auditada: 25, ubicacion_bodega: 'P05-E05-N1', unidad: 'UND' },
      { id: 'it-10', sku: 'SKU-GRI-CNA', descripcion_producto: 'Grifería Lavamanos Cuello Cisne Grival', cantidad_solicitada: 8, cantidad_auditada: 8, ubicacion_bodega: 'P03-E02-N3', unidad: 'UND' }
    ],
    history: [
      { id: 'h-104', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'ERP', tiempo_estancia_seg: 600, timestamp: subMinutes(80), nota: 'Listo para cargue en muelle' }
    ]
  },
  {
    id: 'dsp-105',
    codigo_orden: 'PVSW-6302',
    codigo_factura_erp: '1M-56740',
    cliente_nombre: 'Ferre-Materiales La Frontera',
    cliente_codigo: 'CL-8007714',
    zona_entrega: 'Zona Industrial El Salado',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-103',
    vehiculo_placa: FLOTA_VEHICULOS[2],
    estado_actual: 'COLA',
    prioridad: 2,
    bahia_asignada: 'Bodega B-01',
    numero_guia: 'GUIA-VAL-992014',
    valor_total: 4120000,
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { id: 'it-11', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 5, cantidad_auditada: 5, ubicacion_bodega: 'P06-E01-N1', unidad: 'BUL' },
      { id: 'it-12', sku: 'SKU-VAR-12', descripcion_producto: 'Varilla Corrugada 1/2" x 6m Diaco W60', cantidad_solicitada: 2, cantidad_auditada: 2, ubicacion_bodega: 'P08-E02-N1', unidad: 'UND' }
    ],
    history: [
      { id: 'h-106', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'Bodega Central', tiempo_estancia_seg: 420, timestamp: subMinutes(18), nota: 'Estiba lista en bahía de cargue' }
    ]
  },
  {
    id: 'dsp-106',
    codigo_orden: 'PVSW-6288',
    codigo_factura_erp: 'FE-80261',
    cliente_nombre: 'Remodelaciones & Acabados San José',
    cliente_codigo: 'CL-9005510',
    zona_entrega: 'Reparto Express Urbano',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-104',
    vehiculo_placa: FLOTA_VEHICULOS[3],
    estado_actual: 'COLA',
    prioridad: 1, // Urgente
    bahia_asignada: 'Bodega B-03',
    numero_guia: 'GUIA-VAL-0909',
    valor_total: 3890000,
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { id: 'it-13', sku: 'SKU-TAL-DEW', descripcion_producto: 'Taladro Percutor Inalámbrico 20V Max DeWalt DCD778', cantidad_solicitada: 2, cantidad_auditada: 2, ubicacion_bodega: 'P01-E03-N2', unidad: 'UND' },
      { id: 'it-14', sku: 'SKU-CER-YAL', descripcion_producto: 'Cerradura Sobreponer Yale Clásica Derecha 110', cantidad_solicitada: 8, cantidad_auditada: 8, ubicacion_bodega: 'P02-E04-N3', unidad: 'UND' },
      { id: 'it-15', sku: 'SKU-DIS-COR', descripcion_producto: 'Caja Discos Corte Metal 4.5" DeWalt (x10)', cantidad_solicitada: 6, cantidad_auditada: 6, ubicacion_bodega: 'P02-E01-N4', unidad: 'UND' }
    ],
    history: [
      { id: 'h-107', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'Líder Bodega', tiempo_estancia_seg: 900, timestamp: subMinutes(50), nota: `Asignado a reparto express motocarro ${FLOTA_VEHICULOS[3]}` }
    ]
  },
  {
    id: 'dsp-107',
    codigo_orden: 'PVSW-6292',
    codigo_factura_erp: '1M-56731',
    cliente_nombre: 'Ferretería El Tornillo Cúcuta',
    cliente_codigo: 'CL-7001890',
    zona_entrega: 'Los Patios & Centro',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-102',
    vehiculo_placa: FLOTA_VEHICULOS[1],
    estado_actual: 'COLA',
    prioridad: 2,
    bahia_asignada: 'Bodega A-02',
    numero_guia: 'GUIA-VAL-0912',
    valor_total: 4780000,
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { id: 'it-16', sku: 'SKU-PIN-PIN', descripcion_producto: 'Pintura Acrílica Viniltex Blanco Galón Pintuco', cantidad_solicitada: 10, cantidad_auditada: 10, ubicacion_bodega: 'P04-E02-N1', unidad: 'GAL' }
    ],
    history: [
      { id: 'h-109', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'Alberto Rojas', tiempo_estancia_seg: 480, timestamp: subMinutes(15), nota: 'Paletizado y listo en muelle' }
    ]
  },
  {
    id: 'dsp-108',
    codigo_orden: 'PVSW-6270',
    codigo_factura_erp: 'FE-80245',
    cliente_nombre: 'Constructora Bolívar Cúcuta',
    cliente_codigo: 'CL-8004412',
    zona_entrega: 'Atalaya Occidental',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-101',
    vehiculo_placa: FLOTA_VEHICULOS[0],
    estado_actual: 'COLA',
    prioridad: 1, // Urgente
    bahia_asignada: 'Bodega A-01',
    numero_guia: 'GUIA-VAL-0899',
    valor_total: 14200000,
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { id: 'it-17', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 12, cantidad_auditada: 12, ubicacion_bodega: 'P06-E01-N1', unidad: 'BUL' },
      { id: 'it-18', sku: 'SKU-VAR-12', descripcion_producto: 'Varilla Corrugada 1/2" x 6m Diaco W60', cantidad_solicitada: 8, cantidad_auditada: 8, ubicacion_bodega: 'P08-E02-N1', unidad: 'UND' }
    ],
    history: [
      { id: 'h-110', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'Líder Despacho', tiempo_estancia_seg: 920, timestamp: subMinutes(28), nota: `Listo para cargar en camión NHR ${FLOTA_VEHICULOS[0]}` }
    ]
  },
  {
    id: 'dsp-109',
    codigo_orden: 'PVSW-6275',
    codigo_factura_erp: '1M-56710',
    cliente_nombre: 'Almacén Ferretero El Samán',
    cliente_codigo: 'CL-9003318',
    zona_entrega: 'Zona Industrial El Salado',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-103',
    vehiculo_placa: FLOTA_VEHICULOS[2],
    estado_actual: 'COLA',
    prioridad: 2,
    bahia_asignada: 'Bodega B-01',
    numero_guia: 'GUIA-VAL-448102',
    valor_total: 6200000,
    incidencia_activa: null,
    sync_onedrive: null,
    items: [
      { id: 'it-19', sku: 'SKU-TUB-PVC', descripcion_producto: 'Tubo PVC Sanitario 3" x 3m Pavco', cantidad_solicitada: 25, cantidad_auditada: 25, ubicacion_bodega: 'P05-E05-N1', unidad: 'UND' }
    ],
    history: [
      { id: 'h-111', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'Alberto Rojas', tiempo_estancia_seg: 600, timestamp: subMinutes(35), nota: 'Preparado para despacho en ruta' }
    ]
  },
  {
    id: 'dsp-110',
    codigo_orden: 'PVSW-6250',
    codigo_factura_erp: 'FE-80210',
    cliente_nombre: 'Consorcio Vial Santanderes',
    cliente_codigo: 'CL-8009941',
    zona_entrega: 'Atalaya Occidental',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-101',
    vehiculo_placa: FLOTA_VEHICULOS[0],
    estado_actual: 'DESPACHADO',
    prioridad: 1,
    bahia_asignada: 'Bodega A-01',
    numero_guia: 'GUIA-VAL-0880',
    manifiesto_despacho: 'MAN-VAL-2026-09-082',
    hora_salida: subMinutes(35),
    valor_total: 21500000,
    incidencia_activa: null,
    sync_onedrive: {
      estado: 'SINCRONIZADO',
      fecha: subMinutes(35),
      placa: FLOTA_VEHICULOS[0],
      destino: 'OneDrive Cloud via Graph API',
      error: null
    },
    items: [
      { id: 'it-20', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 25, cantidad_auditada: 25, ubicacion_bodega: 'P06-E01-N1', unidad: 'BUL' }
    ],
    history: [
      { id: 'h-112', estado_anterior: 'COLA', estado_nuevo: 'DESPACHADO', usuario_operador: 'Líder Despachos', tiempo_estancia_seg: 450, timestamp: subMinutes(35), nota: `Camión NHR ${FLOTA_VEHICULOS[0]} despachado. Fila registrada en plantilla Excel de OneDrive.` }
    ]
  },
  {
    id: 'dsp-111',
    codigo_orden: 'PVSW-6304',
    codigo_factura_erp: 'FE-80290',
    cliente_nombre: 'Ferretería El Maestro Cúcuta',
    cliente_codigo: 'CL-9008819',
    zona_entrega: 'Atalaya Occidental',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-101',
    vehiculo_placa: FLOTA_VEHICULOS[0],
    estado_actual: 'COLA',
    prioridad: 1, // Urgente
    bahia_asignada: 'Bodega Retención R-01',
    numero_guia: 'GUIA-VAL-0919',
    valor_total: 3100000,
    incidencia_activa: {
      id: 'inc-101',
      tipo: 'FALTANTE',
      descripcion: 'Falta 1 unidad de Cerradura Sobreponer Yale en el pallet recibido. Stock físico en estante agotado.',
      reportado_por: 'Alberto Rojas',
      fecha_reporte: subMinutes(10),
      resuelta: false
    },
    sync_onedrive: null,
    items: [
      { id: 'it-21', sku: 'SKU-CER-YAL', descripcion_producto: 'Cerradura Sobreponer Yale Clásica Derecha 110', cantidad_solicitada: 15, cantidad_auditada: 15, ubicacion_bodega: 'P02-E04-N3', unidad: 'UND' }
    ],
    history: [
      { id: 'h-113', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'Alberto Rojas', tiempo_estancia_seg: 180, timestamp: subMinutes(10), nota: 'Novedad registrada: Faltante reportado' }
    ]
  },
  {
    id: 'dsp-112',
    codigo_orden: 'PVSW-6308',
    codigo_factura_erp: '1M-56748',
    cliente_nombre: 'Constructora Los Arrayanes S.A.',
    cliente_codigo: 'CL-8001123',
    zona_entrega: 'Los Patios & Centro',
    bodega_origen_id: '01',
    transportadora: 'Flota Propia',
    ruta_id: 'rt-102',
    vehiculo_placa: FLOTA_VEHICULOS[1],
    estado_actual: 'COLA',
    prioridad: 2,
    bahia_asignada: 'Bodega Retención R-02',
    numero_guia: 'GUIA-VAL-881290',
    valor_total: 4800000,
    incidencia_activa: {
      id: 'inc-102',
      tipo: 'FALTANTE',
      descripcion: 'Falta 1 bulto de Cemento Gris 50kg en el pallet recibido. Stock físico en estante agotado.',
      reportado_por: 'Sandra Torres (Líder Bodega)',
      fecha_reporte: subMinutes(14),
      resuelta: false
    },
    sync_onedrive: null,
    items: [
      { id: 'it-22', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 3, cantidad_auditada: 2, ubicacion_bodega: 'P06-E01-N1', unidad: 'BUL' }
    ],
    history: [
      { id: 'h-114', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'Sandra Torres', tiempo_estancia_seg: 240, timestamp: subMinutes(14), nota: 'Novedad registrada: Faltante de 1 saco de 50kg' }
    ]
  }
];

export const INITIAL_DEVOLUCIONES = [
  {
    id: 'dev-101',
    codigo_devolucion: 'DEV-VAL-041',
    despacho_codigo: 'PVSW-6210',
    cliente_nombre: 'Depósito Los Comuneros',
    transportadora: 'Flota Propia',
    motivo: 'NO_PAGO',
    estado: 'RECIBIDA',
    items_afectados: '10x Varillas Corrugadas 1/2" x 6m',
    valor_devolucion: 620000,
    observacion: 'Cliente no contaba con el efectivo al momento de la entrega en obra.',
    fecha_registro: subMinutes(120)
  },
  {
    id: 'dev-102',
    codigo_devolucion: 'DEV-VAL-042',
    despacho_codigo: 'PVSW-6205',
    cliente_nombre: 'Ferretería El Progreso',
    transportadora: 'Coordinadora',
    motivo: 'AVERIA',
    estado: 'SOLICITADA',
    items_afectados: '2x Galones Pintura Viniltex (Derrame en tapa por estiba)',
    valor_devolucion: 190000,
    observacion: 'Recipiente fracturado durante trayecto de transporte en camión.',
    fecha_registro: subMinutes(70)
  }
];

// ============================================================================
// CATÁLOGO E INVENTARIO INICIAL — SSOT DESDE EL CATÁLOGO COMPLETO DE 350 SKUs
// Se calcula stockTotal sumando la distribución por bodegas del catálogo maestro.
// ============================================================================
import { CATALOGO_INICIAL_350 } from '../../server/data/catalogoInicial.js';

function _buildInventarioDesde350() {
  const { productos, stockPorBodega } = CATALOGO_INICIAL_350;
  // Mapa: sku -> stockTotal sumando todas las bodegas
  const mapaStock = {};
  for (const entry of stockPorBodega) {
    mapaStock[entry.sku] = (mapaStock[entry.sku] || 0) + entry.cantidad;
  }
  return productos.map((prod, idx) => {
    const total = mapaStock[prod.sku] || 0;
    return {
      id: idx + 1,
      sku: prod.sku,
      nombre: prod.nombre,
      descripcion: prod.descripcion,
      categoria_slug: prod.categoria_slug,
      seccion: prod.categoria_slug,
      unidad_medida: prod.unidad_medida,
      precio_unitario: prod.precio_unitario,
      stockTotal: total,
      stock: total,
      stock_total: total
    };
  });
}

export const INITIAL_INVENTARIO = _buildInventarioDesde350();

// ============================================================================
// BANDEJA INICIAL DE FACTURAS EMITIDAS (CON FE-80993 PARA VALIDACIÓN DE SELLO)
// ============================================================================
export const INITIAL_FACTURAS_EMITIDAS = [
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
        seccion: 'electrico'
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
        detalle: 'Vitrina confirmó entrega completa física. Esperando confirmación de sello en Facturación.'
      }
    ]
  },
  {
    id: 'FAC-80291',
    numero: 'FE-80291',
    numeroFactura: 'FE-80291',
    cliente: 'Constructora Bolívar S.A.S.',
    fecha: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    estado: 'pendiente',
    cajero: 'Caja 01 - Carlos Mendoza',
    items: [
      {
        id: 'it-1',
        sku: 'MAT-001',
        nombre: 'Cemento Gris 50kg Argos Tipo UG',
        producto: 'Cemento Gris 50kg Argos Tipo UG',
        cantidad: 8,
        seccion: 'materiales_construccion'
      },
      {
        id: 'it-2',
        sku: 'PIN-001',
        nombre: 'Esmalte Sintético Pintulux Rojo Galón',
        producto: 'Esmalte Sintético Pintulux Rojo Galón',
        cantidad: 2,
        seccion: 'pinturas'
      }
    ],
    historial: [
      {
        estado: 'pendiente',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Factura generada en Caja 01'
      }
    ]
  }
];

