import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  Warehouse, 
  CheckCircle,
  Truck,
  AlertCircle
} from 'lucide-react';

export default function DispatchCard({ despacho }) {
  const { 
    setSelectedDespachoId, 
    advanceStage, 
    setIncidentModalTarget, 
    currentTime 
  } = useWms();

  // Cálculo del tiempo de corte SLA
  const corteTime = new Date(despacho.horario_corte).getTime();
  const diffMinutes = Math.round((corteTime - currentTime) / 60000);

  let cutOffElement = null;
  if (despacho.estado_actual === 'DESPACHADO') {
    cutOffElement = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
        Despachado
      </span>
    );
  } else if (diffMinutes <= 0) {
    cutOffElement = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600 text-white animate-pulse-fast shadow-sm">
        <AlertTriangle className="h-4 w-4" />
        ¡SLA VENCIDO ({Math.abs(diffMinutes)}m)!
      </span>
    );
  } else if (diffMinutes < 30) {
    cutOffElement = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-[#E11D24] border border-red-300 animate-pulse-fast">
        <Clock className="h-4 w-4 text-[#E11D24]" />
        Corte en {diffMinutes}m
      </span>
    );
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    cutOffElement = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
      </span>
    );
  }

  const totalPiezas = despacho.items?.reduce((acc, it) => acc + it.cantidad_solicitada, 0) || 0;
  const isUrgent = despacho.prioridad === 1;

  const NEXT_ACTIONS = {
    COLA: 'Iniciar Picking',
    PICKING: 'Pasar a Packing',
    PACKING: 'Listo en Bahía',
    LISTO: 'Despachar'
  };

  return (
    <div
      onClick={() => setSelectedDespachoId(despacho.id)}
      className={`w-full bg-white rounded-2xl border p-4 space-y-3 cursor-pointer transition-all shadow-sm active:scale-[0.99] select-none ${
        despacho.estado_actual === 'INCIDENCIA'
          ? 'border-red-400 bg-red-50/30'
          : isUrgent && diffMinutes < 30 && despacho.estado_actual !== 'DESPACHADO'
          ? 'border-[#E11D24] ring-2 ring-red-300/60'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* FILA 1: ID de orden (#ORD-XXXX / Factura) en negrita + Badge de estado/SLA */}
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
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#E11D24] text-white">
              URGENTE
            </span>
          )}
          {cutOffElement}
        </div>
      </div>

      {/* FILA 2: Nombre del cliente y total de bultos/ítems */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 truncate flex-1 min-w-0">
          {despacho.cliente_nombre}
        </h3>
        <span className="text-sm font-semibold font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
          {totalPiezas} bultos • {despacho.peso_total_kg} kg
        </span>
      </div>

      {/* FILA 3: Bahía asignada y transportadora */}
      <div className="flex items-center justify-between gap-2 pt-1 text-sm font-medium">
        <div className="flex items-center gap-1.5 text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl">
          <Warehouse className="h-4 w-4 text-purple-700 shrink-0" />
          <span className="font-bold">{despacho.bahia_asignada}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
          <Truck className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="truncate">{despacho.transportadora}</span>
        </div>
      </div>

      {/* FILA ADICIONAL: ALERTA SI ESTÁ EN INCIDENCIA */}
      {despacho.estado_actual === 'INCIDENCIA' && despacho.incidencia_activa && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#E11D24]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{despacho.incidencia_activa.tipo} (En Retención)</span>
          </div>
          <p className="text-xs text-red-700 font-medium">
            "{despacho.incidencia_activa.descripcion}"
          </p>
        </div>
      )}

      {/* BOTONES DE ACCIÓN (TOUCH TARGET MÍNIMO h-11 / 44px) */}
      <div 
        className="pt-2 border-t border-slate-100 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {despacho.estado_actual === 'INCIDENCIA' ? (
          <button
            onClick={() => setIncidentModalTarget(despacho)}
            className="w-full h-11 flex items-center justify-center gap-2 bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Resolver Incidencia</span>
          </button>
        ) : (
          <>
            {/* Botón rápido para reportar problema (touch target de 44x44px: h-11 w-11) */}
            <button
              onClick={() => setIncidentModalTarget(despacho)}
              className="h-11 w-11 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-[#E11D24] text-slate-600 rounded-xl text-sm font-bold transition-all border border-slate-200 active:scale-95 shrink-0"
              title="Reportar novedad o discrepancia"
              aria-label="Reportar novedad"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>

            {/* Botón de avance primario (h-11 / 44px) */}
            {despacho.estado_actual !== 'DESPACHADO' && (
              <button
                onClick={() => advanceStage(despacho.id)}
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-red-500/20 active:scale-95 group"
              >
                <span>{NEXT_ACTIONS[despacho.estado_actual]}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
