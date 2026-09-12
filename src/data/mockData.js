// ============================================================================
// DATA MOCK WMS: LA VALENCIANA FERREHOGAR
// Dominio: Ferretería, Materiales de Construcción y Hogar
// ============================================================================

export const MOCK_BODEGAS = [
  { id: '01', codigo: '01', nombre: '01 - Principal (Cúcuta Centro)', direccion: 'Av. 5 #10-45 Centro', capacidad_bahias: 8 },
  { id: '02', codigo: '02', nombre: '02 - Almacén Central (Zona Franca)', direccion: 'Km 8 Vía Aeropuerto', capacidad_bahias: 12 },
  { id: '00', codigo: '00', nombre: '00 - Patio Materiales Pesados (Atalaya)', direccion: 'Anillo Vial Occidental Km 2', capacidad_bahias: 6 }
];

export const MOCK_VEHICULOS_RUTAS = [
  {
    id: 'rt-101',
    codigo_ruta: 'RUTA-ATALAYA-01',
    zona: 'Atalaya Occidental',
    vehiculo: {
      placa: 'WRO-482',
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
      placa: 'STZ-910',
      tipo: 'CAMIONETA',
      modelo: 'Chevrolet D-Max 4x4 Diésel',
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
      placa: 'ENV-301',
      tipo: 'CAMION_TURBO',
      modelo: 'Hino Dutro Pro 7.5T',
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
      placa: 'MC-441',
      tipo: 'MOTO',
      modelo: 'Motocarro Bajaj Torito Carga',
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
  // 1. EN COLA
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
    estado_actual: 'COLA',
    prioridad: 1, // Urgente
    horario_corte: addMinutes(24), // 24m -> ¡Alerta Roja parpadeante!
    bahia_asignada: 'Bodega A-01',
    numero_guia: 'GUIA-VAL-0918',
    peso_total_kg: 324.5,
    peso_bascula_kg: 325.1, // Tolerancia OK (+0.18%)
    valor_total: 5840000,
    picking_operario: null,
    packing_mesa: null,
    items: [
      { id: 'it-1', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 6, cantidad_auditada: 0, ubicacion_bodega: 'P06-E01-N1', peso_unitario_kg: 50.0, unidad: 'BUL' },
      { id: 'it-2', sku: 'SKU-VAR-12', descripcion_producto: 'Varilla Corrugada 1/2" x 6m Diaco W60', cantidad_solicitada: 4, cantidad_auditada: 0, ubicacion_bodega: 'P08-E02-N1', peso_unitario_kg: 5.9, unidad: 'UND' },
      { id: 'it-3', sku: 'SKU-DIS-COR', descripcion_producto: 'Caja Discos Corte Metal 4.5" DeWalt (x10)', cantidad_solicitada: 2, cantidad_auditada: 0, ubicacion_bodega: 'P02-E01-N4', peso_unitario_kg: 0.45, unidad: 'UND' }
    ],
    history: [
      { id: 'h-101', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'ERP Servintec', tiempo_estancia_seg: 180, timestamp: subMinutes(30), nota: 'Pedido comercial aprobado con despacho directo a obra' }
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
    transportadora: 'Coordinadora',
    ruta_id: 'rt-103',
    estado_actual: 'COLA',
    prioridad: 2, // Normal
    horario_corte: addMinutes(68), // 68m -> Ámbar
    bahia_asignada: 'Bodega B-01',
    numero_guia: 'GUIA-COO-448190',
    peso_total_kg: 186.0,
    peso_bascula_kg: 187.5, // Tolerancia OK
    valor_total: 7920000,
    picking_operario: null,
    packing_mesa: null,
    items: [
      { id: 'it-4', sku: 'SKU-IMP-COR', descripcion_producto: 'Manto Asfáltico Fibra Vidrio 3mm x 10m', cantidad_solicitada: 5, cantidad_auditada: 0, ubicacion_bodega: 'P06-E03-N2', peso_unitario_kg: 34.0, unidad: 'ROL' },
      { id: 'it-5', sku: 'SKU-PIN-PIN', descripcion_producto: 'Pintura Acrílica Viniltex Blanco Galón Pintuco', cantidad_solicitada: 3, cantidad_auditada: 0, ubicacion_bodega: 'P04-E02-N1', peso_unitario_kg: 5.1, unidad: 'GAL' }
    ],
    history: [
      { id: 'h-102', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'ERP Servintec', tiempo_estancia_seg: 300, timestamp: subMinutes(45), nota: 'Factura crédito radicada por tesorería' }
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
    estado_actual: 'COLA',
    prioridad: 3, // Consolidado
    horario_corte: addMinutes(190), // Verde
    bahia_asignada: 'Bodega A-02',
    numero_guia: 'GUIA-VAL-0922',
    peso_total_kg: 42.0,
    peso_bascula_kg: 42.0,
    valor_total: 2450000,
    picking_operario: null,
    packing_mesa: null,
    items: [
      { id: 'it-6', sku: 'SKU-CER-YAL', descripcion_producto: 'Cerradura Sobreponer Yale Clásica Derecha 110', cantidad_solicitada: 15, cantidad_auditada: 0, ubicacion_bodega: 'P02-E04-N3', peso_unitario_kg: 1.2, unidad: 'UND' },
      { id: 'it-7', sku: 'SKU-LLV-STE', descripcion_producto: 'Juego Llaves Boca Fija Stanley 8-24mm', cantidad_solicitada: 6, cantidad_auditada: 0, ubicacion_bodega: 'P02-E03-N2', peso_unitario_kg: 2.8, unidad: 'JGO' }
    ],
    history: [
      { id: 'h-103', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'ERP Servintec', tiempo_estancia_seg: 120, timestamp: subMinutes(20), nota: 'Pedido consolidado programado para la tarde' }
    ]
  },

  // 2. EN ESCOGIENDO
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
    estado_actual: 'PICKING',
    prioridad: 1, // Urgente
    horario_corte: addMinutes(38),
    bahia_asignada: 'Bodega A-01',
    numero_guia: 'GUIA-VAL-0915',
    peso_total_kg: 114.2,
    peso_bascula_kg: 114.2,
    valor_total: 8650000,
    picking_operario: 'Javier Gómez (RF-01)',
    packing_mesa: null,
    items: [
      { id: 'it-8', sku: 'SKU-TAL-DEW', descripcion_producto: 'Taladro Percutor Inalámbrico 20V Max DeWalt DCD778', cantidad_solicitada: 4, cantidad_auditada: 4, ubicacion_bodega: 'P01-E03-N2', peso_unitario_kg: 2.4, unidad: 'UND' },
      { id: 'it-9', sku: 'SKU-TUB-PVC', descripcion_producto: 'Tubo PVC Sanitario 3" x 3m Pavco', cantidad_solicitada: 25, cantidad_auditada: 18, ubicacion_bodega: 'P05-E05-N1', peso_unitario_kg: 3.8, unidad: 'UND' },
      { id: 'it-10', sku: 'SKU-GRI-CNA', descripcion_producto: 'Grifería Lavamanos Cuello Cisne Grival', cantidad_solicitada: 8, cantidad_auditada: 0, ubicacion_bodega: 'P03-E02-N3', peso_unitario_kg: 1.1, unidad: 'UND' }
    ],
    history: [
      { id: 'h-104', estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'ERP', tiempo_estancia_seg: 600, timestamp: subMinutes(80), nota: 'Orden de ferretería hidrosanitaria' },
      { id: 'h-105', estado_anterior: 'COLA', estado_nuevo: 'PICKING', usuario_operador: 'Javier Gómez (RF-01)', tiempo_estancia_seg: 840, timestamp: subMinutes(25), nota: 'Picking iniciado en pasillos P01, P03 y P05' }
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
    transportadora: 'TCC',
    ruta_id: 'rt-103',
    estado_actual: 'PICKING',
    prioridad: 2,
    horario_corte: addMinutes(115),
    bahia_asignada: 'Bodega B-01',
    numero_guia: 'GUIA-TCC-992014',
    peso_total_kg: 260.0,
    peso_bascula_kg: 260.0,
    valor_total: 4120000,
    picking_operario: 'Mariana Duque (RF-03)',
    packing_mesa: null,
    items: [
      { id: 'it-11', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 5, cantidad_auditada: 5, ubicacion_bodega: 'P06-E01-N1', peso_unitario_kg: 50.0, unidad: 'BUL' },
      { id: 'it-12', sku: 'SKU-VAR-12', descripcion_producto: 'Varilla Corrugada 1/2" x 6m Diaco W60', cantidad_solicitada: 2, cantidad_auditada: 1, ubicacion_bodega: 'P08-E02-N1', peso_unitario_kg: 5.9, unidad: 'UND' }
    ],
    history: [
      { id: 'h-106', estado_anterior: 'COLA', estado_nuevo: 'PICKING', usuario_operador: 'Mariana Duque (RF-03)', tiempo_estancia_seg: 420, timestamp: subMinutes(18), nota: 'Operario en zona de carga pesada' }
    ]
  },

  // 3. EN EMPACANDO
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
    estado_actual: 'PACKING',
    prioridad: 1, // Urgente
    horario_corte: addMinutes(18), // 18m -> ¡Urgente Crítico!
    bahia_asignada: 'Bodega B-03',
    numero_guia: 'GUIA-VAL-0909',
    peso_total_kg: 28.5,
    peso_bascula_kg: 28.6, // Báscula OK (+0.35%)
    valor_total: 3890000,
    picking_operario: 'Javier Gómez (RF-01)',
    packing_mesa: 'Mesa 01 (Báscula Certificada)',
    items: [
      { id: 'it-13', sku: 'SKU-TAL-DEW', descripcion_producto: 'Taladro Percutor Inalámbrico 20V Max DeWalt DCD778', cantidad_solicitada: 2, cantidad_auditada: 2, ubicacion_bodega: 'P01-E03-N2', peso_unitario_kg: 2.4, unidad: 'UND' },
      { id: 'it-14', sku: 'SKU-CER-YAL', descripcion_producto: 'Cerradura Sobreponer Yale Clásica Derecha 110', cantidad_solicitada: 8, cantidad_auditada: 8, ubicacion_bodega: 'P02-E04-N3', peso_unitario_kg: 1.2, unidad: 'UND' },
      { id: 'it-15', sku: 'SKU-DIS-COR', descripcion_producto: 'Caja Discos Corte Metal 4.5" DeWalt (x10)', cantidad_solicitada: 6, cantidad_auditada: 5, ubicacion_bodega: 'P02-E01-N4', peso_unitario_kg: 0.45, unidad: 'UND' }
    ],
    history: [
      { id: 'h-107', estado_anterior: 'COLA', estado_nuevo: 'PICKING', usuario_operador: 'Javier Gómez', tiempo_estancia_seg: 900, timestamp: subMinutes(50), nota: 'Recolección completa de herramientas' },
      { id: 'h-108', estado_anterior: 'PICKING', estado_nuevo: 'PACKING', usuario_operador: 'Sandra Torres (Mesa 01)', tiempo_estancia_seg: 720, timestamp: subMinutes(12), nota: 'Auditoría con pistola láser en curso' }
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
    estado_actual: 'PACKING',
    prioridad: 2,
    horario_corte: addMinutes(75),
    bahia_asignada: 'Bodega A-02',
    numero_guia: 'GUIA-VAL-0912',
    peso_total_kg: 51.0,
    peso_bascula_kg: 51.2,
    valor_total: 4780000,
    picking_operario: 'Mariana Duque (RF-03)',
    packing_mesa: 'Mesa 02',
    items: [
      { id: 'it-16', sku: 'SKU-PIN-PIN', descripcion_producto: 'Pintura Acrílica Viniltex Blanco Galón Pintuco', cantidad_solicitada: 10, cantidad_auditada: 10, ubicacion_bodega: 'P04-E02-N1', peso_unitario_kg: 5.1, unidad: 'GAL' }
    ],
    history: [
      { id: 'h-109', estado_anterior: 'PICKING', estado_nuevo: 'PACKING', usuario_operador: 'Alberto Rojas (Mesa 02)', tiempo_estancia_seg: 480, timestamp: subMinutes(15), nota: 'Paletizado y precintado de cuñetes y galones' }
    ]
  },

  // 4. LISTO EN BODEGA
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
    estado_actual: 'LISTO',
    prioridad: 1, // Urgente listo
    horario_corte: addMinutes(45),
    bahia_asignada: 'Bodega A-01',
    numero_guia: 'GUIA-VAL-0899',
    peso_total_kg: 650.0,
    peso_bascula_kg: 651.5,
    valor_total: 14200000,
    picking_operario: 'Javier Gómez (RF-01)',
    packing_mesa: 'Mesa 03',
    items: [
      { id: 'it-17', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 12, cantidad_auditada: 12, ubicacion_bodega: 'P06-E01-N1', peso_unitario_kg: 50.0, unidad: 'BUL' },
      { id: 'it-18', sku: 'SKU-VAR-12', descripcion_producto: 'Varilla Corrugada 1/2" x 6m Diaco W60', cantidad_solicitada: 8, cantidad_auditada: 8, ubicacion_bodega: 'P08-E02-N1', peso_unitario_kg: 5.9, unidad: 'UND' }
    ],
    history: [
      { id: 'h-110', estado_anterior: 'PACKING', estado_nuevo: 'LISTO', usuario_operador: 'Sandra Torres (Líder Empacando)', tiempo_estancia_seg: 920, timestamp: subMinutes(28), nota: 'Auditoría 100% conforme. Paletizado y ubicado en Bodega A-01' }
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
    transportadora: 'Coordinadora',
    ruta_id: 'rt-103',
    estado_actual: 'LISTO',
    prioridad: 2,
    horario_corte: addMinutes(95),
    bahia_asignada: 'Bodega B-01',
    numero_guia: 'GUIA-COO-448102',
    peso_total_kg: 95.0,
    peso_bascula_kg: 95.0,
    valor_total: 6200000,
    picking_operario: 'Mariana Duque (RF-03)',
    packing_mesa: 'Mesa 01',
    items: [
      { id: 'it-19', sku: 'SKU-TUB-PVC', descripcion_producto: 'Tubo PVC Sanitario 3" x 3m Pavco', cantidad_solicitada: 25, cantidad_auditada: 25, ubicacion_bodega: 'P05-E05-N1', peso_unitario_kg: 3.8, unidad: 'UND' }
    ],
    history: [
      { id: 'h-111', estado_anterior: 'PACKING', estado_nuevo: 'LISTO', usuario_operador: 'Alberto Rojas', tiempo_estancia_seg: 600, timestamp: subMinutes(35), nota: 'Rotulado con guía Coordinadora y precinto de seguridad' }
    ]
  },

  // 5. DESPACHADO
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
    estado_actual: 'DESPACHADO',
    prioridad: 1,
    horario_corte: subMinutes(40),
    bahia_asignada: 'Bodega A-01',
    numero_guia: 'GUIA-VAL-0880',
    manifiesto_despacho: 'MAN-VAL-2026-09-082',
    hora_salida: subMinutes(35),
    peso_total_kg: 1250.0,
    peso_bascula_kg: 1252.0,
    valor_total: 21500000,
    picking_operario: 'Javier Gómez (RF-01)',
    packing_mesa: 'Mesa 03',
    items: [
      { id: 'it-20', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 25, cantidad_auditada: 25, ubicacion_bodega: 'P06-E01-N1', peso_unitario_kg: 50.0, unidad: 'BUL' }
    ],
    history: [
      { id: 'h-112', estado_anterior: 'LISTO', estado_nuevo: 'DESPACHADO', usuario_operador: 'Líder Despachos', tiempo_estancia_seg: 450, timestamp: subMinutes(35), nota: 'Camión NHR WRO-482 cargado y despachado con remisión física y digital' }
    ]
  },

  // 6. INCIDENCIAS ACTIVAS / RETENCIÓN (2 órdenes)
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
    estado_actual: 'INCIDENCIA',
    prioridad: 1, // Urgente retenida
    horario_corte: addMinutes(12), // En 12 minutos
    bahia_asignada: 'Bodega Retención R-01',
    numero_guia: 'GUIA-VAL-0919',
    peso_total_kg: 18.0,
    peso_bascula_kg: 24.2, // Divergencia de báscula grave (+34.4%)
    valor_total: 3100000,
    picking_operario: 'Javier Gómez (RF-01)',
    packing_mesa: 'Mesa 01',
    incidencia_activa: {
      id: 'inc-101',
      tipo: 'DIVERGENCIA_PESO',
      descripcion: 'Báscula marca 24.2 kg pero el peso teórico de las cerraduras es 18.0 kg (+34% de exceso). Posible inclusión de producto no facturado en la caja.',
      reportado_por: 'Alberto Rojas (Aforo y Báscula)',
      fecha_reporte: subMinutes(10),
      resuelta: false
    },
    items: [
      { id: 'it-21', sku: 'SKU-CER-YAL', descripcion_producto: 'Cerradura Sobreponer Yale Clásica Derecha 110', cantidad_solicitada: 15, cantidad_auditada: 15, ubicacion_bodega: 'P02-E04-N3', peso_unitario_kg: 1.2, unidad: 'UND' }
    ],
    history: [
      { id: 'h-113', estado_anterior: 'PACKING', estado_nuevo: 'INCIDENCIA', usuario_operador: 'Alberto Rojas (Báscula)', tiempo_estancia_seg: 180, timestamp: subMinutes(10), nota: 'RETENCIÓN: Divergencia de peso > ±3% detectada en báscula de empaque' }
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
    transportadora: 'Servientrega',
    ruta_id: 'rt-102',
    estado_actual: 'INCIDENCIA',
    prioridad: 2,
    horario_corte: addMinutes(50),
    bahia_asignada: 'Bodega Retención R-02',
    numero_guia: 'GUIA-SER-881290',
    peso_total_kg: 150.0,
    peso_bascula_kg: 100.0, // Faltante de 1 bulto (-33%)
    valor_total: 4800000,
    picking_operario: 'Mariana Duque (RF-03)',
    packing_mesa: 'Mesa 02',
    incidencia_activa: {
      id: 'inc-102',
      tipo: 'FALTANTE',
      descripcion: 'Falta 1 bulto de Cemento Gris 50kg en el pallet recibido de pasillo P06. Stock físico en estante agotado.',
      reportado_por: 'Sandra Torres (Líder Packing)',
      fecha_reporte: subMinutes(14),
      resuelta: false
    },
    items: [
      { id: 'it-22', sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 3, cantidad_auditada: 2, ubicacion_bodega: 'P06-E01-N1', peso_unitario_kg: 50.0, unidad: 'BUL' }
    ],
    history: [
      { id: 'h-114', estado_anterior: 'PACKING', estado_nuevo: 'INCIDENCIA', usuario_operador: 'Sandra Torres', tiempo_estancia_seg: 240, timestamp: subMinutes(14), nota: 'BLOQUEO: Faltante de 1 saco de 50kg reportado a jefe de patio' }
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
