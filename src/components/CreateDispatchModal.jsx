import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, FileText, User, MapPin, DollarSign, Sun, Moon,
  Truck, Warehouse, Package, MessageSquare, Plus, Save,
  Check, Trash2, Loader2, Zap, CheckCircle2
} from 'lucide-react';
import ProductAutocomplete from './ProductAutocomplete';
import { FLOTA_VEHICULOS } from '../data/flota';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  observaciones: ''
};

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function CreateDispatchModal({ isOpen, onClose }) {
  const { crearNuevoDespacho, showToast } = useWms();
  const [form, setForm]                 = useState({ ...INITIAL_FORM });
  const [errors, setErrors]             = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const facturaInputRef = useRef(null);
  const sugerenciasRef  = useRef(null);

  // ── Kardex: estado interno ────────────────────────────────────────────────
  const [kardexSugerencias, setKardexSugerencias]     = useState([]);
  const [kardexCargando, setKardexCargando]           = useState(false);
  const [kardexCargada, setKardexCargada]             = useState(false); // ¿factura ya cargada?
  const [mostrarSugerencias, setMostrarSugerencias]   = useState(false);

  // Debounce sobre el número de factura que escribe el operador
  const debouncedFactura = useDebounce(form.numero_factura, 350);

  // ── Cargar factura completa desde el kardex ───────────────────────────────
  // Definido ANTES del early return (Rules of Hooks)
  const cargarFacturaKardex = useCallback(async (numFactura) => {
    if (!numFactura?.trim()) return;
    setKardexCargando(true);
    setMostrarSugerencias(false);
    setKardexSugerencias([]);

    try {
      const res  = await fetch(`${API_URL}/api/kardex/factura/${encodeURIComponent(numFactura.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        // Factura no en el kardex → el operador ingresa todo manualmente (flujo normal)
        setKardexCargada(false);
        return;
      }

      // ✅ Auto-llenar campos con los datos del kardex
      setForm(prev => ({
        ...prev,
        numero_factura: data.num_factura,
        cliente_nombre: data.nit_cliente || '',
        valor_factura:  Math.round(data.valor_total)
      }));

      // Limpiar errores de validación previos para los campos auto-llenados
      setErrors(prev => ({
        ...prev,
        numero_factura: null,
        cliente_nombre: null,
        valor_factura: null
      }));

      // Convertir ítems del kardex al formato del modal
      const itemsKardex = data.items.map(item => ({
        codigo:          item.codigo_producto,
        descripcion:     item.descripcion || item.codigo_producto,
        und_base:        'UND',
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        _kardex_valor:   item.valor_total,
        _kardex_bodega:  item.bodega
      }));

      setSelectedItems(itemsKardex);
      setKardexCargada(true);
      showToast(
        `⚡ ${data.total_items} ítems cargados desde Factura ${data.num_factura} · $${Number(data.valor_total).toLocaleString('es-CO')} COP`,
        'success'
      );
    } catch (_) {
      setKardexCargada(false);
    } finally {
      setKardexCargando(false);
    }
  }, [showToast]);

  // ── Autocomplete: buscar sugerencias mientras escribe ─────────────────────
  useEffect(() => {
    if (!debouncedFactura || debouncedFactura.length < 2 || kardexCargada) {
      setKardexSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }
    const buscar = async () => {
      try {
        const res = await fetch(`${API_URL}/api/kardex/buscar?q=${encodeURIComponent(debouncedFactura)}`);
        if (res.ok) {
          const data = await res.json();
          setKardexSugerencias(data);
          setMostrarSugerencias(data.length > 0);
        }
      } catch (_) {
        setKardexSugerencias([]);
        setMostrarSugerencias(false);
      }
    };
    buscar();
  }, [debouncedFactura, kardexCargada]);

  // ── Cerrar sugerencias al hacer clic fuera ────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(e.target) &&
          facturaInputRef.current && !facturaInputRef.current.contains(e.target)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Reset al abrir ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setForm({ ...INITIAL_FORM, vehiculo_placa: FLOTA_VEHICULOS[0] });
      setErrors({});
      setSelectedItems([]);
      setKardexSugerencias([]);
      setKardexCargada(false);
      setMostrarSugerencias(false);
      setTimeout(() => { facturaInputRef.current?.focus(); }, 150);
    }
  }, [isOpen]);

  // ── Early return DESPUÉS de todos los hooks ───────────────────────────────
  if (!isOpen) return null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'numero_factura') {
      // Si el operador edita la factura a mano, resetea el estado de kardex
      setKardexCargada(false);
      setSelectedItems([]);
    }
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

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
    const errs = {};
    if (!form.numero_factura.trim())  errs.numero_factura  = 'Factura / Remisión requerida';
    if (!form.cliente_nombre.trim())  errs.cliente_nombre  = 'Nombre del cliente requerido';
    if (!form.direccion_entrega.trim()) errs.direccion_entrega = 'Dirección de entrega requerida';
    if (!form.valor_factura || Number(form.valor_factura) <= 0) errs.valor_factura = 'Ingrese un valor válido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const guardar = async (crearOtro) => {
    if (!validate()) return;
    const payload = {
      numero_factura:   form.numero_factura.trim().toUpperCase(),
      cliente_nombre:   form.cliente_nombre.trim(),
      direccion_entrega: form.direccion_entrega.trim(),
      valor_factura:    Number(form.valor_factura) || 0,
      jornada:          form.jornada,
      vehiculo_placa:   form.vehiculo_placa,
      bodega_id:        form.bodega_id,
      observaciones:    form.observaciones?.trim() || '',
      items:            selectedItems
    };
    try {
      const ordenCreada = await crearNuevoDespacho(payload);
      if (crearOtro) {
        setForm(prev => ({ ...prev, numero_factura: '', valor_factura: '', observaciones: '' }));
        setSelectedItems([]);
        setErrors({});
        setKardexCargada(false);
        showToast(`Despacho ${ordenCreada.codigo_factura_erp || ordenCreada.codigo_orden} creado. Siguiente factura...`, 'success');
        setTimeout(() => facturaInputRef.current?.focus(), 100);
      } else {
        setForm({ ...INITIAL_FORM, vehiculo_placa: FLOTA_VEHICULOS[0] });
        setSelectedItems([]);
        setErrors({});
        setKardexCargada(false);
        onClose();
      }
    } catch (error) {
      console.warn('Creación abortada:', error.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    else if (
      e.key === 'Enter' &&
      e.target.tagName !== 'BUTTON' &&
      e.target.tagName !== 'TEXTAREA' &&
      e.target !== facturaInputRef.current
    ) {
      e.preventDefault();
      guardar(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center animate-fadeIn"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp"
        onClick={e => e.stopPropagation()}
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
              <p className="text-xs text-red-200 font-medium">
                {kardexCargada
                  ? '⚡ Datos cargados desde el kardex ERP'
                  : 'Digita la factura para auto-llenar desde el kardex'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-red-800/60 hover:bg-red-900 transition-all text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* FORMULARIO */}
        <form
          onSubmit={e => { e.preventDefault(); guardar(false); }}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >

          {/* ── 1. FACTURA — Campo principal / motor del kardex ── */}
          <div className="relative">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Factura *
              {/* Indicador de carga / cargado */}
              {kardexCargando && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Buscando en kardex...
                </span>
              )}
              {kardexCargada && !kardexCargando && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                  <CheckCircle2 className="h-3 w-3" />
                  Kardex ✓
                </span>
              )}
            </label>

            <div className="relative">
              <input
                ref={facturaInputRef}
                autoFocus
                type="text"
                value={form.numero_factura}
                onChange={e => handleChange('numero_factura', e.target.value.toUpperCase())}
                onFocus={() => kardexSugerencias.length > 0 && setMostrarSugerencias(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && form.numero_factura.trim()) {
                    e.preventDefault();
                    cargarFacturaKardex(form.numero_factura.trim());
                  }
                }}
                placeholder="Ej: 70058 — el kardex auto-llena el despacho"
                className={`w-full h-11 px-3 pr-10 rounded-xl border text-sm font-bold font-mono bg-white focus:outline-none focus:ring-2 transition-all uppercase ${
                  errors.numero_factura
                    ? 'border-red-400 ring-1 ring-red-400'
                    : kardexCargada
                    ? 'border-emerald-400 ring-1 ring-emerald-300 bg-emerald-50'
                    : 'border-slate-300 focus:ring-[#E11D24]'
                }`}
              />
              {/* Ícono de rayo cuando está cargado */}
              {kardexCargada && (
                <Zap className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
              )}
            </div>

            {errors.numero_factura && (
              <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.numero_factura}</p>
            )}

            {/* ── Dropdown de sugerencias del kardex ── */}
            {mostrarSugerencias && kardexSugerencias.length > 0 && (
              <div
                ref={sugerenciasRef}
                className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-amber-200 shadow-xl overflow-hidden max-h-52 overflow-y-auto"
              >
                <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                    ⚡ Facturas en el kardex — selecciona para auto-llenar
                  </p>
                </div>
                {kardexSugerencias.map(sug => (
                  <button
                    key={sug.num_factura}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault(); // evita blur del input
                      cargarFacturaKardex(sug.num_factura);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 transition-colors border-b border-slate-100 last:border-0 text-left"
                  >
                    <div>
                      <span className="text-sm font-bold text-slate-800 font-mono">{sug.num_factura}</span>
                      <span className="ml-2 text-[10px] text-slate-400">NIT: {sug.nit_cliente || '—'}</span>
                      <span className="ml-2 text-[10px] text-slate-400">{sug.total_items} ítems</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      ${Number(sug.valor_total).toLocaleString('es-CO')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── 2. CLIENTE ── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Nombre del Cliente *
            </label>
            <input
              type="text"
              value={form.cliente_nombre}
              onChange={e => handleChange('cliente_nombre', e.target.value)}
              placeholder="Ej: FERRETERIA SANTA ANA"
              className={`w-full h-11 px-3 rounded-xl border text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                errors.cliente_nombre ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.cliente_nombre && (
              <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.cliente_nombre}</p>
            )}
          </div>

          {/* ── 3. DIRECCIÓN ── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Dirección de Entrega *
            </label>
            <input
              type="text"
              value={form.direccion_entrega}
              onChange={e => handleChange('direccion_entrega', e.target.value)}
              placeholder="Ej: Av. 5 #10-45 Centro"
              className={`w-full h-11 px-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                errors.direccion_entrega ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.direccion_entrega && (
              <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.direccion_entrega}</p>
            )}
          </div>

          {/* ── 4 + 5. VALOR + JORNADA ── */}
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                Valor Factura *
                {kardexCargada && (
                  <span className="text-[10px] text-emerald-600 font-bold normal-case">auto ⚡</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.valor_factura ? formatCOP(form.valor_factura) : ''}
                  onChange={e => handleValorChange(e.target.value)}
                  placeholder="834.033"
                  className={`w-full h-11 pl-7 pr-12 rounded-xl border text-sm font-bold font-mono text-right bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all ${
                    errors.valor_factura
                      ? 'border-red-400 ring-1 ring-red-400'
                      : kardexCargada
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-300'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">COP</span>
              </div>
              {errors.valor_factura && (
                <p className="text-xs text-red-600 mt-0.5 font-semibold">{errors.valor_factura}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Jornada
              </label>
              <div className="flex h-11 rounded-xl border border-slate-300 overflow-hidden bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => handleChange('jornada', 'AM')}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold rounded-lg transition-all ${
                    form.jornada === 'AM' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />AM
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('jornada', 'PM')}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold rounded-lg transition-all ${
                    form.jornada === 'PM' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />PM
                </button>
              </div>
            </div>
          </div>

          {/* ── 6. VEHÍCULO ── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              Vehículo Asignado
            </label>
            <select
              value={form.vehiculo_placa}
              onChange={e => handleChange('vehiculo_placa', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all"
            >
              {FLOTA_VEHICULOS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* ── 8. OBSERVACIONES ── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
              Observaciones (Opcional)
            </label>
            <textarea
              value={form.observaciones}
              onChange={e => handleChange('observaciones', e.target.value)}
              placeholder="Ej: Llamar antes de entregar..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all min-h-[60px] resize-none"
            />
          </div>

          {/* ── 9. ÍTEMS DEL DESPACHO ── */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              Productos a Despachar
              {kardexCargada && selectedItems.length > 0 && (
                <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  {selectedItems.length} ítems del kardex
                </span>
              )}
            </label>

            {/* Autocomplete manual (siempre disponible para agregar más) */}
            <ProductAutocomplete
              onAddProduct={prod => {
                const exists = selectedItems.find(i => i.codigo === prod.codigo);
                if (exists) {
                  setSelectedItems(prev => prev.map(i =>
                    i.codigo === prod.codigo ? { ...i, cantidad: i.cantidad + 1 } : i
                  ));
                } else {
                  setSelectedItems(prev => [...prev, { ...prod, cantidad: 1 }]);
                }
              }}
            />

            {/* Lista de ítems seleccionados / cargados del kardex */}
            {selectedItems.length > 0 && (
              <div className="mt-3 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                <ul className="divide-y divide-slate-200">
                  {selectedItems.map(item => (
                    <li
                      key={item.codigo}
                      className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.descripcion}</p>
                        <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          {item.codigo} • {item.und_base}
                          {item._kardex_bodega && (
                            <span className="bg-amber-100 text-amber-700 px-1 rounded text-[9px] font-bold">
                              {item._kardex_bodega}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item._kardex_valor && (
                          <span className="text-[10px] font-mono text-emerald-700 font-bold hidden sm:block">
                            ${Number(item._kardex_valor).toLocaleString('es-CO')}
                          </span>
                        )}
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 1;
                            setSelectedItems(prev =>
                              prev.map(i => i.codigo === item.codigo ? { ...i, cantidad: val } : i)
                            );
                          }}
                          className="w-14 h-7 px-1 text-center text-xs font-bold border border-slate-300 rounded focus:ring-1 focus:ring-[#E11D24] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedItems(prev => prev.filter(i => i.codigo !== item.codigo))}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Resumen pie */}
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

        {/* PIE — BOTONES */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all active:scale-95 shrink-0"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => guardar(true)}
            className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#E11D24] text-[#E11D24] bg-white hover:bg-red-50 text-xs font-bold transition-all active:scale-95"
          >
            <Save className="h-4 w-4" />
            Guardar + Otro
          </button>
          <button
            type="button"
            onClick={() => guardar(false)}
            className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#E11D24] hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Check className="h-4 w-4" />
            Guardar Despacho
          </button>
        </div>

      </div>
    </div>
  );
}
