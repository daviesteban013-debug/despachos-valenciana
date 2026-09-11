import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  MapPin, 
  Warehouse, 
  Weight, 
  CheckCircle,
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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-red-600 text-white animate-pulse-fast shadow-sm">
        <AlertTriangle className="h-4 w-4" />
        ¡SLA VENCIDO ({Math.abs(diffMinutes)}m)!
      </span>
    );
  } else if (diffMinutes < 30) {
    cutOffElement = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-red-100 text-[#E11D24] border border-red-300 animate-pulse-fast">
        <Clock className="h-4 w-4 text-[#E11D24]" />
        Corte en {diffMinutes}m
      </span>
    );
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    cutOffElement = (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
      </span>
    );
  }

  const totalPiezas = despacho.items?.reduce((acc, it) => acc + it.cantidad_solicitada, 0) || 0;

  // Prioridad Visual
  const isUrgent = despacho.prioridad === 1;

  // Botones de acción rápida con texto claro
  const NEXT_ACTIONS = {
    COLA: 'Iniciar Picking ➔',
    PICKING: 'Pasar a Mesa Packing ➔',
    PACKING: 'Confirmar Listo en Bahía ➔',
    LISTO: 'Completar Despacho ➔'
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
      {/* 1. CABECERA: CÓDIGO DE ORDEN Y BADGE DE PRIORIDAD / SLA */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {despacho.codigo_factura_erp || despacho.codigo_orden}
          </span>
          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {despacho.codigo_orden}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isUrgent && (
            <span className="px-2 py-0.5 rounded-md text-xs font-black bg-[#E11D24] text-white">
              URGENTE
            </span>
          )}
          {cutOffElement}
        </div>
      </div>

      {/* 2. NOMBRE DEL CLIENTE (LEGIBLE A 1.5 METROS) */}
      <div>
        <h3 className="text-base font-black text-slate-900 leading-snug">
          {despacho.cliente_nombre}
        </h3>
        <p className="text-sm font-medium text-slate-600 flex items-center gap-1 mt-0.5">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{despacho.zona_entrega || 'Zona Centro'}</span>
          <span>•</span>
          <span className="font-bold text-slate-700">{despacho.transportadora}</span>
        </p>
      </div>

      {/* 3. DATOS DE BODEGA: BAHÍA ASIGNADA, PESO Y BULTOS */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-sm font-semibold">
        <div className="flex items-center gap-1.5 text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl">
          <Warehouse className="h-4 w-4 text-purple-700 shrink-0" />
          <span className="font-bold">{despacho.bahia_asignada}</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-slate-700">
          <span className="flex items-center gap-1">
            <Weight className="h-4 w-4 text-slate-400" />
            {despacho.peso_total_kg} kg
          </span>
          <span>•</span>
          <span>{totalPiezas} piezas</span>
        </div>
      </div>

      {/* 4. ALERTA SI ESTÁ EN INCIDENCIA */}
      {despacho.estado_actual === 'INCIDENCIA' && despacho.incidencia_activa && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-900 space-y-1">
          <div className="flex items-center gap-1.5 font-black text-[#E11D24]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{despacho.incidencia_activa.tipo} (En Retención)</span>
          </div>
          <p className="text-xs text-red-700 font-medium">
            "{despacho.incidencia_activa.descripcion}"
          </p>
        </div>
      )}

      {/* 5. BOTONES DE ACCIÓN DIRECTA (TOUCH TARGET MÍNIMO 44px DE ALTO) */}
      <div 
        className="pt-2 border-t border-slate-100 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {despacho.estado_actual === 'INCIDENCIA' ? (
          <button
            onClick={() => setIncidentModalTarget(despacho)}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-sm font-black transition-all shadow-sm active:scale-95"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Resolver Incidencia</span>
          </button>
        ) : (
          <>
            {/* Botón rápido para reportar problema (touch target de 44x44px) */}
            <button
              onClick={() => setIncidentModalTarget(despacho)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-[#E11D24] text-slate-600 rounded-xl text-sm font-bold transition-all border border-slate-200 active:scale-95 shrink-0"
              title="Reportar novedad o discrepancia"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>

            {/* Botón de avance primario (min 44px de alto) */}
            {despacho.estado_actual !== 'DESPACHADO' && (
              <button
                onClick={() => advanceStage(despacho.id)}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-red-500/20 active:scale-95 group"
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
