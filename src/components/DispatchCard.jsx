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
  ArrowRight,
  Printer
} from 'lucide-react';
import PackageLabelModal from './PackageLabelModal';
import { FLOTA_VEHICULOS } from '../data/flota';

export default function DispatchCard({ despacho }) {
  const { 
    setSelectedDespachoId, 
    despacharOrden, 
    asignarVehiculo,
    reintentarSyncDrive,
    exportarCopiaExcel,
    restaurarACola,
    setIncidentModalTarget
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
    if (window.confirm(`¿Devolver la orden ${despacho.codigo_orden} a COLA?`)) {
      restaurarACola(despacho.id);
    }
  };

  const handlePrintTirilla = (e) => {
    e.stopPropagation();
    setShowTirilla(true);
  };

  return (
    <>
      <div
        onClick={() => setSelectedDespachoId(despacho.id)}
        className={`w-full bg-white rounded-xl border p-5 space-y-3 cursor-pointer transition-all active:scale-[0.99] select-none ${
          tieneIncidencia
            ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
            : isUrgent && despacho.estado_actual !== 'DESPACHADO'
            ? 'border-[#E11D24] ring-2 ring-red-300/60'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* FILA 1: Encabezado y Estado */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-base font-bold text-slate-900 tracking-tight truncate">
              {despacho.codigo_factura_erp || despacho.codigo_orden}
            </span>
            <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
              #{despacho.codigo_orden}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isUrgent && (
              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-[#E11D24] text-white shrink-0">
                URGENTE
              </span>
            )}
            {despacho.estado_actual === 'DESPACHADO' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 shrink-0">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                Despachado
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 truncate flex-1 min-w-0" title={despacho.cliente_nombre}>
            {despacho.cliente_nombre}
          </h3>
        </div>

        {/* FILA 3: Selector de Vehículo de Flota Fija (4 placas) */}
        <div className="pt-1">
          {despacho.estado_actual === 'COLA' ? (
            <div 
              className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 w-[400px] max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Truck className="h-4 w-4 text-slate-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block leading-tight">
                  Vehículo Asignado (Hoja Excel):
                </label>
                <select
                  value={placaSeleccionada}
                  onChange={handleCambiarVehiculo}
                  className={`w-full mt-0.5 bg-white border text-xs font-bold font-mono rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 ${
                    errorSinPlaca ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-300 text-slate-800'
                  }`}
                >
                  {FLOTA_VEHICULOS.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Datos de Despacho en Modo Despachado */
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase leading-none">Despachado en:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{despacho.vehiculo_placa || placaSeleccionada}</span>
                </div>
              </div>
              {despacho.hora_salida && (
                <span className="font-mono text-slate-500 text-[11px]">
                  Salida: {new Date(despacho.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* FILA 4: Alerta si tiene Incidencia / Novedad activa */}
        {tieneIncidencia && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs text-amber-950 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
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
              "{despacho.incidencia_activa.descripcion}"
            </p>
          </div>
        )}

        {/* FILA 5: Estado de Sincronización con Google Drive (en Despachados) */}
        {despacho.estado_actual === 'DESPACHADO' && (
          <div className="pt-1">
            {despacho.sync_cloud?.estado === 'SINCRONIZADO' ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-semibold">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Google Drive: Sincronizado en hoja [<span className="font-mono">{despacho.vehiculo_placa}</span>]</span>
                </div>
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              </div>
            ) : despacho.sync_cloud?.estado === 'ERROR_SYNC' ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-semibold truncate flex-1 mr-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Pendiente de sincronizar con Excel</span>
                </div>
                <button
                  type="button"
                  onClick={handleReintentar}
                  disabled={reintentando}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] shrink-0 active:scale-95 transition-all"
                >
                  <RefreshCw className={`h-3 w-3 ${reintentando ? 'animate-spin' : ''}`} />
                  <span>{reintentando ? 'Sync...' : 'Reintentar'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  Guardando en plantilla de Google Drive...
                </span>
              </div>
            )}
          </div>
        )}

        {/* PIE DE LA TARJETA: ACCIONES OPERATIVAS */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          {/* Botón de Novedad (Siempre accesible) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIncidentModalTarget(despacho);
            }}
            className={`h-10 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 shrink-0 ${
              tieneIncidencia
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
            title={tieneIncidencia ? 'Ver novedad activa' : 'Reportar novedad'}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">{tieneIncidencia ? 'Novedad' : 'Reportar'}</span>
          </button>

          {/* Botón Imprimir Tirilla */}
          <button
            type="button"
            onClick={handlePrintTirilla}
            className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-95 shrink-0"
            title="Imprimir tirilla de despacho"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Tirilla</span>
          </button>

          {/* Botón de Despacho Principal (Un solo toque para despachar) */}
          {despacho.estado_actual === 'COLA' ? (
            <button
              type="button"
              onClick={handleDespachar}
              className="h-10 flex-1 flex items-center justify-center gap-2 px-4 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all active:scale-95"
            >
              <Truck className="w-4 h-4 shrink-0" />
              <span>Despachar en <span className="font-mono">{placaSeleccionada}</span></span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          ) : (
            /* Opciones de orden despachada */
            <div className="flex items-center justify-between flex-1 gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 px-2 py-1">
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

      {/* MODAL TIRILLA TÉRMICA (accesible desde tarjeta) */}
      {showTirilla && (
        <PackageLabelModal 
          despacho={despacho} 
          onClose={() => setShowTirilla(false)} 
        />
      )}
    </>
  );
}
