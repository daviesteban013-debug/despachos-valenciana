import React, { useState, useRef } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Search, 
  X, 
  SlidersHorizontal,
  FileSpreadsheet,
  Loader2,
  CheckCircle2
} from 'lucide-react';

const CARRIERS = ['TODAS', 'Flota Propia', 'Coordinadora', 'TCC', 'Servientrega'];
const ZONES = ['TODAS', 'Atalaya Occidental', 'Los Patios & Centro', 'Zona Industrial El Salado', 'Reparto Express Urbano'];

export default function ControlBar() {
  const { 
    searchQuery, 
    setSearchQuery, 
    selectedCarrier, 
    setSelectedCarrier, 
    selectedZone, 
    setSelectedZone, 
    onlyUrgent, 
    setOnlyUrgent,
    showToast
  } = useWms();

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // ── Kardex import state ────────────────────────────────────────────────────
  const [kardexCargando, setKardexCargando] = useState(false);
  const [kardexStats, setKardexStats]       = useState(null); // { facturas_unicas, filas_procesadas }
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const hasActiveFilters = selectedCarrier !== 'TODAS' || selectedZone !== 'TODAS' || onlyUrgent;

  const handleClearFilters = () => {
    setSelectedCarrier('TODAS');
    setSelectedZone('TODAS');
    setOnlyUrgent(false);
  };

  // ── Importar kardex Excel ──────────────────────────────────────────────────
  const handleKardexFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset para poder reimportar el mismo archivo

    setKardexCargando(true);
    setKardexStats(null);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      const res  = await fetch(`${API_URL}/api/kardex/importar`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar');
      setKardexStats({ facturas: data.facturas_unicas, lineas: data.filas_procesadas });
      showToast(
        `⚡ Kardex listo: ${data.facturas_unicas} facturas · ${data.filas_procesadas} líneas importadas`,
        'success'
      );
    } catch (err) {
      showToast(`Error importando kardex: ${err.message}`, 'error');
    } finally {
      setKardexCargando(false);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-2 relative z-20">
      <div className="flex items-center gap-2">
        {/* Barra de Búsqueda Compacta (h-11 = 44px touch target) */}
        <div className="relative flex-1 flex items-center">
          <Search className="h-5 w-5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por #ORD, factura ERP, cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/90 backdrop-blur-sm border border-slate-300/80 rounded-xl pl-10 pr-9 h-11 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#E11D24] focus:ring-1 focus:ring-[#E11D24] shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 active:scale-95"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Botón Importar Kardex ERP ── */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleKardexFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={kardexCargando}
          title={kardexStats ? `Kardex cargado: ${kardexStats.facturas} facturas` : 'Importar kardex de ventas ERP (.xlsx)'}
          className={`h-11 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all shrink-0 active:scale-95 shadow-sm ${
            kardexCargando
              ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-wait'
              : kardexStats
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
              : 'bg-white/90 backdrop-blur-sm border-slate-300/80 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {kardexCargando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : kardexStats ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {kardexCargando
              ? 'Cargando...'
              : kardexStats
              ? `${kardexStats.facturas} Facturas`
              : 'Kardex ERP'}
          </span>
        </button>

        {/* Botón Filtros Rápidos (h-11 = 44px touch target) */}
        <button
          onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          className={`h-11 px-3.5 rounded-xl border flex items-center gap-2 text-sm font-bold transition-all shrink-0 active:scale-95 shadow-sm ${
            hasActiveFilters
              ? 'bg-[#E11D24] border-[#E11D24] text-white shadow-red-500/20'
              : 'bg-white/90 backdrop-blur-sm border-slate-300/80 text-slate-700 hover:bg-slate-50'
          }`}
          title="Filtros rápidos de despacho"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden xs:inline">Filtros</span>
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>

      {/* Menú Desplegable de Filtros */}
      {filterMenuOpen && (
        <div className="absolute top-full left-3 right-3 sm:left-auto sm:right-4 sm:w-80 mt-1 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 p-4 space-y-4 animate-fadeIn z-30 ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-sm font-bold text-slate-900">Filtros Operativos</span>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-[#E11D24] font-bold hover:underline"
              >
                Restablecer
              </button>
            )}
          </div>

          {/* Filtro Transportadora */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Transportadora
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CARRIERS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCarrier(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCarrier === c
                      ? 'bg-[#E11D24] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro Zona de Entrega */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Zona de Entrega
            </label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 h-10 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#E11D24]"
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Switch Solo Urgentes */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">Solo Urgentes (SLA)</span>
            <button
              onClick={() => setOnlyUrgent(!onlyUrgent)}
              className={`h-7 w-12 rounded-full p-1 transition-colors flex items-center ${
                onlyUrgent ? 'bg-[#E11D24] justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          <button
            onClick={() => setFilterMenuOpen(false)}
            className="w-full h-11 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all active:scale-95"
          >
            Aplicar Filtros
          </button>
        </div>
      )}
    </div>
  );
}
