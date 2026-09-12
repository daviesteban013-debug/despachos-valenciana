import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  INITIAL_DESPACHOS, 
  INITIAL_DEVOLUCIONES, 
  MOCK_VEHICULOS_RUTAS, 
  MOCK_BODEGAS,
  INITIAL_INVENTARIO,
  INITIAL_FACTURAS_EMITIDAS
} from '../data/mockData';

const WmsContext = createContext(null);

export function WmsProvider({ children }) {
  const [despachos, setDespachos] = useState(() => {
    const saved = localStorage.getItem('wms_valenciana_despachos_v2');
    return saved ? JSON.parse(saved) : INITIAL_DESPACHOS;
  });

  const [devoluciones, setDevoluciones] = useState(() => {
    const saved = localStorage.getItem('wms_valenciana_devoluciones_v2');
    return saved ? JSON.parse(saved) : INITIAL_DEVOLUCIONES;
  });

  // Catálogo maestro e inventario operativo con stock global
  const [inventario, setInventario] = useState(() => {
    const saved = localStorage.getItem('wms_valenciana_inventario_v2');
    return saved ? JSON.parse(saved) : INITIAL_INVENTARIO;
  });

  // Facturas emitidas y control de sello
  const [facturas, setFacturas] = useState(() => {
    const saved = localStorage.getItem('wms_valenciana_facturas_v2');
    return saved ? JSON.parse(saved) : INITIAL_FACTURAS_EMITIDAS;
  });

  // Navegación Bottom Dock: 'waves' | 'packing' | 'bays' | 'incidents'
  const [activeDockTab, setActiveDockTab] = useState('waves');

  // Modo de visualización en Tablero de Olas: 'kanban' | 'list'
  const [wavesViewMode, setWavesViewMode] = useState('kanban');

  // Configuración operativa
  const [activeBodega, setActiveBodega] = useState(MOCK_BODEGAS[0].codigo);
  const [activeTurno, setActiveTurno] = useState('Diurno');
  const [selectedCarrier, setSelectedCarrier] = useState('TODAS');
  const [selectedZone, setSelectedZone] = useState('TODAS');
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modales y Drawers
  const [selectedDespachoId, setSelectedDespachoId] = useState(null);
  const [incidentModalTarget, setIncidentModalTarget] = useState(null);
  const [packageLabelDespacho, setPackageLabelDespacho] = useState(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [returnsDrawerOpen, setReturnsDrawerOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Reloj de corte SLA (cada 5 segundos)
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Persistencia local
  useEffect(() => {
    try {
      localStorage.setItem('wms_valenciana_despachos_v2', JSON.stringify(despachos));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [despachos]);

  useEffect(() => {
    try {
      localStorage.setItem('wms_valenciana_inventario_v2', JSON.stringify(inventario));
    } catch (e) {
      console.warn('LocalStorage inventario error', e);
    }
  }, [inventario]);

  useEffect(() => {
    try {
      localStorage.setItem('wms_valenciana_facturas_v2', JSON.stringify(facturas));
    } catch (e) {
      console.warn('LocalStorage facturas error', e);
    }
  }, [facturas]);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.id === notification?.id ? null : curr));
    }, 4500);
  };

  // Efecto auditivo / háptico simulado para el pistoleo RF
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

  // Mapeo de transiciones operativas
  const NEXT_STAGE_MAP = {
    COLA: 'PICKING',
    PICKING: 'PACKING',
    PACKING: 'LISTO',
    LISTO: 'DESPACHADO'
  };

  const advanceStage = (despachoId) => {
    setDespachos((prev) =>
      prev.map((d) => {
        if (d.id !== despachoId) return d;
        const current = d.estado_actual;
        const next = NEXT_STAGE_MAP[current];
        if (!next) return d;

        const nowIso = new Date().toISOString();
        let updatedPickingOperario = d.picking_operario;
        let updatedPackingMesa = d.packing_mesa;
        let updatedBahia = d.bahia_asignada;
        let updatedManifest = d.manifiesto_despacho;
        let updatedHoraSalida = d.hora_salida;
        let nota = `Transición operativa a ${next}`;

        if (next === 'PICKING') {
          updatedPickingOperario = updatedPickingOperario || 'Javier Gómez (RF-01)';
          nota = `Asignado a ${updatedPickingOperario} para recolección en estantería`;
        } else if (next === 'PACKING') {
          updatedPackingMesa = updatedPackingMesa || 'Mesa 01 (Báscula Certificada)';
          nota = `Recibido en ${updatedPackingMesa} para verificación y aforo de peso`;
        } else if (next === 'LISTO') {
          updatedBahia = updatedBahia || 'Bodega A-01';
          nota = `Auditoría y báscula conformes. Trasladado a ${updatedBahia} para estiba y cargue`;
        } else if (next === 'DESPACHADO') {
          updatedManifest = `MAN-VAL-2026-09-${Math.floor(100 + Math.random() * 900)}`;
          updatedHoraSalida = nowIso;
          nota = `Cargue completado. Despachado en ruta con manifiesto ${updatedManifest}`;
        }

        const newHistory = [
          ...(d.history || []),
          {
            id: `h-${Date.now()}`,
            estado_anterior: current,
            estado_nuevo: next,
            usuario_operador: 'Líder Bodega Valenciana',
            tiempo_estancia_seg: Math.floor(Math.random() * 300) + 120,
            timestamp: nowIso,
            nota
          }
        ];

        playBeep(1046); // Nota aguda de éxito
        showToast(`Orden ${d.codigo_orden} avanzada a [${next}] exitosamente.`, 'success');

        return {
          ...d,
          estado_actual: next,
          picking_operario: updatedPickingOperario,
          packing_mesa: updatedPackingMesa,
          bahia_asignada: updatedBahia,
          manifiesto_despacho: updatedManifest,
          hora_salida: updatedHoraSalida,
          history: newHistory
        };
      })
    );
  };

  // Pistoleo / Escaneo individual de ítem
  const auditItem = (despachoId, itemId) => {
    playBeep(1200); // Beep de escáner láser
    setDespachos((prev) =>
      prev.map((d) => {
        if (d.id !== despachoId) return d;
        const updatedItems = (d.items || []).map((it) => {
          if (it.id !== itemId) return it;
          const newQty = Math.min(it.cantidad_solicitada, (it.cantidad_auditada || 0) + 1);
          return { ...it, cantidad_auditada: newQty };
        });
        return { ...d, items: updatedItems };
      })
    );
  };

  // Pistoleo masivo (Auditoría 100% de la orden)
  const auditAllItems = (despachoId) => {
    playBeep(1320);
    setDespachos((prev) =>
      prev.map((d) => {
        if (d.id !== despachoId) return d;
        const updatedItems = (d.items || []).map((it) => ({
          ...it,
          cantidad_auditada: it.cantidad_solicitada
        }));
        showToast(`Pistoleo completado: 100% de ítems verificados para ${d.codigo_orden}`, 'success');
        return { ...d, items: updatedItems };
      })
    );
  };

  // Ajuste de peso en báscula (para simular aforo)
  const updateScaleWeight = (despachoId, newWeight) => {
    setDespachos((prev) =>
      prev.map((d) => {
        if (d.id !== despachoId) return d;
        return { ...d, peso_bascula_kg: Number(newWeight) };
      })
    );
  };

  // Reportar Incidencia
  const reportIncident = (despachoId, tipo, descripcion) => {
    playBeep(440, 'sawtooth'); // Tono de alerta grave
    setDespachos((prev) =>
      prev.map((d) => {
        if (d.id !== despachoId) return d;
        const nowIso = new Date().toISOString();
        const nuevaIncidencia = {
          id: `inc-${Date.now()}`,
          tipo,
          descripcion,
          reportado_por: 'Auditor de Empaque (WMS)',
          fecha_reporte: nowIso,
          resuelta: false
        };

        const newHistory = [
          ...(d.history || []),
          {
            id: `h-${Date.now()}`,
            estado_anterior: d.estado_actual,
            estado_nuevo: 'INCIDENCIA',
            usuario_operador: 'Auditor de Empaque',
            tiempo_estancia_seg: 60,
            timestamp: nowIso,
            nota: `RETENCIÓN POR INCIDENCIA (${tipo}): ${descripcion}`
          }
        ];

        showToast(`⚠️ Orden ${d.codigo_orden} retenida por [${tipo}].`, 'warning');

        return {
          ...d,
          estado_actual: 'INCIDENCIA',
          estado_previo_incidencia: d.estado_actual,
          incidencia_activa: nuevaIncidencia,
          history: newHistory
        };
      })
    );
    setIncidentModalTarget(null);
  };

  // Resolver Incidencia
  const resolveIncident = (despachoId, solucion, destino = 'PACKING') => {
    playBeep(987);
    setDespachos((prev) =>
      prev.map((d) => {
        if (d.id !== despachoId) return d;
        const nowIso = new Date().toISOString();
        const estadoRestaurado = d.estado_previo_incidencia || destino;

        const newHistory = [
          ...(d.history || []),
          {
            id: `h-${Date.now()}`,
            estado_anterior: 'INCIDENCIA',
            estado_nuevo: estadoRestaurado,
            usuario_operador: 'Líder Bodega Valenciana',
            tiempo_estancia_seg: 180,
            timestamp: nowIso,
            nota: `INCIDENCIA RESUELTA: ${solucion}. Reincorporado a [${estadoRestaurado}]`
          }
        ];

        showToast(`✅ Novedad resuelta en ${d.codigo_orden}. Reingresada a [${estadoRestaurado}].`, 'success');

        return {
          ...d,
          estado_actual: estadoRestaurado,
          incidencia_activa: null,
          history: newHistory
        };
      })
    );
    setIncidentModalTarget(null);
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
      estado_actual: 'COLA',
      prioridad: 1, // Urgente
      horario_corte: new Date(Date.now() + 19 * 60000).toISOString(), // 19 minutos restante
      bahia_asignada: 'Bodega A-01',
      numero_guia: `GUIA-VAL-${Math.floor(1000 + Math.random() * 9000)}`,
      peso_total_kg: 172.0,
      peso_bascula_kg: 172.0,
      valor_total: 4280000,
      picking_operario: null,
      packing_mesa: null,
      items: [
        { id: `it-sim-1`, sku: 'SKU-CEM-50', descripcion_producto: 'Cemento Gris Estructural 50kg Argos', cantidad_solicitada: 3, cantidad_auditada: 0, ubicacion_bodega: 'P06-E01-N1', peso_unitario_kg: 50.0, unidad: 'BUL' },
        { id: `it-sim-2`, sku: 'SKU-VAR-12', descripcion_producto: 'Varilla Corrugada 1/2" x 6m Diaco W60', cantidad_solicitada: 3, cantidad_auditada: 0, ubicacion_bodega: 'P08-E02-N1', peso_unitario_kg: 5.9, unidad: 'UND' },
        { id: `it-sim-3`, sku: 'SKU-PIN-PIN', descripcion_producto: 'Pintura Acrílica Viniltex Blanco Galón Pintuco', cantidad_solicitada: 1, cantidad_auditada: 0, ubicacion_bodega: 'P04-E02-N1', peso_unitario_kg: 5.1, unidad: 'GAL' }
      ],
      history: [
        { id: `h-sim-${Date.now()}`, estado_anterior: null, estado_nuevo: 'COLA', usuario_operador: 'Ventas Mostrador Valenciana', tiempo_estancia_seg: 10, timestamp: new Date().toISOString(), nota: 'Pedido express ferretería para despacho en ruta 1' }
      ]
    };

    setDespachos((prev) => [newOrder, ...prev]);
    playBeep(880, 'triangle');
    showToast(`⚡ Nuevo pedido crítico: ${newOrder.codigo_orden} (Corte en 19 min)`, 'warning');
  };

  const resetDemoData = () => {
    localStorage.removeItem('wms_valenciana_despachos_v2');
    localStorage.removeItem('wms_valenciana_inventario_v2');
    localStorage.removeItem('wms_valenciana_facturas_v2');
    setDespachos(INITIAL_DESPACHOS);
    setDevoluciones(INITIAL_DEVOLUCIONES);
    setInventario(INITIAL_INVENTARIO);
    setFacturas(INITIAL_FACTURAS_EMITIDAS);
    setSelectedCarrier('TODAS');
    setSelectedZone('TODAS');
    setOnlyUrgent(false);
    setSearchQuery('');
    showToast('Datos reiniciados a los valores estándar de La Valenciana FERREHOGAR.', 'info');
  };

  // Dentro de la función que confirma el sello de la factura:
  const confirmarSelloFactura = (facturaId) => {
    // 1. Obtener la factura que se está sellando
    const factura = facturas.find(f => f.id === facturaId || f.numero === facturaId || f.numeroFactura === facturaId);
    if (!factura) return;

    // 2. Descontar las cantidades de cada ítem del inventario global
    setInventario(prevInventario => {
      return prevInventario.map(producto => {
        // Buscar si este producto está en los ítems de la factura
        const itemFacturado = factura.items?.find(
          item => item.sku === producto.sku || item.nombre === producto.nombre || item.producto === producto.nombre
        );

        if (itemFacturado) {
          const nuevoStock = Math.max(0, (producto.stockTotal || producto.stock || 0) - (itemFacturado.cantidad || 0));
          return {
            ...producto,
            stockTotal: nuevoStock,
            stock: nuevoStock
          };
        }
        return producto;
      });
    });

    // 3. Actualizar el estado de la factura a sellada
    setFacturas(prevFacturas =>
      prevFacturas.map(f =>
        (f.id === facturaId || f.numero === facturaId || f.numeroFactura === facturaId)
          ? { ...f, estado: 'ENTREGADA Y SELLADA', sellada: true, fechaSello: new Date().toISOString() }
          : f
      )
    );

    playBeep(1046);
    showToast(`Factura ${factura.numeroFactura || factura.numero || factura.id} confirmada como [ENTREGADA Y SELLADA]. Inventario descontado.`, 'success');
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

  // Métricas calculadas para la barra superior
  const kpis = {
    pendientesHoy: despachos.filter((d) => d.estado_actual !== 'DESPACHADO').length,
    enCola: despachos.filter((d) => d.estado_actual === 'COLA').length,
    enPicking: despachos.filter((d) => d.estado_actual === 'PICKING').length,
    enPacking: despachos.filter((d) => d.estado_actual === 'PACKING').length,
    enBahia: despachos.filter((d) => d.estado_actual === 'LISTO').length,
    despachados: despachos.filter((d) => d.estado_actual === 'DESPACHADO').length,
    incidencias: despachos.filter((d) => d.estado_actual === 'INCIDENCIA').length,
    unidadesEnBodega: inventario.reduce((acc, p) => acc + (p.stockTotal || p.stock || 0), 0),
    unidades_en_bodega: inventario.reduce((acc, p) => acc + (p.stockTotal || p.stock || 0), 0),
    alertasCorteProximo: despachos.filter((d) => {
      if (d.estado_actual === 'DESPACHADO' || d.estado_actual === 'INCIDENCIA') return false;
      const diffMins = (new Date(d.horario_corte).getTime() - currentTime) / 60000;
      return diffMins > 0 && diffMins <= 30;
    }).length,
    eficienciaSla: Math.round(
      (despachos.filter((d) => {
        if (d.estado_actual === 'DESPACHADO') return true;
        const diffMins = (new Date(d.horario_corte).getTime() - currentTime) / 60000;
        return diffMins > 0;
      }).length / (despachos.length || 1)) * 100
    )
  };

  const selectedDespacho = despachos.find((d) => d.id === selectedDespachoId) || null;

  return (
    <WmsContext.Provider
      value={{
        despachos,
        filteredDespachos,
        devoluciones,
        inventario,
        setInventario,
        facturas,
        setFacturas,
        confirmarSelloFactura,
        bodegas: MOCK_BODEGAS,
        rutasVehiculos: MOCK_VEHICULOS_RUTAS,
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
        packageLabelDespacho,
        setPackageLabelDespacho,
        scannerModalOpen,
        setScannerModalOpen,
        returnsDrawerOpen,
        setReturnsDrawerOpen,
        notification,
        setNotification,
        currentTime,
        kpis,
        advanceStage,
        auditItem,
        auditAllItems,
        updateScaleWeight,
        reportIncident,
        resolveIncident,
        addSimulatedOrder,
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
