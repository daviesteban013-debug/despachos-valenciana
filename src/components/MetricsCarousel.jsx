import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Package, 
  Warehouse, 
  Clock, 
  Timer, 
  Flame, 
  AlertTriangle, 
  Truck,
  CheckCircle2
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

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 pt-3 pb-2 space-y-3">
      
      {/* 1. CAROUSEL TÁCTIL DE MÉTRICAS */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
        
        {/* KPI 1: Pendientes */}
        <div className="min-w-[180px] sm:min-w-[220px] flex-1 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm snap-start flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pendientes Hoy</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{kpis.pendientesHoy}</span>
              <span className="text-[11px] text-slate-500 font-medium">órdenes</span>
            </div>
            <p className="text-[10px] text-slate-400">En flujo de bodega</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Package className="h-5 w-5 text-[#E11D24]" />
          </div>
        </div>

        {/* KPI 2: En Bahía de Carga */}
        <div className="min-w-[180px] sm:min-w-[220px] flex-1 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm snap-start flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Listo en Bahía</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-emerald-600">{kpis.enBahia}</span>
              <span className="text-[11px] text-emerald-600 font-medium">pallets / estibas</span>
            </div>
            <p className="text-[10px] text-slate-400">Para cargue a camión</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Warehouse className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 3: Alerta de Corte Inmediato (< 30 min) */}
        <div className={`min-w-[190px] sm:min-w-[230px] flex-1 border rounded-2xl p-3.5 shadow-sm snap-start flex items-center justify-between transition-all ${
          kpis.alertasCorteProximo > 0
            ? 'bg-red-50 border-red-300 ring-2 ring-red-500/30'
            : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${kpis.alertasCorteProximo > 0 ? 'text-[#E11D24]' : 'text-slate-500'}`}>
                Cortes Próximos
              </span>
              {kpis.alertasCorteProximo > 0 && (
                <span className="h-2 w-2 rounded-full bg-[#E11D24] animate-ping" />
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-2xl font-black ${kpis.alertasCorteProximo > 0 ? 'text-[#E11D24]' : 'text-slate-800'}`}>
                {kpis.alertasCorteProximo}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">&lt; 30 min SLA</span>
            </div>
            <p className="text-[10px] text-slate-400">Salida de ruta crítica</p>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            kpis.alertasCorteProximo > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
          }`}>
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4: Eficiencia SLA */}
        <div className="min-w-[180px] sm:min-w-[220px] flex-1 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm snap-start flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cumplimiento SLA</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-800">{kpis.eficienciaSla}%</span>
              <span className="text-[11px] text-emerald-600 font-semibold">a tiempo</span>
            </div>
            <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-[#E11D24] rounded-full"
                style={{ width: `${Math.min(100, kpis.eficienciaSla)}%` }}
              />
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Timer className="h-5 w-5 text-slate-700" />
          </div>
        </div>

      </div>

      {/* 2. FILTROS RÁPIDOS POR TRANSPORTADORA & URGENCIA */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        
        {/* Chips de Transportadoras */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" />
            Flota:
          </span>
          {CARRIERS.map((carrier) => {
            const isSelected = selectedCarrier === carrier;
            return (
              <button
                key={carrier}
                onClick={() => setSelectedCarrier(carrier)}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#E11D24] border-[#E11D24] text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {carrier}
              </button>
            );
          })}
        </div>

        {/* Switch Solo Urgentes */}
        <button
          onClick={() => setOnlyUrgent(!onlyUrgent)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all shrink-0 ${
            onlyUrgent
              ? 'bg-red-50 border-red-300 text-[#E11D24] shadow-sm'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Flame className={`h-3.5 w-3.5 ${onlyUrgent ? 'text-[#E11D24] fill-[#E11D24]' : 'text-slate-400'}`} />
          <span>Solo Urgentes</span>
        </button>

      </div>

    </div>
  );
}
