import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Package, 
  Warehouse, 
  Clock, 
  Timer, 
  Flame, 
  Truck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const CARRIERS = ['TODAS', 'Flota Propia', 'Coordinadora', 'TCC', 'Servientrega'];

export default function MetricsCarousel() {
  const { 
    kpis, 
    selectedCarrier, 
    setSelectedCarrier, 
    onlyUrgent, 
    setOnlyUrgent 
  } = useWms();

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 pt-2">
      {/* 1. BARRA COMPACTA RESUMEN DE KPIs (SIEMPRE VISIBLE, BAJA ALTURA) */}
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm flex items-center justify-between gap-2 text-xs">
        
        {/* Micro contadores en una sola línea */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none font-semibold text-slate-700">
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#E11D24]" />
            <span className="text-slate-500">Pendientes:</span>
            <span className="font-bold text-slate-900">{kpis.pendientesHoy}</span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500">En Bahía:</span>
            <span className="font-bold text-emerald-700">{kpis.enBahia}</span>
          </div>

          {kpis.alertasCorteProximo > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 shrink-0 text-[#E11D24] font-black">
                <Clock className="h-3.5 w-3.5 animate-pulse" />
                <span>{kpis.alertasCorteProximo} &lt;30m</span>
              </div>
            </>
          )}

          <span className="text-slate-300 hidden sm:inline">•</span>

          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <span className="text-slate-500">SLA:</span>
            <span className="font-bold text-slate-900">{kpis.eficienciaSla}%</span>
          </div>
        </div>

        {/* Botón para expandir/colapsar filtros y tarjetas */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors shrink-0"
        >
          <span>{expanded ? 'Ocultar' : 'Filtros'}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* 2. PANEL EXPANDIBLE: CARDS DE KPIS Y FILTROS DE TRANSPORTADORA */}
      {expanded && (
        <div className="mt-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 animate-fadeIn">
          
          {/* Tarjetas de Métricas en Carrusel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Pendientes Hoy</span>
                <span className="text-lg font-black text-slate-900">{kpis.pendientesHoy}</span>
              </div>
              <Package className="h-5 w-5 text-[#E11D24]" />
            </div>

            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-emerald-800 block text-[11px] font-medium">Listo en Bahía</span>
                <span className="text-lg font-black text-emerald-700">{kpis.enBahia}</span>
              </div>
              <Warehouse className="h-5 w-5 text-emerald-600" />
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
              kpis.alertasCorteProximo > 0 ? 'bg-red-50 border-red-300 text-red-900' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="block text-[11px] font-medium">Corte &lt; 30 min</span>
                <span className="text-lg font-black text-[#E11D24]">{kpis.alertasCorteProximo}</span>
              </div>
              <Clock className="h-5 w-5 text-[#E11D24]" />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Cumplimiento</span>
                <span className="text-lg font-black text-slate-900">{kpis.eficienciaSla}%</span>
              </div>
              <Timer className="h-5 w-5 text-slate-600" />
            </div>
          </div>

          {/* Filtros Rápidos por Flota & Urgencia */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <Truck className="h-4 w-4 text-slate-400 shrink-0" />
              {CARRIERS.map((carrier) => {
                const isSelected = selectedCarrier === carrier;
                return (
                  <button
                    key={carrier}
                    onClick={() => setSelectedCarrier(carrier)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#E11D24] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {carrier}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setOnlyUrgent(!onlyUrgent)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                onlyUrgent
                  ? 'bg-red-50 border-red-300 text-[#E11D24]'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <Flame className={`h-3.5 w-3.5 ${onlyUrgent ? 'text-[#E11D24] fill-[#E11D24]' : 'text-slate-400'}`} />
              <span>Solo Urgentes</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
