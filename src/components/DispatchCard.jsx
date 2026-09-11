import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  MapPin, 
  Truck, 
  Warehouse, 
  Weight, 
  UserCheck, 
  Package, 
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

  // Cálculo del corte SLA
  const corteTime = new Date(despacho.horario_corte).getTime();
  const diffMinutes = Math.round((corteTime - currentTime) / 60000);

  let cutOffBadge = null;
  if (despacho.estado_actual === 'DESPACHADO') {
    cutOffBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
        Despachado
      </span>
    );
  } else if (diffMinutes <= 0) {
    cutOffBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-red-600 text-white animate-pulse-fast shadow-sm">
        <AlertTriangle className="h-3.5 w-3.5" />
        ¡SLA VENCIDO ({Math.abs(diffMinutes)}m)!
      </span>
    );
  } else if (diffMinutes < 30) {
    cutOffBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-red-100 text-[#E11D24] border border-red-300 animate-pulse-fast">
        <Clock className="h-3.5 w-3.5" />
        Corte en {diffMinutes}m
      </span>
    );
  } else if (diffMinutes < 120) {
    cutOffBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        Corte en {diffMinutes}m
      </span>
    );
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    cutOffBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <Clock className="h-3.5 w-3.5 text-emerald-600" />
        Corte: {hours}h {mins}m
      </span>
    );
  }

  // Progreso de ítems / auditoría
  const totalSolicitado = despacho.items?.reduce((acc, it) => acc + it.cantidad_solicitada, 0) || 0;
  const totalAuditado = despacho.items?.reduce((acc, it) => acc + (it.cantidad_auditada || 0), 0) || 0;
  const auditPercent = totalSolicitado > 0 ? Math.round((totalAuditado / totalSolicitado) * 100) : 100;

  // Prioridad Visual
  const priorityConfig = {
    1: {
      label: 'URGENTE',
      badgeClass: 'bg-red-600 text-white shadow-sm'
    },
    2: {
      label: 'NORMAL',
      badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200'
    },
    3: {
      label: 'CONSOLIDADO',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200'
    }
  }[despacho.prioridad] || { label: 'NORMAL', badgeClass: 'bg-blue-100 text-blue-800' };

  // Nombre de la siguiente fase para el botón táctil grande
  const NEXT_STAGE_LABELS = {
    COLA: 'Iniciar Picking ➔',
    PICKING: 'Pasar a Mesa Packing ➔',
    PACKING: 'Confirmar Listo en Bahía ➔',
    LISTO: 'Completar Despacho ➔'
  };

  const isCritical = despacho.prioridad === 1 && diffMinutes < 30 && despacho.estado_actual !== 'DESPACHADO';

  return (
    <div
      onClick={() => setSelectedDespachoId(despacho.id)}
      className={`relative bg-white rounded-2xl border p-4 space-y-3 cursor-pointer transition-all duration-150 hover:shadow-lg active:scale-[0.99] select-none ${
        despacho.estado_actual === 'INCIDENCIA'
          ? 'border-red-400 bg-red-50/40 shadow-md shadow-red-100'
          : isCritical
          ? 'border-[#E11D24] ring-2 ring-red-400/40 bg-red-50/20'
          : 'border-slate-200 shadow-sm'
      }`}
    >
      {/* 1. CABECERA: FACTURA ERP Y CLIENTE LEGIBLE A 1.5 METROS */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {despacho.codigo_factura_erp || despacho.codigo_orden}
            </span>
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {despacho.codigo_orden}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-black text-slate-900 mt-1 line-clamp-1">
            {despacho.cliente_nombre}
          </h3>
        </div>

        {/* Badge Prioridad */}
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider shrink-0 ${priorityConfig.badgeClass}`}>
          {priorityConfig.label}
        </span>
      </div>

      {/* 2. ZONA DE ENTREGA Y TEMPORIZADOR SLA */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1 text-xs text-slate-600 truncate">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold truncate">{despacho.zona_entrega || 'Zona Centro'}</span>
        </div>
        <div className="shrink-0">
          {cutOffBadge}
        </div>
      </div>

      {/* 3. DETALLE DE FASE OPERATIVA */}
      {despacho.estado_actual === 'PICKING' && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-900 font-bold flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-purple-600" />
              {despacho.picking_operario || 'Operario asignado'}
            </span>
            <span className="font-mono font-bold text-purple-900">
              {totalAuditado}/{totalSolicitado} und
            </span>
          </div>
          <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-purple-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${auditPercent}%` }}
            />
          </div>
        </div>
      )}

      {despacho.estado_actual === 'PACKING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <span className="text-amber-900 font-bold flex items-center gap-1">
            <Package className="h-4 w-4 text-amber-600" />
            {despacho.packing_mesa || 'Mesa Báscula'}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
            auditPercent === 100 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
              : 'bg-amber-200 text-amber-900'
          }`}>
            {auditPercent === 100 ? 'Auditado 100%' : `Auditoría ${auditPercent}%`}
          </span>
        </div>
      )}

      {despacho.estado_actual === 'LISTO' && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-purple-900 font-black text-sm">
            <Warehouse className="h-4 w-4 text-purple-700" />
            <span>{despacho.bahia_asignada}</span>
          </div>
          <span className="font-mono text-xs font-bold text-purple-800 bg-white px-2 py-0.5 rounded-md border border-purple-200">
            {despacho.numero_guia}
          </span>
        </div>
      )}

      {despacho.estado_actual === 'INCIDENCIA' && despacho.incidencia_activa && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-2.5 text-xs text-red-900 space-y-1">
          <div className="flex items-center justify-between font-black text-[#E11D24]">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {despacho.incidencia_activa.tipo}
            </span>
            <span className="text-[10px] uppercase font-bold bg-red-100 px-1.5 py-0.5 rounded">En Triage</span>
          </div>
          <p className="text-[11px] text-red-700 line-clamp-2">
            "{despacho.incidencia_activa.descripcion}"
          </p>
        </div>
      )}

      {/* 4. METADATA: TRANSPORTADORA Y PESO */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
          {despacho.transportadora}
        </span>
        <div className="flex items-center gap-2 font-mono font-bold text-slate-700 text-xs">
          <span className="flex items-center gap-1">
            <Weight className="h-3.5 w-3.5 text-slate-400" />
            {despacho.peso_total_kg} kg
          </span>
          <span>•</span>
          <span>{totalSolicitado} und</span>
        </div>
      </div>

      {/* 5. BOTÓN TÁCTIL GRANDE (MÍNIMO 48px ALTO) PARA OPERACIÓN CON GUANTES */}
      <div 
        className="pt-2 border-t border-slate-100 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Si está en incidencia -> Botón para Resolver */}
        {despacho.estado_actual === 'INCIDENCIA' ? (
          <button
            onClick={() => setIncidentModalTarget(despacho)}
            className="flex-1 min-h-[48px] flex items-center justify-center gap-2 bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Resolver Incidencia</span>
          </button>
        ) : (
          <>
            {/* Botón rápido de reportar novedad */}
            <button
              onClick={() => setIncidentModalTarget(despacho)}
              className="min-h-[48px] px-3.5 bg-slate-100 hover:bg-red-50 hover:text-[#E11D24] text-slate-500 rounded-xl text-xs font-bold transition-all border border-slate-200"
              title="Reportar novedad o discrepancia"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>

            {/* Botón táctil primario de avance */}
            {despacho.estado_actual !== 'DESPACHADO' && (
              <button
                onClick={() => advanceStage(despacho.id)}
                className="flex-1 min-h-[48px] flex items-center justify-center gap-2 bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md shadow-red-500/20 active:scale-95 group"
              >
                <span>{NEXT_STAGE_LABELS[despacho.estado_actual]}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
}
