import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, 
  Undo2, 
  RotateCcw, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  FileText, 
  MapPin, 
  Truck,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function ReturnsDrawer() {
  const { 
    devoluciones, 
    returnsDrawerOpen, 
    setReturnsDrawerOpen, 
    processReturn 
  } = useWms();

  const [filterStatus, setFilterStatus] = useState('ALL');

  if (!returnsDrawerOpen) return null;

  const filtered = devoluciones.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.estado === filterStatus;
  });

  const handleAction = (returnId, action) => {
    const notes = action === 'REINGRESO_INVENTARIO' 
      ? 'Producto verificado sin daños. Reintegrado al rack de origen en bodega.' 
      : 'Producto con rotura irreparable. Dado de baja contable y enviado a contenedor de mermas.';
    processReturn(returnId, action, notes);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-[#0d1424] border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Encabezado */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Undo2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Módulo de Logística Inversa & Devoluciones</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {devoluciones.length} Registros
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Inspección de pedidos devueltos por No Pago, Avería o Dirección Errónea
              </p>
            </div>
          </div>

          <button
            onClick={() => setReturnsDrawerOpen(false)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filtros de Devolución */}
        <div className="flex items-center gap-1.5 p-3 border-b border-slate-800 bg-slate-900/40 overflow-x-auto text-xs">
          {['ALL', 'SOLICITADA', 'RECIBIDA', 'INSPECCIONADA', 'REINGRESADO', 'DADO_DE_BAJA'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition-all shrink-0 ${
                filterStatus === st
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Todas' : st}
            </button>
          ))}
        </div>

        {/* Lista de Devoluciones */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {filtered.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-4 text-center text-slate-500">
              <Undo2 className="h-6 w-6 opacity-40 mb-2" />
              <p className="text-xs font-semibold">No se encontraron devoluciones en esta categoría</p>
            </div>
          ) : (
            filtered.map((ret) => {
              const isResolved = ret.estado === 'REINGRESADO' || ret.estado === 'DADO_DE_BAJA';

              return (
                <div 
                  key={ret.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/50">
                          {ret.codigo_devolucion}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          Orden Origen: <strong className="text-slate-200">{ret.despacho_codigo}</strong>
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 mt-1">
                        {ret.cliente_nombre}
                      </h3>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ret.estado === 'REINGRESADO'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : ret.estado === 'DADO_DE_BAJA'
                        ? 'bg-slate-700/40 text-slate-400 border-slate-600'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {ret.estado}
                    </span>
                  </div>

                  {/* Motivo e Ítems */}
                  <div className="bg-slate-800/50 rounded-lg p-2.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Motivo de Retorno:</span>
                      <span className="font-semibold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                        {ret.motivo}
                      </span>
                    </div>
                    <div className="text-slate-300 pt-1">
                      <span className="text-slate-400">Ítems Devueltos:</span> {ret.items_afectados}
                    </div>
                    <div className="text-slate-400 text-[11px] italic pt-0.5">
                      "{ret.observacion}"
                    </div>
                  </div>

                  {/* Acciones de Operación Inversa */}
                  {!isResolved ? (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <button
                        onClick={() => handleAction(ret.id, 'REINGRESO_INVENTARIO')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reingresar a Inventario</span>
                      </button>

                      <button
                        onClick={() => handleAction(ret.id, 'BAJA_MERMA')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Dar de Baja / Merma</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Inspección finalizada</span>
                      </span>
                      <span>Resolución: <strong className="text-slate-200">{ret.accion_destino}</strong></span>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
