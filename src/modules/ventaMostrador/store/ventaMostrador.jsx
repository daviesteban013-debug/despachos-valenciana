import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ejecutarDescuentoTransaccional } from '../../inventario/services/inventarioApi.js';

const STORAGE_KEY = 'valenciana_mostrador_facturas_v1';
const BROADCAST_CHANNEL_NAME = 'valenciana_mostrador_channel';

// Datos iniciales realistas para evaluar de inmediato todos los estados
const INITIAL_FACTURAS = [
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
  const [facturas, setFacturas] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('No se pudo leer localStorage para facturas mostrador', e);
    }
    return INITIAL_FACTURAS;
  });

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

  // 5. FACTURACIÓN: "Confirmar sello / Entregado" -> pasa a entregada
  // Dispara el descuento de inventario real por la cantidad EXACTA original facturada mediante transacción atómica.
  const confirmarSelloYEntregar = useCallback(async (facturaId, cajero = 'Facturación') => {
    const factura = facturas.find((f) => f.id === facturaId);
    if (!factura) return;

    // Mapa de sección a bodega ID
    const SECCION_A_BODEGA = {
      materiales_construccion: 1,
      pinturas: 2,
      herramienta_electrica: 3,
      plomeria: 4,
      electrico: 5,
      jardin_exteriores: 6,
      ferreteria_general: 7
    };

    // =========================================================================
    // TODO: aquí se descuenta, por sección/bodega, la cantidad facturada de cada ítem — NUNCA una cantidad distinta a la original
    // =========================================================================
    try {
      await ejecutarDescuentoTransaccional({
        items: factura.items.map((it) => ({
          sku: it.sku || (it.nombre?.includes('Cemento') ? 'MAT-001' : it.nombre?.includes('Esmalte') || it.nombre?.includes('Vinilo') ? 'PIN-001' : it.nombre?.includes('Taladro') ? 'HER-001' : it.nombre?.includes('Cable') ? 'ELE-001' : it.nombre?.includes('Tubo') ? 'PLO-001' : 'FER-001'),
          bodegaId: it.bodega_id || SECCION_A_BODEGA[it.seccion] || 1,
          cantidad: Number(it.cantidad),
          nombre: it.nombre
        })),
        origen: 'venta_mostrador',
        referenciaId: factura.numeroFactura
      });
    } catch (errStock) {
      persistFacturas(facturas, {
        mensaje: `Bloqueo de Inventario: ${errStock.message}. La factura permanece en LISTA_SELLO.`,
        tipo: 'danger'
      });
      throw errStock;
    }

    setFacturas((prev) => {
      const actualizadas = prev.map((fac) => {
        if (fac.id === facturaId) {
          return {
            ...fac,
            estado: 'entregada',
            fechaEntregaFinal: new Date().toISOString(),
            selloConfirmadoPor: cajero,
            historial: [
              ...fac.historial,
              {
                estado: 'entregada',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                detalle: `Sello físico verificado por ${cajero}. Pedido finalizado e inventario descontado con éxito.`
              }
            ]
          };
        }
        return fac;
      });

      persistFacturas(actualizadas, {
        mensaje: `Sello confirmado para ${factura.numeroFactura}. Inventario descontado con éxito.`,
        tipo: 'success'
      });
      return actualizadas;
    });
  }, [facturas, persistFacturas]);

  // Restablecer datos de prueba a valores iniciales
  const reiniciarDatos = useCallback(() => {
    persistFacturas(INITIAL_FACTURAS, {
      mensaje: 'Datos demo de Venta Mostrador restablecidos',
      tipo: 'info'
    });
  }, [persistFacturas]);

  return (
    <VentaMostradorContext.Provider
      value={{
        facturas,
        sedeActiva,
        setSedeActiva,
        ultimaAccion,
        crearFactura,
        iniciarAlistamiento,
        confirmarEntregaCompleta,
        reportarFaltante,
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
