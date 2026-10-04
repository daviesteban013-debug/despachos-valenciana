import React, { useState, useRef } from 'react';
import { useWms } from '../context/WmsContext';
import {
  Search,
  X,
  SlidersHorizontal,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Truck
} from 'lucide-react';
import AddVehicleModal from './AddVehicleModal';

const CARRIERS = ['TODAS', 'Flota Propia', 'Coordinadora', 'TCC', 'Servientrega'];
const ZONES = ['TODAS', 'Atalaya Occidental', 'Los Patios & Centro', 'Zona Industrial El Salado', 'Reparto Express Urbano'];

/**
 * ControlBar — barra de busqueda + Kardex ERP + Filtros.
 *
 * Props:
 *   compact (bool) — cuando es true, el componente no envuelve su contenido
 *   en un contenedor con max-width/padding propio; el layout lo maneja el padre.
 *   Cuando es false/undefined, se comporta como antes (standalone con su propio wrapper).
 */
export default function ControlBar({ compact = false }) {
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
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);

  // Kardex import state
  const [kardexCargando, setKardexCargando] = useState(false);
  const [kardexStats, setKardexStats] = useState(null); // { facturas, lineas }
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Lee el token de Google almacenado en sesión, validando expiración
  const getGoogleToken = () => {
    try {
      const u = JSON.parse(localStorage.getItem('wms_google_user'));
      if (!u) return null;
      const token = u.token || u.credential;
      if (!token) return null;

      // Decodificar sin importar lib adicional (ya está en el bundle)
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          localStorage.removeItem('wms_google_user');
          return null;
        }
      }
      return token;
    } catch (_) {
      return null;
    }
  };

  const hasActiveFilters = selectedCarrier !== 'TODAS' || selectedZone !== 'TODAS' || onlyUrgent;

  const handleClearFilters = () => {
    setSelectedCarrier('TODAS');
    setSelectedZone('TODAS');
    setOnlyUrgent(false);
  };

  const handleKardexFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setKardexCargando(true);
    setKardexStats(null);
    try {
      const token = getGoogleToken();
      const formData = new FormData();
      formData.append('archivo', file);
      const res = await fetch(`${API_URL}/api/kardex/importar`, {
        method: 'POST',
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.status === 401) {
        // Sesión expirada: limpiar y recargar
        localStorage.removeItem('wms_google_user');
        window.location.reload();
        return;
      }
      if (res.status === 403) {
        showToast('No tienes permisos de administrador para importar el kardex.', 'error');
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar');
      setKardexStats({ facturas: data.facturas_unicas, lineas: data.filas_procesadas });
      showToast(
        `Kardex listo: ${data.facturas_unicas} facturas · ${data.filas_procesadas} lineas importadas`,
        'success'
      );
    } catch (err) {
      showToast(`Error importando kardex: ${err.message}`, 'error');
    } finally {
      setKardexCargando(false);
    }
  };

  const inner = (
    <div className="flex items-center gap-2 flex-1">
      {/* Buscador */}
      <div className="relative flex-1 flex items-center min-w-0">
        <Search className="h-5 w-5 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
        <input
          type="text"
          placeholder="Buscar por #ORD, factura ERP, cliente..."
          aria-label="Buscar por orden, factura ERP o cliente"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/90 backdrop-blur-sm border border-slate-300/80 rounded-xl pl-10 pr-9 h-11 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#E11D24] focus:ring-1 focus:ring-[#E11D24] shadow-sm transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 active:scale-95"
            aria-label="Limpiar busqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Boton Importar Kardex ERP */}
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
        aria-label="Importar kardex de ventas ERP"
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

      {/* Boton Agregar Vehiculo a Flota y Excel */}
      <button
        onClick={() => setAddVehicleOpen(true)}
        aria-label="Agregar vehículo a la flota y plantilla Excel"
        title="Agregar nuevo vehículo por placa (Crea hoja en Excel automáticamente)"
        className="h-11 px-3 rounded-xl border border-slate-300/80 bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 text-xs font-bold transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer"
      >
        <Truck className="h-4 w-4 text-red-600" />
        <span className="hidden md:inline">+ Vehículo</span>
      </button>

      {/* Boton Filtros Rapidos */}
      <div className="relative">
        <button
          onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          aria-label="Filtros rápidos de despacho"
          aria-expanded={filterMenuOpen}
          className={`h-11 px-3.5 rounded-xl border flex items-center gap-2 text-sm font-bold transition-all shrink-0 active:scale-95 shadow-sm ${
            hasActiveFilters
              ? 'bg-[#E11D24] border-[#E11D24] text-white shadow-red-500/20'
              : 'bg-white/90 backdrop-blur-sm border-slate-300/80 text-slate-700 hover:bg-slate-50'
          }`}
          title="Filtros rapidos de despacho"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden xs:inline">Filtros</span>
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          )}
        </button>

        {/* Menu Desplegable de Filtros — posicion absoluta relativa al boton */}
        {filterMenuOpen && (
          <div className="absolute top-full right-0 w-80 mt-1 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 p-4 space-y-4 animate-fadeIn z-30 ring-1 ring-slate-900/5">
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

      {/* Modal para agregar vehículo y crear hoja en Excel */}
      <AddVehicleModal
        isOpen={addVehicleOpen}
        onClose={() => setAddVehicleOpen(false)}
      />
    </div>
  );

  // En modo compact (usado desde KanbanBoard), no agrega wrapper propio
  if (compact) {
    return inner;
  }

  // En modo standalone (si se usa independiente en otro contexto), conserva su wrapper original
  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-2 relative z-20">
      {inner}
    </div>
  );
}
