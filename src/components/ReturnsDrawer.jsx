import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, 
  Undo2, 
  RotateCcw, 
  Trash2, 
  CheckCircle 
} from 'lucide-react';

export default function ReturnsDrawer() {
  const { 
    devoluciones, 
    returnsDrawerOpen, 
    setReturnsDrawerOpen, 
    procesarDevolucion 
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
    procesarDevolucion(returnId, action, notes);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center animate-fadeIn"
      onClick={() => setReturnsDrawerOpen(false)}
    >
      <div 
        className="w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl max-h-[90vh] h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull handle para cerrar con el pulgar */}
        <div className="pt-2 pb-1 bg-white md:hidden cursor-pointer" onClick={() => setReturnsDrawerOpen(false)}>
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
        </div>

        {/* Encabezado */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
              <Undo2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                Logística Inversa & Devoluciones
              </h2>
              <p className="text-xs text-slate-500">Gestión de productos devueltos a bodega</p>
            </div>
          </div>

          <button
            onClick={() => setReturnsDrawerOpen(false)}
            className="h-11 w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 transition-colors active:scale-95"
            aria-label="Cerrar devoluciones"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 overflow-x-auto scrollbar-none text-xs">
          {['ALL', 'SOLICITADA', 'RECIBIDA', 'INSPECCIONADA', 'REINGRESADO', 'DADO_DE_BAJA'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all shrink-0 ${
                filterStatus === st
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Todas' : st}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm font-bold">
              Sin devoluciones en esta categoría
            </div>
          ) : (
            filtered.map((ret) => {
              const isResolved = ret.estado === 'REINGRESADO' || ret.estado === 'DADO_DE_BAJA';

              return (
                <div 
                  key={ret.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {ret.codigo_devolucion}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {ret.despacho_codigo}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-1">
                        {ret.cliente_nombre}
                      </h4>
                    </div>

                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                      {ret.estado}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-slate-200 space-y-1 text-xs">
                    <p className="font-bold text-[#E11D24]">Motivo: {ret.motivo}</p>
                    <p className="text-slate-700">Ítems: {ret.items_afectados}</p>
                    <p className="text-slate-500 italic">"{ret.observacion}"</p>
                  </div>

                  {!isResolved ? (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleAction(ret.id, 'REINGRESO_INVENTARIO')}
                        className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Reingresar</span>
                      </button>

                      <button
                        onClick={() => handleAction(ret.id, 'BAJA_MERMA')}
                        className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 rounded-xl font-bold text-xs transition-all active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Dar de Baja</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs pt-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>Resuelto: {ret.accion_destino}</span>
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
