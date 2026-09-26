import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWmsSockets } from '../hooks/useWmsSockets';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import {
  INITIAL_DESPACHOS,
  INITIAL_DEVOLUCIONES,
  MOCK_VEHICULOS_RUTAS,
  MOCK_BODEGAS
} from '../data/mockData';
import { FLOTA_VEHICULOS } from '../data/flota';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WmsContext = createContext(null);

let globalAudioContext = null;
const initAudioContext = () => {
  if (typeof window !== 'undefined' && window.AudioContext && !globalAudioContext) {
    try {
      globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("AudioContext not supported or blocked");
    }
  }
  return globalAudioContext;
};

const getGoogleToken = () => {
  try {
    const u = JSON.parse(localStorage.getItem('wms_google_user'));
    return u ? (u.token || u.credential) : null;
  } catch (e) {
    return null;
  }
};

const apiFetch = async (url, options = {}) => {
  const token = getGoogleToken();
  const headers = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` })
  };
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Token inválido o expirado: limpiar sesión y recargar
    const wasLoggedIn = !!localStorage.getItem('wms_google_user');
    if (wasLoggedIn) {
      localStorage.removeItem('wms_google_user');
      window.location.reload();
    }
  }

  if (response.status === 403) {
    // Cuenta no autorizada (dominio/whitelist): mostrar error específico sin recargar
    // El componente que llama debe leer response.status === 403 para diferenciarlo del 401
    // No borramos la sesión aquí; el usuario puede necesitar ver el mensaje.
    console.warn('[WMS] 403 Forbidden: cuenta de Google no autorizada en el backend.');
  }
  
  return response;
};
export function WmsProvider({ children }) {
  const { despachos, setDespachos } = useOfflineQueue(INITIAL_DESPACHOS);

  // Estado de conexión con el backend
  const [backendOnline, setBackendOnline] = useState(true);
  // Flag para evitar reintentos simultáneos
  const retryingRef = React.useRef(false);

  // Fetch initial despachos from backend
  const fetchDespachos = useCallback(async () => {
    if (!getGoogleToken()) return;
    try {
      const res = await apiFetch(`${API_URL}/api/despachos`);
      if (res.ok) {
        const data = await res.json();
        setDespachos(data || []);
      }
    } catch (err) {
      console.warn('Error fetching despachos from backend, using local fallback:', err);
    }
  }, []);

  const [devoluciones, setDevoluciones] = useState([]);

  const fetchDevoluciones = useCallback(async () => {
    if (!getGoogleToken()) return;
    try {
      const res = await apiFetch(`${API_URL}/api/devoluciones`);
      if (res.ok) {
        const data = await res.json();
        setDevoluciones(data || []);
      }
    } catch (err) {
      console.warn('Error fetching devoluciones from backend:', err);
    }
  }, []);

  // Función de reintento automático para despachos PENDIENTE_DE_SYNC
  const reintentarDespachosPendientes = useCallback(async () => {
    if (retryingRef.current) return;
    const pendientes = JSON.parse(localStorage.getItem('wms_valenciana_despachos_v3') || '[]')
      .filter(d => d._sync_status === 'PENDIENTE_DE_SYNC');
    if (pendientes.length === 0) return;

    retryingRef.current = true;
    console.log(`[SYNC] Reintentando ${pendientes.length} despacho(s) pendiente(s)...`);

    for (const d of pendientes) {
      try {
        const res = await apiFetch(`${API_URL}/api/despachos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo_orden: d.codigo_orden,
            codigo_factura_erp: d.codigo_factura_erp,
            cliente_nombre: d.cliente_nombre,
            direccion_entrega: d.cliente_direccion || d.zona_entrega,
            jornada: d.jornada,
            vehiculo_placa: d.vehiculo_placa,
            bodega_id: d.bodega_origen_id,
            valor_total: d.valor_total,
            observaciones: d.observaciones,
            fecha_despacho: d.fecha_despacho,
            items: d.items
          })
        });

        if (res.ok) {
          const confirmado = await res.json();
          // Reemplazar el despacho offline con el confirmado por el servidor
          setDespachos(prev => prev.map(item =>
            item.id === d.id
              ? { ...confirmado, _sync_status: 'CONFIRMADO', _offline_id_reemplazado: d.id }
              : item
          ));
          console.log(`[SYNC] ✅ Despacho ${d.codigo_orden} confirmado en servidor.`);
        }
      } catch (err) {
        console.warn(`[SYNC] Reintento fallido para ${d.codigo_orden}:`, err.message);
      }
    }

    retryingRef.current = false;
  }, []);

  // Manejador de eventos WebSocket
  const handleWebSocketEvent = useCallback((data) => {
    console.log('⚡ WMS WebSocket Update:', data);
    fetchDespachos();
    if (data.action && data.action.includes('DEVOLUCION')) {
      fetchDevoluciones();
    }
  }, [fetchDespachos, fetchDevoluciones]);

  // Hook de Sockets
  useWmsSockets(handleWebSocketEvent, API_URL);

  useEffect(() => {
    fetchDespachos();
    fetchDevoluciones();

    // ── Reintento automático en background ──────────────────────────────────
    // 1. Cuando el navegador recupera conexión a Internet
    const handleOnline = () => {
      console.log('[SYNC] Conexión restaurada. Verificando backend...');
      setBackendOnline(true);
      reintentarDespachosPendientes();
    };
    window.addEventListener('online', handleOnline);

    // 2. Polling cada 30 s a /api/health para detectar que el backend volvió
    const healthInterval = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          if (!backendOnline) {
            setBackendOnline(true);
            console.log('[SYNC] Backend detectado online. Iniciando reintento...');
          }
          reintentarDespachosPendientes();
        }
      } catch {
        setBackendOnline(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(healthInterval);
    };
  }, [fetchDespachos, fetchDevoluciones, reintentarDespachosPendientes, backendOnline]);

  // Navegación Bottom Dock: 'waves' (Despachos) | 'incidents' (Novedades)
  const [activeDockTab, setActiveDockTab] = useState('waves');

  // Modo de visualización en Tablero: 'kanban' | 'list'
  const [wavesViewMode, setWavesViewMode] = useState('kanban');

  // Configuración operativa y filtros
  const [activeTurno, setActiveTurno] = useState('Diurno');
  const [selectedCarrier, setSelectedCarrier] = useState('TODAS');
  const [selectedZone, setSelectedZone] = useState('TODAS');
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modales y selección
  const [selectedDespachoId, setSelectedDespachoId] = useState(null);
  const [incidentModalTarget, setIncidentModalTarget] = useState(null);
  const [returnsDrawerOpen, setReturnsDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);



  // La persistencia de despachos ahora es manejada por useOfflineQueue
  const showToast = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.id === notification?.id ? null : curr));
    }, 4500);
  };

  // Sonido / respuesta táctil para interacción en bodega
  const playBeep = (freq = 880, type = 'sine') => {
    try {
      const ctx = initAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      }
      if (navigator.vibrate) {
        if (freq < 500) {
          navigator.vibrate([200, 100, 200]);
        } else {
          navigator.vibrate([50, 50, 50]);
        }
      }
    } catch (e) {
      // AudioContext policy fallback
    }
  };

  // ============================================================================
  // MODELO WMS DE 2 ESTADOS (PENDIENTE / DESPACHADO) + AUTOMATIZACIÓN ONEDRIVE
  // ============================================================================

  // Asignar vehículo validando contra las 4 placas fijas
  const asignarVehiculo = (despachoId, placa) => {
    const placaNormalizada = (placa || '').trim().toUpperCase();
    if (!FLOTA_VEHICULOS.map(v => v.trim().toUpperCase()).includes(placaNormalizada)) {
      showToast(`Placa no permitida: "${placa}". Placas válidas: ${FLOTA_VEHICULOS.join(', ')}`, 'warning');
      return;
    }

    setDespachos(prev =>
      prev.map(d => (d.id === despachoId ? { ...d, vehiculo_placa: placaNormalizada } : d))
    );
    showToast(`Vehículo [${placaNormalizada}] asignado a la orden.`, 'info');
  };

  // Helper: Sync Excel directo sin PostgreSQL.
  // Se usa como fallback cuando el endpoint principal falla por BD caída.
  const _intentarSyncExcelDirecto = async (despacho, placa, despachoId, nowIso) => {
    try {
      const res = await fetch(`${API_URL}/api/despachos/sync-excel-directo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculo: placa,
          numeroFactura: despacho.codigo_factura_erp || despacho.codigo_orden,
          clienteNombre: despacho.cliente_nombre || '',
          direccion: despacho.cliente_direccion || despacho.zona_entrega || '',
          valorFactura: despacho.valor_total || 0
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDespachos(prev =>
          prev.map(d => d.id === despachoId
            ? { ...d, sync_cloud: { estado: 'SINCRONIZADO', fecha: nowIso, destino: data.destino } }
            : d
          )
        );
        showToast(`✅ Registrado en Excel [${placa}] (modo offline).`, 'success');
      } else {
        throw new Error(data.error || 'Error desconocido en sync directo');
      }
    } catch (err) {
      console.error('[SYNC-DIRECTO] Falló también el endpoint directo:', err.message);
      // ⚠️ Marcar explícitamente como NO confirmado centralmente
      setDespachos(prev =>
        prev.map(d => d.id === despachoId
          ? {
              ...d,
              // _sync_status diferencia entre "confirmado en BD" vs "solo local"
              _sync_status: 'PENDIENTE_DE_SYNC',
              sync_cloud: { estado: 'PENDIENTE', error: err.message, placa, intentos: 1, ultimo_intento: nowIso }
            }
          : d
        )
      );
      // Toast honesto: el despacho NO está confirmado en el sistema central
      showToast(
        `⚠️ Sin confirmar en servidor. El despacho quedó solo en este dispositivo y se reintentará automáticamente.`,
        'warning'
      );
    }
  };

  // Acción principal: "Despachar" (PENDIENTE -> DESPACHADO + Guardado en plantilla Excel de Google Drive)
  // NOTA CRÍTICA: NO DESCUENTA INVENTARIO. El inventario se descuenta solo al sellar en mostrador.
  const despacharOrden = async (despachoId, vehiculoPlacaOverride = null, metadataOperador = 'Líder Bodega Valenciana') => {
    const targetDespacho = despachos.find(d => d.id === despachoId);
    if (!targetDespacho) return false;

    const placaFinal = (vehiculoPlacaOverride || targetDespacho.vehiculo_placa || '').trim().toUpperCase();

    if (!placaFinal || !FLOTA_VEHICULOS.map(v => v.trim().toUpperCase()).includes(placaFinal)) {
      playBeep(440, 'sawtooth');
      showToast(`Debe seleccionar uno de los vehículos permitidos (${FLOTA_VEHICULOS.join(', ')}) para despachar.`, 'warning');
      return false;
    }

    const nowIso = new Date().toISOString();

    // 1. Transición de estado inmediata en la interfaz
    setDespachos(prev =>
      prev.map(d => {
        if (d.id !== despachoId) return d;
        const newHistory = [
          ...(d.history || []),
          {
            id: `h-${Date.now()}`,
            estado_anterior: d.estado_actual,
            estado_nuevo: 'DESPACHADO',
            usuario_operador: metadataOperador,
            tiempo_estancia_seg: 300,
            timestamp: nowIso,
            nota: `Despachado en vehículo [${placaFinal}]. Sincronizando con plantilla Google Drive.`
          }
        ];

        return {
          ...d,
          estado_actual: 'DESPACHADO',
          vehiculo_placa: placaFinal,
          hora_salida: nowIso,
          sync_cloud: {
            estado: 'PENDIENTE',
            placa: placaFinal,
            fecha: nowIso,
            error: null
          },
          history: newHistory
        };
      })
    );

    playBeep(1046);
    showToast(`Orden ${targetDespacho.codigo_orden} despachada en ${placaFinal}.`, 'success');

    // 2. Disparo de guardado automático en la hoja de esa placa en Google Drive
    try {
      const response = await apiFetch(`${API_URL}/api/despachos/${despachoId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevoEstado: 'DESPACHADO',
          vehiculoPlaca: placaFinal,
          usuario: metadataOperador
        })
      });

      const data = await response.json();

      if (response.ok && data.syncExcel?.estado === 'SINCRONIZADO') {
        setDespachos(prev =>
          prev.map(d => (d.id === despachoId ? { ...d, sync_cloud: data.syncExcel } : d))
        );
        showToast(`✅ Fila registrada en hoja [${placaFinal}] de Google Drive.`, 'success');
      } else {
        // BD caída o sync falló → intentar endpoint directo sin PostgreSQL
        console.warn('[WMS] Endpoint principal falló. Intentando sync Excel directo...');
        await _intentarSyncExcelDirecto(targetDespacho, placaFinal, despachoId, nowIso);
      }
    } catch (err) {
      console.warn('[WMS] Error de red al contactar backend. Intentando sync Excel directo...', err.message);
      await _intentarSyncExcelDirecto(targetDespacho, placaFinal, despachoId, nowIso);
    }

    return true;
  };

  // Reintentar sincronización de orden fallida
  const reintentarSyncDrive = async (despachoId) => {
    const d = despachos.find(item => item.id === despachoId);
    if (!d) return;

    showToast(`Reintentando sincronización de ${d.codigo_orden} con Google Drive...`, 'info');

    try {
      const response = await apiFetch(`${API_URL}/api/despachos/${despachoId}/reintentar-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (response.ok) {
        setDespachos(prev =>
          prev.map(item => (item.id === despachoId ? { ...item, sync_cloud: data.syncExcel } : item))
        );
        playBeep(1046);
        showToast(`✅ Sincronizado exitosamente en plantilla Excel (${d.vehiculo_placa}).`, 'success');
      } else {
        setDespachos(prev =>
          prev.map(item => (item.id === despachoId ? { ...item, sync_cloud: data.syncExcel } : item))
        );
        playBeep(440, 'sawtooth');
        showToast(`Fallo al sincronizar: ${data.error || 'Error desconocido'}`, 'warning');
      }
    } catch (e) {
      showToast(`Error al reintentar: ${e.message}`, 'warning');
    }
  };

  // Descargar bajo demanda una copia física del archivo Excel con las 4 hojas
  const exportarCopiaExcel = async () => {
    showToast('Generando copia de la plantilla Excel de vehículos...', 'info');
    try {
      const response = await apiFetch(`${API_URL}/api/despachos/exportar-plantilla`);
      if (!response.ok) {
        throw new Error(`Error en servidor (${response.status})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plantilla_Despachos_Valenciana_${new Date().toISOString().substring(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Copia de la plantilla descargada exitosamente.', 'success');
    } catch (e) {
      showToast(`Error al descargar plantilla: ${e.message}`, 'warning');
    }
  };

  // Restaurar a PENDIENTE (en caso de error operacional en muelle)
  const restaurarACola = async (despachoId) => {
    const despachoAnterior = despachos.find(d => d.id === despachoId);
    if (!despachoAnterior) return;

    setDespachos(prev =>
      prev.map(d => {
        if (d.id !== despachoId) return d;
        return {
          ...d,
          estado_actual: 'PENDIENTE',
          hora_salida: null,
          sync_cloud: null
        };
      })
    );
    showToast('Orden devuelta a PENDIENTE.', 'info');

    try {
      const res = await apiFetch(`${API_URL}/api/despachos/${despachoId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoEstado: 'PENDIENTE' })
      });
      if (!res.ok) throw new Error('Falló en el servidor');
    } catch (err) {
      console.warn('Error restaurando estado en el backend:', err);
      setDespachos(prev => prev.map(d => d.id === despachoId ? despachoAnterior : d));
      showToast('Error al restaurar orden. Se ha revertido el cambio.', 'error');
    }
  };

  // Procesar devolución en logística inversa
  const procesarDevolucion = async (devolucionId, accion, notas = '') => {
    // Optimistic update
    setDevoluciones(prev =>
      prev.map(d => (d.id === devolucionId ? {
        ...d,
        estado: accion === 'REINGRESO_INVENTARIO' ? 'RESUELTO_REINGRESO' : 'RESUELTO_BAJA',
        notas_resolucion: notas
      } : d))
    );
    showToast(`Devolución gestionada con éxito.`, 'info');

    try {
      await apiFetch(`${API_URL}/api/devoluciones/${devolucionId}/procesar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, notas })
      });
    } catch (err) {
      console.warn('Error procesando devolución en backend:', err);
    }
  };

  // ============================================================================
  // GESTIÓN DE INCIDENCIAS (BANDERA INDEPENDIENTE - NO ALTERA EL ESTADO DE FLUJO)
  // ============================================================================
  const registrarIncidencia = async (despachoId, tipo, descripcion, metadataOperador = 'Auditor Bodega') => {
    playBeep(440, 'sawtooth');
    const nowIso = new Date().toISOString();
    const nuevaIncidencia = {
      tipo,
      descripcion,
      reportado_por: metadataOperador,
      timestamp: nowIso
    };

    setDespachos(prev =>
      prev.map(d => {
        if (d.id !== despachoId) return d;
        const newHistory = [
          ...(d.history || []),
          {
            id: `h-inc-${Date.now()}`,
            estado_anterior: d.estado_actual,
            estado_nuevo: d.estado_actual,
            usuario_operador: metadataOperador,
            tiempo_estancia_seg: 0,
            timestamp: nowIso,
            nota: `NOVEDAD REPORTADA (${tipo}): ${descripcion}`
          }
        ];
        return {
          ...d,
          incidencia_activa: nuevaIncidencia,
          history: newHistory
        };
      })
    );
    setIncidentModalTarget(null);
    showToast(`Novedad registrada en la orden: [${tipo}]`, 'warning');

    try {
      await apiFetch(`${API_URL}/api/despachos/${despachoId}/incidencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'REGISTRAR', tipo, descripcion, reportado_por: metadataOperador })
      });
    } catch (e) {
      // Offline fallback
    }
  };

  const resolverIncidencia = async (despachoId, solucion = '', metadataOperador = 'Líder Bodega') => {
    playBeep(987);
    const nowIso = new Date().toISOString();

    setDespachos(prev =>
      prev.map(d => {
        if (d.id !== despachoId) return d;
        const newHistory = [
          ...(d.history || []),
          {
            id: `h-res-${Date.now()}`,
            estado_anterior: d.estado_actual,
            estado_nuevo: d.estado_actual,
            usuario_operador: metadataOperador,
            tiempo_estancia_seg: 0,
            timestamp: nowIso,
            nota: `NOVEDAD RESUELTA: ${solucion || 'Aclarada y liberada en muelle'}`
          }
        ];
        return {
          ...d,
          incidencia_activa: null,
          history: newHistory
        };
      })
    );
    setIncidentModalTarget(null);
    showToast(`Novedad resuelta y despejada de la orden.`, 'success');

    try {
      await apiFetch(`${API_URL}/api/despachos/${despachoId}/incidencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'RESOLVER', solucion, reportado_por: metadataOperador })
      });
    } catch (e) {
      // Offline fallback
    }
  };



  // 1. Inserción de nueva orden conectada al backend
  const crearNuevoDespacho = async (payload) => {
    // Preparar variables antes del try/catch para que sean accesibles en ambos bloques
    const factura = (payload.numero_factura || '').trim().toUpperCase();
    const cliente = (payload.cliente_nombre || '').trim();
    const direccion = (payload.direccion_entrega || '').trim();
    const valor = Number(payload.valor_factura) || 0;
    const vehiculo = payload.vehiculo_placa || FLOTA_VEHICULOS[0];
    const jornada = payload.jornada || (new Date().getHours() < 12 ? 'AM' : 'PM');
    const bodega = payload.bodega_id || '01';
    const obs = (payload.observaciones || '').trim();
    const fechaDespacho = payload.fecha_despacho || new Date().toISOString().slice(0, 10);
    const randomNum = Math.floor(6400 + Math.random() * 600);

    const items = payload.items && payload.items.length > 0 
      ? payload.items.map((it, idx) => ({
          id: `it-${Date.now()}-${idx}`,
          sku: it.codigo,
          descripcion_producto: it.descripcion,
          cantidad_solicitada: it.cantidad || 1,
          cantidad_auditada: it.cantidad || 1,
          ubicacion_bodega: payload.bodega_id || 'DESPACHO',
          unidad: it.und_base || 'UND'
        }))
      : [
          {
            id: `it-${Date.now()}`,
            sku: 'SKU-PEDIDO',
            descripcion_producto: `Despacho ${factura}`,
            cantidad_solicitada: 1,
            cantidad_auditada: 1,
            ubicacion_bodega: 'DESPACHO',
            unidad: 'UND'
          }
        ];

    try {

      const res = await apiFetch(`${API_URL}/api/despachos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_orden: `PVSW-${randomNum}`,
          codigo_factura_erp: factura,
          cliente_nombre: cliente,
          direccion_entrega: direccion,
          jornada: jornada,
          vehiculo_placa: vehiculo,
          bodega_id: bodega,
          valor_total: valor,
          observaciones: obs,
          fecha_despacho: fechaDespacho,
          items: items
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error creando el despacho en el servidor');
      }

      const nuevaOrden = await res.json();

      // Completar datos de UI que no vienen del backend o que se manejan localmente para compatibilidad
      const ordenCompleta = {
        ...nuevaOrden,
        cliente_codigo: `CL-${Math.floor(7000000 + Math.random() * 3000000)}`,
        zona_entrega: direccion,
        bodega_origen_id: bodega,
        transportadora: 'Flota Propia',
        ruta_id: 'rt-101',
        prioridad: 2,
        bahia_asignada: 'Bodega A-01',
        numero_guia: `GUIA-VAL-${Math.floor(1000 + Math.random() * 9000)}`,
        history: [
          {
            id: `h-${Date.now()}`,
            estado_anterior: null,
            estado_nuevo: 'PENDIENTE',
            usuario_operador: 'Coordinador Logística',
            tiempo_estancia_seg: 0,
            timestamp: new Date().toISOString(),
            nota: `Pedido registrado. Vehículo: ${vehiculo}. Jornada: ${jornada}. Obs: ${obs || 'Sin observaciones'}`
          }
        ]
      };

      setDespachos((prev) => [ordenCompleta, ...prev]);
      playBeep(880, 'triangle');
      showToast(`✅ Despacho ${ordenCompleta.codigo_factura_erp || ordenCompleta.codigo_orden} creado con éxito.`, 'success');
      return ordenCompleta;

    } catch (error) {
      console.warn('Error al crear despacho en servidor (Activando Modo Offline):', error.message);

      // ⚠️ MODO OFFLINE HONESTO:
      // El despacho se guarda SOLO en este dispositivo con estado PENDIENTE_DE_SYNC.
      // NUNCA se presenta como confirmado. El reintento automático lo enviará al servidor
      // cuando la conexión se restablezca.
      const ordenCompleta = {
        id: `offline-${Date.now()}`,
        codigo_orden: `PVSW-${randomNum}`,
        codigo_factura_erp: factura,
        cliente_nombre: payload.cliente_nombre,
        cliente_direccion: payload.direccion_entrega,
        zona_entrega: payload.direccion_entrega,
        estado_actual: 'PENDIENTE',
        vehiculo_placa: payload.vehiculo_placa,
        bodega_origen_id: payload.bodega_id,
        valor_total: payload.valor_factura,
        jornada: payload.jornada,
        observaciones: payload.observaciones,
        fecha_despacho: fechaDespacho,
        transportadora: 'Flota Propia',
        ruta_id: 'rt-offline',
        prioridad: 2,
        bahia_asignada: 'Bodega (Offline)',
        numero_guia: `GUIA-OFF-${Math.floor(1000 + Math.random() * 9000)}`,
        items: items,
        sync_cloud: null,
        // Campo clave que identifica despachos sin confirmar en el servidor
        _sync_status: 'PENDIENTE_DE_SYNC',
        _sync_error: error.message,
        _sync_timestamp: new Date().toISOString()
      };

      setDespachos((prev) => [ordenCompleta, ...prev]);
      playBeep(440, 'sawtooth'); // beep de advertencia, no de éxito
      // Toast honesto: NO dice que fue un éxito
      showToast(
        `⚠️ El servidor no confirmó el registro. Despacho guardado solo en este dispositivo. Se reintentará automáticamente cuando haya conexión.`,
        'warning'
      );
      return ordenCompleta;
    }
  };

  // 2. Transición de estado a DESPACHADO
  const marcarComoDespachado = (despachoId) => {
    const nowIso = new Date().toISOString();
    setDespachos((prev) =>
      prev.map((orden) => {
        if (orden.id === despachoId) {
          const placa = orden.vehiculo_placa || FLOTA_VEHICULOS[0];
          return {
            ...orden,
            estado: 'DESPACHADO',
            estado_actual: 'DESPACHADO',
            fecha_despacho: nowIso,
            hora_salida: nowIso,
            sync_cloud: {
              estado: 'PENDIENTE',
              placa: placa,
              fecha: nowIso,
              error: null
            }
          };
        }
        return orden;
      })
    );
    showToast('Orden marcada como DESPACHADA.', 'success');
  };



  // Filtrado reactivo de despachos
  const filteredDespachos = despachos.filter((d) => {
    if (selectedCarrier !== 'TODAS' && d.transportadora !== selectedCarrier) {
      return false;
    }
    if (selectedZone !== 'TODAS' && d.zona_entrega !== selectedZone) {
      return false;
    }
    if (onlyUrgent && d.prioridad !== 1) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchOrder = d.codigo_orden?.toLowerCase().includes(q);
      const matchInvoice = d.codigo_factura_erp?.toLowerCase().includes(q);
      const matchClient = d.cliente_nombre?.toLowerCase().includes(q);
      const matchGuia = d.numero_guia?.toLowerCase().includes(q);
      const matchSku = d.items?.some((it) => it.sku?.toLowerCase().includes(q) || it.descripcion_producto?.toLowerCase().includes(q));
      if (!matchOrder && !matchInvoice && !matchClient && !matchGuia && !matchSku) {
        return false;
      }
    }
    return true;
  });

  // Métricas calculadas para la barra superior y control de 2 estados
  const kpis = {
    pendientesTotal: despachos.filter((d) => d.estado_actual === 'PENDIENTE').length,
    pendientesHoy: despachos.filter((d) => d.estado_actual === 'PENDIENTE').length,
    despachadosTotal: despachos.filter((d) => d.estado_actual === 'DESPACHADO').length,
    despachados: despachos.filter((d) => d.estado_actual === 'DESPACHADO').length,
    conIncidencia: despachos.filter((d) => Boolean(d.incidencia_activa)).length,
    incidencias: despachos.filter((d) => Boolean(d.incidencia_activa)).length,
    pendientesSyncExcel: despachos.filter((d) => d.estado_actual === 'DESPACHADO' && d.sync_cloud?.estado === 'PENDIENTE').length,
    // Despachos creados offline que AÚN no han sido confirmados por el servidor
    sinConfirmarEnServidor: despachos.filter((d) => d._sync_status === 'PENDIENTE_DE_SYNC').length
  };

  const selectedDespacho = despachos.find((d) => d.id === selectedDespachoId) || null;

  return (
    <WmsContext.Provider
      value={{
        despachos,
        filteredDespachos,
        devoluciones,
        bodegas: MOCK_BODEGAS,
        rutasVehiculos: MOCK_VEHICULOS_RUTAS,
        flotaVehiculos: FLOTA_VEHICULOS,
        activeTurno,
        setActiveTurno,
        activeDockTab,
        setActiveDockTab,
        wavesViewMode,
        setWavesViewMode,
        selectedCarrier,
        setSelectedCarrier,
        selectedZone,
        setSelectedZone,
        onlyUrgent,
        setOnlyUrgent,
        searchQuery,
        setSearchQuery,
        selectedDespacho,
        setSelectedDespachoId,
        incidentModalTarget,
        setIncidentModalTarget,
        returnsDrawerOpen,
        setReturnsDrawerOpen,
        notification,
        setNotification,
        kpis,
        backendOnline,
        despacharOrden,
        marcarComoDespachado,
        asignarVehiculo,
        reintentarSyncDrive,
        reintentarDespachosPendientes,
        exportarCopiaExcel,
        restaurarACola,
        registrarIncidencia,
        resolverIncidencia,
        procesarDevolucion,
        crearNuevoDespacho,
        createModalOpen,
        setCreateModalOpen,
        showToast,
        playBeep
      }}
    >
      {children}
    </WmsContext.Provider>
  );
}

export function useWms() {
  const context = useContext(WmsContext);
  if (!context) {
    throw new Error('useWms debe usarse dentro de WmsProvider');
  }
  return context;
}
