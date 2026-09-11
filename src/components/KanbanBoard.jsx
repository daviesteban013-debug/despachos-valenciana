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

  // En móvil (< 768px) seleccionamos una pestaña a la vez para una lista vertical limpia
  const [activeStageTab, setActiveStageTab] = useState('COLA');

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

  const STAGES = [
    {
      id: 'COLA',
      title: 'En Cola',
      icon: Inbox,
      count: enCola.length,
      items: enCola,
      color: 'border-blue-300 bg-blue-50 text-blue-900',
      badgeClass: 'bg-blue-600 text-white'
    },
    {
      id: 'PICKING',
      title: 'En Picking',
      icon: UserCheck,
      count: enPicking.length,
      items: enPicking,
      color: 'border-purple-300 bg-purple-50 text-purple-900',
      badgeClass: 'bg-purple-600 text-white'
    },
    {
      id: 'PACKING',
      title: 'En Packing',
      icon: Package,
      count: enPacking.length,
      items: enPacking,
      color: 'border-amber-300 bg-amber-50 text-amber-900',
      badgeClass: 'bg-amber-600 text-white'
    },
    {
      id: 'LISTO',
      title: 'En Bahía',
      icon: Warehouse,
      count: listos.length,
      items: listos,
      color: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      badgeClass: 'bg-emerald-600 text-white'
    },
    {
      id: 'DESPACHADO',
      title: 'Despachados',
      icon: Truck,
      count: despachados.length,
      items: despachados,
      color: 'border-slate-300 bg-slate-100 text-slate-800',
      badgeClass: 'bg-slate-600 text-white'
    },
    {
      id: 'INCIDENCIA',
      title: 'Incidencias',
      icon: AlertOctagon,
      count: incidencias.length,
      items: incidencias,
      color: 'border-red-300 bg-red-50 text-[#E11D24]',
      badgeClass: 'bg-[#E11D24] text-white animate-pulse'
    }
  ];

  const currentActiveStage = STAGES.find((s) => s.id === activeStageTab) || STAGES[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-2 space-y-3">
      
      {/* 1. SELECTOR DE PESTAÑAS HORIZONTAL / SEGMENTED CONTROL (MOBILE-FIRST) */}
      <div className="md:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
          {STAGES.map((stage) => {
            const isSelected = activeStageTab === stage.id;
            const Icon = stage.icon;

            return (
              <button
                key={stage.id}
                onClick={() => setActiveStageTab(stage.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 min-h-[44px] snap-start border ${
                  isSelected
                    ? 'bg-[#E11D24] border-[#E11D24] text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{stage.title}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono font-bold leading-none ${
                  isSelected ? 'bg-white text-[#E11D24]' : 'bg-slate-100 text-slate-700'
                }`}>
                  {stage.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ENCABEZADO PARA DESKTOP/TABLET: SELECTOR KANBAN VS LISTA */}
      <div className="hidden md:flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
            Tablero de Olas de Despacho
          </h2>
          <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold">
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
            <span>Columnas Kanban</span>
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
            <span>Lista Rápida</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* VISTA MÓVIL (< 768px): LISTA VERTICAL LIMPIA DE UNA SOLA COLUMNA        */}
      {/* ======================================================================= */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-semibold">
          <span>Mostrando: <strong className="text-slate-900">{currentActiveStage.title}</strong></span>
          <span>{currentActiveStage.items.length} pedidos</span>
        </div>

        {currentActiveStage.items.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-1">
            <currentActiveStage.icon className="h-8 w-8 mx-auto text-slate-300 mb-1" />
            <p className="text-sm font-bold text-slate-700">Sin pedidos en esta fase</p>
            <p className="text-xs text-slate-400">Selecciona otra etapa en la barra superior</p>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            {currentActiveStage.items.map((despacho) => (
              <DispatchCard key={despacho.id} despacho={despacho} />
            ))}
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* VISTA TABLET/DESKTOP (>= 768px): KANBAN CON COLUMNAS O LISTA             */}
      {/* ======================================================================= */}
      <div className="hidden md:block">
        {wavesViewMode === 'kanban' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start overflow-x-auto pb-4">
            {STAGES.map((col) => {
              const Icon = col.icon;
              const totalKg = col.items.reduce((acc, d) => acc + (d.peso_total_kg || 0), 0);

              return (
                <div
                  key={col.id}
                  className="flex flex-col rounded-2xl bg-slate-50 border border-slate-200 p-2.5 min-h-[580px] shadow-sm"
                >
                  <div className={`rounded-xl border p-2 mb-2 flex items-center justify-between ${col.color}`}>
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wide">
                        {col.title}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${col.badgeClass}`}>
                      {col.count}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pb-1.5 border-b border-slate-200 mb-2 font-medium">
                    <span>Carga:</span>
                    <span className="font-bold text-slate-800">{Math.round(totalKg)} kg</span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-270px)] pr-0.5">
                    {col.items.length === 0 ? (
                      <div className="h-32 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-3 text-center text-slate-400">
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
        ) : (
          /* Vista Lista en Desktop */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredDespachos.map((despacho) => (
              <DispatchCard key={despacho.id} despacho={despacho} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
