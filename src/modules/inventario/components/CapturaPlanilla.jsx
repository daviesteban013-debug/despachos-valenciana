import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Loader2, Search, Plus, Trash2, Pencil, Lock, Unlock, CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import { cuadreApi, formatoCantidad } from '../services/cuadreApi';

const aNumero = (v) => Number(String(v ?? '').trim().replace(',', '.'));

export default function CapturaPlanilla({ planillaId, jornada, bodegas, usuario, esAdmin, onVolver, notificar }) {
  const [planilla, setPlanilla] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Formulario de captura
  const [texto, setTexto] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [articulo, setArticulo] = useState(null);
  const [unidadTipo, setUnidadTipo] = useState('MENOR');
  const [cantidad, setCantidad] = useState('');
  const [bodega, setBodega] = useState('');
  const [guardando, setGuardando] = useState(false);
  const refCodigo = useRef(null);
  const refCantidad = useRef(null);

  const nombreBodega = (c) => bodegas.find(b => b.codigo === c)?.nombre || c;
  const email = String(usuario.email || '').toLowerCase();

  const cargar = useCallback(async () => {
    try {
      const p = await cuadreApi.planilla(planillaId);
      setPlanilla(p);
      setBodega(b => b || p.bodega_codigo);
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setCargando(false);
    }
  }, [planillaId, notificar]);

  useEffect(() => { cargar(); }, [cargar]);

  // Búsqueda de artículos con espera corta mientras se escribe
  useEffect(() => {
    if (articulo || texto.trim().length < 2) { setSugerencias([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        setSugerencias(await cuadreApi.buscarArticulos(texto.trim()));
      } catch (err) {
        notificar('error', err.message);
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [texto, articulo, notificar]);

  if (cargando) {
    return <div className="flex items-center justify-center py-16 text-slate-500 gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#E11D24]" /> Cargando planilla...</div>;
  }
  if (!planilla) {
    return <button onClick={onVolver} className="text-sm font-bold text-[#E11D24]">← Volver a planillas</button>;
  }

  const editable = planilla.estado === 'ABIERTA' && planilla.jornada_estado === 'ABIERTA';
  const esLider = esAdmin || planilla.lider_email === email || planilla.creado_por === email;
  const tieneMayor = articulo && articulo.unidad_mayor && articulo.unidad_mayor !== articulo.unidad_menor;

  const elegir = (a) => {
    setArticulo(a);
    setTexto(a.codigo);
    setSugerencias([]);
    setUnidadTipo('MENOR');
    setTimeout(() => refCantidad.current?.focus(), 30);
  };

  // Carga el artículo completo (con unidad mayor y factor) a partir de su código
  const elegirPorCodigo = async (codigo) => {
    try {
      const encontrados = await cuadreApi.buscarArticulos(codigo);
      const exacto = encontrados.find(a => a.codigo === codigo);
      if (exacto) elegir(exacto);
      else notificar('error', `El artículo ${codigo} no está en el catálogo cargado.`);
    } catch (err) {
      notificar('error', err.message);
    }
  };

  const limpiar = () => {
    setArticulo(null);
    setTexto('');
    setCantidad('');
    setUnidadTipo('MENOR');
    setTimeout(() => refCodigo.current?.focus(), 30);
  };

  // Enter en el código (o lector de código de barras, que escribe y da Enter de inmediato):
  // si la búsqueda aún no respondió, se consulta el código exacto en ese momento.
  const alEnterCodigo = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const codigo = texto.trim().toUpperCase();
    if (!codigo) return;
    const exacto = sugerencias.find(s => s.codigo === codigo);
    if (exacto) { elegir(exacto); return; }
    try {
      const encontrados = await cuadreApi.buscarArticulos(codigo);
      const coincidencia = encontrados.find(a => a.codigo === codigo) || (encontrados.length === 1 ? encontrados[0] : null);
      if (coincidencia) elegir(coincidencia);
      else if (encontrados.length === 0) notificar('error', `No se encontró el artículo "${codigo}".`);
      else setSugerencias(encontrados);
    } catch (err) {
      notificar('error', err.message);
    }
  };

  const agregar = async (e) => {
    e?.preventDefault();
    if (!articulo) { notificar('error', 'Escoge un artículo de la lista.'); return; }
    const cant = aNumero(cantidad);
    if (!Number.isFinite(cant) || cant < 0 || String(cantidad).trim() === '') { notificar('error', 'Escribe una cantidad válida.'); return; }
    setGuardando(true);
    try {
      const r = await cuadreApi.agregarLinea(planilla.id, {
        articulo_codigo: articulo.codigo, cantidad: cant, unidad_tipo: unidadTipo, bodega
      });
      setPlanilla(r.planilla);
      limpiar();
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const editarCantidad = async (linea) => {
    const nueva = window.prompt(`Nueva cantidad para ${linea.articulo_codigo} (${linea.unidad}):`, String(linea.cantidad));
    if (nueva === null) return;
    const cant = aNumero(nueva);
    if (!Number.isFinite(cant) || cant < 0) { notificar('error', 'Cantidad inválida.'); return; }
    try {
      setPlanilla(await cuadreApi.actualizarLinea(linea.id, { cantidad: cant }));
    } catch (err) {
      notificar('error', err.message);
    }
  };

  const borrar = async (linea) => {
    if (!window.confirm(`¿Borrar la línea ${linea.numero} (${linea.articulo_codigo})?`)) return;
    try {
      setPlanilla(await cuadreApi.eliminarLinea(linea.id));
    } catch (err) {
      notificar('error', err.message);
    }
  };

  const cambiarEstado = async () => {
    const nuevo = planilla.estado === 'ABIERTA' ? 'CERRADA' : 'ABIERTA';
    if (nuevo === 'CERRADA' && !window.confirm('¿Cerrar la planilla? Ya no se podrán agregar ni corregir artículos.')) return;
    try {
      setPlanilla(await cuadreApi.actualizarPlanilla(planilla.id, { estado: nuevo }));
      notificar('success', nuevo === 'CERRADA' ? 'Planilla cerrada.' : 'Planilla reabierta.');
    } catch (err) {
      notificar('error', err.message);
    }
  };

  const recontados = new Set(planilla.lineas.map(l => `${l.articulo_codigo}|${l.bodega_codigo}`));

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <button onClick={onVolver} className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 shrink-0" title="Volver a planillas">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-black text-slate-900">
              Planilla #{planilla.id} · {planilla.tipo === 'RECONTEO' ? 'Reconteo' : 'Conteo'}
            </h2>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-700">{planilla.bodega_codigo} · {planilla.bodega_nombre}</span>
            {planilla.estado === 'CERRADA' && <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-xs font-bold text-slate-600">Cerrada</span>}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {planilla.ubicacion || 'Sin ubicación'} · Equipo: {planilla.equipo.map(m => `${m.nombre} (${m.rol})`).join(', ')}
          </p>
        </div>
        {esLider && planilla.jornada_estado === 'ABIERTA' && (
          <button onClick={cambiarEstado} className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0">
            {planilla.estado === 'ABIERTA' ? <><Lock className="w-4 h-4" /> Cerrar</> : <><Unlock className="w-4 h-4" /> Reabrir</>}
          </button>
        )}
      </div>

      {/* Artículos a recontar */}
      {planilla.tipo === 'RECONTEO' && planilla.items_reconteo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
          <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> Artículos a recontar ({planilla.items_reconteo.filter(i => recontados.has(`${i.articulo_codigo}|${i.bodega_codigo}`)).length}/{planilla.items_reconteo.length} listos)
          </p>
          <div className="grid gap-1 sm:grid-cols-2">
            {planilla.items_reconteo.map(i => {
              const listo = recontados.has(`${i.articulo_codigo}|${i.bodega_codigo}`);
              return (
                <button key={`${i.articulo_codigo}|${i.bodega_codigo}`} disabled={!editable || listo}
                  onClick={() => { setBodega(i.bodega_codigo); elegirPorCodigo(i.articulo_codigo); }}
                  className={`text-left text-xs flex items-center gap-2 px-2 py-1.5 rounded-lg ${listo ? 'text-emerald-800' : 'text-amber-900 hover:bg-amber-100'}`}>
                  {listo ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Circle className="w-4 h-4 shrink-0" />}
                  <span className="font-mono font-bold">{i.articulo_codigo}</span>
                  <span className="truncate">{i.descripcion}</span>
                  <span className="ml-auto shrink-0 text-[10px] font-bold">{i.bodega_codigo}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Captura */}
      {editable ? (
        <form onSubmit={agregar} className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3 shadow-sm">
          <div className="relative">
            <label className="text-xs font-bold text-slate-600 uppercase">Artículo (código o descripción)</label>
            <div className="relative mt-1">
              {buscando ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
              <input ref={refCodigo} autoFocus value={texto} onKeyDown={alEnterCodigo}
                onChange={e => { setTexto(e.target.value); setArticulo(null); }}
                placeholder="Escanea o escribe el código..." autoComplete="off" enterKeyHint="search"
                className="w-full h-12 pl-9 pr-3 rounded-xl border border-slate-300 text-base font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E11D24]" />
            </div>
            {sugerencias.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {sugerencias.map(s => (
                  <li key={s.codigo}>
                    <button type="button" onClick={() => elegir(s)} className="w-full text-left px-3 py-2 hover:bg-red-50 border-b border-slate-50 last:border-0">
                      <span className="font-mono font-bold text-sm text-slate-900">{s.codigo}</span>
                      <span className="ml-2 text-xs text-slate-600">{s.descripcion}</span>
                      {s.inactivo && <span className="ml-2 text-[10px] font-bold text-amber-700">INACTIVO</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {articulo && (
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {articulo.descripcion}
                <span className="ml-2 text-xs text-slate-500">
                  Unidad: {articulo.unidad_menor}{tieneMayor && ` · Mayor: ${articulo.unidad_mayor} x${formatoCantidad(articulo.factor)}`}
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <label className="block col-span-1">
              <span className="text-xs font-bold text-slate-600 uppercase">Cantidad</span>
              <input ref={refCantidad} value={cantidad} onChange={e => setCantidad(e.target.value)} inputMode="decimal" enterKeyHint="done"
                placeholder="0" className="mt-1 w-full h-12 px-3 rounded-xl border border-slate-300 text-lg font-black text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-[#E11D24]" />
            </label>
            <div className="col-span-1">
              <span className="text-xs font-bold text-slate-600 uppercase">Unidad</span>
              <div className="mt-1 flex h-12 rounded-xl border border-slate-300 overflow-hidden bg-slate-50 p-0.5">
                <button type="button" onClick={() => setUnidadTipo('MENOR')}
                  className={`flex-1 text-xs font-bold rounded-lg ${unidadTipo === 'MENOR' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
                  {articulo?.unidad_menor || 'UND'}
                </button>
                {tieneMayor && (
                  <button type="button" onClick={() => setUnidadTipo('MAYOR')}
                    className={`flex-1 text-xs font-bold rounded-lg ${unidadTipo === 'MAYOR' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
                    {articulo.unidad_mayor}
                  </button>
                )}
              </div>
            </div>
            <label className="block col-span-1">
              <span className="text-xs font-bold text-slate-600 uppercase">Bodega</span>
              <select value={bodega} onChange={e => setBodega(e.target.value)} className="mt-1 w-full h-12 px-2 rounded-xl border border-slate-300 text-sm bg-white">
                {jornada.bodegas.map(b => <option key={b} value={b}>{b} · {nombreBodega(b)}</option>)}
              </select>
            </label>
            <button disabled={guardando || !articulo} className="col-span-1 h-12 rounded-xl bg-[#E11D24] hover:bg-red-700 text-white text-sm font-black disabled:opacity-40 flex items-center justify-center gap-1.5">
              {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Agregar
            </button>
          </div>
          {tieneMayor && unidadTipo === 'MAYOR' && aNumero(cantidad) > 0 && (
            <p className="text-xs text-slate-500">= {formatoCantidad(aNumero(cantidad) * articulo.factor)} {articulo.unidad_menor}</p>
          )}
        </form>
      ) : (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
          <Lock className="w-4 h-4" /> {planilla.jornada_estado !== 'ABIERTA' ? 'La jornada está cerrada.' : 'La planilla está cerrada. El líder puede reabrirla para corregir.'}
        </div>
      )}

      {/* Líneas registradas */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-black text-slate-900">Artículos registrados ({planilla.lineas.length})</span>
        </div>
        {planilla.lineas.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Todavía no hay artículos en esta planilla.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Artículo</th>
                  <th className="px-3 py-2 text-left hidden sm:table-cell">Bod.</th>
                  <th className="px-3 py-2 text-right hidden sm:table-cell">Cantidad</th>
                  <th className="px-3 py-2 text-right hidden sm:table-cell">En unidad menor</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...planilla.lineas].reverse().map(l => {
                  const puede = editable && (esLider || l.contado_por === email);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400 tabular-nums">{l.numero}</td>
                      <td className="px-3 py-2 sm:min-w-[180px]">
                        <div className="font-mono font-bold text-slate-900">{l.articulo_codigo}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[220px] sm:max-w-[320px]">{l.descripcion}</div>
                        {/* En celular la cantidad y la bodega van debajo del artículo */}
                        <div className="sm:hidden mt-0.5 text-sm font-black tabular-nums">
                          {formatoCantidad(l.cantidad)} <span className="text-xs font-semibold text-slate-500">{l.unidad}</span>
                          <span className="ml-2 text-[11px] font-bold text-slate-500">Bod. {l.bodega_codigo}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-slate-700 hidden sm:table-cell">{l.bodega_codigo}</td>
                      <td className="px-3 py-2 text-right font-black tabular-nums whitespace-nowrap hidden sm:table-cell">{formatoCantidad(l.cantidad)} <span className="text-xs font-semibold text-slate-500">{l.unidad}</span></td>
                      <td className="px-3 py-2 text-right text-xs text-slate-500 tabular-nums hidden sm:table-cell">{formatoCantidad(l.cantidad_menor)} {l.unidad_menor}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {puede && (
                          <>
                            <button onClick={() => editarCantidad(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100" title="Corregir cantidad"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => borrar(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Borrar línea"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
