import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  PackageX, 
  Scale, 
  FileWarning 
} from 'lucide-react';

const INCIDENT_TYPES = [
  { id: 'DIVERGENCIA_PESO', label: 'Divergencia de Peso en Báscula (> ±3%)', icon: Scale, desc: 'Diferencia detectada entre báscula y peso teórico' },
  { id: 'FALTANTE', label: 'Faltante de Inventario / Stock en Rack', icon: PackageX, desc: 'Unidades físicas inferiores a las facturadas' },
  { id: 'AVERIA', label: 'Avería / Bulto Roto o Dañado', icon: AlertTriangle, desc: 'Empaque roto o producto con daño' },
  { id: 'ERROR_GUIA', label: 'Error en Guía / Rótulo', icon: FileWarning, desc: 'Rótulo ilegible o dirección errónea' }
];

export default function IncidentModal() {
  const { incidentModalTarget, setIncidentModalTarget, reportIncident, resolveIncident } = useWms();

  if (!incidentModalTarget) return null;

  const isResolving = incidentModalTarget.estado_actual === 'INCIDENCIA';

  const [selectedType, setSelectedType] = useState('DIVERGENCIA_PESO');
  const [description, setDescription] = useState(
    isResolving ? 'Se verificó físicamente el producto y se regularizó la discrepancia con el supervisor de bodega.' : ''
  );
  const [destinationStage, setDestinationStage] = useState('PACKING');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    if (isResolving) {
      resolveIncident(incidentModalTarget.id, description, destinationStage);
    } else {
      reportIncident(incidentModalTarget.id, selectedType, description);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 animate-fadeIn"
      onClick={() => setIncidentModalTarget(null)}
    >
      <div 
        className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull handle en móvil */}
        <div className="pt-2 pb-1 bg-white md:hidden cursor-pointer" onClick={() => setIncidentModalTarget(null)}>
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
        </div>

        {/* Encabezado */}
        <div className={`p-4 flex items-center justify-between text-white ${
          isResolving ? 'bg-emerald-600' : 'bg-[#E11D24]'
        }`}>
          <div className="flex items-center gap-2.5">
            {isResolving ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wide">
                {isResolving ? 'Resolver Novedad & Liberar' : 'Reportar Novedad en Muelle'}
              </h3>
              <p className="text-xs opacity-90 font-medium">
                Orden: <strong>{incidentModalTarget.codigo_factura_erp || incidentModalTarget.codigo_orden}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIncidentModalTarget(null)}
            className="p-1 rounded-lg hover:bg-black/20 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-sm">
          
          {isResolving && incidentModalTarget.incidencia_activa && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-1">
              <span className="text-xs font-black uppercase text-[#E11D24]">Causa de Retención:</span>
              <p className="text-sm text-red-900 font-bold">
                [{incidentModalTarget.incidencia_activa.tipo}] {incidentModalTarget.incidencia_activa.descripcion}
              </p>
            </div>
          )}

          {/* Selección de Tipo */}
          {!isResolving && (
            <div className="space-y-2">
              <label className="font-black uppercase tracking-wide text-slate-700 block text-xs">
                Tipo de Novedad Operativa:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INCIDENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedType === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setSelectedType(t.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#E11D24] bg-red-50 text-[#E11D24] ring-1 ring-red-300 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{t.label}</span>
                      </div>
                      <p className="text-xs opacity-75 mt-1">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Destino tras Resolver */}
          {isResolving && (
            <div className="space-y-1.5">
              <label className="font-black uppercase tracking-wide text-slate-700 block text-xs">
                Reincorporar orden a la fase:
              </label>
              <select
                value={destinationStage}
                onChange={(e) => setDestinationStage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="PACKING">En Packing (Reauditar y aforar báscula)</option>
                <option value="PICKING">En Picking (Completar sustituto en rack)</option>
                <option value="LISTO">Listo en Bahía (Liberación directa a camión)</option>
              </select>
            </div>
          )}

          {/* Justificación */}
          <div className="space-y-1.5">
            <label className="font-black uppercase tracking-wide text-slate-700 block text-xs">
              {isResolving ? 'Solución Aplicada en Bodega:' : 'Descripción del Problema o Divergencia:'}
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isResolving ? 'Explica el ajuste realizado...' : 'Indica el SKU, cantidad o motivo de la retención...'}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D24] font-sans"
            />
          </div>

          {/* Botones táctiles grandes (min 44px) */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIncidentModalTarget(null)}
              className="min-h-[44px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-xs sm:text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`min-h-[44px] px-5 rounded-xl text-white font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-xs sm:text-sm ${
                isResolving 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-[#E11D24] hover:bg-red-700'
              }`}
            >
              {isResolving ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Liberar y Desbloquear Orden</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>Confirmar Retención en Muelle</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
