import React from 'react';
import { useWms } from '../context/WmsContext';
import {
  Layers,
  AlertOctagon,
  Undo2
} from 'lucide-react';

export default function BottomDock() {
  const {
    activeDockTab,
    setActiveDockTab,
    kpis,
    devoluciones,
    setReturnsDrawerOpen
  } = useWms();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-1 px-4">
      <div className="max-w-md mx-auto flex items-center justify-around gap-2">

        {/* Tab 1: Tablero de Despachos (2 Estados: Pendiente / Despachado) */}
        <button
          onClick={() => setActiveDockTab('waves')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all h-12 active:scale-95 ${
            activeDockTab === 'waves'
              ? 'text-[#E11D24] font-bold bg-red-50'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
          aria-label="Tablero de Despachos"
        >
          <div className="relative">
            <Layers className="h-5 w-5" />
            {kpis.pendientesHoy > 0 && (
              <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-white">
                {kpis.pendientesHoy}
              </span>
            )}
          </div>
          <span className="text-xs">Despachos</span>
        </button>

        {/* Tab 2: Incidencias & Novedades */}
        <button
          onClick={() => setActiveDockTab('incidents')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all h-12 active:scale-95 ${
            activeDockTab === 'incidents'
              ? 'text-[#E11D24] font-bold bg-red-50'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
          aria-label="Incidencias y Novedades"
        >
          <div className="relative">
            <AlertOctagon className="h-5 w-5" />
            {kpis.conIncidencia > 0 && (
              <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#E11D24] text-white animate-pulse">
                {kpis.conIncidencia}
              </span>
            )}
          </div>
          <span className="text-xs">Novedades</span>
        </button>

        {/* Tab 3: Logística Inversa (Devoluciones) */}
        <button
          onClick={() => setReturnsDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all h-12 text-slate-500 hover:text-slate-800 font-medium active:scale-95"
          aria-label="Abrir panel de Logística Inversa"
        >
          <div className="relative">
            <Undo2 className="h-5 w-5 text-amber-600" />
            {devoluciones?.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white">
                {devoluciones.length}
              </span>
            )}
          </div>
          <span className="text-xs">Devoluciones</span>
        </button>

      </div>
    </nav>
  );
}
