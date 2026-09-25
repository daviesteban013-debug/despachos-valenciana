import React, { useState, useEffect } from 'react';
import { useWms } from '../context/WmsContext';
import {
  AlertTriangle,
  CheckCircle,
  Truck,
  AlertCircle,
  FileSpreadsheet,
  RotateCcw,
  RefreshCw,
  WifiOff,
  Printer,
  DollarSign,
} from 'lucide-react';
import PackageLabelModal from './PackageLabelModal';
import { FLOTA_VEHICULOS } from '../data/flota';

export default function DispatchCard({ despacho }) {
  const {
    setSelectedDespachoId,
    despacharOrden,
    asignarVehiculo,
    reintentarSyncDrive,
    restaurarACola,
    setIncidentModalTarget,
  } = useWms();

  const [placaSeleccionada, setPlacaSeleccionada] = useState(
    despacho.vehiculo_placa || FLOTA_VEHICULOS[0]
  );

  useEffect(() => {
    setPlacaSeleccionada(despacho.vehiculo_placa || FLOTA_VEHICULOS[0]);
  }, [despacho.vehiculo_placa]);

  const [errorSinPlaca, setErrorSinPlaca] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const [showTirilla, setShowTirilla] = useState(false);

  const isUrgent = despacho.prioridad === 1;
  const tieneIncidencia = Boolean(despacho.incidencia_activa);
  const sinConfirmar = despacho._sync_status === 'PENDIENTE_DE_SYNC';
  const isDespachado = despacho.estado_actual === 'DESPACHADO';

  // ── Handlers (logica de negocio intacta) ──────────────────────────────────
  const handleCambiarVehiculo = (e) => {
    e.stopPropagation();
    const nuevaPlaca = e.target.value;
    setPlacaSeleccionada(nuevaPlaca);
    setErrorSinPlaca(false);
    asignarVehiculo(despacho.id, nuevaPlaca);
  };

  const handleDespachar = async (e) => {
    e.stopPropagation();
    const placaFinal = placaSeleccionada || despacho.vehiculo_placa;
    if (!placaFinal) {
      setErrorSinPlaca(true);
      return;
    }
    await despacharOrden(despacho.id, placaFinal);
  };

  const handleReintentar = async (e) => {
    e.stopPropagation();
    setReintentando(true);
    await reintentarSyncDrive(despacho.id);
    setReintentando(false);
  };

  const handleRestaurar = (e) => {
    e.stopPropagation();
    if (window.confirm(`Devolver la orden ${despacho.codigo_orden} a PENDIENTE?`)) {
      restaurarACola(despacho.id);
    }
  };

  const handlePrintTirilla = (e) => {
    e.stopPropagation();
    setShowTirilla(true);
  };

  // ── Clase de borde segun estado ───────────────────────────────────────────
  const ringClass = sinConfirmar
    ? 'ring-2 ring-amber-400/40 border-amber-400/60'
    : tieneIncidencia
    ? 'ring-2 ring-amber-300/40 border-amber-300/60'
    : isUrgent && !isDespachado
    ? 'ring-2 ring-[#E11D24]/20 border-[#E11D24]/30'
    : 'border-slate-900/5 hover:border-slate-300/60';

  return (
    <>
      <div
        onClick={() => setSelectedDespachoId(despacho.id)}
        className={`w-full bg-white rounded-2xl border ring-1 ring-slate-900/5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none ${ringClass} ${
          sinConfirmar ? 'bg-amber-50/40' : tieneIncidencia ? 'bg-amber-50/20' : ''
        }`}
      >
        {/* ── CABECERA: factura + badges ── */}
        <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-base font-black text-slate-800 tracking-tight truncate">
              {despacho.codigo_factura_erp || despacho.codigo_orden}
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0 border border-slate-200/60">
              #{despacho.codigo_orden}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isUrgent && !isDespachado && (
              <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-[#E11D24] text-white">
                URGENTE
              </span>
            )}
            {isDespachado && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <CheckCircle className="h-3 w-3 text-emerald-600" />
                Despachado
              </span>
            )}
            {sinConfirmar && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300/60 animate-pulse"
                title="Este despacho no ha sido confirmado por el servidor. Se reintentara automaticamente."
              >
                <WifiOff className="h-3 w-3" />
                Sin confirmar
              </span>
            )}
          </div>
        </div>

        {/* ── CUERPO ── */}
        <div className="px-4 py-3 space-y-3">
          {/* Cliente */}
          <h3
            className="text-sm font-black text-slate-800 tracking-tight truncate"
            title={despacho.cliente_nombre}
          >
            {despacho.cliente_nombre}
          </h3>

          {/* Vehiculo + valor (solo en despachado) */}
          {isDespachado && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <Truck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span className="font-mono font-bold text-slate-800">
                  {despacho.vehiculo_placa || placaSeleccionada}
                </span>
                {despacho.hora_salida && (
                  <span className="text-slate-400 font-medium ml-1">
                    · {new Date(despacho.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              {despacho.valor_total > 0 && (
                <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                  <span>{Number(despacho.valor_total).toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>
          )}

          {/* Banner offline: sin confirmar en servidor */}
          {sinConfirmar && (
            <div className="bg-amber-50 border border-amber-300/70 rounded-xl p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-0.5">
                <WifiOff className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Sin confirmar en servidor</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                Este despacho existe solo en este dispositivo. Se reintentara enviarlo automaticamente cuando haya conexion.
              </p>
            </div>
          )}

          {/* Banner incidencia activa */}
          {tieneIncidencia && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-xs">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>Novedad: {despacho.incidencia_activa.tipo}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIncidentModalTarget(despacho);
                  }}
                  className="text-[11px] font-bold text-amber-800 hover:underline"
                >
                  Resolver
                </button>
              </div>
              <p className="text-[11px] text-amber-900/90 line-clamp-2">
                &quot;{despacho.incidencia_activa.descripcion}&quot;
              </p>
            </div>
          )}

          {/* Estado sync con Google Drive (SOLO ramas SINCRONIZADO y ERROR_SYNC — sin spinner por defecto) */}
          {isDespachado && despacho.sync_cloud?.estado === 'SINCRONIZADO' && (
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-semibold">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>
                  Google Drive: Sincronizado en hoja [<span className="font-mono">{despacho.vehiculo_placa}</span>]
                </span>
              </div>
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>
          )}
          {isDespachado && despacho.sync_cloud?.estado === 'ERROR_SYNC' && (
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-semibold truncate flex-1 mr-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="truncate">Pendiente de sincronizar con Google Drive</span>
              </div>
              <button
                type="button"
                onClick={handleReintentar}
                disabled={reintentando}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-black text-white font-bold text-[11px] shrink-0 active:scale-95 transition-all"
              >
                <RefreshCw className={`h-3 w-3 ${reintentando ? 'animate-spin' : ''}`} />
                <span>{reintentando ? 'Sync...' : 'Reintentar'}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── PIE: acciones ── */}
        <div className="flex items-center gap-2 px-4 pb-4 pt-1 border-t border-slate-100 mt-1">
          {/* Boton Novedad */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIncidentModalTarget(despacho);
            }}
            className={`h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 shrink-0 ${
              tieneIncidencia
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title={tieneIncidencia ? 'Ver novedad activa' : 'Reportar novedad'}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">{tieneIncidencia ? 'Novedad' : 'Reportar'}</span>
          </button>

          {/* Boton Imprimir Tirilla */}
          <button
            type="button"
            onClick={handlePrintTirilla}
            className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all active:scale-95 shrink-0"
            title="Imprimir tirilla de despacho"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Tirilla</span>
          </button>

          {/* Accion principal */}
          {!isDespachado ? (
            /* PENDIENTE → Split button DESPACHAR */
            <div className={`h-10 flex-1 flex rounded-xl shadow-sm transition-all min-w-0 ${errorSinPlaca ? 'ring-2 ring-amber-400' : 'hover:shadow-md'}`}>
              <button
                type="button"
                onClick={handleDespachar}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 rounded-l-xl bg-[#E11D24] hover:bg-red-700 text-white text-[11px] sm:text-xs font-black transition-all active:scale-95 overflow-hidden"
              >
                <Truck className="w-4 h-4 shrink-0" />
                <span className="truncate">DESPACHAR</span>
              </button>
              <div
                className="relative flex items-center shrink-0 bg-red-800 border-l border-red-700 rounded-r-xl px-2 hover:bg-red-900 transition-colors cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <select
                  value={placaSeleccionada}
                  onChange={handleCambiarVehiculo}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Cambiar vehiculo asignado"
                >
                  {FLOTA_VEHICULOS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <span className="font-mono text-white/90 text-[11px] font-bold px-1 truncate max-w-[60px] inline-block align-middle">{placaSeleccionada}</span>
                <span className="text-white/50 text-[10px] shrink-0">▼</span>
              </div>
            </div>
          ) : (
            /* DESPACHADO → indicador + devolver */
            <div className="flex items-center justify-between flex-1 gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 px-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Despacho Concluido</span>
              </div>
              <button
                type="button"
                onClick={handleRestaurar}
                className="h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95"
                title="Devolver a pendiente si hubo error"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Devolver</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tirilla Termica */}
      {showTirilla && (
        <PackageLabelModal
          despacho={despacho}
          onClose={() => setShowTirilla(false)}
        />
      )}
    </>
  );
}
