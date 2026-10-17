import { jwtDecode } from 'jwt-decode';

// Descuento de stock usado por la Venta Mostrador al confirmar el sello de una factura.
// Si el servidor falla, se lanza el error: nunca se simula un descuento en el navegador.
const API_URL = import.meta.env.VITE_API_URL || '';

function getGoogleToken() {
  try {
    const u = JSON.parse(localStorage.getItem('wms_google_user'));
    const token = u?.token || u?.credential;
    if (!token) return null;
    const { exp } = jwtDecode(token);
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('wms_google_user');
      return null;
    }
    return token;
  } catch (_) {
    return null;
  }
}

export async function ejecutarDescuentoTransaccional({ referenciaId }) {
  const token = getGoogleToken();
  const res = await fetch(`${API_URL}/api/facturas/${referenciaId}/estado`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ nuevoEstado: 'entregada', usuario: 'Facturación' })
  });
  if (res.status === 401 && localStorage.getItem('wms_google_user')) {
    localStorage.removeItem('wms_google_user');
    window.dispatchEvent(new CustomEvent('wms:auth-expired'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al descontar stock');
  return data;
}
