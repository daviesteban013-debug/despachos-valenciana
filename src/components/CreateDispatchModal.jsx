import React, { useState, useRef, useEffect } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, 
  FileText, 
  User, 
  MapPin, 
  DollarSign, 
  Sun, 
  Moon, 
  Truck, 
  Warehouse, 
  Package, 
  MessageSquare,
  Plus,
  Save,
  ArrowRight
} from 'lucide-react';

const CUADRILLAS = [
  { id: 'LEO-JULIAN', nombre: 'LEO - JULIAN', placa: 'WRO-482' },
  { id: 'ANDERSON-JHOAN', nombre: 'ANDERSON - JHOAN', placa: 'STZ-910' },
  { id: 'JEFFERSON-MAURICIO', nombre: 'JEFFERSON - MAURICIO', placa: 'ENV-301' },
  { id: 'JESUS-ALEJANDRO', nombre: 'JESUS - ALEJANDRO', placa: 'MC-441' }
];

const INITIAL_FORM = {
  numero_factura: '',
  cliente_nombre: '',
  direccion_entrega: '',
  valor_factura: '',
  jornada: new Date().getHours() < 12 ? 'AM' : 'PM',
  vehiculo_cuadrilla: 'LEO-JULIAN',
  bodega_id: '01',
  bultos: '1',
  observaciones: ''
};

export default function CreateDispatchModal({ isOpen, onClose }) {
  const { crearNuevoDespacho, bodegas, showToast } = useWms();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const firstInputRef = useRef(null);

  // Focus en el primer campo al abrir
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current.focus(), 150);
    }
    if (isOpen) {
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Máscara visual para pesos colombianos
  const formatCOP = (value) => {
    const num = String(value).replace(/[^\d]/g, '');
    if (!num) return '';
    return Number(num).toLocaleString('es-CO');
  };

  const handleValorChange = (rawValue) => {
    const clean = rawValue.replace(/[^\d]/g, '');
    handleChange('valor_factura', clean);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.numero_factura.trim()) newErrors.numero_factura = 'Factura requerida';
    if (!form.cliente_nombre.trim()) newErrors.cliente_nombre = 'Cliente requerido';
    if (!form.direccion_entrega.trim()) newErrors.direccion_entrega = 'Dirección requerida';
    if (!form.valor_factura || Number(form.valor_factura) <= 0) newErrors.valor_factura = 'Valor inválido';
    if (!form.bultos || Number(form.bultos) < 1) newErrors.bultos = 'Mínimo 1 bulto';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (keepOpen = false) => {
    if (!validate()) return;

    const cuadrilla = CUADRILLAS.find(c => c.id === form.vehiculo_cuadrilla);

    const resultado = crearNuevoDespacho({
      numero_factura: form.numero_factura,
      cliente_nombre: form.cliente_nombre,
      direccion_entrega: form.direccion_entrega,
      valor_factura: form.valor_factura,
      jornada: form.jornada,
      vehiculo_cuadrilla: cuadrilla?.nombre || form.vehiculo_cuadrilla,
      vehiculo_placa: cuadrilla?.placa || 'WRO-482',
      bodega_id: form.bodega_id,
      bultos: form.bultos,
      observaciones: form.observaciones
    });

    if (keepOpen) {
      // "Guardar y Crear Otro": limpia solo factura y valor, conserva cliente/dirección/cuadrilla
      setForm(prev => ({
        ...prev,
        numero_factura: '',
        valor_factura: '',
        bultos: '1',
        observaciones: ''
      }));
      setErrors({});
      showToast(`Despacho ${resultado.codigo_orden} creado. Puede ingresar otra factura.`, 'success');
      if (firstInputRef.current) firstInputRef.current.focus();
    } else {
      // Cerrar modal y resetear todo
      setForm({ ...INITIAL_FORM });
      setErrors({});
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const cuadrillaActual = CUADRILLAS.find(c => c.id === form.vehiculo_cuadrilla);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center animate-fadeIn"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* PULL HANDLE (Mobile) */}
        <div className="pt-2 pb-1 bg-[#E11D24] md:hidden cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 bg-white/40 rounded-full mx-auto" />
        </div>

        {/* ENCABEZADO */}
        <div className="bg-[#E11D24] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-xl">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Nuevo Despacho</h2>
              <p className="text-xs text-red-200 font-medium">Registro rápido de pedido a domicilio</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-red-800/60 hover:bg-red-900 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* FORMULARIO (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Factura */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Factura / Remisión *
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={form.numero_factura}
              onChange={(e) => handleChange('numero_factura', e.target.value.toUpperCase())}
              placeholder="Ej: 1M-54022, FE-80310"
              className={`w-full h-11 px-3 rounded-xl border text-sm font-bold font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                errors.numero_factura ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.numero_factura && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.numero_factura}</p>}
          </div>

          {/* Cliente */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Cliente *
            </label>
            <input
              type="text"
              value={form.cliente_nombre}
              onChange={(e) => handleChange('cliente_nombre', e.target.value)}
              placeholder="Ej: Ferretería Santa Ana"
              className={`w-full h-11 px-3 rounded-xl border text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                errors.cliente_nombre ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.cliente_nombre && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.cliente_nombre}</p>}
          </div>

          {/* Dirección */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Dirección de Entrega *
            </label>
            <input
              type="text"
              value={form.direccion_entrega}
              onChange={(e) => handleChange('direccion_entrega', e.target.value)}
              placeholder="Ej: Calle 10 #5-22 Barrio Centro, Cúcuta"
              className={`w-full h-11 px-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                errors.direccion_entrega ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.direccion_entrega && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.direccion_entrega}</p>}
          </div>

          {/* Valor + Jornada (Fila compacta) */}
          <div className="grid grid-cols-5 gap-2">
            {/* Valor Factura (3 cols) */}
            <div className="col-span-3">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                Valor Factura *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCOP(form.valor_factura)}
                  onChange={(e) => handleValorChange(e.target.value)}
                  placeholder="0"
                  className={`w-full h-11 pl-7 pr-14 rounded-xl border text-sm font-bold font-mono text-right bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                    errors.valor_factura ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">COP</span>
              </div>
              {errors.valor_factura && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.valor_factura}</p>}
            </div>

            {/* Jornada AM/PM (2 cols) */}
            <div className="col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Jornada
              </label>
              <div className="flex h-11 rounded-xl border border-slate-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleChange('jornada', 'AM')}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold transition-all ${
                    form.jornada === 'AM'
                      ? 'bg-amber-500 text-white shadow-inner'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('jornada', 'PM')}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold transition-all ${
                    form.jornada === 'PM'
                      ? 'bg-indigo-600 text-white shadow-inner'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Cuadrilla / Vehículo */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              Cuadrilla / Vehículo
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CUADRILLAS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleChange('vehiculo_cuadrilla', c.id)}
                  className={`h-11 px-2.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-between gap-1 ${
                    form.vehiculo_cuadrilla === c.id
                      ? 'bg-[#E11D24] text-white border-[#E11D24] shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span className="truncate">{c.nombre}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    form.vehiculo_cuadrilla === c.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {c.placa}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bodega + Bultos (Fila compacta) */}
          <div className="grid grid-cols-5 gap-2">
            {/* Bodega Origen (3 cols) */}
            <div className="col-span-3">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                <Warehouse className="h-3.5 w-3.5 text-slate-400" />
                Bodega Origen
              </label>
              <select
                value={form.bodega_id}
                onChange={(e) => handleChange('bodega_id', e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all"
              >
                {bodegas.map((b) => (
                  <option key={b.id} value={b.codigo}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Bultos (2 cols) */}
            <div className="col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                <Package className="h-3.5 w-3.5 text-slate-400" />
                Bultos *
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={form.bultos}
                onChange={(e) => handleChange('bultos', e.target.value)}
                className={`w-full h-11 px-3 rounded-xl border text-sm font-bold font-mono text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                  errors.bultos ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
                }`}
              />
              {errors.bultos && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.bultos}</p>}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
              Observaciones (opcional)
            </label>
            <input
              type="text"
              value={form.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Nota libre para la cuadrilla..."
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all"
            />
          </div>

          {/* Preview de la Cuadrilla seleccionada */}
          {cuadrillaActual && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-slate-600">
              <Truck className="h-4 w-4 text-[#E11D24] shrink-0" />
              <span>
                Hoja Excel: <strong className="text-slate-900">{cuadrillaActual.placa}</strong> — Cuadrilla: <strong className="text-slate-900">{cuadrillaActual.nombre}</strong>
              </span>
            </div>
          )}

        </div>

        {/* PIE DE MODAL: ACCIONES */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center gap-2">
            {/* Cancelar */}
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl border border-slate-300 bg-white text-slate-600 text-xs font-bold hover:bg-slate-100 transition-all active:scale-95 shrink-0"
            >
              Cancelar
            </button>

            {/* Guardar y Crear Otro */}
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#E11D24] text-[#E11D24] bg-white hover:bg-red-50 text-xs font-bold transition-all active:scale-95"
            >
              <Save className="h-4 w-4" />
              <span>Guardar + Otro</span>
            </button>

            {/* Crear Despacho (Principal) */}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#E11D24] hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <ArrowRight className="h-4 w-4" />
              <span>Crear Despacho</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
