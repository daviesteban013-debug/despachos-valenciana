import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'wms_valenciana_despachos_v3';

export function useOfflineQueue(despachosIniciales = []) {
  // Inicialización perezosa (Lazy initialization) para no bloquear el hilo principal
  const [despachos, setDespachos] = useState(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('[WMS-STORAGE] Fallo leyendo localStorage, usando estado inicial:', e);
    }
    return despachosIniciales;
  });

  // Sincronización asíncrona hacia localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(despachos));
    } catch (err) {
      console.warn('[WMS-STORAGE] Cuota excedida o error escribiendo localStorage:', err);
    }
  }, [despachos]);

  const actualizarDespachoLocal = useCallback((id, patchFn) => {
    setDespachos((prev) =>
      prev.map((item) => (item.id === id || item.numero_factura === id ? patchFn(item) : item))
    );
  }, []);

  const agregarDespachoLocal = useCallback((nuevoDespacho) => {
    setDespachos((prev) => [nuevoDespacho, ...prev]);
  }, []);

  return {
    despachos,
    setDespachos,
    actualizarDespachoLocal,
    agregarDespachoLocal
  };
}
