import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Building2, 
  Clock, 
  Search, 
  QrCode, 
  Zap, 
  RotateCcw, 
  Moon, 
  Sun,
  Truck,
  ScanLine,
  X
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
    resetDemoData, 
    setScannerModalOpen,
    kpis,
    currentTime 
  } = useWms();

  const formattedTime = new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(currentTime);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      
      {/* 1. BARRA SUPERIOR ROJO VALENCIANA (#E11D24) */}
      <div className="bg-[#E11D24] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-md">
        
        {/* Identidad de Marca: Isotipo Hexágono Rojo con Chevron Blanco */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 flex items-center justify-center drop-shadow-md">
            {/* Isotipo SVG Hexágono con Chevron */}
            <svg className="h-full w-full" viewBox="0 0 32 32">
              <polygon points="16,2 29,9.5 29,22.5 16,30 3,22.5 3,9.5" fill="#B91C1C" stroke="#FFFFFF" strokeWidth="1.5" />
              <polyline points="11,15 16,10 21,15" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="11,20 16,15 21,20" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-wider uppercase drop-shadow-sm text-white">
                La Valenciana
              </span>
              <span className="text-[10px] font-extrabold uppercase bg-white text-[#E11D24] px-1.5 py-0.2 rounded font-sans tracking-wide">
                FERREHOGAR
              </span>
            </div>
            <p className="text-[11px] text-red-100 font-medium">Torre de Control & WMS Bodega</p>
          </div>
        </div>

        {/* Turno, Hora y Controles Rápidos */}
        <div className="flex items-center gap-2.5 text-xs">
          
          {/* Reloj de Bodega */}
          <div className="hidden sm:flex items-center gap-1.5 bg-red-800/60 px-2.5 py-1 rounded-lg font-mono text-white text-[11px]">
            <Clock className="h-3.5 w-3.5 text-red-200 animate-pulse" />
            <span>{formattedTime}</span>
          </div>

          {/* Selector de Turno */}
          <button
            onClick={() => setActiveTurno(activeTurno === 'Diurno' ? 'Despacho Nocturno' : 'Diurno')}
            className="flex items-center gap-1.5 bg-red-800/80 hover:bg-red-900 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            title="Cambiar turno de operación"
          >
            {activeTurno === 'Diurno' ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5 text-blue-200" />}
            <span className="hidden md:inline">{activeTurno}</span>
          </button>

          {/* Inyector de Orden Crítica Simulada */}
          <button
            onClick={addSimulatedOrder}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-[#E11D24] px-3 py-1 rounded-lg text-xs font-extrabold shadow-sm active:scale-95 transition-all"
            title="Inyecta un pedido urgente con corte SLA en menos de 20 min"
          >
            <Zap className="h-3.5 w-3.5 fill-[#E11D24]" />
            <span className="hidden sm:inline">+ Simular Urgente</span>
          </button>

          {/* Reiniciar Demo */}
          <button
            onClick={resetDemoData}
            className="p-1.5 bg-red-800/50 hover:bg-red-900 text-white rounded-lg transition-all"
            title="Restablecer datos originales de La Valenciana"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

        </div>

      </div>

      {/* 2. SUB-BARRA DE CONTROL: BODEGA Y LECTOR DE CÓDIGO DE BARRAS */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/90">
        
        {/* Selector de Bodega */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Building2 className="h-4 w-4 text-[#E11D24] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">Bodega Activa</span>
              <select
                value={activeBodega}
                onChange={(e) => setActiveBodega(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-3"
              >
                {bodegas.map((b) => (
                  <option key={b.codigo} value={b.codigo} className="text-slate-800">
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Buscador Integrado con Botón de Pistola / Lector RF */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar Factura ERP (FE-80297), Orden, Cliente o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#E11D24] focus:ring-1 focus:ring-[#E11D24] shadow-sm font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Botón táctil para simular pistola láser / escáner de código de barras */}
          <button
            onClick={() => setScannerModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all shrink-0 border border-slate-700"
            title="Abrir simulador de pistola láser / Lector QR"
          >
            <ScanLine className="h-4 w-4 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Pistola RF / QR</span>
          </button>
        </div>

      </div>

    </header>
  );
}
