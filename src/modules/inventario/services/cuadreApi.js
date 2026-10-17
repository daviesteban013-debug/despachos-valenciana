import { jwtDecode } from 'jwt-decode';

// Cliente HTTP del módulo Cuadre de Inventario.
// Sin datos de respaldo: si el servidor falla, se lanza el error para mostrarlo.
const API = `${import.meta.env.VITE_API_URL || ''}/api/cuadre`;

function token() {
  try {
    const u = JSON.parse(localStorage.getItem('wms_google_user'));
    const t = u?.token || u?.credential;
    if (!t) return null;
    const { exp } = jwtDecode(t);
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('wms_google_user');
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

async function pedir(ruta, { method = 'GET', body, form } = {}) {
  const t = token();
  const headers = {};
  if (t) headers.Authorization = `Bearer ${t}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API}${ruta}`, {
      method,
      headers,
      body: form || (body !== undefined ? JSON.stringify(body) : undefined)
    });
  } catch {
    throw new Error('No hay conexión con el servidor. Revisa la red e intenta de nuevo.');
  }

  if (res.status === 401) {
    if (localStorage.getItem('wms_google_user')) {
      localStorage.removeItem('wms_google_user');
      window.dispatchEvent(new CustomEvent('wms:auth-expired'));
    }
    throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error del servidor (${res.status})`);
  }
  return res;
}

const json = async (ruta, opciones) => (await pedir(ruta, opciones)).json();

export const cuadreApi = {
  permisos: () => json('/permisos'),
  bodegas: () => json('/bodegas'),
  buscarArticulos: (q) => json(`/articulos?q=${encodeURIComponent(q)}&limite=15`),

  jornadas: () => json('/jornadas'),
  jornada: (id) => json(`/jornadas/${id}`),
  crearJornada: (datos) => json('/jornadas', { method: 'POST', body: datos }),
  actualizarJornada: (id, datos) => json(`/jornadas/${id}`, { method: 'PATCH', body: datos }),
  importar: (id, { articulos, existencias }) => {
    const form = new FormData();
    if (articulos) form.append('articulos', articulos);
    if (existencias) form.append('existencias', existencias);
    return json(`/jornadas/${id}/importar`, { method: 'POST', form });
  },

  planillas: (jornadaId) => json(`/jornadas/${jornadaId}/planillas`),
  crearPlanilla: (jornadaId, datos) => json(`/jornadas/${jornadaId}/planillas`, { method: 'POST', body: datos }),
  planilla: (id) => json(`/planillas/${id}`),
  actualizarPlanilla: (id, datos) => json(`/planillas/${id}`, { method: 'PATCH', body: datos }),
  agregarLinea: (planillaId, datos) => json(`/planillas/${planillaId}/lineas`, { method: 'POST', body: datos }),
  actualizarLinea: (id, datos) => json(`/lineas/${id}`, { method: 'PATCH', body: datos }),
  eliminarLinea: (id) => json(`/lineas/${id}`, { method: 'DELETE' }),

  cuadre: (jornadaId, filtros = {}) => {
    const p = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) p.append(k, v); });
    return json(`/jornadas/${jornadaId}/cuadre?${p.toString()}`);
  },
  crearReconteo: (jornadaId, datos) => json(`/jornadas/${jornadaId}/reconteos`, { method: 'POST', body: datos }),
  exportar: async (jornadaId) => {
    const res = await pedir(`/jornadas/${jornadaId}/exportar`);
    const nombre = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'Cuadre.xlsx';
    return { blob: await res.blob(), nombre };
  }
};

/** Formato de cantidades: hasta 4 decimales, separador colombiano. */
export const formatoCantidad = (n) =>
  n === null || n === undefined ? '—' : Number(n).toLocaleString('es-CO', { maximumFractionDigits: 4 });
