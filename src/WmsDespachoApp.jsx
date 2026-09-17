import React from 'react';
import { useWms } from './context/WmsContext';
import Header from './components/Header';
import ControlBar from './components/ControlBar';
import KanbanBoard from './components/KanbanBoard';
import IncidentsView from './components/IncidentsView';
import BottomDock from './components/BottomDock';
import DispatchDetailDrawer from './components/DispatchDetailDrawer';
import IncidentModal from './components/IncidentModal';
import ReturnsDrawer from './components/ReturnsDrawer';
import ToastNotification from './components/ToastNotification';
import CreateDispatchModal from './components/CreateDispatchModal';
import HistorialView from './components/HistorialView';
import { Layers, AlertOctagon, Undo2, History } from 'lucide-react';

function AppContent() {
  const { 
    activeDockTab, 
    setActiveDockTab,
    createModalOpen, 
    setCreateModalOpen,
    kpis,
    devoluciones,
    setReturnsDrawerOpen
  } = useWms();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Contenedor Superior Sticky (Header + Pestañas + ControlBar) */}
      <div className="sticky top-0 z-30 bg-slate-100 pb-2 shadow-sm">
        {/* 1. Header Desktop-First (h-[68px]) con bloque de marca */}
      <Header />

      {/* Desktop Navigation Tabs (Hidden on mobile) */}
      <div className="hidden lg:flex items-center gap-2 w-full max-w-[1600px] mx-auto px-4 pt-4 pb-2">
        <button
          onClick={() => setActiveDockTab('waves')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeDockTab === 'waves'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Despachos</span>
          {kpis?.pendientesHoy > 0 && (
            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-lg ${activeDockTab === 'waves' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {kpis.pendientesHoy}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveDockTab('incidents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeDockTab === 'incidents'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertOctagon className="h-4 w-4" />
          <span>Novedades</span>
          {kpis?.conIncidencia > 0 && (
            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-lg ${activeDockTab === 'incidents' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'}`}>
              {kpis.conIncidencia}
            </span>
          )}
        </button>

        <button
          onClick={() => setReturnsDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
        >
          <Undo2 className="h-4 w-4 text-amber-600" />
          <span>Devoluciones</span>
          {devoluciones?.length > 0 && (
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-800">
              {devoluciones.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveDockTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeDockTab === 'history'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Historial</span>
        </button>
      </div>

      {/* 2. Barra de Control con Búsqueda Compacta y Filtros Desplegables */}
      <ControlBar />
      </div>

      {/* 4. Contenido Principal con pb-24 para despejar el BottomDock */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto pb-24">
        {activeDockTab === 'waves' && <KanbanBoard />}
        {activeDockTab === 'incidents' && <IncidentsView />}
        {activeDockTab === 'history' && <HistorialView />}
      </main>

      {/* 5. Dock Inferior Táctil */}
      <BottomDock />

      {/* 6. Modales y Bottom Sheets */}
      <DispatchDetailDrawer />
      <IncidentModal />
      <ReturnsDrawer />
      <CreateDispatchModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      <ToastNotification />
    </div>
  );
}

export default function WmsDespachoApp() {
  return <AppContent />;
}
