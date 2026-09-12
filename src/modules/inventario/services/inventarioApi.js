import { CATALOGO_PRODUCTOS_350, STOCK_INICIAL_POR_BODEGA } from '../data/catalogo350.js';

// Cliente de API HTTP hacia el backend Express en la nube / localhost
const API_BASE = '/api/inventario';
const LOCAL_STORAGE_STOCK_KEY = 'valenciana_inventario_stock_v1';
const LOCAL_STORAGE_DIFERENCIAS_KEY = 'valenciana_inventario_diferencias_v1';

// BODEGAS FIJAS OFICIALES
const BODEGAS_SISTEMA = [
  { id: 1, codigo: 'BOD-MAT', nombre: 'Materiales de Construcción', seccion_slug: 'materiales_construccion' },
  { id: 2, codigo: 'BOD-PIN', nombre: 'Pinturas', seccion_slug: 'pinturas' },
  { id: 3, codigo: 'BOD-HER', nombre: 'Herramienta Eléctrica', seccion_slug: 'herramienta_electrica' },
  { id: 4, codigo: 'BOD-PLO', nombre: 'Plomería', seccion_slug: 'plomeria' },
  { id: 5, codigo: 'BOD-ELE', nombre: 'Eléctrico', seccion_slug: 'electrico' },
  { id: 6, codigo: 'BOD-JAR', nombre: 'Jardín y Exteriores', seccion_slug: 'jardin_exteriores' },
  { id: 7, codigo: 'BOD-FER', nombre: 'Ferretería General', seccion_slug: 'ferreteria_general' }
];

function obtenerMapaStockLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STOCK_KEY);
    if (raw) return new Map(JSON.parse(raw));
  } catch (e) {}

  const mapa = new Map();
  STOCK_INICIAL_POR_BODEGA.forEach((s) => {
    mapa.set(`${s.sku}__${s.bodega_id}`, s.cantidad);
  });
  return mapa;
}

function guardarMapaStockLocal(mapa) {
  try {
    localStorage.setItem(LOCAL_STORAGE_STOCK_KEY, JSON.stringify(Array.from(mapa.entries())));
  } catch (e) {}
}

export async function obtenerInventario({ seccion = 'todas', buscar = '', sku = '' } = {}) {
  try {
    const params = new URLSearchParams();
    if (seccion && seccion !== 'todas') params.append('seccion', seccion);
    if (buscar) params.append('buscar', buscar);
    if (sku) params.append('sku', sku);

    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch (e) {}

  // Fallback cliente
  const mapaStock = obtenerMapaStockLocal();
  let productos = [];

  for (const prod of CATALOGO_PRODUCTOS_350) {
    if (sku && prod.sku.toUpperCase() !== sku.toUpperCase()) continue;
    if (seccion && seccion !== 'todas' && prod.categoria_slug !== seccion) continue;
    if (buscar) {
      const q = buscar.toLowerCase();
      if (!prod.nombre.toLowerCase().includes(q) && !prod.sku.toLowerCase().includes(q)) continue;
    }

    const desgloseBodegas = BODEGAS_SISTEMA.map((b) => ({
      bodega_id: b.id,
      codigo_bodega: b.codigo,
      nombre_bodega: b.nombre,
      seccion_slug: b.seccion_slug,
      cantidad: mapaStock.get(`${prod.sku}__${b.id}`) || 0
    }));

    const stockTotal = desgloseBodegas.reduce((acc, b) => acc + b.cantidad, 0);
    productos.push({
      ...prod,
      stock_total: stockTotal,
      stockTotal: stockTotal,
      stock: stockTotal,
      desglose_bodegas: desgloseBodegas
    });
  }

  return { total: productos.length, productos };
}

export async function obtenerDetalleProducto(sku) {
  try {
    const res = await fetch(`${API_BASE}/${sku}`);
    if (res.ok) return await res.json();
  } catch (e) {}

  const prod = CATALOGO_PRODUCTOS_350.find((p) => p.sku.toUpperCase() === sku.toUpperCase());
  if (!prod) throw new Error(`Producto ${sku} no encontrado`);

  const mapaStock = obtenerMapaStockLocal();
  const desgloseBodegas = BODEGAS_SISTEMA.map((b) => ({
    bodega_id: b.id,
    nombre_bodega: b.nombre,
    seccion_slug: b.seccion_slug,
    cantidad: mapaStock.get(`${prod.sku}__${b.id}`) || 0
  }));

  return {
    ...prod,
    stock_total: desgloseBodegas.reduce((acc, b) => acc + b.cantidad, 0),
    desglose_bodegas: desgloseBodegas
  };
}

export async function obtenerDiferencias(rol = 'admin') {
  try {
    const res = await fetch(`${API_BASE}/diferencias`, {
      headers: { 'x-user-role': rol }
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  let difs = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DIFERENCIAS_KEY);
    if (raw) difs = JSON.parse(raw);
  } catch (e) {}

  return {
    pendientes: difs.filter((d) => d.estado === 'pendiente'),
    historial: difs.filter((d) => d.estado !== 'pendiente'),
    importaciones: []
  };
}

export async function resolverDiferencia(id, accion, rol = 'admin') {
  try {
    const res = await fetch(`${API_BASE}/diferencias/${id}/resolver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': rol
      },
      body: JSON.stringify({ accion })
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  // Fallback cliente
  let difs = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DIFERENCIAS_KEY);
    if (raw) difs = JSON.parse(raw);
  } catch (e) {}

  const dif = difs.find((d) => d.id === Number(id));
  if (dif) {
    if (accion === 'aplicar') {
      const mapaStock = obtenerMapaStockLocal();
      mapaStock.set(`${dif.sku}__${dif.bodega_id}`, dif.cantidad_excel);
      guardarMapaStockLocal(mapaStock);
      dif.estado = 'aplicada';
    } else {
      dif.estado = 'descartada';
    }
    localStorage.setItem(LOCAL_STORAGE_DIFERENCIAS_KEY, JSON.stringify(difs));
    return { diferencia: dif };
  }
  throw new Error(`Diferencia ${id} no encontrada`);
}

export async function importarArchivoExcel(file, rol = 'admin') {
  const formData = new FormData();
  formData.append('archivo', file);

  const res = await fetch(`${API_BASE}/importar`, {
    method: 'POST',
    headers: { 'x-user-role': rol },
    body: formData
  });

  if (res.ok) return await res.json();
  const err = await res.json();
  throw new Error(err.error || 'Error al importar Excel');
}

export async function importarDemoExcel(rol = 'admin') {
  try {
    const res = await fetch(`${API_BASE}/importar-demo`, {
      method: 'POST',
      headers: { 'x-user-role': rol }
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  // Generar diferencias de prueba locales si el servidor no responde
  const difsPrueba = [
    {
      id: 1,
      sku: 'MAT-001',
      producto_nombre: 'Cemento Gris 50kg Argos Tipo UG',
      bodega_id: 1,
      bodega_nombre: 'Materiales de Construcción',
      cantidad_sistema: 142,
      cantidad_excel: 160,
      diferencia: 18,
      estado: 'pendiente'
    },
    {
      id: 2,
      sku: 'PIN-003',
      producto_nombre: 'Vinilo Tipo 1 Blanco Nieve Cuñete 5 Gal',
      bodega_id: 2,
      bodega_nombre: 'Pinturas',
      cantidad_sistema: 48,
      cantidad_excel: 35,
      diferencia: -13,
      estado: 'pendiente'
    },
    {
      id: 3,
      sku: 'HER-001',
      producto_nombre: 'Taladro Percutor 1/2" DeWalt',
      bodega_id: 3,
      bodega_nombre: 'Herramienta Eléctrica',
      cantidad_sistema: 28,
      cantidad_excel: 40,
      diferencia: 12,
      estado: 'pendiente'
    }
  ];

  localStorage.setItem(LOCAL_STORAGE_DIFERENCIAS_KEY, JSON.stringify(difsPrueba));
  return {
    resumen: {
      total_filas: 37,
      productos_nuevos: 2,
      productos_actualizados: 35,
      diferencias_detectadas: 3,
      estado: 'COMPLETADO'
    },
    diferencias: difsPrueba
  };
}

export async function ejecutarDescuentoTransaccional({ items, origen, referenciaId }) {
  try {
    const res = await fetch(`/api/facturas/${referenciaId}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nuevoEstado: 'entregada', usuario: 'Facturación' })
    });
    if (res.ok) return await res.json();
    const errJson = await res.json();
    throw new Error(errJson.error || 'Error al descontar stock');
  } catch (e) {
    if (e.message?.includes('stock') || e.message?.includes('insuficiente') || e.message?.includes('Bloqueo')) {
      throw e;
    }
  }

  // Descuento local transaccional (Todo o Nada con CHECK cantidad >= 0)
  const mapaStock = obtenerMapaStockLocal();

  // 1. Verificación
  for (const it of items) {
    const key = `${it.sku}__${it.bodegaId}`;
    const disponible = mapaStock.get(key) || 0;
    if (disponible < it.cantidad) {
      throw new Error(`Stock insuficiente para "${it.nombre || it.sku}" en bodega ${it.bodegaId}: disponible ${disponible}, solicitado ${it.cantidad}. Transacción abortada.`);
    }
  }

  // 2. Aplicación atómica
  for (const it of items) {
    const key = `${it.sku}__${it.bodegaId}`;
    const actual = mapaStock.get(key) || 0;
    mapaStock.set(key, actual - it.cantidad);
  }

  guardarMapaStockLocal(mapaStock);
  return { exito: true, origen, referenciaId, descontados: items };
}
