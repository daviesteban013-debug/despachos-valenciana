import React, { useState, useMemo } from 'react';
import { useWms } from '../context/WmsContext';
import DispatchCard from './DispatchCard';
import ControlBar from './ControlBar';
import {
  Inbox,
  Truck,
  LayoutGrid,
  AlertTriangle,
  Download,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

export default function KanbanBoard() {
  const {
    filteredDespachos,
    kpis,
    exportarCopiaExcel,
    reintentarSyncDrive,
  } = useWms();

  // 'pendientes' | 'despachados' | 'todos'
  const [activeTab, setActiveTab] = useState('pendientes');
  const [soloConIncidencia, setSoloConIncidencia] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [reintentandoTodos, setReintentandoTodos] = useState(false);

  const pendientes = useMemo(() =>
    filteredDespachos
      .filter((d) => d.estado_actual === 'PENDIENTE')
      .filter((d) => (soloConIncidencia ? Boolean(d.incidencia_activa) : true))
      .sort((a, b) => a.prioridad - b.prioridad),
    [filteredDespachos, soloConIncidencia]
  );

  const despachados = useMemo(() =>
    filteredDespachos
      .filter((d) => d.estado_actual === 'DESPACHADO')
      .filter((d) => (soloConIncidencia ? Boolean(d.incidencia_activa) : true))
      .sort((a, b) => {
        const tA = a.hora_salida ? new Date(a.hora_salida).getTime() : 0;
        const tB = b.hora_salida ? new Date(b.hora_salida).getTime() : 0;
        return tB - tA;
      }),
    [filteredDespachos, soloConIncidencia]
  );

  const todos = useMemo(() => [...pendientes, ...despachados], [pendientes, despachados]);

  // Banner de sync: usa sync_cloud (campo REAL del contexto) — NO sync_onedrive
  const conSyncPendiente = despachados.filter(
    (d) => d.sync_cloud?.estado === 'PENDIENTE' || d.sync_cloud?.estado === 'ERROR_SYNC'
  );

  const handleExportarExcel = async () => {
    setExportando(true);
    await exportarCopiaExcel();
    setExportando(false);
  };

  // Reintentar sync Drive — usa reintentarSyncDrive (función REAL del contexto)
  const handleReintentarTodos = async () => {
    setReintentandoTodos(true);
    for (const d of conSyncPendiente) {
      await reintentarSyncDrive(d.id);
    }
    setReintentandoTodos(false);
  };

  const despachosAMostrar =
    activeTab === 'pendientes' ? pendientes
    : activeTab === 'despachados' ? despachados
    : todos;

  const TABS = [
    {
      id: 'pendientes',
      label: 'Pendientes',
      count: kpis.pendientesTotal,
      Icon: Inbox,
      activeClass: 'bg-slate-800 text-white',
      countClass: 'bg-white text-slate-800',
    },
    {
      id: 'despachados',
      label: 'Despachados',
      count: kpis.despachadosTotal,
      Icon: Truck,
      activeClass: 'bg-emerald-600 text-white',
      countClass: 'bg-white text-emerald-700',
    },
    {
      id: 'todos',
      label: 'Todos',
      count: kpis.pendientesTotal + kpis.despachadosTotal,
      Icon: LayoutGrid,
      activeClass: 'bg-slate-900 text-white',
      countClass: 'bg-white text-slate-900',
    },
  ];

  return (
    <div className="w-full">

      {/* ── FRANJA UNIFICADA: pestanas + buscador + kardex + filtros + exportar ── */}
      <div className="w-full max-w-7xl mx-auto px-4 mb-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">

          {/* Izquierda: Segmented tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-2xl w-fit shrink-0">
            {TABS.map(({ id, label, count, Icon, activeClass, countClass }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 ${
                  activeTab === id ? activeClass : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-mono font-bold leading-none ${
                  activeTab === id ? countClass : 'bg-slate-300/80 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Derecha: buscador + kardex + filtros + novedad + exportar */}
          <div className="flex items-center gap-2 flex-1 lg:max-w-2xl justify-end flex-wrap">

            {/* ControlBar aporta: buscador expandible, Kardex ERP, boton Filtros + dropdown */}
            <ControlBar compact />

            {/* Toggle Con Novedad */}
            <button
              onClick={() => setSoloConIncidencia(!soloConIncidencia)}
              className={`h-11 flex items-center gap-1.5 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 shrink-0 shadow-sm ${
                soloConIncidencia
                  ? 'bg-amber-100 border-amber-400 text-amber-900'
                  : 'bg-white/90 backdrop-blur-sm border-slate-300/80 text-slate-600 hover:bg-slate-50'
              }`}
              title="Filtrar solo ordenes con novedad activa"
            >
              <AlertTriangle className={`h-4 w-4 ${soloConIncidencia ? 'text-amber-600' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Novedad</span>
              {kpis.conIncidencia > 0 && (
                <span className="px-1.5 rounded-lg text-[11px] font-mono font-bold bg-amber-500 text-white">
                  {kpis.conIncidencia}
                </span>
              )}
            </button>

            {/* Descargar Plantilla Drive */}
            <button
              onClick={handleExportarExcel}
              disabled={exportando}
              title="Descargar copia de la plantilla física de Google Drive (4 hojas de vehículos)"
              className="h-11 flex items-center gap-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-95 shrink-0 shadow-sm"
            >
              <Download className={`h-4 w-4 ${exportando ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{exportando ? 'Descargando...' : 'Plantilla Drive'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BANNER: sync pendiente con Google Drive (solo si hay ordenes con error) ── */}
      {conSyncPendiente.length > 0 && (
        <div className="w-full max-w-7xl mx-auto px-4 mb-4">
          <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-blue-700 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 animate-pulse" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  <span className="font-mono">{conSyncPendiente.length}</span>{' '}
                  {conSyncPendiente.length === 1
                    ? 'orden despachada tiene'
                    : 'ordenes despachadas tienen'}{' '}
                  sincronizacion pendiente con la plantilla de Google Drive
                </p>
                <p className="text-[11px] text-slate-600">
                  Las ordenes salieron de bodega pero falta asentar su fila en la hoja de Excel.
                </p>
              </div>
            </div>
            <button
              onClick={handleReintentarTodos}
              disabled={reintentandoTodos}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shrink-0 active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reintentandoTodos ? 'animate-spin' : ''}`} />
              <span>{reintentandoTodos ? 'Sincronizando...' : 'Reintentar pendientes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── GRID DE TARJETAS: ancho completo, scroll de pagina, sin scroll interno ── */}
      <div className="w-full max-w-7xl mx-auto px-4 pb-16">
        {despachosAMostrar.length === 0 ? (
          <div className="h-56 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 mt-4">
            {activeTab === 'pendientes' ? (
              <>
                <CheckCircle className="h-10 w-10 text-emerald-400" />
                <p className="text-sm font-bold text-slate-700">No hay despachos pendientes</p>
                <p className="text-xs text-slate-500">Crea el primero usando el boton &quot;+ Nuevo Despacho&quot;.</p>
              </>
            ) : activeTab === 'despachados' ? (
              <>
                <Clock className="h-10 w-10 text-slate-400" />
                <p className="text-sm font-bold text-slate-700">Aun no hay despachos hoy</p>
                <p className="text-xs text-slate-500">Los pedidos despachados en vehiculos apareceran aqui.</p>
              </>
            ) : (
              <>
                <LayoutGrid className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No hay ordenes</p>
                <p className="text-xs text-slate-500">Crea una nueva orden para comenzar.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {despachosAMostrar.map((despacho) => (
              <DispatchCard key={despacho.id} despacho={despacho} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
