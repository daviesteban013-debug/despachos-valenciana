import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, CalendarDays, ClipboardList, Scale, Loader2, ShieldCheck, X } from 'lucide-react';
import AuthGate from '../../../components/AuthGate';
import GoogleAuthBadge from '../../../components/GoogleAuthBadge';
import { cuadreApi } from '../services/cuadreApi';
import JornadasPanel from '../components/JornadasPanel';
import PlanillasPanel from '../components/PlanillasPanel';
import CapturaPlanilla from '../components/CapturaPlanilla';
import CuadrePanel from '../components/CuadrePanel';

const CLAVE_JORNADA = 'cuadre_jornada_activa';

const leerJornadaGuardada = () => {
  try { return Number(localStorage.getItem(CLAVE_JORNADA)) || null; } catch { return null; }
};
const guardarJornada = (id) => {
  try { id ? localStorage.setItem(CLAVE_JORNADA, String(id)) : localStorage.removeItem(CLAVE_JORNADA); } catch { /* sin almacenamiento */ }
};

export default function CuadreInventarioPage() {
  return (
    <AuthGate titulo="Cuadre de Inventario" subtitulo="Conteo físico, reconteo y cuadre contra el TNS" icono={ClipboardCheck}>
      {(usuario, setUsuario) => <Cuadre usuario={usuario} setUsuario={setUsuario} />}
    </AuthGate>
  );
}

const PESTANAS = [
  { id: 'planillas', etiqueta: 'Conteo', icono: ClipboardList },
  { id: 'cuadre', etiqueta: 'Cuadre', icono: Scale },
  { id: 'jornadas', etiqueta: 'Jornadas', icono: CalendarDays }
];

function Cuadre({ usuario, setUsuario }) {
  const [permisos, setPermisos] = useState(null);
  const [bodegas, setBodegas] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [jornadaId, setJornadaId] = useState(leerJornadaGuardada);
  const [pestana, setPestana] = useState('planillas');
  const [planillaId, setPlanillaId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);

  const notificar = useCallback((tipo, texto) => {
    setAviso({ tipo, texto, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!aviso || aviso.tipo === 'error') return;
    const t = setTimeout(() => setAviso(a => (a?.id === aviso.id ? null : a)), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  const cargarJornadas = useCallback(async () => {
    const lista = await cuadreApi.jornadas();
    setJornadas(lista);
    setJornadaId(actual => {
      if (actual && lista.some(j => j.id === actual)) return actual;
      const preferida = lista.find(j => j.estado === 'ABIERTA') || lista[0];
      return preferida?.id || null;
    });
    return lista;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, b] = await Promise.all([cuadreApi.permisos(), cuadreApi.bodegas()]);
        setPermisos(p);
        setBodegas(b);
        const lista = await cargarJornadas();
        if (lista.length === 0) setPestana('jornadas');
      } catch (err) {
        notificar('error', err.message);
      } finally {
        setCargando(false);
      }
    })();
  }, [cargarJornadas, notificar]);

  useEffect(() => { guardarJornada(jornadaId); }, [jornadaId]);

  const jornada = jornadas.find(j => j.id === jornadaId) || null;
  const esAdmin = Boolean(permisos?.es_admin);

  const seleccionarJornada = (id) => {
    setJornadaId(id);
    setPlanillaId(null);
    setPestana('planillas');
  };

  const abrirPlanilla = (id) => {
    setPlanillaId(id);
    setPestana('planillas');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link to="/" className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Volver al inicio">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <img src="/logo-valenciana.png" alt="La Valenciana" className="h-9 w-9 rounded-lg object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black leading-none">Cuadre de Inventario</span>
              {esAdmin && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-900 text-white flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-[#E11D24] truncate block">
              {jornada ? `${jornada.nombre}${jornada.estado === 'CERRADA' ? ' (cerrada)' : ''}` : 'Sin jornada activa'}
            </span>
          </div>
          <div className="shrink-0">
            <GoogleAuthBadge user={usuario} setUser={setUsuario} />
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 flex gap-1">
          {PESTANAS.map(p => {
            const Icono = p.icono;
            const activa = pestana === p.id;
            return (
              <button key={p.id} onClick={() => { setPestana(p.id); if (p.id !== 'planillas') setPlanillaId(null); }}
                className={`px-3 py-2.5 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activa ? 'border-[#E11D24] text-[#E11D24]' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}>
                <Icono className="w-4 h-4" /> {p.etiqueta}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {aviso && (
          <div className={`p-3 rounded-xl border text-sm font-semibold flex items-start justify-between gap-2 ${
            aviso.tipo === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
          }`}>
            <span>{aviso.texto}</span>
            <button onClick={() => setAviso(null)} className="text-slate-400 hover:text-slate-700 shrink-0"><X className="w-4 h-4" /></button>
          </div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#E11D24]" /> Cargando cuadre de inventario...
          </div>
        ) : pestana === 'jornadas' || !jornada ? (
          <JornadasPanel jornadas={jornadas} bodegas={bodegas} esAdmin={esAdmin} jornadaId={jornadaId}
            onSeleccionar={seleccionarJornada} onCambio={cargarJornadas} notificar={notificar} />
        ) : pestana === 'cuadre' ? (
          <CuadrePanel jornada={jornada} bodegas={bodegas} esAdmin={esAdmin} onAbrirPlanilla={abrirPlanilla} notificar={notificar} />
        ) : planillaId ? (
          <CapturaPlanilla key={planillaId} planillaId={planillaId} jornada={jornada} bodegas={bodegas} usuario={usuario}
            esAdmin={esAdmin} onVolver={() => { setPlanillaId(null); cargarJornadas(); }} notificar={notificar} />
        ) : (
          <PlanillasPanel jornada={jornada} bodegas={bodegas} usuario={usuario} onAbrir={abrirPlanilla} notificar={notificar} />
        )}
      </main>
    </div>
  );
}
