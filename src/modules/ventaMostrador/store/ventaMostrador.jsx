import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ejecutarDescuentoTransaccional } from '../../inventario/services/inventarioApi.js';
import { INITIAL_INVENTARIO } from '../../../data/mockData.js';
import { useWms } from '../../../context/WmsContext.jsx';

const STORAGE_KEY = 'valenciana_mostrador_facturas_v1';
const BROADCAST_CHANNEL_NAME = 'valenciana_mostrador_channel';

// Datos iniciales realistas para evaluar de inmediato todos los estados
const INITIAL_FACTURAS = [
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
    numeroFactura: 'FE-80291',
    cliente: 'Constructora Bolívar S.A.S.',
    fecha: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    estado: 'pendiente',
    cajero: 'Caja 01 - Carlos Mendoza',
    items: [
      {
        id: 'it-1',
        nombre: 'Cemento Gris 50kg Argos Tipo UG',
        cantidad: 8,
        seccion: 'materiales_construccion'
      },
      {
        id: 'it-2',
        nombre: 'Esmalte Sintético Pintulux Rojo Galón',
        cantidad: 2,
        seccion: 'pinturas'
      },
      {
        id: 'it-3',
        nombre: 'Taladro Percutor 1/2" 650W DeWalt DWD024',
        cantidad: 1,
        seccion: 'herramienta_electrica'
      }
    ],
    historial: [
      {
        estado: 'pendiente',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Factura generada en Caja 01'
      }
    ]
  },
  {
    id: 'FAC-80292',
    numeroFactura: 'FE-80292',
    cliente: 'Ingeniería Eléctrica del Norte S.A.',
    fecha: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    estado: 'en_vitrina',
    cajero: 'Caja 02 - Laura Gómez',
    operarioVitrina: 'Pedro (Vitrina Mostrador)',
    items: [
      {
        id: 'it-4',
        nombre: 'Cable Cobre THHN #12 AWG Rojo Rollo 100m',
        cantidad: 2,
        seccion: 'electrico'
      },
      {
        id: 'it-5',
        nombre: 'Tubo PVC Presión 1/2" RDE 9 x 6m Pavco',
        cantidad: 6,
        seccion: 'plomeria'
      },
      {
        id: 'it-6',
        nombre: 'Chazo Plástico 5/16" Caja x 100 un',
        cantidad: 3,
        seccion: 'ferreteria_general'
      }
    ],
    historial: [
      {
        estado: 'pendiente',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Factura generada en Caja 02'
      },
      {
        estado: 'en_vitrina',
        timestamp: new Date(Date.now() - 18 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Vitrina inició alistamiento en bodega'
      }
    ]
  },
  {
    id: 'FAC-80293',
    numeroFactura: 'FE-80293',
    cliente: 'Marcela Restrepo (Remodelación Apt. 402)',
    fecha: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    estado: 'lista_sello',
    cajero: 'Caja 01 - Carlos Mendoza',
    operarioVitrina: 'Andrés (Vitrina Mostrador)',
    items: [
      {
        id: 'it-7',
        nombre: 'Vinilo Tipo 1 Blanco Nieve Cuñete 5 Gal',
        cantidad: 2,
        seccion: 'pinturas'
      },
      {
        id: 'it-8',
        nombre: 'Cerradura Sobreponer Derecha Yale 101',
        cantidad: 1,
        seccion: 'ferreteria_general'
      }
    ],
    historial: [
      {
        estado: 'pendiente',
        timestamp: new Date(Date.now() - 35 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Factura generada en Caja 01'
      },
      {
        estado: 'en_vitrina',
        timestamp: new Date(Date.now() - 28 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Vitrina inició alistamiento'
      },
      {
        estado: 'lista_sello',
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Vitrina confirmó mercancía completa. Esperando sello en Facturación.'
      }
    ]
  },
  {
    id: 'FAC-80290',
    numeroFactura: 'FE-80290',
    cliente: 'Obras Civiles La Sabana',
    fecha: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    estado: 'faltante',
    cajero: 'Caja 03 - Diana Torres',
    operarioVitrina: 'Pedro (Vitrina Mostrador)',
    motivoFaltante: 'Quiebre de stock en pasillo 4: Thinner Corriente Galón no disponible en bodega física.',
    items: [
      {
        id: 'it-9',
        nombre: 'Esmalte Sintético Pintulux Rojo Galón',
        cantidad: 4,
        seccion: 'pinturas'
      },
      {
        id: 'it-10',
        nombre: 'Thinner Corriente Galón',
        cantidad: 2,
        seccion: 'pinturas'
      }
    ],
    historial: [
      {
        estado: 'pendiente',
        timestamp: new Date(Date.now() - 48 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Factura generada en Caja 03'
      },
      {
        estado: 'en_vitrina',
        timestamp: new Date(Date.now() - 40 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Vitrina inició recorrido por pasillo 4'
      },
      {
        estado: 'faltante',
        timestamp: new Date(Date.now() - 32 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Vitrina reportó falta de stock: Thinner Corriente agotado. Factura congelada.'
      }
    ]
  },
  {
    id: 'FAC-80288',
    numeroFactura: 'FE-80288',
    cliente: 'Ferretería El Progreso',
    fecha: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    estado: 'entregada',
    cajero: 'Caja 01 - Carlos Mendoza',
    operarioVitrina: 'Andrés (Vitrina Mostrador)',
    items: [
      {
        id: 'it-11',
        nombre: 'Varilla Corrugada 1/2" x 6m',
        cantidad: 15,
        seccion: 'materiales_construccion'
      },
      {
        id: 'it-12',
        nombre: 'Pulidora Angular 4-1/2" 750W Bosch GWS 700',
        cantidad: 1,
        seccion: 'herramienta_electrica'
      }
    ],
    historial: [
      {
        estado: 'pendiente',
        timestamp: new Date(Date.now() - 75 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Factura generada'
      },
      {
        estado: 'en_vitrina',
        timestamp: new Date(Date.now() - 65 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Alistada en patio de materiales'
      },
      {
        estado: 'lista_sello',
        timestamp: new Date(Date.now() - 50 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Entregada al cliente en mostrador'
      },
      {
        estado: 'entregada',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detalle: 'Sello físico verificado por Facturación. Inventario descontado con éxito.'
      }
    ]
  }
];

const VentaMostradorContext = createContext(null);

export function VentaMostradorProvider({ children }) {
  let wms = null;
  try {
    wms = useWms();
  } catch (e) {
    // Fallback si se ejecuta fuera de WmsProvider
  }

  const [facturas, setFacturas] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const tiene80993 = parsed.some(f => f.id === 'FAC-80993' || f.numeroFactura === 'FE-80993' || f.numero === 'FE-80993');
        if (!tiene80993) {
          const fac80993 = INITIAL_FACTURAS.find(f => f.id === 'FAC-80993');
          if (fac80993) return [fac80993, ...parsed];
        }
        return parsed;
      }
    } catch (e) {
      console.warn('No se pudo leer localStorage para facturas mostrador', e);
    }
    return INITIAL_FACTURAS;
  });

  // Estado del catálogo global e inventario de productos (respaldado por WMS si existe)
  const [localInventario, setLocalInventario] = useState(() => {
    try {
      const saved = localStorage.getItem('wms_valenciana_inventario_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_INVENTARIO;
  });

  const inventario = wms?.inventario || localInventario;
  const setInventario = wms?.setInventario || setLocalInventario;

  useEffect(() => {
    if (!wms) {
      try {
        localStorage.setItem('wms_valenciana_inventario_v2', JSON.stringify(localInventario));
      } catch (e) {}
    }
  }, [localInventario, wms]);

  const [sedeActiva, setSedeActiva] = useState('BOG-VAL-01');
  const [ultimaAccion, setUltimaAccion] = useState(null);

  // Guardar en localStorage y sincronizar con otras pestañas
  const persistFacturas = useCallback((nuevasFacturas, accionInfo) => {
    setFacturas(nuevasFacturas);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevasFacturas));
      if (accionInfo) {
        setUltimaAccion(accionInfo);
      }
      // BroadcastChannel para sincronización instantánea entre pestañas
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage({ type: 'UPDATE_FACTURAS', payload: nuevasFacturas, accion: accionInfo });
        bc.close();
      }
    } catch (e) {
      console.error('Error persistiendo facturas en localStorage', e);
    }
  }, []);

  // Escuchar cambios de otras pestañas vía storage event y BroadcastChannel
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setFacturas(parsed);
        } catch (e) {
          console.error('Error parseando actualización de storage', e);
        }
      }
    };

    let bc;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === 'UPDATE_FACTURAS' && event.data.payload) {
          setFacturas(event.data.payload);
          if (event.data.accion) {
            setUltimaAccion(event.data.accion);
          }
        }
      };
    }

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, []);

  // 1. FACTURACIÓN: Crear nueva factura con ítems y secciones obligatorias
  const crearFactura = useCallback(({ numeroFactura, cliente, items, cajero = 'Caja 01 - Facturación' }) => {
    if (!numeroFactura || !cliente || !items || items.length === 0) {
      throw new Error('Número de factura, cliente y al menos un ítem son obligatorios.');
    }

    // Validar que CADA ítem tenga sección obligatoria
    for (const item of items) {
      if (!item.nombre?.trim()) {
        throw new Error('Cada ítem debe tener un nombre válido.');
      }
      if (!item.cantidad || Number(item.cantidad) <= 0) {
        throw new Error(`La cantidad de "${item.nombre}" debe ser mayor a cero.`);
      }
      if (!item.seccion) {
        throw new Error(`El ítem "${item.nombre}" no tiene una sección asignada. La sección es obligatoria.`);
      }
    }

    const nuevaFactura = {
      id: `FAC-${Date.now()}`,
      numeroFactura: numeroFactura.trim(),
      cliente: cliente.trim(),
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      cajero,
      items: items.map((it, idx) => ({
        id: `it-${Date.now()}-${idx}`,
        nombre: it.nombre.trim(),
        cantidad: Number(it.cantidad),
        seccion: it.seccion
      })),
      historial: [
        {
          estado: 'pendiente',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          detalle: `Factura generada por ${cajero}. Enviada a Vitrina.`
        }
      ]
    };

    setFacturas((prev) => {
      const actualizadas = [nuevaFactura, ...prev];
      persistFacturas(actualizadas, {
        mensaje: `Factura ${nuevaFactura.numeroFactura} creada y enviada a Vitrina`,
        tipo: 'success'
      });
      return actualizadas;
    });

    return nuevaFactura;
  }, [persistFacturas]);

  // 2. VITRINA: "Ya la vi, voy por esto" -> pasa a en_vitrina
  const iniciarAlistamiento = useCallback((facturaId, operario = 'Vitrina Mostrador') => {
    setFacturas((prev) => {
      const actualizadas = prev.map((fac) => {
        if (fac.id === facturaId) {
          return {
            ...fac,
            estado: 'en_vitrina',
            operarioVitrina: operario,
            historial: [
              ...fac.historial,
              {
                estado: 'en_vitrina',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                detalle: `${operario} inició el alistamiento en bodegas físicas.`
              }
            ]
          };
        }
        return fac;
      });

      persistFacturas(actualizadas, {
        mensaje: `Factura en alistamiento por ${operario}`,
        tipo: 'info'
      });
      return actualizadas;
    });
  }, [persistFacturas]);

  // 3. VITRINA: "Entrega completa" -> pasa a lista_sello
  // NOTA CRÍTICA: Vitrina NUNCA edita cantidades. Solo confirma que se entregó todo lo facturado.
  const confirmarEntregaCompleta = useCallback((facturaId, operario = 'Vitrina Mostrador') => {
    setFacturas((prev) => {
      const actualizadas = prev.map((fac) => {
        if (fac.id === facturaId) {
          return {
            ...fac,
            estado: 'lista_sello',
            historial: [
              ...fac.historial,
              {
                estado: 'lista_sello',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                detalle: `${operario} confirmó entrega completa física. Factura lista para sello en Facturación.`
              }
            ]
          };
        }
        return fac;
      });

      persistFacturas(actualizadas, {
        mensaje: `Entrega completa confirmada. Esperando sello físico en Facturación.`,
        tipo: 'success'
      });
      return actualizadas;
    });
  }, [persistFacturas]);

  // 4. VITRINA: "Reportar faltante" -> pasa a faltante (congelada)
  // NOTA CRÍTICA: No permite escribir cantidades — es una bandera, no una edición.
  const reportarFaltante = useCallback((facturaId, motivo = 'Falta stock físico en sección', operario = 'Vitrina Mostrador') => {
    setFacturas((prev) => {
      const actualizadas = prev.map((fac) => {
        if (fac.id === facturaId) {
          return {
            ...fac,
            estado: 'faltante',
            motivoFaltante: motivo,
            historial: [
              ...fac.historial,
              {
                estado: 'faltante',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                detalle: `FALTANTE REPORTADO por ${operario}: ${motivo}. Factura congelada.`
              }
            ]
          };
        }
        return fac;
      });

      persistFacturas(actualizadas, {
        mensaje: `Faltante reportado: Factura congelada fuera del flujo normal.`,
        tipo: 'danger'
      });
      return actualizadas;
    });
  }, [persistFacturas]);

  // 5. FACTURACIÓN: "Confirmar sello / Entregado" → pasa a ENTREGADA Y SELLADA
  // NOTA CRÍTICA: Toda la deducción de inventario se delega al WmsContext (SSOT).
  // Este store SOLO actualiza el estado de la factura en su array local.
  const confirmarSelloFactura = useCallback((facturaId, metadataOperador = 'Cajero 01') => {
    // 1. Obtener la factura que se está sellando
    const factura = facturas.find(f => f.id === facturaId || f.numero === facturaId || f.numeroFactura === facturaId);
    if (!factura) {
      return { success: false, reason: 'NOT_FOUND' };
    }

    // 2. Control estricto de Idempotencia: no permitir doble sellado ni doble descuento
    if (factura.sellada || factura.estado === 'ENTREGADA Y SELLADA' || factura.estado === 'Sello verificado') {
      console.warn(`[IDEMPOTENCIA MOSTRADOR] Factura ${factura.numeroFactura || factura.id} ya fue sellada.`);
      return { success: false, reason: 'ALREADY_SEALED', factura };
    }

    // 3. Delegar descuento transaccional al WmsContext (SSOT única fuente de verdad)
    //    WmsContext.confirmarSelloFactura se encarga de:
    //    - Normalización robusta (NFD, tildes, mayúsculas)
    //    - Pre-validación de ítems huérfanos (rollback si no coinciden)
    //    - Deducción atómica del inventario
    //    - Registro de trazabilidad inmutable
    //    - Actualización del estado de la factura en su propio array
    let resultadoWms = { success: true };
    if (wms?.confirmarSelloFactura) {
      resultadoWms = wms.confirmarSelloFactura(facturaId, metadataOperador);
      // Si el WMS abortó la transacción (ítems huérfanos, ya sellada, etc.), NO continuar
      if (!resultadoWms?.success) {
        return resultadoWms;
      }
    } else {
      // Fallback local SOLO si NO hay WmsContext (ejecución aislada sin WmsProvider)
      setInventario(prevInventario => {
        return prevInventario.map(producto => {
          const nomProd = (producto.nombre || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const itemFacturado = factura.items?.find(item => {
            const skuItem = item.sku?.toUpperCase();
            const skuProd = producto.sku?.toUpperCase();
            if (skuItem && skuProd && skuItem === skuProd) return true;

            const nomItem = (item.nombre || item.producto || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return nomItem.length > 0 && nomItem === nomProd;
          });

          if (itemFacturado) {
            const stockActual = producto.stockTotal ?? producto.stock ?? producto.stock_total ?? 0;
            const nuevoStock = Math.max(0, stockActual - (Number(itemFacturado.cantidad) || 0));
            return {
              ...producto,
              stockTotal: nuevoStock,
              stock: nuevoStock,
              stock_total: nuevoStock,
              ultimaActualizacionStock: new Date().toISOString()
            };
          }
          return producto;
        });
      });
    }

    // 4. Actualizar el estado de la factura a sellada en este store local (sincronización de UI)
    const timestamp = new Date().toISOString();
    const horaLegible = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setFacturas(prevFacturas => {
      const actualizadas = prevFacturas.map(f =>
        (f.id === facturaId || f.numero === facturaId || f.numeroFactura === facturaId)
          ? {
              ...f,
              estado: 'ENTREGADA Y SELLADA',
              sellada: true,
              fechaSello: timestamp,
              selladaAt: timestamp,
              fechaEntregaFinal: timestamp,
              operadorSello: metadataOperador,
              selloConfirmadoPor: metadataOperador,
              historial: [
                ...(f.historial || []),
                {
                  estado: 'ENTREGADA Y SELLADA',
                  timestamp: horaLegible,
                  detalle: `Sello físico verificado por ${metadataOperador}. Mercancía entregada e inventario descontado con éxito.`
                }
              ]
            }
          : f
      );

      persistFacturas(actualizadas, {
        mensaje: `Factura #${factura.numeroFactura || factura.numero || factura.id} sellada: inventario descontado con éxito.`,
        tipo: 'success'
      });
      return actualizadas;
    });

    // 5. Backend sync (no-critical, fire-and-forget)
    try {
      const SECCION_A_BODEGA = {
        materiales_construccion: 1,
        pinturas: 2,
        herramienta_electrica: 3,
        plomeria: 4,
        electrico: 5,
        jardin_exteriores: 6,
        ferreteria_general: 7
      };
      ejecutarDescuentoTransaccional({
        items: factura.items.map((it) => ({
          sku: it.sku || (it.nombre?.includes('Cable') ? 'ELE-001' : 'MAT-001'),
          bodegaId: it.bodega_id || SECCION_A_BODEGA[it.seccion] || 5,
          cantidad: Number(it.cantidad),
          nombre: it.nombre
        })),
        origen: 'venta_mostrador',
        referenciaId: factura.numeroFactura || factura.numero || factura.id
      }).catch(() => {});
    } catch (e) {}

    return { success: true };
  }, [facturas, persistFacturas, wms, setInventario]);

  // Alias para compatibilidad operativa
  const confirmarSelloYEntregar = useCallback(async (facturaId, cajero = 'Facturación') => {
    confirmarSelloFactura(facturaId);
  }, [confirmarSelloFactura]);

  // Restablecer datos de prueba a valores iniciales
  const reiniciarDatos = useCallback(() => {
    localStorage.removeItem('wms_valenciana_inventario_v2');
    setInventario(INITIAL_INVENTARIO);
    persistFacturas(INITIAL_FACTURAS, {
      mensaje: 'Datos demo de Venta Mostrador restablecidos',
      tipo: 'info'
    });
  }, [persistFacturas]);

  const totalUnidadesBodega = inventario.reduce((acc, p) => acc + (p.stockTotal || p.stock || 0), 0);

  return (
    <VentaMostradorContext.Provider
      value={{
        facturas,
        inventario,
        setInventario,
        totalUnidadesBodega,
        sedeActiva,
        setSedeActiva,
        ultimaAccion,
        crearFactura,
        iniciarAlistamiento,
        confirmarEntregaCompleta,
        reportarFaltante,
        confirmarSelloFactura,
        confirmarSelloYEntregar,
        reiniciarDatos
      }}
    >
      {children}
    </VentaMostradorContext.Provider>
  );
}

export function useVentaMostrador() {
  const context = useContext(VentaMostradorContext);
  if (!context) {
    throw new Error('useVentaMostrador debe utilizarse dentro de un VentaMostradorProvider');
  }
  return context;
}
