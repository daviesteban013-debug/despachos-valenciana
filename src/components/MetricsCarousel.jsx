import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Package, 
  Warehouse, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

export default function MetricsCarousel() {
  const { kpis } = useWms();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 pt-1">
      {/* 1. BARRA RESUMEN COMPACTA DE KPIs (ALTURA < 64px: h-11 / 44px) */}
      <div className="h-11 bg-white border border-slate-200 rounded-xl px-3 shadow-sm flex items-center justify-between gap-2 text-xs">
        
        {/* Contadores en una sola línea horizontal */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none font-semibold text-slate-700">
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#E11D24]" />
            <span className="text-slate-500">Pendientes:</span>
            <span className="font-bold text-slate-900">{kpis.pendientesHoy}</span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500">Despachados:</span>
            <span className="font-bold text-emerald-700">{kpis.despachados}</span>
          </div>

          {kpis.conIncidencia > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 shrink-0 text-amber-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-800">Novedades:</span>
                <span>{kpis.conIncidencia}</span>
              </div>
            </>
          )}

          {kpis.pendientesSyncExcel > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 shrink-0 text-red-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Sync pendiente: {kpis.pendientesSyncExcel}</span>
              </div>
            </>
          )}
        </div>

        {/* Botón para expandir/colapsar panel de KPIs */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="h-8 flex items-center gap-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors shrink-0 active:scale-95"
          aria-label={expanded ? 'Ocultar panel de métricas' : 'Ver métricas detalladas'}
        >
          <span>{expanded ? 'Ocultar' : 'Métricas'}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* 2. PANEL DESLIZABLE / EXPANDIBLE DE TARJETAS DE KPIS */}
      {expanded && (
        <div className="mt-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-xs font-medium">Pendientes Hoy</span>
                <span className="text-lg font-bold text-slate-900">{kpis.pendientesHoy}</span>
              </div>
              <Package className="h-5 w-5 text-[#E11D24]" />
            </div>

            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-emerald-800 block text-xs font-medium">Despachados</span>
                <span className="text-lg font-bold text-emerald-700">{kpis.despachados}</span>
              </div>
              <Warehouse className="h-5 w-5 text-emerald-600" />
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
              kpis.conIncidencia > 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="block text-xs font-medium">Con Novedad</span>
                <span className="text-lg font-bold text-amber-600">{kpis.conIncidencia}</span>
              </div>
              <Package className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
