import React, { useState, useMemo } from 'react';
import MostradorHeader from '../components/MostradorHeader';
import { useVentaMostrador } from '../store/ventaMostrador';
import { SECCIONES, getSeccionInfo, ESTADOS_META } from '../data/secciones';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  Filter,
  Layers,
  MapPin,
  X,
  Sparkles,
  ShoppingBag,
  Eye
} from 'lucide-react';

export default function VitrinaPage() {
  const {
    facturas,
    iniciarAlistamiento,
    confirmarEntregaCompleta,
    reportarFaltante
  } = useVentaMostrador();

  // Filtros
  const [seccionFiltro, setSeccionFiltro] = useState('todas');
  const [tabEstado, setTabEstado] = useState('activas'); // 'activas' | 'pendientes' | 'en_vitrina' | 'sello'

  // Modal para reportar faltante
  const [modalFaltante, setModalFaltante] = useState(null); // facturaId
  const [motivoFaltante, setMotivoFaltante] = useState('');

  // Facturas según tab de estado
  const facturasFiltradasPorTab = useMemo(() => {
    if (tabEstado === 'activas') {
      return facturas.filter((f) => f.estado === 'pendiente' || f.estado === 'en_vitrina');
    }
    if (tabEstado === 'pendientes') {
      return facturas.filter((f) => f.estado === 'pendiente');
    }
    if (tabEstado === 'en_vitrina') {
      return facturas.filter((f) => f.estado === 'en_vitrina');
    }
    if (tabEstado === 'sello') {
      return facturas.filter((f) => f.estado === 'lista_sello');
    }
    return facturas;
  }, [facturas, tabEstado]);

  // Filtrar además por sección seleccionada (si la factura tiene algún ítem de esa sección)
  const facturasVisibles = useMemo(() => {
    if (seccionFiltro === 'todas') {
      return facturasFiltradasPorTab;
    }
    return facturasFiltradasPorTab.filter((f) =>
      f.items.some((it) => it.seccion === seccionFiltro)
    );
  }, [facturasFiltradasPorTab, seccionFiltro]);

  // Conteos para chips de secciones
  const conteoPorSeccion = useMemo(() => {
    const mapa = { todas: facturasFiltradasPorTab.length };
    SECCIONES.forEach((sec) => {
      mapa[sec.slug] = facturasFiltradasPorTab.filter((f) =>
        f.items.some((it) => it.seccion === sec.slug)
      ).length;
    });
    return mapa;
  }, [facturasFiltradasPorTab]);

  // Manejador para enviar reporte de faltante
  const handleConfirmarFaltante = (e) => {
    e.preventDefault();
    if (!modalFaltante) return;
    const motivoFinal = motivoFaltante.trim() || 'Falta stock físico de uno o más ítems en bodega';
    reportarFaltante(modalFaltante, motivoFinal, 'Operario Vitrina Mostrador');
    setModalFaltante(null);
    setMotivoFaltante('');
  };

  const conteoPendientes = facturas.filter((f) => f.estado === 'pendiente').length;
  const conteoEnVitrina = facturas.filter((f) => f.estado === 'en_vitrina').length;
  const conteoListaSello = facturas.filter((f) => f.estado === 'lista_sello').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-20">
      {/* Header institucional */}
      <MostradorHeader
        tituloModulo="Estación de Vitrina / Mostrador"
        subModulo="Alistamiento Físico y Entrega al Cliente"
        otraRuta="/facturacion"
        nombreOtraRuta="Facturación"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 space-y-6">
        {/* Banner de Operación Rápida */}
        <div className="bg-white border-l-4 border-l-[#E11D24] p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E11D24] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Alistamiento en Mostrador — Vitrina
              </h1>
              <p className="text-xs text-slate-600">
                Consulta los ítems agrupados por sección de bodega. Si tienes todo listo, presiona <b>Entrega completa</b>. Si falta stock, usa <b>Reportar faltante</b> (sin editar cantidades).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg">
              {conteoPendientes + conteoEnVitrina} órdenes por atender
            </span>
          </div>
        </div>

        {/* 1. Selector de Pestañas de Estado con Contadores */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs sm:text-sm font-black">
          <button
            onClick={() => setTabEstado('activas')}
            className={`min-h-[44px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              tabEstado === 'activas'
                ? 'bg-[#E11D24] text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ACTIVAS EN COLA ({conteoPendientes + conteoEnVitrina})</span>
          </button>

          <button
            onClick={() => setTabEstado('pendientes')}
            className={`min-h-[44px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              tabEstado === 'pendientes'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <span>PENDIENTES ({conteoPendientes})</span>
          </button>

          <button
            onClick={() => setTabEstado('en_vitrina')}
            className={`min-h-[44px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              tabEstado === 'en_vitrina'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>EN ALISTAMIENTO ({conteoEnVitrina})</span>
          </button>

          <button
            onClick={() => setTabEstado('sello')}
            className={`min-h-[44px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              tabEstado === 'sello'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ESPERANDO SELLO ({conteoListaSello})</span>
          </button>
        </div>

        {/* 2. Filtro Superior por Sección (Horizontal scrollable chips) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-red-600" />
              Filtrar por Sección / Bodega Específica:
            </span>
            {seccionFiltro !== 'todas' && (
              <button
                onClick={() => setSeccionFiltro('todas')}
                className="text-red-600 hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Ver todas las secciones
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {/* Chip "Todas" */}
            <button
              onClick={() => setSeccionFiltro('todas')}
              className={`shrink-0 min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border ${
                seccionFiltro === 'todas'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
              }`}
            >
              Todas las Secciones ({conteoPorSeccion.todas || 0})
            </button>

            {/* Chips de las 7 secciones fijas */}
            {SECCIONES.map((sec) => {
              const activo = seccionFiltro === sec.slug;
              const cantidad = conteoPorSeccion[sec.slug] || 0;
              return (
                <button
                  key={sec.slug}
                  onClick={() => setSeccionFiltro(sec.slug)}
                  className={`shrink-0 min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-2 ${
                    activo
                      ? `${sec.badgeColor} border-transparent shadow-md ring-2 ring-slate-900`
                      : `${sec.color} hover:opacity-90`
                  }`}
                >
                  <span>{sec.nombre}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                    activo ? 'bg-white/20 text-white' : 'bg-black/10 text-slate-800'
                  }`}>
                    {cantidad}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Grid de Facturas Táctiles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {facturasVisibles.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">
                No hay facturas con los filtros seleccionados
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Prueba seleccionando "Todas las Secciones" o la pestaña de "ACTIVAS EN COLA".
              </p>
            </div>
          ) : (
            facturasVisibles.map((fac) => {
              const meta = ESTADOS_META[fac.estado] || ESTADOS_META.pendiente;
              const esPendiente = fac.estado === 'pendiente';
              const esEnVitrina = fac.estado === 'en_vitrina';
              const esListaSello = fac.estado === 'lista_sello';

              // Agrupar ítems por sección para mostrarlos de forma estructurada
              const itemsPorSeccion = fac.items.reduce((acc, it) => {
                if (!acc[it.seccion]) {
                  acc[it.seccion] = [];
                }
                acc[it.seccion].push(it);
                return acc;
              }, {});

              const seccionesDeEstaFactura = Object.keys(itemsPorSeccion);

              return (
                <div
                  key={fac.id}
                  className={`bg-white rounded-2xl border-2 ${meta.cardBorder} ${meta.borderClass} p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all`}
                >
                  <div className="space-y-4">
                    {/* Encabezado: Factura grande + Cliente + Estado */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-2xl font-black text-slate-900 tracking-tight">
                            {fac.numeroFactura}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        </div>
                        <h2 className="text-base font-black text-slate-800 mt-1 line-clamp-1">
                          {fac.cliente}
                        </h2>
                      </div>

                      {/* Resumen de secciones a visitar */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                          {seccionesDeEstaFactura.length} {seccionesDeEstaFactura.length === 1 ? 'sección' : 'secciones'}
                        </span>
                      </div>
                    </div>

                    {/* Ítems agrupados visualmente por sección/bodega */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-600" />
                        <span>Ruta de Alistamiento por Bodegas Físicas:</span>
                      </div>

                      <div className="space-y-2.5">
                        {seccionesDeEstaFactura.map((secSlug) => {
                          const secInfo = getSeccionInfo(secSlug);
                          const itemsEnSec = itemsPorSeccion[secSlug];
                          const estaFiltrada = seccionFiltro === secSlug;

                          return (
                            <div
                              key={secSlug}
                              className={`rounded-xl border ${secInfo.color} p-3 space-y-2 transition-all ${
                                estaFiltrada ? 'ring-2 ring-slate-900 shadow-sm' : ''
                              }`}
                            >
                              {/* Encabezado de la sección con su bodega física */}
                              <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${secInfo.badgeColor}`}>
                                    {secInfo.nombre}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700">
                                    &bull; {secInfo.bodegaFisica}
                                  </span>
                                </div>
                                <span className="text-xs font-mono font-bold text-slate-600">
                                  {itemsEnSec.length} {itemsEnSec.length === 1 ? 'ítem' : 'ítems'}
                                </span>
                              </div>

                              {/* Lista de productos en esta sección */}
                              <div className="space-y-1.5 pl-1">
                                {itemsEnSec.map((it) => (
                                  <div
                                    key={it.id}
                                    className="flex items-center justify-between gap-3 text-sm"
                                  >
                                    <span className="font-bold text-slate-900 leading-snug">
                                      {it.nombre}
                                    </span>
                                    {/* CANTIDAD FACTURADA DESTACADA (Solo lectura, NUNCA editable) */}
                                    <span className="font-mono text-base font-black px-2.5 py-0.5 rounded-lg bg-white border border-slate-300 text-slate-900 shrink-0 shadow-xs">
                                      {it.cantidad} UNID
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Historial o nota de cajero */}
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {fac.historial[fac.historial.length - 1]?.detalle}
                      </span>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* BOTONES DE ACCIÓN TÁCTIL INDUSTRIAL (MÍNIMO 48px) */}
                  {/* ========================================================================= */}
                  <div className="pt-3 border-t border-slate-100">
                    {esPendiente && (
                      <button
                        type="button"
                        onClick={() => iniciarAlistamiento(fac.id, 'Operario Vitrina')}
                        className="w-full min-h-[48px] py-3.5 px-4 bg-[#E11D24] hover:bg-red-700 active:scale-95 text-white rounded-xl text-base font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        <span>Ya la vi, voy por esto</span>
                      </button>
                    )}

                    {esEnVitrina && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Botón 1: Entrega completa */}
                        <button
                          type="button"
                          onClick={() => confirmarEntregaCompleta(fac.id, 'Operario Vitrina')}
                          className="min-h-[48px] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-sm font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Entrega completa</span>
                        </button>

                        {/* Botón 2: Reportar faltante (visual y funcionalmente distinto) */}
                        <button
                          type="button"
                          onClick={() => {
                            setModalFaltante(fac.id);
                            setMotivoFaltante('');
                          }}
                          className="min-h-[48px] py-3 px-4 bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 border-2 border-red-300 rounded-xl text-sm font-black tracking-wide transition-all flex items-center justify-center gap-2"
                        >
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span>Reportar faltante</span>
                        </button>
                      </div>
                    )}

                    {esListaSello && (
                      <div className="w-full py-3 px-4 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 text-center">
                        <CheckCircle2 className="w-5 h-5 text-purple-700 shrink-0" />
                        <span>Mercancía entregada al cliente. Esperando sello físico en Facturación.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL PARA REPORTAR FALTANTE (BANDEROLA SIN EDICIÓN DE CANTIDADES) */}
      {/* ========================================================================= */}
      {modalFaltante && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border-2 border-red-500 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Reportar Faltante de Stock
                </h3>
                <span className="text-xs text-red-600 font-bold">
                  La factura se congelará y saldrá del flujo normal
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <b>Atención:</b> Vitrina <u>no puede modificar cantidades</u> ni entregar pedidos incompletos como si estuvieran completos. Al reportar este faltante, la factura queda bloqueada para que Facturación y el área comercial emitan nota crédito o sustitución.
            </p>

            <form onSubmit={handleConfirmarFaltante} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Motivo o Producto Agotado:
                </label>
                <textarea
                  value={motivoFaltante}
                  onChange={(e) => setMotivoFaltante(e.target.value)}
                  placeholder="Ej: No se encontró stock en Pasillo 4 de Thinner Corriente Galón..."
                  rows={3}
                  className="w-full p-3 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Botones de acción del modal */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalFaltante(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black shadow-md transition-all"
                >
                  Confirmar y Congelar Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
