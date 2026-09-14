import React from 'react';
import logoValenciana from '../assets/logo-valenciana.jpg';
import { useWms } from '../context/WmsContext';
import { Building2, Zap, RotateCcw } from 'lucide-react';

export default function Header() {
  const {
    bodegas,
    activeBodega,
    setActiveBodega,
    addSimulatedOrder,
    resetDemoData
  } = useWms();

  return (
    <header className="sticky top-0 z-30 w-full h-14 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between shadow-sm">
      {/* 1. Logotipo y Título de Marca */}
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={logoValenciana}
          alt="La Valenciana Ferrehogar"
          className="h-9 w-9 object-cover rounded-lg shadow-sm flex-shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-900 leading-tight truncate">
            FERREHOGAR
          </span>
          <span className="text-xs font-semibold text-red-600 tracking-wider uppercase leading-none">
            Logistica Despachos
          </span>
        </div>
      </div>

      {/* 2. Estado En Línea y Controles Operativos */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          En línea
        </span>

        {/* Selector de Bodega (visible en tablet/desktop) */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2 h-8">
          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <select
            value={activeBodega}
            onChange={(e) => setActiveBodega(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            {bodegas.map((b) => (
              <option key={b.codigo} value={b.codigo} className="text-slate-900 font-medium">
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Inyector Rápido de Órdenes */}
        <button
          onClick={addSimulatedOrder}
          className="h-8 px-2 sm:px-2.5 bg-[#E11D24] hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1 shrink-0"
          title="Inyectar orden de prueba urgente"
        >
          <Zap className="h-3.5 w-3.5 fill-white" />
          <span className="text-xs hidden sm:inline">+Orden</span>
        </button>

        {/* Reiniciar Datos Demo */}
        <button
          onClick={resetDemoData}
          className="h-8 w-8 items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors hidden sm:flex shrink-0"
          title="Restablecer datos de prueba"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
