import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Truck,
  AlertCircle,
  FileSpreadsheet,
  RotateCcw,
  RefreshCw,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

const VEHICULOS_INFO = [
  { placa: 'WRO-482', modelo: 'Camión NHR 4.5T' },
  { placa: 'STZ-910', modelo: 'Camioneta D-Max 1.8T' },
  { placa: 'ENV-301', modelo: 'Hino Dutro 7.5T' },
  { placa: 'MC-441',  modelo: 'Motocarro 500kg' }
];

export default function DispatchCard({ despacho }) {
  const { 
    setSelectedDespachoId, 
    despacharOrden, 
    asignarVehiculo,
    reintentarSyncOneDrive,
    restaurarAPendiente,
    setIncidentModalTarget, 
    placasFlotaFija,
    currentTime 
  } = useWms();

  const [placaSeleccionada, setPlacaSeleccionada] = useState(
    despacho.vehiculo_placa || 'WRO-482'
  );
  const [errorSinPlaca, setErrorSinPlaca] = useState(false);
  const [reintentando, setReintentando] = useState(false);

  // Cálculo de tiempo SLA
  const corteTime = new Date(despacho.horario_corte).getTime();
  const diffMinutes = Math.round((corteTime - currentTime) / 60000);

  let cutOffElement = null;
  if (despacho.estado_actual === 'DESPACHADO') {
    cutOffElement = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 shrink-0">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
        Despachado
      </span>
    );
  } else if (diffMinutes <= 0) {
    cutOffElement = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-red-600 text-white animate-pulse-fast shadow-sm shrink-0">
        <AlertTriangle className="h-3.5 w-3.5" />
        ¡SLA VENCIDO ({Math.abs(diffMinutes)}m)!
      </span>
    );
  } else if (diffMinutes < 30) {
    cutOffElement = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-red-100 text-[#E11D24] border border-red-300 animate-pulse-fast shrink-0">
        <Clock className="h-3.5 w-3.5 text-[#E11D24]" />
        Corte en {diffMinutes}m
      </span>
    );
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    cutOffElement = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
      </span>
    );
  }

  const totalPiezas = despacho.items?.reduce((acc, it) => acc + (it.cantidad_solicitada || it.cantidad || 0), 0) || despacho.bultos_total || 0;
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
    await reintentarSyncOneDrive(despacho.id);
    setReintentando(false);
  };

  const handleRestaurar = (e) => {
    e.stopPropagation();
    if (window.confirm(`¿Devolver la orden ${despacho.codigo_orden} a PENDIENTE?`)) {
      restaurarAPendiente(despacho.id);
    }
  };

  return (
    <div
      onClick={() => setSelectedDespachoId(despacho.id)}
      className={`w-full bg-white rounded-2xl border p-4 space-y-3 cursor-pointer transition-all shadow-sm active:scale-[0.99] select-none ${
        tieneIncidencia
          ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
          : isUrgent && diffMinutes < 30 && despacho.estado_actual !== 'DESPACHADO'
          ? 'border-[#E11D24] ring-2 ring-red-300/60'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* FILA 1: Encabezado y SLA */}
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
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#E11D24] text-white shrink-0">
              URGENTE
            </span>
          )}
          <div className="shrink-0">
            {cutOffElement}
          </div>
        </div>
      </div>

      {/* FILA 2: Cliente y Bultos/Kilos */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 truncate flex-1 min-w-0" title={despacho.cliente_nombre}>
          {despacho.cliente_nombre}
        </h3>
        <span className="text-xs font-semibold font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
          {totalPiezas} bultos • {despacho.peso_total_kg} kg
        </span>
      </div>

      {/* FILA 3: Selector de Vehículo de Flota Fija (4 placas) */}
      <div className="pt-1">
        {despacho.estado_actual === 'PENDIENTE' ? (
          <div 
            className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Truck className="h-4 w-4 text-[#E11D24] shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block leading-tight">
                Vehículo Asignado (Hoja Excel):
              </label>
              <select
                value={placaSeleccionada}
                onChange={handleCambiarVehiculo}
                className={`w-full mt-0.5 bg-white border text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#E11D24] ${
                  errorSinPlaca ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 text-slate-800'
                }`}
              >
                {VEHICULOS_INFO.map(v => (
                  <option key={v.placa} value={v.placa}>
                    {v.placa} — {v.modelo}
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
              className="text-[11px] font-bold text-[#E11D24] hover:underline"
            >
              Resolver
            </button>
          </div>
          <p className="text-[11px] text-amber-900/90 line-clamp-2">
            "{despacho.incidencia_activa.descripcion}"
          </p>
        </div>
      )}

      {/* FILA 5: Estado de Sincronización con OneDrive (en Despachados) */}
      {despacho.estado_actual === 'DESPACHADO' && (
        <div className="pt-1">
          {despacho.sync_onedrive?.estado === 'SINCRONIZADO' ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-semibold">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>OneDrive: Sincronizado en hoja [{despacho.vehiculo_placa}]</span>
              </div>
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            </div>
          ) : despacho.sync_onedrive?.estado === 'PENDIENTE' ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900">
              <div className="flex items-center gap-1.5 font-semibold truncate flex-1 mr-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span className="truncate">Pendiente de sincronizar con Excel</span>
              </div>
              <button
                type="button"
                onClick={handleReintentar}
                disabled={reintentando}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shrink-0 active:scale-95 transition-all shadow-sm"
              >
                <RefreshCw className={`h-3 w-3 ${reintentando ? 'animate-spin' : ''}`} />
                <span>{reintentando ? 'Sync...' : 'Reintentar'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              <span className="font-semibold flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                Guardando en plantilla de OneDrive...
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
          className={`h-10 px-3 flex items-center justify-center gap-1 rounded-xl text-xs font-bold border transition-all active:scale-95 shrink-0 ${
            tieneIncidencia
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600'
          }`}
          title={tieneIncidencia ? 'Ver novedad activa' : 'Reportar novedad'}
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="hidden xs:inline">{tieneIncidencia ? 'Novedad' : 'Reportar'}</span>
        </button>

        {/* Botón de Despacho Principal (Un solo toque para despachar) */}
        {despacho.estado_actual === 'PENDIENTE' ? (
          <button
            type="button"
            onClick={handleDespachar}
            className="h-10 flex-1 flex items-center justify-center gap-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>Despachar en {placaSeleccionada}</span>
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
  );
}
