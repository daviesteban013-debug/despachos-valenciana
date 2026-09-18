import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, 
  History, 
  Truck, 
  ArrowRight, 
  Check, 
  MapPin, 
  Printer,
  Package,
  AlertCircle
} from 'lucide-react';
import PackageLabelModal from './PackageLabelModal';
import { FLOTA_VEHICULOS } from '../data/flota';

export default function DispatchDetailDrawer() {
  const { 
    selectedDespacho, 
    setSelectedDespachoId, 
    despacharOrden, 
    marcarComoDespachado,
    setIncidentModalTarget, 
    rutasVehiculos 
  } = useWms();

  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'timeline' | 'route'
  const [showTirilla, setShowTirilla] = useState(false);

  if (!selectedDespacho) return null;

  const isDespachado = (selectedDespacho.estado || selectedDespacho.estado_actual) === 'DESPACHADO';
  const factura = selectedDespacho.numero_factura || selectedDespacho.codigo_factura_erp || selectedDespacho.codigo_orden;
  const direccion = selectedDespacho.direccion_entrega || selectedDespacho.zona_entrega || 'Sin dirección registrada';
  const cuadrilla = selectedDespacho.vehiculo_placa || FLOTA_VEHICULOS[0];
  const rutaAsignada = rutasVehiculos.find((r) => r.id === selectedDespacho.ruta_id) || rutasVehiculos[0];

  return (
    <>
      <div 
        className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center animate-fadeIn"
        onClick={() => setSelectedDespachoId(null)}
      >
        <div 
          className="w-full md:max-w-2xl bg-white rounded-t-3xl md:rounded-3xl max-h-[90vh] h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* PULL HANDLE SUPERIOR PARA EL PULGAR */}
          <div className="pt-2 pb-1 bg-[#E11D24] md:hidden cursor-pointer" onClick={() => setSelectedDespachoId(null)}>
            <div className="w-12 h-1.5 bg-white/40 rounded-full mx-auto" />
          </div>

          {/* 1. CABECERA: CLIENTE, FACTURA, DIRECCIÓN, CUADRILLA Y ESTADO (COLA / DESPACHADO) */}
          <div className="bg-[#E11D24] text-white px-4 py-3 flex items-start justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-lg sm:text-xl font-black text-white tracking-tight">
                  {factura}
                </span>
                {selectedDespacho.codigo_orden && selectedDespacho.codigo_orden !== factura && (
                  <span className="font-mono text-xs font-bold bg-white text-[#E11D24] px-2 py-0.5 rounded-md">
                    {selectedDespacho.codigo_orden}
                  </span>
                )}
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                  isDespachado 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-red-800 text-white'
                }`}>
                  {isDespachado ? 'DESPACHADO' : 'COLA'}
                </span>
              </div>

              <h2 className="text-base font-bold text-white leading-tight">
                {selectedDespacho.cliente_nombre}
              </h2>

              <p className="text-xs text-red-100 font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-red-200 shrink-0" />
                <span className="truncate max-w-md">{direccion}</span>
              </p>

              <div className="flex items-center gap-2 text-xs text-red-100 font-medium flex-wrap pt-0.5">
                <span className="flex items-center gap-1 bg-red-800/80 px-2 py-0.5 rounded-md text-white font-semibold">
                  <Truck className="h-3 w-3" />
                  Vehículo: {cuadrilla}
                </span>
                {selectedDespacho.jornada && (
                  <span className="bg-white/20 text-white font-bold px-2 py-0.5 rounded-md">
                    Jornada: {selectedDespacho.jornada}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedDespachoId(null)}
              className="p-2 rounded-xl bg-red-800/80 hover:bg-red-900 text-white transition-all shrink-0"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 2. PESTAÑAS DE NAVEGACIÓN SUPERIOR */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-2 sm:px-4">
            <button
              onClick={() => setActiveTab('items')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeTab === 'items'
                  ? 'border-[#E11D24] text-[#E11D24] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Materiales</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeTab === 'timeline'
                  ? 'border-[#E11D24] text-[#E11D24] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Trazabilidad</span>
            </button>

            <button
              onClick={() => setActiveTab('route')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeTab === 'route'
                  ? 'border-[#E11D24] text-[#E11D24] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Ruta & Camión</span>
            </button>
          </div>

          {/* 3. CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* TAB 1: LISTA DE MATERIALES (SOLO LECTURA — SIN PISTOLEO NI PESO) */}
            {activeTab === 'items' && (
              <div className="space-y-3">
                
                {/* Resumen de Bultos + Botón Imprimir Tirilla */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-end gap-2">

                  <button
                    onClick={() => setShowTirilla(true)}
                    className="flex items-center gap-1.5 bg-[#E11D24] hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Imprimir Tirilla</span>
                  </button>
                </div>

                {/* Incidencia activa (si existe) */}
                {selectedDespacho.incidencia_activa && (
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-xs text-amber-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span>Novedad Activa: {selectedDespacho.incidencia_activa.tipo}</span>
                    </div>
                    <p className="text-amber-900/90">"{selectedDespacho.incidencia_activa.descripcion}"</p>
                  </div>
                )}

                {/* Lista Detallada de SKUs (solo lectura) */}
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <div className="bg-slate-100 p-2.5 text-xs font-bold uppercase text-slate-600">
                    Líneas de Pedido ({selectedDespacho.items?.length || 1} SKUs)
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selectedDespacho.items && selectedDespacho.items.length > 0 ? (
                      selectedDespacho.items.map((item) => (
                        <div 
                          key={item.id} 
                          className="p-3.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {item.sku || 'SKU-GEN'}
                              </span>
                              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                {item.ubicacion_bodega || 'DESPACHO'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {item.descripcion_producto}
                            </h4>
                            <p className="text-xs text-slate-500 font-mono">
                              Unidad: {item.unidad || 'UND'}
                            </p>
                          </div>

                          <div className="text-right font-mono shrink-0">
                            <span className="font-bold text-base text-slate-800">
                              {item.cantidad_solicitada || item.cantidad || 1}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">{item.unidad || 'UND'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500 space-y-1">
                        <p className="font-semibold text-slate-700">Pedido registrado por remisión general</p>
                        <p className="text-xs text-slate-400">Preparado para despacho directo</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: TRAZABILIDAD / HISTORIAL DE ESTADOS */}
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Historial de Movimientos
                </h3>
                {selectedDespacho.history && selectedDespacho.history.length > 0 ? (
                  <div className="space-y-2">
                    {[...selectedDespacho.history].reverse().map((entry) => (
                      <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            entry.estado_nuevo === 'DESPACHADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {entry.estado_nuevo}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(entry.timestamp).toLocaleString([], {
                              day: '2-digit', month: '2-digit', year: '2-digit',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{entry.nota}</p>
                        <p className="text-[11px] text-slate-400">Operador: {entry.usuario_operador}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-slate-400">
                    Sin registros de trazabilidad aún.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ASIGNACIÓN DE FLOTA & RUTA */}
            {activeTab === 'route' && rutaAsignada && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-xs text-slate-500 block">Ruta Asignada:</span>
                    <strong className="text-slate-900">{rutaAsignada.codigo_ruta}</strong>
                  </div>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs">
                    {rutaAsignada.estado}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500 block">Vehículo / Placa:</span>
                    <span className="font-mono text-base font-bold text-slate-900">{rutaAsignada.vehiculo.placa}</span>
                    <span className="text-xs text-slate-500 block">{rutaAsignada.vehiculo.modelo}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Conductor:</span>
                    <span className="font-bold text-slate-900">{rutaAsignada.conductor.nombre}</span>
                    <span className="text-xs text-purple-700 font-mono block">{rutaAsignada.conductor.telefono}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-500 block">Número de Guía:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedDespacho.numero_guia}</span>
                </div>
              </div>
            )}

          </div>

          {/* 4. PIE DE PÁGINA: ACCIONES TÁCTILES GRANDES (MÍNIMO 44px) */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              onClick={() => setIncidentModalTarget(selectedDespacho)}
              className="min-h-[44px] px-3.5 bg-white hover:bg-red-50 hover:text-[#E11D24] text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 transition-all shrink-0 active:scale-95"
            >
              Reportar Novedad
            </button>

            {!isDespachado ? (
              <button
                onClick={() => {
                  despacharOrden(selectedDespacho.id, selectedDespacho.vehiculo_placa || FLOTA_VEHICULOS[0]);
                  setSelectedDespachoId(null);
                }}
                className="flex-1 min-h-[44px] bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Truck className="h-4 w-4" />
                <span>Despachar ({selectedDespacho.vehiculo_placa || FLOTA_VEHICULOS[0]})</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100 py-2.5 rounded-xl">
                <Check className="h-4 w-4" />
                <span>Orden Despachada</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MODAL TIRILLA TÉRMICA */}
      {showTirilla && (
        <PackageLabelModal 
          despacho={selectedDespacho} 
          onClose={() => setShowTirilla(false)} 
        />
      )}
    </>
  );
}
