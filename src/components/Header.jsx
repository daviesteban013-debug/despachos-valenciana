import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Building2, 
  Search, 
  Zap, 
  RotateCcw, 
  Sun, 
  Moon, 
  X,
  SlidersHorizontal
} from 'lucide-react';

export default function Header() {
  const { 
    bodegas, 
    activeBodega, 
    setActiveBodega, 
    activeTurno, 
    setActiveTurno, 
    searchQuery, 
    setSearchQuery, 
    addSimulatedOrder, 
    resetDemoData
  } = useWms();

  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      {/* 1. BARRA SUPERIOR COMPACTA ROJO VALENCIANA (#E11D24) */}
      <div className="bg-[#E11D24] text-white px-3 sm:px-4 py-2 flex items-center justify-between shadow-sm">
        
        {/* Identidad de Marca: Isotipo Hexágono con Chevron */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 flex items-center justify-center">
            <svg className="h-full w-full" viewBox="0 0 32 32">
              <polygon points="16,2 29,9.5 29,22.5 16,30 3,22.5 3,9.5" fill="#B91C1C" stroke="#FFFFFF" strokeWidth="1.5" />
              <polyline points="11,15 16,10 21,15" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="11,20 16,15 21,20" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-sm tracking-wide text-white">
                La Valenciana
              </span>
              <span className="text-[11px] font-black uppercase bg-white text-[#E11D24] px-1 py-0.5 rounded font-sans leading-none">
                WMS
              </span>
            </div>
            <p className="text-[12px] text-red-100 font-medium leading-none mt-0.5">Control de Despachos</p>
          </div>
        </div>

        {/* Controles Rápidos Mobile */}
        <div className="flex items-center gap-1.5">
          {/* Botón Buscar (Toggle) */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`p-2 rounded-xl text-white transition-colors ${
              searchOpen || searchQuery ? 'bg-red-800' : 'hover:bg-red-700/80'
            }`}
            title="Buscar órdenes o SKUs"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Turno */}
          <button
            onClick={() => setActiveTurno(activeTurno === 'Diurno' ? 'Nocturno' : 'Diurno')}
            className="p-2 rounded-xl hover:bg-red-700/80 text-white transition-colors"
            title={`Turno actual: ${activeTurno}`}
          >
            {activeTurno === 'Diurno' ? <Sun className="h-4 w-4 text-amber-200" /> : <Moon className="h-4 w-4 text-blue-200" />}
          </button>

          {/* Inyector Rápido */}
          <button
            onClick={addSimulatedOrder}
            className="p-2 bg-white hover:bg-red-50 text-[#E11D24] rounded-xl font-bold transition-all shadow-sm active:scale-95"
            title="Inyectar orden urgente crítica"
          >
            <Zap className="h-4 w-4 fill-[#E11D24]" />
          </button>

          {/* Reiniciar Demo */}
          <button
            onClick={resetDemoData}
            className="p-2 hover:bg-red-700/80 text-white rounded-xl transition-colors hidden sm:block"
            title="Restablecer datos de prueba"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. SUB-BARRA COMPACTA: SELECTOR DE BODEGA & BUSCADOR COLAPSABLE */}
      <div className="px-3 sm:px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Building2 className="h-4 w-4 text-[#E11D24] shrink-0" />
          <select
            value={activeBodega}
            onChange={(e) => setActiveBodega(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer truncate max-w-[240px] sm:max-w-none"
          >
            {bodegas.map((b) => (
              <option key={b.codigo} value={b.codigo} className="text-slate-800 font-medium">
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        {searchQuery && (
          <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
            Filtrado
          </span>
        )}
      </div>

      {/* 3. CAMPO DE BÚSQUEDA COLAPSABLE (SE ABRE AL TOCAR LA LUPA) */}
      {(searchOpen || searchQuery) && (
        <div className="px-3 sm:px-4 pb-2.5 pt-1 bg-slate-50 border-t border-slate-200 animate-fadeIn">
          <div className="relative flex items-center">
            <Search className="h-4 w-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              autoFocus={searchOpen}
              placeholder="Buscar Factura (FE-80297), Orden, Cliente o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#E11D24] focus:ring-1 focus:ring-[#E11D24] shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
