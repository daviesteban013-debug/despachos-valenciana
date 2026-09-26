// ============================================================================
// DATA MOCK WMS: LA VALENCIANA FERREHOGAR
// Dominio: Ferretería, Materiales de Construcción y Hogar
// ============================================================================

import { FLOTA_VEHICULOS } from './flota';

export const MOCK_BODEGAS = [
  { id: '00', codigo: '00', nombre: '00 - Patio Materiales Pesados (Los Patios)', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 6 },
  { id: '01', codigo: '01', nombre: '01 - Principal (Los Patios)', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 8 },
  { id: '02', codigo: '02', nombre: '02 - Almacén Central (Los Patios)', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 12 },
  { id: '03', codigo: '03', nombre: '03 - Bodega 1 (Los Patios)', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 6 },
  { id: '04', codigo: '04', nombre: '04 - Bodega 2 (Los Patios)', direccion: 'Los Patios, N. de Santander', capacidad_bahias: 4 }
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

export const INITIAL_DESPACHOS = [];

export const INITIAL_DEVOLUCIONES = [];

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

