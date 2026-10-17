import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Download, RotateCcw, Search, RefreshCw } from 'lucide-react';
import { cuadreApi, formatoCantidad } from '../services/cuadreApi';

const FILTROS = [
  { id: 'diferencias', etiqueta: 'Con diferencia' },
  { id: 'faltantes', etiqueta: 'Faltantes' },
  { id: 'sobrantes', etiqueta: 'Sobrantes' },
  { id: 'cuadran', etiqueta: 'Cuadran' },
  { id: 'reconteo', etiqueta: 'En reconteo' },
  { id: 'sin_contar', etiqueta: 'Sin contar' },
  { id: 'todos', etiqueta: 'Todos' }
];

const ESTADOS = {
  CUADRA: { texto: 'Cuadra', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SOBRANTE: { texto: 'Sobrante', clase: 'bg-sky-50 text-sky-700 border-sky-200' },
  FALTANTE: { texto: 'Faltante', clase: 'bg-red-50 text-red-700 border-red-200' },
  PENDIENTE_RECONTEO: { texto: 'En reconteo', clase: 'bg-amber-50 text-amber-800 border-amber-200' },
  SIN_CONTAR: { texto: 'Sin contar', clase: 'bg-slate-100 text-slate-600 border-slate-200' }
};

const TAM_PAGINA = 200;
const clave = (f) => `${f.articulo_codigo}|${f.bodega_codigo}`;

export default function CuadrePanel({ jornada, bodegas, esAdmin, onAbrirPlanilla, notificar }) {
  const [filtro, setFiltro] = useState('diferencias');
  const [bodega, setBodega] = useState('');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState(new Map());
  const [generando, setGenerando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const nombreBodega = (c) => bodegas.find(b => b.codigo === c)?.nombre || c;

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const cargar = useCallback(async (desde = 0) => {
    setCargando(true);
    try {
      const r = await cuadreApi.cuadre(jornada.id, { filtro, bodega, q: busqueda, desde, limite: TAM_PAGINA });
      setDatos(prev => (desde > 0 && prev ? { ...r, filas: [...prev.filas, ...r.filas] } : r));
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setCargando(false);
    }
  }, [jornada.id, filtro, bodega, busqueda, notificar]);

  useEffect(() => { cargar(0); }, [cargar]);

  const alternar = (f) => setSeleccion(s => {
    const n = new Map(s);
    n.has(clave(f)) ? n.delete(clave(f)) : n.set(clave(f), f);
    return n;
  });

  const seleccionables = (datos?.filas || []).filter(f => f.estado === 'SOBRANTE' || f.estado === 'FALTANTE');
  const todosMarcados = seleccionables.length > 0 && seleccionables.every(f => seleccion.has(clave(f)));
  const marcarTodos = () => setSeleccion(s => {
    const n = new Map(s);
    if (todosMarcados) seleccionables.forEach(f => n.delete(clave(f)));
    else seleccionables.forEach(f => n.set(clave(f), f));
    return n;
  });

  const generarReconteo = async () => {
    const items = [...seleccion.values()];
    const bods = [...new Set(items.map(i => i.bodega_codigo))];
    const ubicacion = window.prompt(
      `Se creará una planilla de RECONTEO con ${items.length} artículo(s).\nUbicación o nombre de la planilla:`,
      'Reconteo de diferencias'
    );
    if (ubicacion === null) return;
    setGenerando(true);
    try {
      const p = await cuadreApi.crearReconteo(jornada.id, {
        bodega: bods.length === 1 ? bods[0] : (bodega || bods[0]),
        ubicacion,
        items: items.map(i => ({ articulo_codigo: i.articulo_codigo, bodega_codigo: i.bodega_codigo }))
      });
      setSeleccion(new Map());
      notificar('success', `Planilla de reconteo #${p.id} creada.`);
      onAbrirPlanilla(p.id);
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setGenerando(false);
    }
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const { blob, nombre } = await cuadreApi.exportar(jornada.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setExportando(false);
    }
  };

  const t = datos?.resumen.total;
  const resumenBodegas = datos ? Object.entries(datos.resumen.por_bodega) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-slate-900">Cuadre: sistema vs. conteo físico</h2>
          <p className="text-xs text-slate-500">Cantidades en unidad menor. Si un artículo se recontó, manda el reconteo. Lo que nadie contó no entra en el error.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => cargar(0)} className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50" title="Actualizar">
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportar} disabled={exportando} className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Excel
          </button>
        </div>
      </div>

      {/* Indicadores */}
      {t && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <Indicador titulo="Exactitud del sistema" valor={t.exactitud_pct === null ? '—' : `${t.exactitud_pct}%`} destacado />
          <Indicador titulo="Artículos contados" valor={t.contados.toLocaleString('es-CO')} />
          <Indicador titulo="Cuadran exacto" valor={t.cuadran.toLocaleString('es-CO')} color="text-emerald-700" />
          <Indicador titulo="Con diferencia" valor={t.con_diferencia.toLocaleString('es-CO')} color="text-red-700" />
          <Indicador titulo="Sobrante (unid.)" valor={formatoCantidad(t.sobrante_unidades)} color="text-sky-700" />
          <Indicador titulo="Faltante (unid.)" valor={formatoCantidad(t.faltante_unidades)} color="text-red-700" />
          <Indicador titulo="En reconteo" valor={t.pendientes_reconteo.toLocaleString('es-CO')} color="text-amber-700" />
          <Indicador titulo="Sin contar" valor={t.sin_contar.toLocaleString('es-CO')} color="text-slate-500" />
        </div>
      )}

      {/* Resumen por bodega */}
      {resumenBodegas.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Bodega</th>
                <th className="px-3 py-2 text-right">Contados</th>
                <th className="px-3 py-2 text-right">Exactitud</th>
                <th className="px-3 py-2 text-right">Con dif.</th>
                <th className="px-3 py-2 text-right">Sobrante</th>
                <th className="px-3 py-2 text-right">Faltante</th>
                <th className="px-3 py-2 text-right">Sin contar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resumenBodegas.map(([b, g]) => (
                <tr key={b} onClick={() => setBodega(bodega === b ? '' : b)}
                  className={`cursor-pointer hover:bg-slate-50 ${bodega === b ? 'bg-red-50/60' : ''}`}>
                  <td className="px-3 py-2 font-bold text-slate-800">{b} · {nombreBodega(b)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.contados}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{g.exactitud_pct === null ? '—' : `${g.exactitud_pct}%`}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">{g.con_diferencia}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-sky-700">{formatoCantidad(g.sobrante_unidades)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">{formatoCantidad(g.faltante_unidades)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{g.sin_contar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar código o descripción..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E11D24]" />
        </div>
        <select value={bodega} onChange={e => setBodega(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-300 text-sm bg-white">
          <option value="">Todas las bodegas</option>
          {jornada.bodegas.map(b => <option key={b} value={b}>{b} · {nombreBodega(b)}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filtro === f.id ? 'bg-[#E11D24] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {f.etiqueta}
          </button>
        ))}
      </div>

      {/* Barra de reconteo */}
      {esAdmin && jornada.estado === 'ABIERTA' && seleccion.size > 0 && (
        <div className="sticky top-2 z-10 bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm">
          <span className="text-xs font-bold text-amber-900">{seleccion.size} artículo(s) seleccionados para recontar</span>
          <div className="flex gap-2">
            <button onClick={() => setSeleccion(new Map())} className="h-9 px-3 rounded-lg border border-amber-300 text-xs font-bold text-amber-900">Quitar selección</button>
            <button onClick={generarReconteo} disabled={generando} className="h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
              {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Generar reconteo
            </button>
          </div>
        </div>
      )}

      {/* Detalle */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-100 text-sm font-black text-slate-900">
          {datos ? `${datos.total_filas.toLocaleString('es-CO')} artículo(s)` : 'Cargando...'}
          <span className="ml-2 text-xs font-semibold text-slate-500">ordenados por la diferencia más grande</span>
        </div>
        {datos && datos.filas.length === 0 && !cargando ? (
          <p className="p-6 text-center text-sm text-slate-500">No hay artículos con este filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  {esAdmin && jornada.estado === 'ABIERTA' && (
                    <th className="px-3 py-2 w-8">
                      <input type="checkbox" checked={todosMarcados} onChange={marcarTodos} disabled={seleccionables.length === 0} title="Seleccionar diferencias visibles" />
                    </th>
                  )}
                  <th className="px-3 py-2 text-left">Artículo</th>
                  <th className="px-3 py-2 text-left">Bod.</th>
                  <th className="px-3 py-2 text-right">Sistema</th>
                  <th className="px-3 py-2 text-right">Conteo</th>
                  <th className="px-3 py-2 text-right">Reconteo</th>
                  <th className="px-3 py-2 text-right">Diferencia</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(datos?.filas || []).map(f => {
                  const est = ESTADOS[f.estado];
                  const marcable = f.estado === 'SOBRANTE' || f.estado === 'FALTANTE';
                  return (
                    <tr key={clave(f)} className="hover:bg-slate-50">
                      {esAdmin && jornada.estado === 'ABIERTA' && (
                        <td className="px-3 py-2">
                          {marcable && <input type="checkbox" checked={seleccion.has(clave(f))} onChange={() => alternar(f)} />}
                        </td>
                      )}
                      <td className="px-3 py-2 min-w-[200px]">
                        <div className="font-mono font-bold text-slate-900">{f.articulo_codigo}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[340px]">{f.descripcion}</div>
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-slate-700">{f.bodega_codigo}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatoCantidad(f.sistema)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatoCantidad(f.conteo)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatoCantidad(f.reconteo)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-black ${f.diferencia > 0 ? 'text-sky-700' : f.diferencia < 0 ? 'text-red-700' : 'text-slate-700'}`}>
                        {f.diferencia === null ? '—' : `${f.diferencia > 0 ? '+' : ''}${formatoCantidad(f.diferencia)}`}
                        <span className="ml-1 text-[10px] font-semibold text-slate-400">{f.unidad}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap ${est.clase}`}>{est.texto}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {datos && datos.filas.length < datos.total_filas && (
          <div className="p-3 border-t border-slate-100 text-center">
            <button onClick={() => cargar(datos.filas.length)} disabled={cargando} className="h-9 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {cargando ? 'Cargando...' : `Ver más (${datos.filas.length} de ${datos.total_filas.toLocaleString('es-CO')})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Indicador({ titulo, valor, color = 'text-slate-900', destacado = false }) {
  return (
    <div className={`rounded-2xl p-3 border ${destacado ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200'}`}>
      <div className={`text-[11px] font-semibold ${destacado ? 'text-slate-300' : 'text-slate-500'}`}>{titulo}</div>
      <div className={`text-xl font-black tabular-nums ${destacado ? 'text-white' : color}`}>{valor}</div>
    </div>
  );
}
