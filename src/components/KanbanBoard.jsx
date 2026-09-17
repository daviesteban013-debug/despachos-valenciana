import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import DispatchCard from './DispatchCard';
import { 
  Inbox, 
  Truck, 
  AlertTriangle, 
  FileSpreadsheet, 
  Download, 
  RefreshCw, 
  LayoutGrid, 
  Columns2,
  CheckCircle
} from 'lucide-react';

export default function KanbanBoard() {
  const { 
    filteredDespachos, 
    kpis, 
    exportarCopiaExcel,
    reintentarSyncOneDrive
  } = useWms();

  // 'pendientes' | 'despachados' | 'ambas'
  const [activeTab, setActiveTab] = useState('pendientes');
  const [soloConIncidencia, setSoloConIncidencia] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [reintentandoTodos, setReintentandoTodos] = useState(false);

  // Segmentación en los 2 estados
  const pendientes = filteredDespachos
    .filter((d) => d.estado_actual === 'PENDIENTE')
    .filter((d) => (soloConIncidencia ? Boolean(d.incidencia_activa) : true))
    .sort((a, b) => a.prioridad - b.prioridad);

  const despachados = filteredDespachos
    .filter((d) => d.estado_actual === 'DESPACHADO')
    .filter((d) => (soloConIncidencia ? Boolean(d.incidencia_activa) : true))
    .sort((a, b) => {
      const timeA = a.hora_salida ? new Date(a.hora_salida).getTime() : 0;
      const timeB = b.hora_salida ? new Date(b.hora_salida).getTime() : 0;
      return timeB - timeA;
    });



  const despachosConSyncPendiente = despachados.filter(
    (d) => d.sync_onedrive?.estado === 'PENDIENTE'
  );

  const handleExportarExcel = async () => {
    setExportando(true);
    await exportarCopiaExcel();
    setExportando(false);
  };

  const handleReintentarTodos = async () => {
    setReintentandoTodos(true);
    for (const d of despachosConSyncPendiente) {
      await reintentarSyncOneDrive(d.id);
    }
    setReintentandoTodos(false);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-1 space-y-2">
      
      {/* 1. BARRA SUPERIOR DE CONTROL: PESTAÑAS 2 ESTADOS + FILTRO NOVEDADES + EXPORTAR EXCEL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-slate-200 p-2 rounded-xl">
        
        {/* Selector Segmentado de Estados (Mobile First) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shrink-0 active:scale-95 ${
              activeTab === 'pendientes'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Inbox className="h-4 w-4" />
            <span>Pendientes</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold leading-none ${
              activeTab === 'pendientes' ? 'bg-white text-slate-800' : 'bg-slate-200 text-slate-800'
            }`}>
              {kpis.pendientesTotal}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('despachados')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shrink-0 active:scale-95 ${
              activeTab === 'despachados'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Despachados</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold leading-none ${
              activeTab === 'despachados' ? 'bg-white text-emerald-700' : 'bg-slate-200 text-slate-800'
            }`}>
              {kpis.despachadosTotal}
            </span>
          </button>

          {/* Opción ver ambos (pantallas grandes) */}
          <button
            onClick={() => setActiveTab('ambas')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 active:scale-95 ${
              activeTab === 'ambas'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Columns2 className="h-4 w-4" />
            <span>Ver Ambos</span>
          </button>
        </div>

        {/* Acciones Rápidas: Filtro Incidencias + Botón Exportar Copia */}
        <div className="flex items-center gap-4">
          {/* Toggle Novedades */}
          <button
            onClick={() => setSoloConIncidencia(!soloConIncidencia)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all active:scale-95 shrink-0 ${
              soloConIncidencia
                ? 'bg-amber-100 border-amber-400 text-amber-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className={`h-4 w-4 ${soloConIncidencia ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>Con Novedad</span>
            {kpis.conIncidencia > 0 && (
              <span className="px-1.5 py-0.2 rounded-lg text-[11px] font-mono font-bold bg-amber-500 text-white">
                {kpis.conIncidencia}
              </span>
            )}
          </button>

          {/* Botón Principal: Exportar Copia Excel */}
          <button
            onClick={handleExportarExcel}
            disabled={exportando}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 shrink-0"
            title="Descargar copia del archivo Excel con las 4 hojas de vehículos"
          >
            <Download className={`h-4 w-4 ${exportando ? 'animate-bounce' : ''}`} />
            <span>{exportando ? 'Generando...' : 'Exportar copia Excel'}</span>
          </button>
        </div>

      </div>

      {/* 2. BANNER DE ALERTA: SINCRONIZACIONES PENDIENTES CON ONEDRIVE (NO SILENCIOSO) */}
      {despachosConSyncPendiente.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-blue-700 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 animate-pulse" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                <span className="font-mono">{despachosConSyncPendiente.length}</span> {despachosConSyncPendiente.length === 1 ? 'orden despachada tiene' : 'órdenes despachadas tienen'} sincronización pendiente con la plantilla de OneDrive
              </p>
              <p className="text-[11px] text-slate-600">
                Las órdenes salieron de bodega pero falta asentar su fila en la hoja de Excel.
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
      )}

      {/* 3. VISTA DE ÓRDENES: 2 PANELES / COLUMNAS */}
      <div className={`grid gap-4 ${
        activeTab === 'ambas' 
          ? 'grid-cols-1 lg:grid-cols-2' 
          : 'grid-cols-1'
      }`}>

        {/* PANEL A: PENDIENTES */}
        {(activeTab === 'pendientes' || activeTab === 'ambas') && (
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3 flex flex-col space-y-3">
            {/* Cabecera de Columna */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 border-l-4 border-l-slate-800 text-slate-800 p-2.5 rounded-xl">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-slate-700" />
                <span className="text-xs font-bold uppercase tracking-wider">Órdenes Pendientes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-slate-800 text-white">
                  {pendientes.length}
                </span>
              </div>
            </div>

            {/* Listado de tarjetas de pendientes */}
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-242px)] pr-1">
              {pendientes.length === 0 ? (
                <div className="h-44 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-center space-y-1.5">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-bold text-slate-700">No hay despachos pendientes</p>
                  <p className="text-xs text-slate-500">Crea el primero usando el botón "+ Nuevo Despacho".</p>
                </div>
              ) : (
                pendientes.map((despacho) => (
                  <DispatchCard key={despacho.id} despacho={despacho} />
                ))
              )}
            </div>
          </div>
        )}

        {/* PANEL B: DESPACHADOS */}
        {(activeTab === 'despachados' || activeTab === 'ambas') && (
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3 flex flex-col space-y-3">
            {/* Cabecera de Columna */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 border-l-4 border-l-emerald-700 text-slate-900 p-2.5 rounded-xl">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-700" />
                <span className="text-xs font-bold uppercase tracking-wider">Despachados (Historial)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-700 text-white">
                  {despachados.length}
                </span>
              </div>
            </div>

            {/* Listado de tarjetas de despachados */}
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
              {despachados.length === 0 ? (
                <div className="h-44 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-center space-y-1.5">
                  <Clock className="h-8 w-8 text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">Aún no hay despachos hoy</p>
                  <p className="text-xs text-slate-500">Los pedidos despachados en vehículos aparecerán aquí.</p>
                </div>
              ) : (
                despachados.map((despacho) => (
                  <DispatchCard key={despacho.id} despacho={despacho} />
                ))
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
