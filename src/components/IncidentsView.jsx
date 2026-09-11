import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  AlertOctagon, 
  CheckCircle2, 
  Undo2, 
  Clock
} from 'lucide-react';

export default function IncidentsView() {
  const { despachos, setIncidentModalTarget, setSelectedDespachoId, devoluciones, setReturnsDrawerOpen } = useWms();

  const [activeFilter, setActiveFilter] = useState('ALL');

  const incidencias = despachos.filter((d) => d.estado_actual === 'INCIDENCIA');

  const filteredIncidencias = incidencias.filter((d) => {
    if (activeFilter === 'ALL') return true;
    return d.incidencia_activa?.tipo === activeFilter;
  });

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 space-y-4">
      
      {/* Encabezado */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-[#E11D24] border border-red-200 shrink-0">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Triage de Incidencias & Retención
              </h2>
              <span className="text-xs font-mono font-bold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                {incidencias.length} retenidas
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Despachos bloqueados por faltantes, peso en báscula o rotulado
            </p>
          </div>
        </div>

        {/* Acceso a Devoluciones */}
        <button
          onClick={() => setReturnsDrawerOpen(true)}
          className="min-h-[44px] flex items-center justify-center gap-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shrink-0 active:scale-95"
        >
          <Undo2 className="h-4 w-4 text-amber-600" />
          <span>Logística Inversa ({devoluciones.length})</span>
        </button>
      </div>

      {/* Filtros de Tipo */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['ALL', 'DIVERGENCIA_PESO', 'FALTANTE', 'AVERIA', 'ERROR_GUIA'].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setActiveFilter(tipo)}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl font-bold border transition-all shrink-0 active:scale-95 ${
              activeFilter === tipo
                ? 'bg-[#E11D24] border-[#E11D24] text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tipo === 'ALL' ? 'Todas las Novedades' : tipo.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Lista de Despachos en Incidencia */}
      <div className="space-y-3">
        {filteredIncidencias.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No hay incidencias activas en esta categoría</h3>
            <p className="text-xs text-slate-400">Todas las órdenes se encuentran fluyendo normalmente en el centro de distribución.</p>
          </div>
        ) : (
          filteredIncidencias.map((ord) => {
            const inc = ord.incidencia_activa;

            return (
              <div 
                key={ord.id}
                className="bg-white border-2 border-red-300 rounded-2xl p-4 shadow-sm space-y-3 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-slate-900">
                        {ord.codigo_factura_erp || ord.codigo_orden}
                      </span>
                      <span className="font-bold text-xs bg-red-100 text-[#E11D24] px-2 py-0.5 rounded-md">
                        {inc?.tipo || 'BLOQUEO OPERATIVO'}
                      </span>
                      <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        {ord.bahia_asignada}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mt-1">
                      {ord.cliente_nombre}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Destino: {ord.zona_entrega} • Transportadora: {ord.transportadora}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-[#E11D24] flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Corte: {new Date(ord.horario_corte).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Motivo y Causa del Bloqueo */}
                <div className="bg-red-50/80 rounded-xl p-3 text-xs text-red-900 space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#E11D24]">
                    <span>Causa de Retención en Muelle:</span>
                    <span className="text-xs font-normal text-slate-500">
                      Reportado por: {inc?.reportado_por || 'Auditor'}
                    </span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed">
                    "{inc?.descripcion}"
                  </p>
                </div>

                {/* Botones de acción táctiles grandes */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setSelectedDespachoId(ord.id)}
                    className="min-h-[44px] px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center active:scale-95"
                  >
                    Ver Detalle & Materiales
                  </button>

                  <button
                    onClick={() => setIncidentModalTarget(ord)}
                    className="min-h-[44px] px-5 rounded-xl text-xs font-black text-white bg-[#E11D24] hover:bg-red-700 transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Resolver y Liberar Despacho</span>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
