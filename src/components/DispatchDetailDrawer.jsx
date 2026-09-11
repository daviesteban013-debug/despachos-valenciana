import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, 
  ScanLine, 
  History, 
  Truck, 
  ArrowRight, 
  AlertTriangle, 
  Barcode, 
  Check, 
  Clock, 
  MapPin, 
  Warehouse, 
  Scale, 
  Printer, 
  PackageCheck,
  UserCheck 
} from 'lucide-react';

export default function DispatchDetailDrawer() {
  const { 
    selectedDespacho, 
    setSelectedDespachoId, 
    auditItem, 
    auditAllItems, 
    advanceStage, 
    setIncidentModalTarget,
    setPackageLabelDespacho,
    rutasVehiculos 
  } = useWms();

  const [activeTab, setActiveTab] = useState('packing'); // 'packing' | 'timeline' | 'route'

  if (!selectedDespacho) return null;

  const rutaAsignada = rutasVehiculos.find((r) => r.id === selectedDespacho.ruta_id) || rutasVehiculos[0];

  const totalSolicitado = selectedDespacho.items?.reduce((acc, it) => acc + it.cantidad_solicitada, 0) || 0;
  const totalAuditado = selectedDespacho.items?.reduce((acc, it) => acc + (it.cantidad_auditada || 0), 0) || 0;
  const auditPercent = totalSolicitado > 0 ? Math.round((totalAuditado / totalSolicitado) * 100) : 100;
  const isFullyAudited = auditPercent === 100;

  // Tolerancia de Báscula ±3%
  const pesoTeorico = selectedDespacho.peso_total_kg || 1;
  const pesoBascula = selectedDespacho.peso_bascula_kg || pesoTeorico;
  const diffPercent = ((pesoBascula - pesoTeorico) / pesoTeorico) * 100;
  const isToleranceOk = Math.abs(diffPercent) <= 3.0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden animate-slideLeft border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* 1. ENCABEZADO CON ROJO VALENCIANA (#E11D24) */}
        <div className="bg-[#E11D24] text-white p-4 flex items-start justify-between gap-3 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xl font-black tracking-tight text-white">
                {selectedDespacho.codigo_factura_erp || selectedDespacho.codigo_orden}
              </span>
              <span className="font-mono text-xs font-bold bg-white text-[#E11D24] px-2 py-0.5 rounded-md">
                {selectedDespacho.codigo_orden}
              </span>
              <span className="text-[11px] font-bold bg-red-800 text-white px-2 py-0.5 rounded-full border border-red-400/30">
                {selectedDespacho.estado_actual}
              </span>
            </div>

            <h2 className="text-base font-black leading-tight text-white">
              {selectedDespacho.cliente_nombre}
            </h2>

            <p className="text-xs text-red-100 flex items-center gap-2">
              <span>{selectedDespacho.zona_entrega}</span>
              <span>•</span>
              <span>{selectedDespacho.transportadora}</span>
              <span>•</span>
              <span className="font-bold text-yellow-200">{selectedDespacho.bahia_asignada}</span>
            </p>
          </div>

          <button
            onClick={() => setSelectedDespachoId(null)}
            className="p-2 rounded-xl bg-red-800/80 hover:bg-red-900 text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4">
          <button
            onClick={() => setActiveTab('packing')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'packing'
                ? 'border-[#E11D24] text-[#E11D24] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ScanLine className="h-4 w-4" />
            <span>Materiales & Checklist</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200 text-slate-800">
              {auditPercent}%
            </span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
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
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'route'
                ? 'border-[#E11D24] text-[#E11D24] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Ruta & Camión</span>
          </button>
        </div>

        {/* 3. CONTENIDO SEGÚN PESTAÑA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* TAB 1: LISTA DE MATERIALES DE FERRETERÍA & PISTOLEO */}
          {activeTab === 'packing' && (
            <div className="space-y-4">
              
              {/* Resumen de Auditoría y Botón de Etiqueta */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Progreso Verificación:</span>
                  <div className="font-mono text-sm font-bold text-slate-800">
                    {totalAuditado} de {totalSolicitado} unidades pistoleadas
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => auditAllItems(selectedDespacho.id)}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
                  >
                    <ScanLine className="h-3.5 w-3.5 text-amber-400" />
                    <span>Pistolear Todo</span>
                  </button>

                  <button
                    onClick={() => setPackageLabelDespacho(selectedDespacho)}
                    className="flex items-center gap-1.5 bg-[#E11D24] hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Etiqueta QR</span>
                  </button>
                </div>
              </div>

              {/* Báscula Tolerancia ±3% */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                isToleranceOk 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 shrink-0 text-slate-700" />
                  <span>Teórico: {pesoTeorico}kg | Báscula: {pesoBascula}kg</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                  isToleranceOk ? 'bg-emerald-200 text-emerald-900' : 'bg-red-600 text-white animate-pulse'
                }`}>
                  {isToleranceOk ? '✓ Tolerancia ±3% OK' : '⚠️ Divergencia excede ±3%'}
                </span>
              </div>

              {/* Tabla de Líneas de Ferretería */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 p-2.5 text-xs font-bold uppercase text-slate-600">
                  Líneas de Pedido ({selectedDespacho.items?.length || 0} SKUs)
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedDespacho.items?.map((item) => {
                    const isDone = item.cantidad_auditada >= item.cantidad_solicitada;

                    return (
                      <div 
                        key={item.id}
                        className={`p-3.5 flex items-center justify-between gap-3 ${
                          isDone ? 'bg-emerald-50/50' : 'bg-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.sku}
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {item.ubicacion_bodega}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900">
                            {item.descripcion_producto}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Peso: {item.peso_unitario_kg} kg • Unidad: {item.unidad || 'UND'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right font-mono text-xs">
                            <span className={`font-black text-sm ${isDone ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {item.cantidad_auditada || 0}
                            </span>
                            <span className="text-slate-400">/{item.cantidad_solicitada}</span>
                          </div>

                          <button
                            onClick={() => auditItem(selectedDespacho.id, item.id)}
                            disabled={isDone}
                            className={`min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-[#E11D24] text-white hover:bg-red-700 active:scale-95 shadow-sm'
                            }`}
                          >
                            {isDone ? <Check className="h-4 w-4" /> : <Barcode className="h-4 w-4" />}
                            <span>{isDone ? 'OK' : '+1 Pistolear'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TRAZABILIDAD INMUTABLE */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <div className="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                {selectedDespacho.history?.map((step, idx) => (
                  <div key={step.id || idx} className="relative">
                    <div className="absolute -left-5 top-1 h-4 w-4 rounded-full bg-[#E11D24] border-2 border-white shadow-sm" />
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{step.estado_anterior ? `${step.estado_anterior} ➔ ` : ''}{step.estado_nuevo}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(step.timestamp).toLocaleTimeString('es-CO')}
                        </span>
                      </div>
                      <p className="text-slate-600">{step.nota}</p>
                      <span className="text-[10px] text-slate-400 block pt-1">Operador: {step.usuario_operador}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TRANSPORTE Y RUTA */}
          {activeTab === 'route' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800">Código de Ruta: {rutaAsignada.codigo_ruta}</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {rutaAsignada.estado}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block">Vehículo:</span>
                  <span className="font-mono text-sm font-black text-slate-900">{rutaAsignada.vehiculo.placa}</span>
                  <span className="text-slate-500 block">{rutaAsignada.vehiculo.modelo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Conductor:</span>
                  <span className="font-bold text-slate-900">{rutaAsignada.conductor.nombre}</span>
                  <span className="text-purple-700 font-mono block">{rutaAsignada.conductor.telefono}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 block">Guía de Despacho:</span>
                <span className="font-mono font-bold text-slate-800">{selectedDespacho.numero_guia}</span>
              </div>
            </div>
          )}

        </div>

        {/* 4. PIE DE PÁGINA: ACCIONES OPERATIVAS */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={() => setIncidentModalTarget(selectedDespacho)}
            className="min-h-[46px] px-4 bg-white hover:bg-red-50 hover:text-[#E11D24] text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all"
          >
            Reportar Novedad
          </button>

          {selectedDespacho.estado_actual !== 'DESPACHADO' && (
            <button
              onClick={() => advanceStage(selectedDespacho.id)}
              className="flex-1 min-h-[46px] bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Avanzar Fase Operativa</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
