import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Building2, 
  Zap, 
  Sun, 
  Moon, 
  RotateCcw 
} from 'lucide-react';

export default function Header() {
  const { 
    bodegas, 
    activeBodega, 
    setActiveBodega, 
    activeTurno, 
    setActiveTurno, 
    addSimulatedOrder, 
    resetDemoData
  } = useWms();

  return (
    <header className="h-14 bg-[#E11D24] text-white sticky top-0 z-30 shadow-md flex items-center justify-between px-3 sm:px-4">
      {/* 1. Identidad de Marca: Isotipo Hexágono con Chevron */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-8 w-8 shrink-0 flex items-center justify-center">
          <svg className="h-full w-full" viewBox="0 0 32 32" aria-label="Isotipo Valenciana">
            <polygon points="16,2 29,9.5 29,22.5 16,30 3,22.5 3,9.5" fill="#B91C1C" stroke="#FFFFFF" strokeWidth="1.5" />
            <polyline points="11,15 16,10 21,15" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="11,20 16,15 21,20" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold text-sm tracking-wide text-white truncate">
              La Valenciana
            </span>
            <span className="text-xs font-bold uppercase bg-white text-[#E11D24] px-1 py-0.5 rounded leading-none shrink-0">
              WMS
            </span>
          </div>
          <p className="text-xs text-red-100 font-medium leading-none mt-0.5 truncate">Control de Despachos</p>
        </div>
      </div>

      {/* 2. Selector de Bodega & Acciones Rápidas */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Selector de Bodega */}
        <div className="flex items-center gap-1 bg-red-800/80 border border-red-500/50 rounded-xl px-2.5 h-9 max-w-[140px] sm:max-w-none">
          <Building2 className="h-4 w-4 text-red-200 shrink-0" />
          <select
            value={activeBodega}
            onChange={(e) => setActiveBodega(e.target.value)}
            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer truncate"
          >
            {bodegas.map((b) => (
              <option key={b.codigo} value={b.codigo} className="text-slate-900 font-medium">
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Turno */}
        <button
          onClick={() => setActiveTurno(activeTurno === 'Diurno' ? 'Nocturno' : 'Diurno')}
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-800/80 hover:bg-red-700 text-white transition-colors active:scale-95 shrink-0"
          title={`Turno actual: ${activeTurno}`}
        >
          {activeTurno === 'Diurno' ? <Sun className="h-4 w-4 text-amber-200" /> : <Moon className="h-4 w-4 text-blue-200" />}
        </button>

        {/* Inyector Rápido */}
        <button
          onClick={addSimulatedOrder}
          className="h-9 px-2.5 bg-white hover:bg-red-50 text-[#E11D24] rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1 shrink-0"
          title="Inyectar orden urgente"
        >
          <Zap className="h-4 w-4 fill-[#E11D24]" />
          <span className="text-xs hidden sm:inline">+Orden</span>
        </button>

        {/* Reiniciar Demo */}
        <button
          onClick={resetDemoData}
          className="h-9 w-9 items-center justify-center rounded-xl hover:bg-red-700/80 text-white transition-colors hidden sm:flex shrink-0"
          title="Restablecer datos de prueba"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
