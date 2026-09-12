import React, { useState } from 'react';
import MostradorHeader from '../components/MostradorHeader';
import { useVentaMostrador } from '../store/ventaMostrador';
import { SECCIONES, getSeccionInfo, ESTADOS_META } from '../data/secciones';
import {
  FileText,
  Plus,
  Trash2,
  Stamp,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Boxes,
  User,
  Hash,
  Send,
  Sparkles,
  Info
} from 'lucide-react';

export default function FacturacionPage() {
  const {
    facturas,
    crearFactura,
    confirmarSelloYEntregar
  } = useVentaMostrador();

  // Estados del formulario de nueva factura
  const [numeroFactura, setNumeroFactura] = useState(() => `FE-${Math.floor(80300 + Math.random() * 900)}`);
  const [cliente, setCliente] = useState('');
  const [items, setItems] = useState([
    { nombre: '', cantidad: 1, seccion: 'materiales_construccion' }
  ]);
  const [errorForm, setErrorForm] = useState('');
  const [exitoForm, setExitoForm] = useState('');

  // Filtro de lista de facturas
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Agregar fila de ítem
  const agregarItem = () => {
    setItems((prev) => [
      ...prev,
      { nombre: '', cantidad: 1, seccion: 'ferreteria_general' }
    ]);
  };

  // Quitar fila de ítem
  const eliminarItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Modificar campo de un ítem
  const actualizarItem = (index, campo, valor) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [campo]: valor } : it))
    );
  };

  // Llenar sugerencia rápida
  const aplicarSugerencia = (index, nombreSugerido, seccionSugerida) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, nombre: nombreSugerido, seccion: seccionSugerida } : it
      )
    );
  };

  // Enviar formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorForm('');
    setExitoForm('');

    if (!numeroFactura.trim()) {
      setErrorForm('El número de factura es obligatorio.');
      return;
    }
    if (!cliente.trim()) {
      setErrorForm('El nombre del cliente es obligatorio.');
      return;
    }

    // Validar ítems
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.nombre.trim()) {
        setErrorForm(`El ítem #${i + 1} no tiene nombre de producto.`);
        return;
      }
      if (!it.cantidad || Number(it.cantidad) <= 0) {
        setErrorForm(`La cantidad del ítem #${i + 1} debe ser mayor a cero.`);
        return;
      }
      if (!it.seccion) {
        setErrorForm(`El ítem #${i + 1} (${it.nombre}) debe tener una sección/bodega asignada.`);
        return;
      }
    }

    try {
      const nueva = crearFactura({
        numeroFactura,
        cliente,
        items,
        cajero: 'Caja 01 - Facturación Mostrador'
      });

      setExitoForm(`¡Factura ${nueva.numeroFactura} creada exitosamente y enviada a Vitrina!`);
      // Preparar siguiente factura
      setNumeroFactura(`FE-${Math.floor(80300 + Math.random() * 900)}`);
      setCliente('');
      setItems([{ nombre: '', cantidad: 1, seccion: 'materiales_construccion' }]);
      setTimeout(() => setExitoForm(''), 5000);
    } catch (err) {
      setErrorForm(err.message || 'Error al crear la factura');
    }
  };

  // Conteos para tabs de filtro
  const totalTodas = facturas.length;
  const totalPendientes = facturas.filter((f) => f.estado === 'pendiente').length;
  const totalEnVitrina = facturas.filter((f) => f.estado === 'en_vitrina').length;
  const totalListaSello = facturas.filter((f) => f.estado === 'lista_sello').length;
  const totalFaltantes = facturas.filter((f) => f.estado === 'faltante').length;
  const totalEntregadas = facturas.filter((f) => f.estado === 'entregada').length;

  // Facturas congeladas por faltante (visibles aparte)
  const facturasFaltantes = facturas.filter((f) => f.estado === 'faltante');

  // Facturas para el tablero general (excluyendo o incluyendo según filtro)
  const facturasFiltradas = facturas.filter((f) => {
    if (filtroEstado === 'todos') return true;
    return f.estado === filtroEstado;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-16">
      {/* Header específico de la estación */}
      <MostradorHeader
        tituloModulo="Estación de Facturación"
        subModulo="Generación de Pedidos y Validación de Sello"
        otraRuta="/vitrina"
        nombreOtraRuta="Vitrina"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 space-y-8">
        {/* Banner de contexto del control */}
        <div className="bg-white border-l-4 border-l-[#E11D24] p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E11D24] flex items-center justify-center shrink-0">
              <Stamp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Control de Despacho en Mostrador — Estación Facturación
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                1. Asigna la bodega obligatoria a cada ítem &bull; 2. Vitrina alista físicamente &bull; 3. Cuando el cliente regrese con todo completo, confirma el sello físico para descontar el inventario original.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
              Cajero activo: <b className="text-slate-900">Caja 01</b>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 1: FORMULARIO DE NUEVA FACTURA */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#E11D24]" />
              <h2 className="text-base font-bold tracking-tight">
                Generar Nueva Factura de Venta
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Sección obligatoria por ítem para trazabilidad de inventario
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
            {errorForm && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 shrink-0 text-red-600" />
                <span>{errorForm}</span>
              </div>
            )}

            {exitoForm && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{exitoForm}</span>
              </div>
            )}

            {/* Fila superior: Factura y Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  Número de Factura ERP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="Ej: FE-80295"
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 font-mono text-base font-bold text-slate-900 focus:outline-none focus:border-[#E11D24] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Nombre del Cliente / Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ej: Constructora San Jerónimo S.A.S."
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 text-base font-semibold text-slate-900 focus:outline-none focus:border-[#E11D24] transition-colors"
                  required
                />
                {/* Clientes frecuentes rápidos */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] font-medium text-slate-400">Frecuentes:</span>
                  {['Constructora Bolívar', 'Obras Civiles La Sabana', 'Ferretería El Progreso', 'Cliente Mostrador'].map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setCliente(nom)}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                    >
                      {nom}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lista Dinámica de Ítems */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Ítems de la Factura ({items.length})
                  </span>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    &bull; La sección/bodega es obligatoria por cada ítem
                  </span>
                </div>
                <button
                  type="button"
                  onClick={agregarItem}
                  className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-slate-200"
                >
                  <Plus className="w-4 h-4 text-red-600" />
                  <span>+ Agregar Ítem</span>
                </button>
              </div>

              {/* Encabezados en pantallas medianas */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Producto / Descripción</div>
                <div className="col-span-2">Cantidad</div>
                <div className="col-span-4">Sección / Bodega de Origen *</div>
                <div className="col-span-1 text-center">Acción</div>
              </div>

              {items.map((item, index) => {
                const seccionActual = getSeccionInfo(item.seccion);
                return (
                  <div
                    key={index}
                    className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* Nombre del Producto */}
                      <div className="md:col-span-5">
                        <label className="block md:hidden text-xs font-bold text-slate-600 mb-1">
                          Producto #{index + 1}
                        </label>
                        <input
                          type="text"
                          value={item.nombre}
                          onChange={(e) => actualizarItem(index, 'nombre', e.target.value)}
                          placeholder="Ej: Cemento Gris 50kg Argos"
                          className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#E11D24] bg-white"
                          required
                        />
                      </div>

                      {/* Cantidad */}
                      <div className="md:col-span-2">
                        <label className="block md:hidden text-xs font-bold text-slate-600 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                          className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#E11D24] bg-white"
                          required
                        />
                      </div>

                      {/* Selector de Sección Obligatorio */}
                      <div className="md:col-span-4">
                        <label className="block md:hidden text-xs font-bold text-slate-600 mb-1">
                          Sección/Bodega Obligatoria *
                        </label>
                        <select
                          value={item.seccion}
                          onChange={(e) => actualizarItem(index, 'seccion', e.target.value)}
                          className="w-full h-11 px-3 rounded-lg border-2 border-slate-300 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#E11D24] bg-white cursor-pointer"
                          required
                        >
                          {SECCIONES.map((sec) => (
                            <option key={sec.slug} value={sec.slug}>
                              {sec.nombre} ({sec.bodegaFisica})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Botón Eliminar */}
                      <div className="md:col-span-1 flex justify-end md:justify-center">
                        <button
                          type="button"
                          onClick={() => eliminarItem(index)}
                          disabled={items.length <= 1}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          title="Eliminar este ítem"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Fila de sugerencias rápidas según la sección seleccionada */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-1">
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Sugerencias {seccionActual.nombre}:
                      </span>
                      {seccionActual.sugerencias?.slice(0, 3).map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => aplicarSugerencia(index, sug, seccionActual.slug)}
                          className="text-[10px] px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors truncate max-w-[220px]"
                          title={sug}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón de Enviar a Vitrina */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Al generar la factura, Vitrina la verá de inmediato agrupada por sus secciones físicas.</span>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto min-h-[48px] px-8 bg-[#E11D24] hover:bg-red-700 active:scale-95 text-white rounded-xl text-base font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span>Crear Factura y Enviar a Vitrina</span>
              </button>
            </div>
          </form>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 2: BANDEJA DE FACTURAS CON FALTANTE (CONGELADAS) */}
        {/* ========================================================================= */}
        {facturasFaltantes.length > 0 && (
          <section className="bg-red-50/70 border-2 border-red-300 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-red-900 leading-tight">
                    Facturas Congeladas por Faltante de Stock ({facturasFaltantes.length})
                  </h3>
                  <p className="text-xs text-red-700">
                    Vitrina reportó que no había stock físico. La factura está detenida fuera del flujo normal y NO puede entregarse sin resolución comercial.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-red-200 text-red-900 rounded-full">
                Atención Caja / Comercial
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {facturasFaltantes.map((fac) => (
                <div
                  key={fac.id}
                  className="bg-white rounded-xl border-l-4 border-l-red-600 border border-red-200 p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-base font-black text-slate-900">
                        {fac.numeroFactura}
                      </span>
                      <p className="text-xs font-semibold text-slate-600">{fac.cliente}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-red-100 text-red-800 border border-red-300">
                      FALTANTE REPORTADO
                    </span>
                  </div>

                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-900 font-medium">
                    <b className="font-bold">Reporte de Vitrina:</b> {fac.motivoFaltante || 'No se encontró todo lo facturado en estantería.'}
                  </div>

                  <div className="border-t border-slate-100 pt-2 text-xs text-slate-600">
                    <div className="font-bold text-slate-700 mb-1">Ítems que tenía la factura:</div>
                    <ul className="space-y-1">
                      {fac.items.map((it) => (
                        <li key={it.id} className="flex items-center justify-between text-slate-700">
                          <span>&bull; {it.nombre}</span>
                          <span className="font-mono font-bold text-slate-900">{it.cantidad} un. ({getSeccionInfo(it.seccion).nombre})</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-[11px] text-slate-500 italic">
                    * Acción requerida: Generar nota crédito o ajuste comercial antes de reiniciar despacho.
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 3: BANDEJA DE FACTURAS EMITIDAS Y CONTROL DE SELLO */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Tablero de Facturas Emitidas</span>
              </h2>
              <p className="text-xs text-slate-600">
                Supervisa el estado en vitrina y confirma el sello físico de las facturas que ya tienen entrega completa.
              </p>
            </div>

            {/* Filtros rápidos con contadores estilo WMS */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-bold">
              <button
                onClick={() => setFiltroEstado('todos')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtroEstado === 'todos'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todas ({totalTodas})
              </button>
              <button
                onClick={() => setFiltroEstado('pendiente')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtroEstado === 'pendiente'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Pendiente ({totalPendientes})
              </button>
              <button
                onClick={() => setFiltroEstado('en_vitrina')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtroEstado === 'en_vitrina'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                En Vitrina ({totalEnVitrina})
              </button>
              <button
                onClick={() => setFiltroEstado('lista_sello')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtroEstado === 'lista_sello'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-800 hover:bg-purple-50'
                }`}
              >
                Lista Sello ({totalListaSello})
              </button>
              <button
                onClick={() => setFiltroEstado('entregada')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtroEstado === 'entregada'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                Entregada ({totalEntregadas})
              </button>
            </div>
          </div>

          {/* Grid de facturas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facturasFiltradas.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                No hay facturas en esta vista con el filtro seleccionado.
              </div>
            ) : (
              facturasFiltradas.map((fac) => {
                const metaEstado = ESTADOS_META[fac.estado] || ESTADOS_META.pendiente;
                const esListaSello = fac.estado === 'lista_sello';
                const esEntregada = fac.estado === 'entregada';

                // Agrupar conteo de secciones de esta factura
                const seccionesUnicas = Array.from(new Set(fac.items.map((i) => i.seccion)));

                return (
                  <div
                    key={fac.id}
                    className={`bg-white rounded-2xl border ${metaEstado.cardBorder} ${metaEstado.borderClass} p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all`}
                  >
                    <div className="space-y-3">
                      {/* Cabecera de la tarjeta: Factura + Estado */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xl font-black text-slate-900 tracking-tight">
                              {fac.numeroFactura}
                            </span>
                            {esListaSello && (
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-700 block line-clamp-1">
                            {fac.cliente}
                          </span>
                        </div>
                        <span className={`text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider font-bold ${metaEstado.badgeClass}`}>
                          {metaEstado.label}
                        </span>
                      </div>

                      {/* Secciones involucradas en la orden */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                          {seccionesUnicas.length} Secciones:
                        </span>
                        {seccionesUnicas.map((secSlug) => {
                          const secInfo = getSeccionInfo(secSlug);
                          return (
                            <span
                              key={secSlug}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${secInfo.color}`}
                            >
                              {secInfo.nombre}
                            </span>
                          );
                        })}
                      </div>

                      {/* Lista de ítems facturados originalmente */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Ítems Facturados ({fac.items.length})
                        </div>
                        <ul className="space-y-1.5">
                          {fac.items.map((it) => {
                            const sec = getSeccionInfo(it.seccion);
                            return (
                              <li key={it.id} className="flex items-start justify-between gap-2">
                                <span className="font-medium text-slate-800 line-clamp-1">
                                  {it.nombre}
                                </span>
                                <span className="font-mono font-black text-slate-900 shrink-0">
                                  {it.cantidad} un.
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* Último evento del historial */}
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {fac.historial[fac.historial.length - 1]?.detalle}
                        </span>
                      </div>
                    </div>

                    {/* Botón de Acción Principal en la Tarjeta */}
                    <div className="pt-2 border-t border-slate-100">
                      {esListaSello ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await confirmarSelloYEntregar(fac.id, 'Cajero 01');
                            } catch (err) {
                              alert(`⚠️ BLOQUEO DE INVENTARIO:\n${err.message}\n\nLa transacción fue abortada (Todo o Nada). La factura permanece en LISTA PARA SELLO.`);
                            }
                          }}
                          className="w-full min-h-[48px] py-3 px-4 bg-[#E11D24] hover:bg-red-700 active:scale-95 text-white rounded-xl text-sm font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          <Stamp className="w-5 h-5" />
                          <span>Confirmar sello / Entregado</span>
                        </button>
                      ) : esEntregada ? (
                        <div className="w-full py-2.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Sello verificado &bull; Inventario descontado</span>
                        </div>
                      ) : fac.estado === 'en_vitrina' ? (
                        <div className="w-full py-2 px-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold text-center">
                          Vitrina alistando en bodega...
                        </div>
                      ) : fac.estado === 'faltante' ? (
                        <div className="w-full py-2 px-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold text-center">
                          Congelada por faltante
                        </div>
                      ) : (
                        <div className="w-full py-2 px-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium text-center">
                          En espera de que Vitrina la tome
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
