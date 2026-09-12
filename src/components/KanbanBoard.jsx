import React, { useState, useRef } from 'react';
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
  const [activeStageTab, setActiveStageTab] = useState('COLA');
  const scrollContainerRef = useRef(null);

  // Segmentación por fases con nueva nomenclatura
  const enCola = filteredDespachos
    .filter((d) => d.estado_actual === 'COLA')
    .sort((a, b) => {
      if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
      return new Date(a.horario_corte) - new Date(b.horario_corte);
    });

  const enEscogiendo = filteredDespachos.filter((d) => d.estado_actual === 'PICKING');
  const enEmpacando = filteredDespachos.filter((d) => d.estado_actual === 'PACKING');
  const enBodega = filteredDespachos.filter((d) => d.estado_actual === 'LISTO');
  const despachados = filteredDespachos.filter((d) => d.estado_actual === 'DESPACHADO');
  const incidencias = filteredDespachos.filter((d) => d.estado_actual === 'INCIDENCIA');

  const STAGES = [
    {
      id: 'COLA',
      title: 'EN COLA',
      icon: Inbox,
      count: enCola.length,
      items: enCola,
      color: 'border-blue-300 bg-blue-50 text-blue-900',
      badgeClass: 'bg-blue-600 text-white'
    },
    {
      id: 'PICKING',
      title: 'EN ESCOGIENDO',
      icon: UserCheck,
      count: enEscogiendo.length,
      items: enEscogiendo,
      color: 'border-purple-300 bg-purple-50 text-purple-900',
      badgeClass: 'bg-purple-600 text-white'
    },
    {
      id: 'PACKING',
      title: 'EN EMPACANDO',
      icon: Package,
      count: enEmpacando.length,
      items: enEmpacando,
      color: 'border-amber-300 bg-amber-50 text-amber-900',
      badgeClass: 'bg-amber-600 text-white'
    },
    {
      id: 'LISTO',
      title: 'EN BODEGA',
      icon: Warehouse,
      count: enBodega.length,
      items: enBodega,
      color: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      badgeClass: 'bg-emerald-600 text-white'
    },
    {
      id: 'DESPACHADO',
      title: 'DESPACHADOS',
      icon: Truck,
      count: despachados.length,
      items: despachados,
      color: 'border-slate-300 bg-slate-100 text-slate-800',
      badgeClass: 'bg-slate-600 text-white'
    },
    {
      id: 'INCIDENCIA',
      title: 'INCIDENCIAS',
      icon: AlertOctagon,
      count: incidencias.length,
      items: incidencias,
      color: 'border-red-300 bg-red-50 text-[#E11D24]',
      badgeClass: 'bg-[#E11D24] text-white animate-pulse'
    }
  ];

  // Desplazamiento suave de columna al hacer tap en una pestaña
  const scrollToStage = (stageId) => {
    setActiveStageTab(stageId);
    const element = document.getElementById(`kanban-col-${stageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 space-y-3">
      
      {/* 1. SELECTOR DE PESTAÑAS RÁPIDAS (SEGMENTED CONTROL CON CONTEO) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
        <div className="flex items-center gap-1.5 shrink-0">
          {STAGES.map((tab) => {
            const isSelected = activeStageTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => scrollToStage(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] snap-start border active:scale-95 ${
                  isSelected
                    ? 'bg-[#E11D24] border-[#E11D24] text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.title}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-xs font-mono font-bold leading-none ${
                  isSelected ? 'bg-white text-[#E11D24]' : 'bg-slate-100 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modo Tablero vs Lista */}
        <div className="hidden md:flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm shrink-0">
          <button
            onClick={() => setWavesViewMode('kanban')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              wavesViewMode === 'kanban'
                ? 'bg-[#E11D24] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Tablero</span>
          </button>
          <button
            onClick={() => setWavesViewMode('list')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              wavesViewMode === 'list'
                ? 'bg-[#E11D24] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Lista</span>
          </button>
        </div>
      </div>

      {/* 2. CONTENEDOR GENERAL DE LAS 6 COLUMNAS KANBAN (SIN COMPRESIÓN HORIZONTAL) */}
      {wavesViewMode === 'kanban' ? (
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-6 pt-2 px-2 snap-x"
        >
          {STAGES.map((col) => {
            const Icon = col.icon;
            const totalKg = col.items.reduce((acc, d) => acc + (d.peso_total_kg || 0), 0);

            return (
              <div
                key={col.id}
                id={`kanban-col-${col.id}`}
                className="w-72 min-w-[288px] flex-shrink-0 bg-slate-50/80 rounded-2xl border border-slate-200 p-3 flex flex-col snap-start shadow-sm"
              >
                {/* Cabecera de Columna */}
                <div className={`rounded-xl border p-2.5 mb-2.5 flex items-center justify-between ${col.color}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wide truncate">
                      {col.title}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono shrink-0 ${col.badgeClass}`}>
                    {col.count}
                  </span>
                </div>

                {/* Subcabecera: Peso acumulado */}
                <div className="flex items-center justify-between text-xs text-slate-500 px-1 pb-2 border-b border-slate-200 mb-2.5 font-medium">
                  <span>Carga Total:</span>
                  <span className="font-bold text-slate-800">{Math.round(totalKg)} kg</span>
                </div>

                {/* Contenedor interno donde se mapean las tarjetas con padding para el scrollbar */}
                <div className="overflow-y-auto max-h-[calc(100vh-220px)] pr-1.5 flex flex-col gap-3 flex-1">
                  {col.items.length === 0 ? (
                    <div className="h-36 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-3 text-center text-slate-400 space-y-1">
                      <col.icon className="h-6 w-6 text-slate-300" />
                      <p className="text-xs font-bold text-slate-500">Sin órdenes</p>
                      <p className="text-xs text-slate-400">No hay pedidos en esta fase</p>
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
        /* Vista de Lista */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredDespachos.map((despacho) => (
            <DispatchCard key={despacho.id} despacho={despacho} />
          ))}
        </div>
      )}

    </div>
  );
}
