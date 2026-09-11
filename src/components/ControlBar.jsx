import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Search, 
  Filter, 
  Truck, 
  MapPin, 
  Flame, 
  AlertOctagon, 
  Package, 
  Boxes, 
  Timer, 
  CheckCircle2, 
  X
} from 'lucide-react';

const CARRIERS = [
  { name: 'TODAS', color: 'border-slate-700 bg-slate-800/80 text-slate-300' },
  { name: 'Coordinadora', color: 'border-blue-500/40 bg-blue-950/40 text-blue-300' },
  { name: 'Servientrega', color: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300' },
  { name: 'TCC', color: 'border-amber-500/40 bg-amber-950/40 text-amber-300' },
  { name: 'Envía', color: 'border-red-500/40 bg-red-950/40 text-red-300' },
  { name: 'Flota Propia', color: 'border-purple-500/40 bg-purple-950/40 text-purple-300' }
];

const ZONES = [
  { id: 'TODAS', label: 'Todas las Zonas / Rutas' },
  { id: 'Norte Industrial', label: 'Zona Norte Industrial' },
  { id: 'Sur Comercial', label: 'Zona Sur Comercial' },
  { id: 'Occidente Express', label: 'Zona Occidente Express' },
  { id: 'Nacional Troncal', label: 'Ruta Nacional Troncal' }
];

export default function ControlBar() {
  const {
    selectedCarrier,
    setSelectedCarrier,
    selectedZone,
    setSelectedZone,
    onlyUrgent,
    setOnlyUrgent,
    searchQuery,
    setSearchQuery,
    kpis
  } = useWms();

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 pt-4 pb-2 space-y-4">
      
      {/* 1. KPIs OPERATIVOS EN VIVO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Despachos Pendientes */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex items-center justify-between shadow-sm transition-all group">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Despachos Pendientes Hoy</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight">{kpis.pendientesHoy}</span>
              <span className="text-xs text-blue-400 font-medium">órdenes activas</span>
            </div>
            <p className="text-[11px] text-slate-500">En flujo de picking a muelle</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
            <Package className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 2: Bultos en Bahía */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex items-center justify-between shadow-sm transition-all group">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bultos en Bahía de Cargue</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 tracking-tight">{kpis.bultosEnBahia}</span>
              <span className="text-xs text-emerald-500 font-medium">unidades consolidadas</span>
            </div>
            <p className="text-[11px] text-slate-500">Listos con guía para cargue inmediato</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Boxes className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 3: Eficiencia de Corte SLA */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex items-center justify-between shadow-sm transition-all group">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cumplimiento Horario de Corte</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black tracking-tight ${kpis.eficienciaSla >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {kpis.eficienciaSla}%
              </span>
              <span className="text-xs text-slate-400 font-medium">SLA Objetivo ≥ 92%</span>
            </div>
            <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${kpis.eficienciaSla >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, kpis.eficienciaSla)}%` }}
              />
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
            <Timer className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4: Incidencias Activas */}
        <div className={`bg-slate-900/90 border rounded-xl p-3.5 flex items-center justify-between shadow-sm transition-all group ${
          kpis.incidenciasActivas > 0 
            ? 'border-red-500/40 bg-gradient-to-r from-red-950/30 to-slate-900/90' 
            : 'border-slate-800'
        }`}>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Incidencias / Bloqueos</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black tracking-tight ${kpis.incidenciasActivas > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {kpis.incidenciasActivas}
              </span>
              <span className="text-xs text-red-300/80 font-medium">órdenes retenidas</span>
            </div>
            <p className="text-[11px] text-slate-500">Requieren intervención en muelle</p>
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
            kpis.incidenciasActivas > 0 
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse' 
              : 'bg-slate-800 border border-slate-700 text-slate-500'
          }`}>
            <AlertOctagon className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* 2. BARRA DE FILTROS RÁPIDOS Y BÚSQUEDA */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 shadow-md flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        
        {/* Selector de Transportadora */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0 pr-1">
            <Truck className="h-3.5 w-3.5 text-slate-400" />
            <span>Transportadora:</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {CARRIERS.map((c) => {
              const isSelected = selectedCarrier === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setSelectedCarrier(c.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400/40'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zona, Switch Solo Urgentes y Buscador */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          
          {/* Selector de Zona */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 shrink-0">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer pr-2"
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id} className="bg-slate-900 text-slate-200">
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          {/* Switch Solo Urgentes */}
          <button
            onClick={() => setOnlyUrgent(!onlyUrgent)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shrink-0 ${
              onlyUrgent
                ? 'bg-red-950/80 border-red-500/60 text-red-300 ring-1 ring-red-500/40 shadow-sm'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${onlyUrgent ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`} />
            <Flame className={`h-3.5 w-3.5 ${onlyUrgent ? 'text-red-400 fill-red-400' : 'text-slate-400'}`} />
            <span>Solo Urgentes</span>
          </button>

          {/* Buscador General */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Orden, Factura, Cliente o Guía..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
