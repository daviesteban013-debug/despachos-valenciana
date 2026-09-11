import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Layers, 
  PackageCheck, 
  Truck, 
  AlertOctagon, 
  ScanLine 
} from 'lucide-react';

export default function BottomDock() {
  const { 
    activeDockTab, 
    setActiveDockTab, 
    kpis, 
    setScannerModalOpen 
  } = useWms();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-1 px-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-1">
        
        {/* Tab 1: Tablero de Olas */}
        <button
          onClick={() => setActiveDockTab('waves')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all min-h-[50px] active:scale-95 ${
            activeDockTab === 'waves'
              ? 'text-[#E11D24] font-black'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <Layers className="h-5 w-5" />
            {kpis.pendientesHoy > 0 && (
              <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-white">
                {kpis.pendientesHoy}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 leading-none">Olas</span>
        </button>

        {/* Tab 2: Mesa Packing */}
        <button
          onClick={() => setActiveDockTab('packing')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all min-h-[50px] active:scale-95 ${
            activeDockTab === 'packing'
              ? 'text-[#E11D24] font-black'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <PackageCheck className="h-5 w-5" />
            {kpis.enPacking > 0 && (
              <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white">
                {kpis.enPacking}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 leading-none">Packing</span>
        </button>

        {/* BOTÓN PRINCIPAL DESTACADO: PISTOLA RF / LECTOR DE CÓDIGOS DE BARRA */}
        <div className="px-1 -mt-4">
          <button
            onClick={() => setScannerModalOpen(true)}
            className="h-14 w-14 rounded-full bg-[#E11D24] hover:bg-red-700 text-white flex flex-col items-center justify-center shadow-lg shadow-red-500/40 ring-4 ring-white active:scale-90 transition-all"
            title="Abrir Pistola Láser / Escáner QR"
          >
            <ScanLine className="h-6 w-6 text-amber-300 animate-pulse" />
          </button>
        </div>

        {/* Tab 3: Bahías & Flota */}
        <button
          onClick={() => setActiveDockTab('bays')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all min-h-[50px] active:scale-95 ${
            activeDockTab === 'bays'
              ? 'text-[#E11D24] font-black'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <Truck className="h-5 w-5" />
            {kpis.enBahia > 0 && (
              <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-purple-600 text-white">
                {kpis.enBahia}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 leading-none">Bahías</span>
        </button>

        {/* Tab 4: Incidencias */}
        <button
          onClick={() => setActiveDockTab('incidents')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all min-h-[50px] active:scale-95 ${
            activeDockTab === 'incidents'
              ? 'text-[#E11D24] font-black'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <AlertOctagon className="h-5 w-5" />
            {kpis.incidencias > 0 && (
              <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#E11D24] text-white animate-pulse">
                {kpis.incidencias}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 leading-none">Novedades</span>
        </button>

      </div>
    </nav>
  );
}
