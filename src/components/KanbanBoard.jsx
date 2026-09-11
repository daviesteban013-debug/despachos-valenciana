import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import DispatchCard from './DispatchCard';
import { 
  Inbox, 
  UserCheck, 
  Package, 
  Warehouse, 
  Truck, 
  AlertOctagon, 
  LayoutGrid, 
  ListFilter 
} from 'lucide-react';

export default function KanbanBoard() {
  const { filteredDespachos, wavesViewMode, setWavesViewMode } = useWms();
  const [selectedMobileStage, setSelectedMobileStage] = useState('ALL');

  // Segmentación por fases
  const enCola = filteredDespachos
    .filter((d) => d.estado_actual === 'COLA')
    .sort((a, b) => {
      if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
      return new Date(a.horario_corte) - new Date(b.horario_corte);
    });

  const enPicking = filteredDespachos.filter((d) => d.estado_actual === 'PICKING');
  const enPacking = filteredDespachos.filter((d) => d.estado_actual === 'PACKING');
  const listos = filteredDespachos.filter((d) => d.estado_actual === 'LISTO');
  const despachados = filteredDespachos.filter((d) => d.estado_actual === 'DESPACHADO');
  const incidencias = filteredDespachos.filter((d) => d.estado_actual === 'INCIDENCIA');

  const COLUMNS = [
    {
      id: 'COLA',
      title: 'En Cola',
      icon: Inbox,
      count: enCola.length,
      items: enCola,
      headerClass: 'border-blue-200 bg-blue-50 text-blue-900',
      badgeClass: 'bg-blue-600 text-white'
    },
    {
      id: 'PICKING',
      title: 'En Picking',
      icon: UserCheck,
      count: enPicking.length,
      items: enPicking,
      headerClass: 'border-purple-200 bg-purple-50 text-purple-900',
      badgeClass: 'bg-purple-600 text-white'
    },
    {
      id: 'PACKING',
      title: 'En Packing',
      icon: Package,
      count: enPacking.length,
      items: enPacking,
      headerClass: 'border-amber-200 bg-amber-50 text-amber-900',
      badgeClass: 'bg-amber-600 text-white'
    },
    {
      id: 'LISTO',
      title: 'Listo Bahía',
      icon: Warehouse,
      count: listos.length,
      items: listos,
      headerClass: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      badgeClass: 'bg-emerald-600 text-white'
    },
    {
      id: 'DESPACHADO',
      title: 'Despachado',
      icon: Truck,
      count: despachados.length,
      items: despachados,
      headerClass: 'border-slate-200 bg-slate-100 text-slate-800',
      badgeClass: 'bg-slate-600 text-white'
    },
    {
      id: 'INCIDENCIA',
      title: 'Retención / Triage',
      icon: AlertOctagon,
      count: incidencias.length,
      items: incidencias,
      headerClass: 'border-red-200 bg-red-50 text-[#E11D24]',
      badgeClass: 'bg-[#E11D24] text-white animate-pulse'
    }
  ];

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-2 space-y-3">
      
      {/* Selector de Modo de Vista: Kanban Horizontal vs Lista Rápida */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
            Tablero de Olas de Despacho
          </h2>
          <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
            {filteredDespachos.length} pedidos
          </span>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setWavesViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              wavesViewMode === 'kanban'
                ? 'bg-[#E11D24] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
          <button
            onClick={() => setWavesViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              wavesViewMode === 'list'
                ? 'bg-[#E11D24] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lista Rápida</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* VISTA 1: KANBAN HORIZONTAL CON SNAP (IDEAL TABLET / ESCRITORIO / TOUCH) */}
      {/* ======================================================================= */}
      {wavesViewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3.5 items-start overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const Icon = col.icon;
            const totalKg = col.items.reduce((acc, d) => acc + (d.peso_total_kg || 0), 0);

            return (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl bg-slate-50 border border-slate-200 p-3 min-h-[580px] shadow-sm"
              >
                {/* Encabezado */}
                <div className={`rounded-xl border p-2.5 mb-2.5 flex items-center justify-between ${col.headerClass}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wide">
                      {col.title}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${col.badgeClass}`}>
                    {col.count}
                  </span>
                </div>

                {/* Subtotal en Kg */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pb-2 border-b border-slate-200 mb-3">
                  <span>Carga:</span>
                  <span className="font-mono font-bold text-slate-800">{Math.round(totalKg)} kg</span>
                </div>

                {/* Lista de Tarjetas */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-270px)] pr-0.5">
                  {col.items.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-3 text-center text-slate-400">
                      <Icon className="h-6 w-6 opacity-30 mb-1" />
                      <p className="text-xs font-bold">Sin órdenes</p>
                    </div>
                  ) : (
                    col.items.map((despacho) => (
                      <DispatchCard key={despacho.id} despacho={despacho} />
                    ))
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================================= */}
      {/* VISTA 2: LISTA RÁPIDA SEGMENTADA (IDEAL MÓVIL SMARTPHONE CON EL PULGAR) */}
      {/* ======================================================================= */}
      {wavesViewMode === 'list' && (
        <div className="space-y-3">
          
          {/* Pills de Filtrado por Fase */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedMobileStage('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border shrink-0 ${
                selectedMobileStage === 'ALL'
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              Todas ({filteredDespachos.length})
            </button>
            {COLUMNS.map((col) => (
              <button
                key={col.id}
                onClick={() => setSelectedMobileStage(col.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border shrink-0 flex items-center gap-1.5 ${
                  selectedMobileStage === col.id
                    ? 'bg-[#E11D24] border-[#E11D24] text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <span>{col.title}</span>
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded-md font-mono text-[10px]">
                  {col.count}
                </span>
              </button>
            ))}
          </div>

          {/* Renderizado de lista en 1 columna */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredDespachos
              .filter((d) => selectedMobileStage === 'ALL' || d.estado_actual === selectedMobileStage)
              .map((despacho) => (
                <DispatchCard key={despacho.id} despacho={despacho} />
              ))}
          </div>

        </div>
      )}

    </div>
  );
}
