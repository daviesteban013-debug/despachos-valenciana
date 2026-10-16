import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWmsSockets } from '../hooks/useWmsSockets';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import {
  INITIAL_DESPACHOS,
  INITIAL_DEVOLUCIONES
} from '../data/mockData';
import { FLOTA_VEHICULOS } from '../data/flota';
import { jwtDecode } from 'jwt-decode';
const API_URL = import.meta.env.VITE_API_URL || '';
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
    if (!u) return null;
    const token = u.token || u.credential;
    if (!token) return null;

    // Validar que el token no haya expirado
    const decoded = jwtDecode(token);
    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < nowSec) {
      console.warn('[AUTH] Token expirado detectado en getGoogleToken. Limpiando sesión.');
      localStorage.removeItem('wms_google_user');
      return null;
    }

    return token;
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
    // Token inválido o expirado: limpiar sesión sin recargar abruptamente la página
    const wasLoggedIn = !!localStorage.getItem('wms_google_user');
    if (wasLoggedIn) {
      localStorage.removeItem('wms_google_user');
      window.dispatchEvent(new CustomEvent('wms:auth-expired'));
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

// "Cliente Retira": el cliente recoge con su propio transporte (hoja CLIENTE RETIRA del Excel)
const TRANSPORTADORA_CLIENTE_RETIRA = 'Cliente Retira';
const PLACA_CLIENTE_RETIRA = 'CLIENTE RETIRA';

// Despachos creados sin conexión: aún no existen en el servidor
const esIdOffline = (id) => String(id || '').startsWith('offline-');

// 4xx = el servidor rechazó la petición (reintentar no sirve).
// Red caída o 5xx = se puede reintentar más tarde.
const esRechazoDelServidor = (status) => status >= 400 && status < 500;

// Código de orden único: se genera en el cliente para que los reintentos offline
// sean idempotentes (el servidor devuelve la orden existente si ya la recibió).
const generarCodigoOrden = () => {
  const tiempo = Date.now().toString(36).toUpperCase().slice(-4);
  const aleatorio = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => (b % 36).toString(36))
    .join('')
    .toUpperCase();
  return `PVSW-${tiempo}${aleatorio}`;
};

// Fecha de hoy (YYYY-MM-DD) en la hora local del dispositivo, no en UTC
const fechaHoyLocal = () => new Date().toLocaleDateString('en-CA');

export function WmsProvider({ children }) {
  const { despachos, setDespachos } = useOfflineQueue(INITIAL_DESPACHOS);
  // Referencia siempre actualizada para los reintentos en background
  const despachosRef = React.useRef(despachos);
  despachosRef.current = despachos;

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
        const servidor = Array.isArray(data) ? data : [];
        // Fusionar con lo que solo existe en este dispositivo: reemplazar el estado
        // completo borraría los despachos offline que aún no se han sincronizado.
        setDespachos(prev => {
          const idsServidor = new Set(servidor.map(d => d.id));
          const codigosServidor = new Set(servidor.map(d => d.codigo_orden));
          const pendientesLocales = prev.filter(
            d => d._sync_status === 'PENDIENTE_DE_SYNC' || d._sync_status === 'RECHAZADO'
          );

          // Órdenes del servidor con un despacho aún sin confirmar en este dispositivo
          const fusion = servidor.map(d => {
            const local = pendientesLocales.find(l => l.id === d.id);
            return local && local.estado_actual === 'DESPACHADO' && d.estado_actual !== 'DESPACHADO' ? local : d;
          });

          // Órdenes creadas offline. Si el servidor ya tiene su código y no queda
          // un despacho pendiente, la versión del servidor manda.
          const soloLocales = pendientesLocales.filter(l =>
            !idsServidor.has(l.id) &&
            (!codigosServidor.has(l.codigo_orden) || l.estado_actual === 'DESPACHADO')
          );

          return [...soloLocales, ...fusion];
        });
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

  const [flotaVehiculos, setFlotaVehiculos] = useState(FLOTA_VEHICULOS);

  const fetchVehiculos = useCallback(async () => {
    if (!getGoogleToken()) return;
    try {
      const res = await apiFetch(`${API_URL}/api/vehiculos`);
      if (res.ok) {
        const data = await res.json();
        const placas = Array.isArray(data)
          ? data.map(v => (typeof v === 'string' ? v : v.placa)).filter(Boolean)
          : [];
        if (placas.length > 0) {
          setFlotaVehiculos(Array.from(new Set([...FLOTA_VEHICULOS, ...placas])));
        }
      }
    } catch (err) {
      console.warn('[VEHICULOS] Error al obtener vehículos:', err.message);
    }
  }, []);

  const agregarNuevoVehiculo = async ({ placa, conductor = '', modelo = '', identificador = '' }) => {
    if (!placa || !placa.trim()) {
      showToast('La placa del vehículo es requerida.', 'warning');
      return { success: false, error: 'Placa requerida' };
    }

    const placaLimpia = placa.trim().toUpperCase();
    const conductorLimpio = (conductor || '').trim().toUpperCase();
    const identificadorFinal = (identificador || (conductorLimpio ? `${placaLimpia} ${conductorLimpio}` : placaLimpia)).trim().toUpperCase();

    try {
      const res = await apiFetch(`${API_URL}/api/vehiculos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa: placaLimpia,
          conductor: conductorLimpio,
          modelo: (modelo || '').trim(),
          identificador: identificadorFinal
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const nombreVehiculo = data.vehiculo?.placa || identificadorFinal;
        setFlotaVehiculos(prev => Array.from(new Set([...prev, nombreVehiculo])));
        showToast(`✅ Vehículo [${nombreVehiculo}] agregado y creado en plantilla Excel (${data.destino || 'Google Drive'}).`, 'success');
        return { success: true, vehiculo: nombreVehiculo, destino: data.destino, data };
      } else {
        throw new Error(data.error || 'Error al registrar vehículo en el servidor');
      }
    } catch (err) {
      console.warn('[VEHICULOS] Fallback al agregar vehículo:', err.message);
      setFlotaVehiculos(prev => Array.from(new Set([...prev, identificadorFinal])));
      showToast(`⚠️ Vehículo [${identificadorFinal}] guardado localmente (${err.message}).`, 'info');
      return { success: true, vehiculo: identificadorFinal, offline: true };
    }
  };

  // ── Perfil, Preferencias y Borradores de Usuario (PostgreSQL) ───────────────
  const [userProfile, setUserProfile] = useState(null);
  const [userPreferences, setUserPreferences] = useState({ bodega_default: '01', tema: 'light' });
  const [userDraft, setUserDraft] = useState(null);

  const fetchUserProfile = useCallback(async () => {
    if (!getGoogleToken()) return;
    try {
      const res = await apiFetch(`${API_URL}/api/usuario/perfil`);
      if (res.ok) {
        const data = await res.json();
        if (data.perfil) {
          setUserProfile(data.perfil);
          if (data.perfil.preferencias) {
            setUserPreferences(prev => ({ ...prev, ...data.perfil.preferencias }));
          }
          if (data.perfil.borrador_despacho) {
            setUserDraft(data.perfil.borrador_despacho);
          }
        }
      }
    } catch (err) {
      console.warn('[USUARIO] Error al obtener perfil desde backend:', err.message);
    }
  }, []);

  const guardarBorradorDespacho = useCallback(async (borrador) => {
    setUserDraft(borrador);
    if (!getGoogleToken()) return;
    try {
      await apiFetch(`${API_URL}/api/usuario/borrador`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrador })
      });
    } catch (err) {
      console.warn('[USUARIO] Error guardando borrador en servidor:', err.message);
    }
  }, []);

  const descartarBorradorDespacho = useCallback(async () => {
    setUserDraft(null);
    if (!getGoogleToken()) return;
    try {
      await apiFetch(`${API_URL}/api/usuario/borrador`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[USUARIO] Error eliminando borrador en servidor:', err.message);
    }
  }, []);

  const actualizarPreferenciasUsuario = useCallback(async (nuevasPrefs) => {
    setUserPreferences(prev => ({ ...prev, ...nuevasPrefs }));
    if (!getGoogleToken()) return;
    try {
      const res = await apiFetch(`${API_URL}/api/usuario/preferencias`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferencias: nuevasPrefs })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.preferencias) {
          setUserPreferences(data.preferencias);
        }
      }
    } catch (err) {
      console.warn('[USUARIO] Error actualizando preferencias en servidor:', err.message);
    }
  }, []);

  // Función de reintento automático para despachos PENDIENTE_DE_SYNC
  // 1. Orden creada offline → POST (idempotente por codigo_orden).
  // 2. Orden marcada DESPACHADO localmente → PATCH (idempotente: no duplica la fila del Excel).
  // Un rechazo 4xx detiene los reintentos de esa orden (RECHAZADO) en lugar de repetir para siempre.
  const reintentarDespachosPendientes = useCallback(async () => {
    if (retryingRef.current || !getGoogleToken()) return;
    const pendientes = despachosRef.current.filter(d => d._sync_status === 'PENDIENTE_DE_SYNC');
    if (pendientes.length === 0) return;

    retryingRef.current = true;
    console.log(`[SYNC] Reintentando ${pendientes.length} despacho(s) pendiente(s)...`);

    const reemplazar = (idLocal, cambios) => {
      setDespachos(prev => prev.map(item => (item.id === idLocal ? { ...item, ...cambios } : item)));
    };
    const marcarRechazado = async (idLocal, res) => {
      const data = await res.json().catch(() => ({}));
      reemplazar(idLocal, { _sync_status: 'RECHAZADO', _sync_error: data.error || `Error ${res.status}` });
      console.warn(`[SYNC] ❌ El servidor rechazó la orden (${res.status}):`, data.error);
    };

    try {
      for (const d of pendientes) {
        let idActual = d.id;
        try {
          if (esIdOffline(d.id)) {
            // Órdenes offline antiguas usaban un código de 4 dígitos (PVSW-6xxx) que puede
            // coincidir con otra orden real: se les asigna un código nuevo (y se guarda
            // localmente antes de enviar, para que los siguientes reintentos usen el mismo).
            let codigoEnvio = d.codigo_orden;
            if (/^PVSW-\d{4}$/.test(codigoEnvio || '')) {
              codigoEnvio = generarCodigoOrden();
              reemplazar(d.id, { codigo_orden: codigoEnvio });
              despachosRef.current = despachosRef.current.map(item =>
                item.id === d.id ? { ...item, codigo_orden: codigoEnvio } : item
              );
            }

            const res = await apiFetch(`${API_URL}/api/despachos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                codigo_orden: codigoEnvio,
                codigo_factura_erp: d.codigo_factura_erp,
                cliente_nombre: d.cliente_nombre,
                direccion_entrega: d.cliente_direccion || d.zona_entrega,
                ciudad: d.cliente_ciudad,
                transportadora: d.transportadora,
                jornada: d.jornada,
                vehiculo_placa: d.vehiculo_placa,
                bodega_id: d.bodega_origen_id,
                valor_total: d.valor_total,
                observaciones: d.observaciones,
                fecha_despacho: d.fecha_despacho,
                items: d.items
              })
            });

            if (!res.ok) {
              if (esRechazoDelServidor(res.status)) await marcarRechazado(d.id, res);
              continue;
            }

            const confirmado = await res.json();
            const quedaDespachoPendiente = d.estado_actual === 'DESPACHADO';
            // Reemplazar el despacho offline con el confirmado por el servidor,
            // conservando el despacho local si aún falta enviarlo.
            reemplazar(d.id, {
              ...confirmado,
              ...(quedaDespachoPendiente && {
                estado_actual: 'DESPACHADO',
                vehiculo_placa: d.vehiculo_placa,
                hora_salida: d.hora_salida
              }),
              _sync_status: quedaDespachoPendiente ? 'PENDIENTE_DE_SYNC' : 'CONFIRMADO',
              _offline_id_reemplazado: d.id
            });
            idActual = confirmado.id;
            console.log(`[SYNC] ✅ Despacho ${codigoEnvio} confirmado en servidor.`);
          }

          if (d.estado_actual === 'DESPACHADO') {
            const res = await apiFetch(`${API_URL}/api/despachos/${idActual}/estado`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nuevoEstado: 'DESPACHADO', vehiculoPlaca: d.vehiculo_placa })
            });

            if (!res.ok) {
              if (esRechazoDelServidor(res.status)) await marcarRechazado(idActual, res);
              continue;
            }

            const data = await res.json();
            reemplazar(idActual, { sync_cloud: data.syncExcel, _sync_status: 'CONFIRMADO', _sync_error: null });
            console.log(`[SYNC] ✅ Despacho ${d.codigo_orden} registrado como DESPACHADO en servidor.`);
          }
        } catch (err) {
          console.warn(`[SYNC] Reintento fallido para ${d.codigo_orden}:`, err.message);
        }
      }
    } finally {
      retryingRef.current = false;
    }
  }, []);

  // Manejador de eventos WebSocket
  const handleWebSocketEvent = useCallback((data) => {
    console.log('⚡ WMS WebSocket Update:', data);
    fetchDespachos();
    if (data.action && data.action.includes('DEVOLUCION')) {
      fetchDevoluciones();
    }
    if (data.action && (data.action.includes('VEHICULO') || data.action === 'VEHICULO_CREADO')) {
      fetchVehiculos();
    }
  }, [fetchDespachos, fetchDevoluciones, fetchVehiculos]);

  // Hook de Sockets
  useWmsSockets(handleWebSocketEvent, API_URL);

  useEffect(() => {
    fetchDespachos();
    fetchDevoluciones();
    fetchVehiculos();
    fetchUserProfile();
    // Enviar al servidor lo que quedó pendiente en este dispositivo (p. ej. tras recargar)
    reintentarDespachosPendientes();

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

    // 3. Cuando el usuario inicia sesión
    const handleAuthChange = () => {
      reintentarDespachosPendientes();
      fetchDespachos();
      fetchDevoluciones();
      fetchVehiculos();
      fetchUserProfile();
    };
    window.addEventListener('wms:auth-login', handleAuthChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('wms:auth-login', handleAuthChange);
      clearInterval(healthInterval);
    };
  }, [fetchDespachos, fetchDevoluciones, fetchVehiculos, fetchUserProfile, reintentarDespachosPendientes, backendOnline]);

  // Navegación Bottom Dock: 'waves' (Despachos) | 'incidents' (Novedades)
  const [activeDockTab, setActiveDockTab] = useState('waves');

  // Modo de visualización en Tablero: 'kanban' | 'list'
  const [wavesViewMode, setWavesViewMode] = useState('kanban');

  // Configuración operativa y filtros
  const [activeTurno, setActiveTurno] = useState('Diurno');
  const [selectedCarrier, setSelectedCarrier] = useState('TODAS');
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

  // Asignar vehículo validando contra las placas activas
  const asignarVehiculo = (despachoId, placa) => {
    const placaNormalizada = (placa || '').trim().toUpperCase();
    if (!flotaVehiculos.map(v => v.trim().toUpperCase()).includes(placaNormalizada)) {
      showToast(`Placa no permitida: "${placa}". Placas válidas: ${flotaVehiculos.join(', ')}`, 'warning');
      return;
    }

    setDespachos(prev =>
      prev.map(d => (d.id === despachoId ? { ...d, vehiculo_placa: placaNormalizada } : d))
    );
    showToast(`Vehículo [${placaNormalizada}] asignado a la orden.`, 'info');
  };

  // Acción principal: "Despachar" (PENDIENTE -> DESPACHADO + Guardado en plantilla Excel de Google Drive)
  // NOTA CRÍTICA: NO DESCUENTA INVENTARIO. El inventario se descuenta solo al sellar en mostrador.
  // El servidor es idempotente: reintentar este PATCH nunca duplica la fila del Excel.
  // Por eso NO se usa el sync-excel-directo como respaldo (escribía sin dejar registro y duplicaba filas).
  const despacharOrden = async (despachoId, vehiculoPlacaOverride = null, metadataOperador = 'Líder Bodega Valenciana') => {
    const targetDespacho = despachos.find(d => d.id === despachoId);
    if (!targetDespacho) return false;

    const clienteRetira = targetDespacho.transportadora === TRANSPORTADORA_CLIENTE_RETIRA;
    const placaFinal = clienteRetira
      ? PLACA_CLIENTE_RETIRA
      : (vehiculoPlacaOverride || targetDespacho.vehiculo_placa || '').trim().toUpperCase();

    if (!clienteRetira && (!placaFinal || !flotaVehiculos.map(v => v.trim().toUpperCase()).includes(placaFinal))) {
      playBeep(440, 'sawtooth');
      showToast(`Debe seleccionar uno de los vehículos permitidos (${flotaVehiculos.join(', ')}) para despachar.`, 'warning');
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

    // Deja el despacho en cola local; el reintento automático lo enviará al servidor
    const dejarPendienteDeSync = (motivo) => {
      setDespachos(prev =>
        prev.map(d => (d.id === despachoId ? { ...d, _sync_status: 'PENDIENTE_DE_SYNC', _sync_error: motivo } : d))
      );
      playBeep(440, 'sawtooth');
      showToast(
        `⚠️ Despacho de ${targetDespacho.codigo_orden} sin confirmar en servidor. Quedó en este dispositivo y se reintentará automáticamente.`,
        'warning'
      );
    };

    // Orden creada offline: primero debe crearse en el servidor (lo hace el reintento automático)
    if (esIdOffline(despachoId)) {
      dejarPendienteDeSync('La orden aún no existe en el servidor');
      return true;
    }

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

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setDespachos(prev =>
          prev.map(d => (d.id === despachoId ? { ...d, sync_cloud: data.syncExcel, _sync_status: undefined, _sync_error: null } : d))
        );
        if (data.syncExcel?.estado === 'SINCRONIZADO') {
          playBeep(1046);
          showToast(
            data.syncExcel.yaRegistrado
              ? `Orden ${targetDespacho.codigo_orden} despachada (ya estaba registrada en el Excel, no se duplicó).`
              : `✅ Orden ${targetDespacho.codigo_orden} despachada y registrada en hoja [${placaFinal}] de Google Drive.`,
            'success'
          );
        } else if (data.syncExcel?.estado === 'EN_PROCESO') {
          showToast(`Orden ${targetDespacho.codigo_orden} despachada. El registro en Excel está en curso.`, 'info');
        } else {
          playBeep(440, 'sawtooth');
          showToast(
            `Orden despachada, pero falló el registro en Excel: ${data.syncExcel?.error || 'error desconocido'}. Usa "Reintentar".`,
            'warning'
          );
        }
        if (data.advertencia) {
          showToast(`⚠️ ${data.advertencia}`, 'warning');
        }
      } else if (esRechazoDelServidor(response.status)) {
        // El servidor rechazó el cambio: revertir la interfaz
        setDespachos(prev => prev.map(d => (d.id === despachoId ? targetDespacho : d)));
        playBeep(440, 'sawtooth');
        showToast(`No se pudo despachar: ${data.error || `Error ${response.status}`}`, 'error');
        return false;
      } else {
        dejarPendienteDeSync(data.error || `Error ${response.status}`);
      }
    } catch (err) {
      console.warn('[WMS] Error de red al despachar. Queda pendiente de sincronizar.', err.message);
      dejarPendienteDeSync(err.message);
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
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setDespachos(prev =>
          prev.map(item => (item.id === despachoId ? { ...item, sync_cloud: data.syncExcel } : item))
        );
        playBeep(1046);
        showToast(`✅ Sincronizado exitosamente en plantilla Excel (${d.vehiculo_placa}).`, 'success');
      } else {
        setDespachos(prev =>
          prev.map(item => (item.id === despachoId ? { ...item, sync_cloud: data.syncExcel || item.sync_cloud } : item))
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
    const soloLocal = esIdOffline(despachoId);

    setDespachos(prev =>
      prev.map(d => {
        if (d.id !== despachoId) return d;
        return {
          ...d,
          estado_actual: 'PENDIENTE',
          hora_salida: null,
          sync_cloud: null,
          // Una orden que existe en el servidor deja de tener un despacho pendiente de enviar
          ...(!soloLocal && { _sync_status: undefined, _sync_error: null })
        };
      })
    );
    showToast('Orden devuelta a PENDIENTE.', 'info');

    // Orden creada offline: el cambio es solo local (aún no existe en el servidor)
    if (soloLocal) return;

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

  // Eliminar orden definitivamente del sistema
  const eliminarDespacho = async (despachoId) => {
    const despachoAnterior = despachos.find(d => d.id === despachoId);
    if (!despachoAnterior) return false;

    // Optimistic removal
    setDespachos(prev => prev.filter(d => d.id !== despachoId));
    if (selectedDespachoId === despachoId) {
      setSelectedDespachoId(null);
    }

    // Orden creada offline que nunca llegó al servidor: basta con quitarla del dispositivo
    if (esIdOffline(despachoId)) {
      showToast(`🗑️ Orden ${despachoAnterior.codigo_orden} eliminada de este dispositivo.`, 'success');
      return true;
    }
    showToast(`Eliminando orden ${despachoAnterior.codigo_orden}...`, 'info');

    try {
      const res = await apiFetch(`${API_URL}/api/despachos/${despachoId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falló al eliminar en el servidor');
      }
      playBeep(659);
      showToast(`🗑️ Orden ${despachoAnterior.codigo_orden} eliminada definitivamente.`, 'success');
      return true;
    } catch (err) {
      console.warn('Error eliminando orden en backend:', err);
      // Revertir optimistic update
      setDespachos(prev => [...prev, despachoAnterior]);
      showToast(`Error al eliminar: ${err.message}`, 'error');
      return false;
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
    const transportadora = payload.transportadora === TRANSPORTADORA_CLIENTE_RETIRA ? TRANSPORTADORA_CLIENTE_RETIRA : 'Flota Propia';
    const vehiculo = transportadora === TRANSPORTADORA_CLIENTE_RETIRA
      ? PLACA_CLIENTE_RETIRA
      : (payload.vehiculo_placa || flotaVehiculos[0] || FLOTA_VEHICULOS[0]);
    const jornada = payload.jornada || (new Date().getHours() < 12 ? 'AM' : 'PM');
    const bodega = payload.bodega_id || '01';
    const obs = (payload.observaciones || '').trim();
    const ciudad = (payload.ciudad || '').trim() || 'Cúcuta';
    const fechaDespacho = payload.fecha_despacho || fechaHoyLocal();
    const codigoOrden = generarCodigoOrden();

    // El formulario exige al menos un artículo; el servidor también lo valida
    const items = (payload.items || []).map((it, idx) => ({
      id: `it-${Date.now()}-${idx}`,
      sku: it.codigo,
      descripcion_producto: it.descripcion,
      cantidad_solicitada: it.cantidad || 1,
      cantidad_auditada: it.cantidad || 1,
      ubicacion_bodega: payload.bodega_id || 'DESPACHO',
      unidad: it.unidad || it.und_base || 'UND'
    }));

    try {

      const res = await apiFetch(`${API_URL}/api/despachos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_orden: codigoOrden,
          codigo_factura_erp: factura,
          cliente_nombre: cliente,
          direccion_entrega: direccion,
          ciudad: ciudad,
          transportadora: transportadora,
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
        const errorData = await res.json().catch(() => ({}));
        const mensaje = errorData.error || `Error ${res.status} creando el despacho en el servidor`;
        if (esRechazoDelServidor(res.status)) {
          // Datos rechazados: guardarlo offline solo lo reintentaría para siempre
          const rechazo = new Error(mensaje);
          rechazo.rechazadoPorServidor = true;
          throw rechazo;
        }
        throw new Error(mensaje);
      }

      const nuevaOrden = await res.json();

      // Completar datos de UI que no vienen del backend o que se manejan localmente para compatibilidad
      const ordenCompleta = {
        ...nuevaOrden,
        cliente_codigo: `CL-${Math.floor(7000000 + Math.random() * 3000000)}`,
        zona_entrega: direccion,
        direccion_entrega: direccion,
        bodega_origen_id: bodega,
        transportadora: transportadora,
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
      if (error.rechazadoPorServidor) {
        playBeep(440, 'sawtooth');
        showToast(`❌ El servidor rechazó el despacho: ${error.message}`, 'error');
        throw error;
      }

      console.warn('Error al crear despacho en servidor (Activando Modo Offline):', error.message);

      // ⚠️ MODO OFFLINE HONESTO:
      // El despacho se guarda SOLO en este dispositivo con estado PENDIENTE_DE_SYNC.
      // NUNCA se presenta como confirmado. El reintento automático lo enviará al servidor
      // cuando la conexión se restablezca.
      const ordenCompleta = {
        id: `offline-${Date.now()}`,
        codigo_orden: codigoOrden,
        codigo_factura_erp: factura,
        cliente_nombre: payload.cliente_nombre,
        cliente_direccion: payload.direccion_entrega,
        cliente_ciudad: ciudad,
        zona_entrega: payload.direccion_entrega,
        estado_actual: 'PENDIENTE',
        vehiculo_placa: vehiculo,
        bodega_origen_id: payload.bodega_id,
        valor_total: payload.valor_factura,
        jornada: payload.jornada,
        observaciones: payload.observaciones,
        fecha_despacho: fechaDespacho,
        direccion_entrega: payload.direccion_entrega,
        transportadora: transportadora,
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
          const placa = orden.vehiculo_placa || flotaVehiculos[0] || FLOTA_VEHICULOS[0];
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
        bodegas: [],
        rutasVehiculos: [],
        flotaVehiculos,
        fetchVehiculos,
        agregarNuevoVehiculo,
        activeTurno,
        setActiveTurno,
        activeDockTab,
        setActiveDockTab,
        wavesViewMode,
        setWavesViewMode,
        selectedCarrier,
        setSelectedCarrier,
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
        eliminarDespacho,
        registrarIncidencia,
        resolverIncidencia,
        procesarDevolucion,
        crearNuevoDespacho,
        createModalOpen,
        setCreateModalOpen,
        showToast,
        playBeep,
        // Perfil, Preferencias y Borradores (asociados al usuario)
        userProfile,
        userPreferences,
        userDraft,
        fetchUserProfile,
        guardarBorradorDespacho,
        descartarBorradorDespacho,
        actualizarPreferenciasUsuario
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
