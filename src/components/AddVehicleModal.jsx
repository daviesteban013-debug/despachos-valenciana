import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import {
  Truck,
  FileSpreadsheet,
  X,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  User,
  Hash
} from 'lucide-react';

export default function AddVehicleModal({ isOpen, onClose, onVehicleAdded }) {
  const { agregarNuevoVehiculo, flotaVehiculos, showToast } = useWms();

  const [placa, setPlaca] = useState('');
  const [conductor, setConductor] = useState('');
  const [modelo, setModelo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const placaNormalizada = placa.trim().toUpperCase();
  const conductorNormalizado = conductor.trim().toUpperCase();
  const nombrePreview = conductorNormalizado
    ? `${placaNormalizada} ${conductorNormalizado}`
    : placaNormalizada || '---';

  const yaExiste = flotaVehiculos.some(
    v => v.trim().toUpperCase() === nombrePreview && nombrePreview !== '---'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!placaNormalizada) {
      setError('La placa del vehículo es obligatoria.');
      return;
    }

    if (placaNormalizada.length < 3) {
      setError('La placa debe tener al menos 3 caracteres.');
      return;
    }

    if (yaExiste) {
      setError(`El vehículo [${nombrePreview}] ya está registrado en la flota.`);
      return;
    }

    if (nombrePreview.length > 31) {
      setError('El identificador final no puede superar 31 caracteres (límite oficial de hojas de Excel).');
      return;
    }

    setCargando(true);
    try {
      const res = await agregarNuevoVehiculo({
        placa: placaNormalizada,
        conductor: conductorNormalizado,
        modelo: modelo.trim()
      });

      if (res && res.success) {
        if (onVehicleAdded) {
          onVehicleAdded(res.vehiculo || nombrePreview);
        }
        // Limpiar formulario y cerrar
        setPlaca('');
        setConductor('');
        setModelo('');
        onClose();
      } else {
        setError(res?.error || 'No se pudo registrar el vehículo.');
      }
    } catch (err) {
      setError(err.message || 'Error inesperado al registrar el vehículo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Encabezado con gradiente premium */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/90 text-white rounded-xl shadow-lg ring-4 ring-red-600/20">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Agregar Vehículo a la Flota
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  <FileSpreadsheet className="h-3 w-3" />
                  Excel Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Crea el vehículo en el sistema y genera su pestaña oficial en la plantilla Excel.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Placa */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              <Hash className="h-3.5 w-3.5 text-red-600" />
              Placa del Vehículo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                required
                maxLength={12}
                disabled={cargando}
                placeholder="Ej: ABC-123 o TJP-653"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.replace(/[\\/?*[\]:]/g, '').toUpperCase())}
                className="w-full h-11 pl-3 pr-10 rounded-xl border border-slate-300 text-base font-mono font-bold tracking-wider text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                CO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Letras y números de la matrícula del vehículo.
            </p>
          </div>

          {/* Campo Conductor / Detalle */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              Conductor o Identificador (Opcional)
            </label>
            <input
              type="text"
              maxLength={20}
              disabled={cargando}
              placeholder="Ej: CARLOS, JEFERSON, GRIS, MOTO 1"
              value={conductor}
              onChange={(e) => setConductor(e.target.value.replace(/[\\/?*[\]:]/g, '').toUpperCase())}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Si se especifica, se compondrá como <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">PLACA CONDUCTOR</code> (ej. WDO-069 ANDERSON).
            </p>
          </div>

          {/* Campo Modelo / Tipo */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              <Truck className="h-3.5 w-3.5 text-slate-500" />
              Tipo de Vehículo / Modelo (Opcional)
            </label>
            <input
              type="text"
              disabled={cargando}
              placeholder="Ej: Camión 3.5 Toneladas, Furgón NHR, Motocarro"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Card de Previsualización en Vivo */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Vista previa del identificador y hoja Excel:
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                Plantilla Oficial
              </span>
            </div>
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
              <span className="font-mono font-bold text-slate-900 text-sm tracking-wide">
                {nombrePreview}
              </span>
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                Hoja: [{nombrePreview}]
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              Al guardar, se creará de inmediato la hoja <strong className="text-slate-700">"{nombrePreview}"</strong> con el membrete de calidad institucional de La Valenciana y sus columnas formateadas para registrar entregas.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || !placaNormalizada || yaExiste}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-bold shadow-md shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {cargando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creando hoja en Excel...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Agregar y Crear en Excel</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
