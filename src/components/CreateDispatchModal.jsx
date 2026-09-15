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
  Check
} from 'lucide-react';

import { FLOTA_VEHICULOS } from '../data/flota';

const BODEGAS_SALIDA = [
  { id: '00', nombre: '00 - Patio Materiales Pesados (Atalaya)' },
  { id: '01', nombre: '01 - Principal (Cúcuta Centro)' },
  { id: '02', nombre: '02 - Almacén Central (Zona Franca)' },
  { id: '03', nombre: '03 - Bodega Los Patios' },
  { id: '04', nombre: '04 - Bodega El Zulia' }
];

const INITIAL_FORM = {
  numero_factura: '',
  cliente_nombre: '',
  direccion_entrega: '',
  valor_factura: '',
  jornada: new Date().getHours() < 12 ? 'AM' : 'PM',
  vehiculo_placa: FLOTA_VEHICULOS[0],
  bodega_id: '01',
  total_bultos: 1,
  observaciones: ''
};

export default function CreateDispatchModal({ isOpen, onClose }) {
  const { crearNuevoDespacho, showToast } = useWms();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const facturaInputRef = useRef(null);

  // Auto-enfoque al abrir
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setTimeout(() => {
        if (facturaInputRef.current) {
          facturaInputRef.current.focus();
        }
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Formateador de moneda COP visual ($ 834.033 COP)
  const formatCOP = (val) => {
    const clean = String(val).replace(/[^\d]/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('es-CO');
  };

  const handleValorChange = (raw) => {
    const clean = raw.replace(/[^\d]/g, '');
    handleChange('valor_factura', clean ? Number(clean) : '');
  };

  const validate = () => {
    const newErrors = {};
    if (!form.numero_factura.trim()) newErrors.numero_factura = 'Factura / Remisión requerida';
    if (!form.cliente_nombre.trim()) newErrors.cliente_nombre = 'Nombre del cliente requerido';
    if (!form.direccion_entrega.trim()) newErrors.direccion_entrega = 'Dirección de entrega requerida';
    if (!form.valor_factura || Number(form.valor_factura) <= 0) newErrors.valor_factura = 'Ingrese un valor válido';
    if (!form.total_bultos || Number(form.total_bultos) < 1) newErrors.total_bultos = 'Mínimo 1 bulto';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const guardar = async (crearOtro) => {
    if (!validate()) return;

    const payload = {
      numero_factura: form.numero_factura.trim().toUpperCase(),
      cliente_nombre: form.cliente_nombre.trim(),
      direccion_entrega: form.direccion_entrega.trim(),
      valor_factura: Number(form.valor_factura) || 0,
      jornada: form.jornada,
      vehiculo_placa: form.vehiculo_placa,
      bodega_id: form.bodega_id,
      total_bultos: Number(form.total_bultos) || 1,
      observaciones: form.observaciones?.trim() || ''
    };

    try {
      const ordenCreada = await crearNuevoDespacho(payload);

      if (crearOtro) {
        // Limpia ÚNICAMENTE Factura y Valor, manteniendo Cliente, Dirección y Vehículo
        setForm(prev => ({
          ...prev,
          numero_factura: '',
          valor_factura: '',
          total_bultos: 1,
          observaciones: ''
        }));
        setErrors({});
        showToast(`Despacho ${ordenCreada.numero_factura || ordenCreada.codigo_factura_erp} creado. Listo para la siguiente factura.`, 'success');
        setTimeout(() => {
          if (facturaInputRef.current) facturaInputRef.current.focus();
        }, 100);
      } else {
        setForm({ ...INITIAL_FORM, vehiculo_placa: FLOTA_VEHICULOS[0] });
        setErrors({});
        onClose();
      }
    } catch (error) {
      // El error ya lo muestra WmsContext en su catch, aquí solo evitamos cerrar el modal si hubo error
      console.warn("Creación abortada por error:", error.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      guardar(false);
    }
  };



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
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-xl bg-red-800/60 hover:bg-red-900 transition-all text-white"
            title="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* FORMULARIO (Scrollable) */}
        <form 
          onSubmit={(e) => { e.preventDefault(); guardar(false); }}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >

          {/* 1. Factura (numero_factura): Auto-focus + Auto-mayúsculas */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Factura *
            </label>
            <input
              ref={facturaInputRef}
              autoFocus
              type="text"
              value={form.numero_factura}
              onChange={(e) => handleChange('numero_factura', e.target.value.toUpperCase())}
              placeholder="Ej: 1M-54022, VC-79091"
              className={`w-full h-11 px-3 rounded-xl border text-sm font-bold font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all uppercase ${
                errors.numero_factura ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.numero_factura && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.numero_factura}</p>}
          </div>

          {/* 2. Cliente (cliente_nombre) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Nombre del Cliente *
            </label>
            <input
              type="text"
              value={form.cliente_nombre}
              onChange={(e) => handleChange('cliente_nombre', e.target.value)}
              placeholder="Ej: FERRETERIA SANTA ANA"
              className={`w-full h-11 px-3 rounded-xl border text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                errors.cliente_nombre ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.cliente_nombre && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.cliente_nombre}</p>}
          </div>

          {/* 3. Dirección de Entrega (direccion_entrega) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Dirección de Entrega *
            </label>
            <input
              type="text"
              value={form.direccion_entrega}
              onChange={(e) => handleChange('direccion_entrega', e.target.value)}
              placeholder="Ej: Av. 5 #10-45 Centro"
              className={`w-full h-11 px-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                errors.direccion_entrega ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.direccion_entrega && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.direccion_entrega}</p>}
          </div>

          {/* 4 y 5. Valor Factura + Jornada */}
          <div className="grid grid-cols-5 gap-2">
            {/* 4. Valor Factura (valor_factura) con máscara COP */}
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
                  value={form.valor_factura ? formatCOP(form.valor_factura) : ''}
                  onChange={(e) => handleValorChange(e.target.value)}
                  placeholder="834.033"
                  className={`w-full h-11 pl-7 pr-12 rounded-xl border text-sm font-bold font-mono text-right bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                    errors.valor_factura ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">COP</span>
              </div>
              {errors.valor_factura && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.valor_factura}</p>}
            </div>

            {/* 5. Jornada: Botones segmentados [ AM ] y [ PM ] */}
            <div className="col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Jornada
              </label>
              <div className="flex h-11 rounded-xl border border-slate-300 overflow-hidden bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => handleChange('jornada', 'AM')}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold rounded-lg transition-all ${
                    form.jornada === 'AM'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('jornada', 'PM')}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold rounded-lg transition-all ${
                    form.jornada === 'PM'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* 6. Vehículo (vehiculo_placa): Selector desplegable FLOTA_VEHICULOS */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              Vehículo Asignado
            </label>
            <select
              value={form.vehiculo_placa}
              onChange={(e) => handleChange('vehiculo_placa', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all"
            >
              {FLOTA_VEHICULOS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* 7 y 8. Bodega de Salida + Total Bultos */}
          <div className="grid grid-cols-5 gap-2">
            {/* 7. Bodega de Salida (bodega_id): 5 sedes */}
            <div className="col-span-3">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                <Warehouse className="h-3.5 w-3.5 text-slate-400" />
                Bodega de Salida
              </label>
              <select
                value={form.bodega_id}
                onChange={(e) => handleChange('bodega_id', e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all"
              >
                {BODEGAS_SALIDA.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 8. Total Bultos (total_bultos): numérico entero >= 1 */}
            <div className="col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                <Package className="h-3.5 w-3.5 text-slate-400" />
                Total Bultos *
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={form.total_bultos}
                onChange={(e) => handleChange('total_bultos', Math.max(1, parseInt(e.target.value, 10) || 1))}
                className={`w-full h-11 px-3 rounded-xl border text-sm font-bold font-mono text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                  errors.total_bultos ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
                }`}
              />
              {errors.total_bultos && <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.total_bultos}</p>}
            </div>
          </div>

          {/* 9. Observaciones (observaciones) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
              Observaciones (opcional)
            </label>
            <input
              type="text"
              value={form.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Ej: Llevar a Ferretería El Burro"
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all"
            />
          </div>

          {/* Resumen del Vehículo y Hoja Excel */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#E11D24]" />
              <span>Vehículo: <strong className="text-slate-900">{form.vehiculo_placa}</strong></span>
            </div>
            <span className="font-mono text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
              Hoja Excel: {form.vehiculo_placa}
            </span>
          </div>

        </form>

        {/* PIE DE MODAL: ACCIONES ESTRICTAS */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
          {/* 1. Cancelar */}
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all active:scale-95 shrink-0"
          >
            Cancelar
          </button>

          {/* 2. Guardar y Crear Otro */}
          <button
            type="button"
            onClick={() => guardar(true)}
            className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#E11D24] text-[#E11D24] bg-white hover:bg-red-50 text-xs font-bold transition-all active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>Guardar + Otro</span>
          </button>

          {/* 3. Guardar Despacho (Principal) */}
          <button
            type="button"
            onClick={() => guardar(false)}
            className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#E11D24] hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>Guardar Despacho</span>
          </button>
        </div>

      </div>
    </div>
  );
}
