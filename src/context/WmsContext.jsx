import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  INITIAL_DESPACHOS,
  INITIAL_DEVOLUCIONES,
  MOCK_VEHICULOS_RUTAS,
  MOCK_BODEGAS
} from '../data/mockData';
import { FLOTA_VEHICULOS } from '../data/flota';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WmsContext = createContext(null);

export function WmsProvider({ children }) {
  // Despachos con modelo de 2 estados: PENDIENTE / DESPACHADO
  const [despachos, setDespachos] = useState(() => {
    try {
      const savedV3 = localStorage.getItem('wms_valenciana_despachos_v3');
      if (savedV3) {
        return JSON.parse(savedV3);
      }
      // Migración de datos legados de versiones anteriores
      const savedV2 = localStorage.getItem('wms_valenciana_despachos_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        const migrados = parsed.map((d) => {
          let estado = d.estado_actual;
          let incidencia = d.incidencia_activa || null;
          if (['COLA', 'PICKING', 'PACKING', 'LISTO'].includes(estado)) {
            estado = 'PENDIENTE';
          } else if (estado === 'INCIDENCIA') {
            estado = 'PENDIENTE';
            if (!incidencia) {
              incidencia = {
                id: `inc-${Date.now()}`,
                tipo: 'RETENCION_PREVIA',
                descripcion: 'Novedad migrada del sistema anterior',
                fecha_reporte: new Date().toISOString()
              };
            }
          }
          const placa = d.vehiculo_placa && FLOTA_VEHICULOS.includes(d.vehiculo_placa)
            ? d.vehiculo_placa
            : FLOTA_VEHICULOS[0];

          return {
            ...d,
            estado_actual: estado === 'DESPACHADO' ? 'DESPACHADO' : 'PENDIENTE',
            vehiculo_placa: placa,
            incidencia_activa: incidencia,
            sync_onedrive: d.sync_onedrive || (estado === 'DESPACHADO' ? { estado: 'SINCRONIZADO', placa } : null)
          };
        });
        localStorage.setItem('wms_valenciana_despachos_v3', JSON.stringify(migrados));
        localStorage.removeItem('wms_valenciana_despachos_v2');
        return migrados;
      }
    } catch (e) {
      console.warn('Error leyendo localStorage despachos:', e);
    }
    return INITIAL_DESPACHOS;
  });

  const [devoluciones, setDevoluciones] = useState(() => {
    const saved = localStorage.getItem('wms_valenciana_devoluciones_v2');
    return saved ? JSON.parse(saved) : INITIAL_DEVOLUCIONES;
  });

  // Navegación Bottom Dock: 'waves' (Despachos) | 'incidents' (Novedades)
  const [activeDockTab, setActiveDockTab] = useState('waves');

  // Modo de visualización en Tablero: 'kanban' | 'list'
  const [wavesViewMode, setWavesViewMode] = useState('kanban');

  // Configuración operativa y filtros
  const [activeBodega, setActiveBodega] = useState(MOCK_BODEGAS[0].codigo);
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



  // Persistencia local de despachos v3 (2 estados)
  useEffect(() => {
    try {
      localStorage.setItem('wms_valenciana_despachos_v3', JSON.stringify(despachos));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [despachos]);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.id === notification?.id ? null : curr));
    }, 4500);
  };

  // Sonido / respuesta táctil para interacción en bodega
  const playBeep = (freq = 880, type = 'sine') => {
    try {
      if (typeof window !== 'undefined' && window.AudioContext) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
        navigator.vibrate(50);
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

  // Acción principal: "Despachar" (PENDIENTE -> DESPACHADO + Guardado en plantilla Excel de OneDrive)
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
            nota: `Despachado en vehículo [${placaFinal}]. Sincronizando con plantilla OneDrive.`
          }
        ];

        return {
          ...d,
          estado_actual: 'DESPACHADO',
          vehiculo_placa: placaFinal,
          hora_salida: nowIso,
          sync_onedrive: {
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

    // 2. Disparo de guardado automático en la hoja de esa placa en OneDrive
    try {
      const response = await fetch(`${API_URL}/api/despachos/${despachoId}/estado`, {
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
          prev.map(d => (d.id === despachoId ? { ...d, sync_onedrive: data.syncExcel } : d))
        );
        showToast(`Fila registrada en hoja [${placaFinal}] de OneDrive.`, 'success');
      } else {
        const syncError = data.syncExcel || {
          estado: 'PENDIENTE',
          error: data.error || 'Error al conectar con OneDrive',
          placa: placaFinal,
          intentos: 1,
          ultimo_intento: nowIso
        };
        setDespachos(prev =>
          prev.map(d => (d.id === despachoId ? { ...d, sync_onedrive: syncError } : d))
        );
        showToast(`Orden despachada en bodega, pero pendiente de sincronizar en Excel: ${syncError.error}`, 'warning');
      }
    } catch (err) {
      console.warn('Error en llamada a backend para sync OneDrive:', err);
      setDespachos(prev =>
        prev.map(d => {
          if (d.id !== despachoId) return d;
          return {
            ...d,
            sync_onedrive: {
              estado: 'PENDIENTE',
              error: err.message || 'Servidor backend no disponible',
              placa: placaFinal,
              intentos: 1,
              ultimo_intento: nowIso
            }
          };
        })
      );
      showToast(`Despacho registrado. Sincronización en cola pendiente por red.`, 'warning');
    }

    return true;
  };

  // Reintentar sincronización de orden fallida
  const reintentarSyncOneDrive = async (despachoId) => {
    const d = despachos.find(item => item.id === despachoId);
    if (!d) return;

    showToast(`Reintentando sincronización de ${d.codigo_orden} con OneDrive...`, 'info');

    try {
      const response = await fetch(`${API_URL}/api/despachos/${despachoId}/reintentar-onedrive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (response.ok) {
        setDespachos(prev =>
          prev.map(item => (item.id === despachoId ? { ...item, sync_onedrive: data.syncExcel } : item))
        );
        playBeep(1046);
        showToast(`✅ Sincronizado exitosamente en plantilla Excel (${d.vehiculo_placa}).`, 'success');
      } else {
        setDespachos(prev =>
          prev.map(item => (item.id === despachoId ? { ...item, sync_onedrive: data.syncExcel } : item))
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
      const response = await fetch(`${API_URL}/api/despachos/exportar-plantilla`);
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
  const restaurarAPendiente = (despachoId) => {
    setDespachos(prev =>
      prev.map(d => {
        if (d.id !== despachoId) return d;
        return {
          ...d,
          estado_actual: 'PENDIENTE',
          hora_salida: null,
          sync_onedrive: null
        };
      })
    );
    showToast('Orden devuelta a PENDIENTE.', 'info');
  };

  // Procesar devolución en logística inversa
  const procesarDevolucion = (devolucionId, accion, notas = '') => {
    setDevoluciones(prev =>
      prev.map(d => (d.id === devolucionId ? {
        ...d,
        estado: accion === 'REINGRESO_INVENTARIO' ? 'RESUELTO_REINGRESO' : 'RESUELTO_BAJA',
        notas_resolucion: notas
      } : d))
    );
    showToast(`Devolución gestionada con éxito.`, 'info');
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
      await fetch(`${API_URL}/api/despachos/${despachoId}/incidencia`, {
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
      await fetch(`${API_URL}/api/despachos/${despachoId}/incidencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'RESOLVER', solucion, reportado_por: metadataOperador })
      });
    } catch (e) {
      // Offline fallback
    }
  };

  // Simular inyección de nuevo pedido crítico
  const addSimulatedOrder = () => {
    const randomNum = Math.floor(6320 + Math.random() * 80);
    const invoiceNum = Math.floor(80310 + Math.random() * 80);
    const newOrder = {
      id: `dsp-new-${Date.now()}`,
      codigo_orden: `PVSW-${randomNum}`,
      codigo_factura_erp: `FE-${invoiceNum}`,
      cliente_nombre: 'Ferretería y Depósito La 10 Cúcuta',
      cliente_codigo: 'CL-9008899',
      zona_entrega: 'Atalaya Occidental',
      bodega_origen_id: activeBodega,
      transportadora: 'Flota Propia',
      ruta_id: 'rt-101',
      vehiculo_placa: FLOTA_VEHICULOS[0],
      estado_actual: 'PENDIENTE',
      prioridad: 1, // Urgente
      bahia_asignada: 'Bodega A-01',
      numero_guia: `GUIA-VAL-${Math.floor(1000 + Math.random() * 9000)}`,
      valor_total: 4280000,
      incidencia_activa: null,
      sync_onedrive: null,
      items: [
        { id: `it-sim-1`, sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 3, cantidad_auditada: 3, ubicacion_bodega: 'P06-E01-N1', unidad: 'BUL' },
        { id: `it-sim-2`, sku: 'SKU-VAR-12', descripcion_producto: 'Varilla Corrugada 1/2" x 6m Diaco W60', cantidad_solicitada: 3, cantidad_auditada: 3, ubicacion_bodega: 'P08-E02-N1', unidad: 'UND' },
        { id: `it-sim-3`, sku: 'SKU-PIN-PIN', descripcion_producto: 'Pintura Acrílica Viniltex Blanco Galón Pintuco', cantidad_solicitada: 1, cantidad_auditada: 1, ubicacion_bodega: 'P04-E02-N1', unidad: 'GAL' }
      ],
      history: [
        { id: `h-sim-${Date.now()}`, estado_anterior: null, estado_nuevo: 'PENDIENTE', usuario_operador: 'Ventas Mostrador Valenciana', tiempo_estancia_seg: 10, timestamp: new Date().toISOString(), nota: `Pedido express ferretería programado para ${FLOTA_VEHICULOS[0]}` }
      ]
    };

    setDespachos((prev) => [newOrder, ...prev]);
    playBeep(880, 'triangle');
    showToast(`⚡ Nuevo pedido crítico: ${newOrder.codigo_orden} (Asignado a ${FLOTA_VEHICULOS[0]})`, 'warning');
  };

  // 1. Inserción de nueva orden conectada al backend
  const crearNuevoDespacho = async (payload) => {
    try {
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

      const items = [
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

      const res = await fetch(`${API_URL}/api/despachos`, {
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
      console.error('Error al crear despacho:', error);
      showToast(`Fallo crítico creando despacho: ${error.message}`, 'error');
      // No se bloquea la ejecución para devolver un error pero NO se crea el registro localmente.
      throw error;
    }
  };

  // 2. Transición de estado a DESPACHADO
  const marcarComoDespachado = (despachoId) => {
    const nowIso = new Date().toISOString();
    setDespachos((prev) =>
      prev.map((orden) => {
        if (orden.id === despachoId || orden.numero_factura === despachoId || orden.codigo_factura_erp === despachoId) {
          const placa = orden.vehiculo_placa || FLOTA_VEHICULOS[0];
          return {
            ...orden,
            estado: 'DESPACHADO',
            estado_actual: 'DESPACHADO',
            fecha_despacho: nowIso,
            hora_salida: nowIso,
            sync_onedrive: {
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

  const resetDemoData = () => {
    localStorage.removeItem('wms_valenciana_despachos_v3');
    localStorage.removeItem('wms_valenciana_despachos_v2');
    setDespachos(INITIAL_DESPACHOS);
    setDevoluciones(INITIAL_DEVOLUCIONES);
    setSelectedCarrier('TODAS');
    setSelectedZone('TODAS');
    setOnlyUrgent(false);
    setSearchQuery('');
    showToast('Datos reiniciados al modelo de 2 estados de La Valenciana FERREHOGAR.', 'info');
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
    pendientesSyncExcel: despachos.filter((d) => d.estado_actual === 'DESPACHADO' && d.sync_onedrive?.estado === 'PENDIENTE').length
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
        activeBodega,
        setActiveBodega,
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
        despacharOrden,
        marcarComoDespachado,
        asignarVehiculo,
        reintentarSyncOneDrive,
        exportarCopiaExcel,
        restaurarAPendiente,
        registrarIncidencia,
        resolverIncidencia,
        procesarDevolucion,
        addSimulatedOrder,
        crearNuevoDespacho,
        createModalOpen,
        setCreateModalOpen,
        resetDemoData,
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
