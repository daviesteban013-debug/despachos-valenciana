import React, { useState } from 'react';
import { CalendarDays, Plus, Upload, Lock, Unlock, CheckCircle2, Loader2, FileSpreadsheet } from 'lucide-react';
import { cuadreApi } from '../services/cuadreApi';

const BODEGAS_POR_DEFECTO = ['00', 'D', 'E', 'Y'];

const fechaCorta = (f) => String(f || '').slice(0, 10).split('-').reverse().join('/');

export default function JornadasPanel({ jornadas, bodegas, esAdmin, emailUsuario, jornadaId, onSeleccionar, onCambio, notificar }) {
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ nombre: '', fecha_corte: '', bodegas: BODEGAS_POR_DEFECTO });
  const [guardando, setGuardando] = useState(false);

  const alternarBodega = (codigo) => setForm(f => ({
    ...f,
    bodegas: f.bodegas.includes(codigo) ? f.bodegas.filter(b => b !== codigo) : [...f.bodegas, codigo]
  }));

  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const j = await cuadreApi.crearJornada(form);
      notificar('success', `Jornada "${j.nombre}" creada. Ahora carga los Excel del TNS.`);
      setCreando(false);
      setForm({ nombre: '', fecha_corte: '', bodegas: BODEGAS_POR_DEFECTO });
      await onCambio();
      onSeleccionar(j.id);
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900">Jornadas de cuadre</h2>
          <p className="text-xs text-slate-500">Cada toma física (ej. diciembre) es una jornada con su propia foto del sistema TNS.</p>
        </div>
        {esAdmin && !creando && (
          <button onClick={() => setCreando(true)} className="h-10 px-3 rounded-xl bg-[#E11D24] hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Nueva jornada
          </button>
        )}
      </div>

      {!esAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
          Entraste como <strong>{emailUsuario || 'una cuenta sin correo'}</strong>, que no es administradora.
          Por eso no ves <strong>"Nueva jornada"</strong> ni la carga de Excel del TNS. Pide a un administrador que agregue tu correo.
        </div>
      )}

      {creando && (
        <form onSubmit={crear} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600 uppercase">Nombre</span>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required
                placeholder="Cuadre Diciembre 2026"
                className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E11D24]" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 uppercase">Fecha de corte</span>
              <input type="date" value={form.fecha_corte} onChange={e => setForm(f => ({ ...f, fecha_corte: e.target.value }))} required
                className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E11D24]" />
            </label>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-600 uppercase">Bodegas a cuadrar</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {bodegas.map(b => (
                <button type="button" key={b.codigo} onClick={() => alternarBodega(b.codigo)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    form.bodegas.includes(b.codigo) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}>
                  {b.codigo} · {b.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setCreando(false)} className="h-10 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700">Cancelar</button>
            <button disabled={guardando} className="h-10 px-4 rounded-xl bg-[#E11D24] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5">
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />} Crear jornada
            </button>
          </div>
        </form>
      )}

      {jornadas.length === 0 && !creando && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500">
          {esAdmin ? 'No hay jornadas. Crea la primera con "Nueva jornada".' : 'Aún no hay jornadas de cuadre.'}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {jornadas.map(j => (
          <TarjetaJornada key={j.id} jornada={j} bodegas={bodegas} esAdmin={esAdmin}
            activa={j.id === jornadaId} onSeleccionar={onSeleccionar} onCambio={onCambio} notificar={notificar} />
        ))}
      </div>
    </div>
  );
}

function TarjetaJornada({ jornada: j, bodegas, esAdmin, activa, onSeleccionar, onCambio, notificar }) {
  const [archivos, setArchivos] = useState({ articulos: null, existencias: null });
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const nombreBodega = (c) => bodegas.find(b => b.codigo === c)?.nombre || c;
  const abierta = j.estado === 'ABIERTA';

  const importar = async () => {
    setImportando(true);
    setResultado(null);
    try {
      const r = await cuadreApi.importar(j.id, archivos);
      setResultado(r);
      setArchivos({ articulos: null, existencias: null });
      notificar('success', 'Archivos del TNS cargados.');
      await onCambio();
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setImportando(false);
    }
  };

  const cambiarEstado = async () => {
    const nuevo = abierta ? 'CERRADA' : 'ABIERTA';
    const msg = abierta
      ? `¿Cerrar la jornada "${j.nombre}"? Ya no se podrán agregar conteos ni cambios.`
      : `¿Reabrir la jornada "${j.nombre}"?`;
    if (!window.confirm(msg)) return;
    try {
      await cuadreApi.actualizarJornada(j.id, { estado: nuevo });
      notificar('success', `Jornada ${nuevo === 'CERRADA' ? 'cerrada' : 'reabierta'}.`);
      await onCambio();
    } catch (err) {
      notificar('error', err.message);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-3 shadow-sm ${activa ? 'border-[#E11D24] ring-1 ring-[#E11D24]' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-black text-slate-900 truncate">{j.nombre}</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <CalendarDays className="w-3.5 h-3.5" /> Corte {fechaCorta(j.fecha_corte)}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold shrink-0 ${abierta ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
          {abierta ? 'Abierta' : 'Cerrada'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {j.bodegas.map(b => (
          <span key={b} className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-700" title={nombreBodega(b)}>
            {b} · {nombreBodega(b)}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 rounded-xl p-2">
          <div className="text-slate-500">Existencias del sistema</div>
          <div className="font-black text-slate-900">{j.total_existencias ?? 0} registros</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-2">
          <div className="text-slate-500">Planillas</div>
          <div className="font-black text-slate-900">{j.total_planillas ?? 0}</div>
        </div>
      </div>
      {j.existencias_cargadas_en && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <FileSpreadsheet className="w-3.5 h-3.5" /> {j.archivo_existencias} · {new Date(j.existencias_cargadas_en).toLocaleString('es-CO')}
        </p>
      )}

      {esAdmin && abierta && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <p className="text-xs font-bold text-slate-600">Cargar Excel del TNS</p>
          <label className="block text-xs">
            <span className="text-slate-500">Artículos (código, descripción, unidad menor/mayor, factor)</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setArchivos(a => ({ ...a, articulos: e.target.files?.[0] || null }))}
              className="mt-1 block w-full text-xs file:mr-2 file:px-2 file:py-1 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white" />
          </label>
          <label className="block text-xs">
            <span className="text-slate-500">Existencias (código, bodega, cantidad, unidad)</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setArchivos(a => ({ ...a, existencias: e.target.files?.[0] || null }))}
              className="mt-1 block w-full text-xs file:mr-2 file:px-2 file:py-1 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white" />
          </label>
          <p className="text-[11px] text-amber-700">Cargar existencias reemplaza la foto del sistema de esta jornada. Exporta los códigos como texto para no perder ceros a la izquierda.</p>
          <button onClick={importar} disabled={importando || (!archivos.articulos && !archivos.existencias)}
            className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5">
            {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Cargar archivos
          </button>
          {resultado && <ResultadoImportacion r={resultado} />}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={() => onSeleccionar(j.id)} disabled={activa}
          className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${activa ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#E11D24] text-white hover:bg-red-700'}`}>
          {activa ? <><CheckCircle2 className="w-4 h-4" /> Jornada activa</> : 'Trabajar en esta jornada'}
        </button>
        {esAdmin && (
          <button onClick={cambiarEstado} title={abierta ? 'Cerrar jornada' : 'Reabrir jornada'}
            className="h-10 px-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1">
            {abierta ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {abierta ? 'Cerrar' : 'Reabrir'}
          </button>
        )}
      </div>
    </div>
  );
}

function ResultadoImportacion({ r }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 space-y-0.5">
      {r.articulos && <div>✔ {r.articulos.articulos.toLocaleString('es-CO')} artículos actualizados (hoja "{r.articulos.hoja}")</div>}
      {r.existencias && (
        <>
          <div>✔ {r.existencias.existencias.toLocaleString('es-CO')} existencias cargadas (hoja "{r.existencias.hoja}")</div>
          {r.existencias.codigos_sin_articulo > 0 && (
            <div className="text-amber-800">⚠ {r.existencias.codigos_sin_articulo} códigos no están en el catálogo (ej. {r.existencias.ejemplos_sin_articulo.join(', ')})</div>
          )}
          {r.existencias.filas_invalidas > 0 && <div className="text-amber-800">⚠ {r.existencias.filas_invalidas} filas con datos incompletos</div>}
          {r.existencias.bodegas_desconocidas.length > 0 && (
            <div className="text-amber-800">⚠ Bodegas desconocidas ignoradas: {r.existencias.bodegas_desconocidas.join(', ')}</div>
          )}
        </>
      )}
    </div>
  );
}
