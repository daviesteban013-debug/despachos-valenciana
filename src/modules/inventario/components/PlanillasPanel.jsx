import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Loader2, ClipboardList, RotateCcw, ChevronRight, Lock } from 'lucide-react';
import { cuadreApi } from '../services/cuadreApi';

const ROLES = ['Contador', 'Digitador', 'Auditor'];

export default function PlanillasPanel({ jornada, bodegas, usuario, onAbrir, notificar }) {
  const [planillas, setPlanillas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ bodega: jornada.bodegas[0] || '', ubicacion: '', equipo: [] });
  const abierta = jornada.estado === 'ABIERTA';
  const nombreBodega = (c) => bodegas.find(b => b.codigo === c)?.nombre || c;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setPlanillas(await cuadreApi.planillas(jornada.id));
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setCargando(false);
    }
  }, [jornada.id, notificar]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const p = await cuadreApi.crearPlanilla(jornada.id, {
        bodega: form.bodega,
        ubicacion: form.ubicacion,
        equipo: form.equipo.filter(m => m.nombre.trim())
      });
      notificar('success', `Planilla #${p.id} creada. Ya puedes registrar artículos.`);
      setCreando(false);
      setForm({ bodega: jornada.bodegas[0] || '', ubicacion: '', equipo: [] });
      onAbrir(p.id);
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarMiembro = (i, campo, valor) => setForm(f => ({
    ...f, equipo: f.equipo.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m))
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900">Planillas de conteo</h2>
          <p className="text-xs text-slate-500">Cada equipo abre una planilla por bodega y ubicación y registra lo que cuenta.</p>
        </div>
        {abierta && !creando && (
          <button onClick={() => setCreando(true)} className="h-10 px-3 rounded-xl bg-[#E11D24] hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Nueva planilla
          </button>
        )}
      </div>

      {!abierta && (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
          <Lock className="w-4 h-4" /> La jornada está cerrada: solo se pueden consultar las planillas.
        </div>
      )}

      {creando && (
        <form onSubmit={crear} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600 uppercase">Bodega</span>
              <select value={form.bodega} onChange={e => setForm(f => ({ ...f, bodega: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-300 text-sm bg-white">
                {jornada.bodegas.map(b => <option key={b} value={b}>{b} · {nombreBodega(b)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 uppercase">Ubicación</span>
              <input value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))}
                placeholder="Ej: Pasillo 3, estantería alambres"
                className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E11D24]" />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase">Equipo</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, equipo: [...f.equipo, { nombre: '', rol: 'Contador' }] }))}
                className="text-xs font-bold text-[#E11D24] hover:underline">+ Agregar persona</button>
            </div>
            <p className="text-[11px] text-slate-500">Tú quedas como líder ({usuario.name || usuario.email}).</p>
            {form.equipo.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input value={m.nombre} onChange={e => cambiarMiembro(i, 'nombre', e.target.value)} placeholder="Nombre"
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-300 text-sm" />
                <select value={m.rol} onChange={e => cambiarMiembro(i, 'rol', e.target.value)}
                  className="h-9 px-2 rounded-lg border border-slate-300 text-sm bg-white">
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <button type="button" onClick={() => setForm(f => ({ ...f, equipo: f.equipo.filter((_, idx) => idx !== i) }))}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setCreando(false)} className="h-10 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700">Cancelar</button>
            <button disabled={guardando || !form.bodega} className="h-10 px-4 rounded-xl bg-[#E11D24] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5">
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />} Crear y empezar a contar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <div className="flex items-center justify-center py-10 text-slate-500 gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#E11D24]" /> Cargando planillas...</div>
      ) : planillas.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500">
          No hay planillas en esta jornada todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {planillas.map(p => (
            <button key={p.id} onClick={() => onAbrir(p.id)}
              className="w-full min-w-0 overflow-hidden text-left bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm rounded-2xl p-3 flex items-center gap-3 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.tipo === 'RECONTEO' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                {p.tipo === 'RECONTEO' ? <RotateCcw className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-900 text-sm">#{p.id} · {p.tipo === 'RECONTEO' ? 'Reconteo' : 'Conteo'}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-700">{p.bodega_codigo} · {p.bodega_nombre}</span>
                  {p.estado === 'CERRADA' && <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-[11px] font-bold text-slate-600">Cerrada</span>}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {p.ubicacion || 'Sin ubicación'} · Líder {p.lider_email} · {p.total_lineas} artículos registrados
                  {p.tipo === 'RECONTEO' && ` · ${p.total_items_reconteo} por recontar`}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
