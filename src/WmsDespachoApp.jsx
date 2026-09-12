import React from 'react';
import { useWms } from './context/WmsContext';
import Header from './components/Header';
import ControlBar from './components/ControlBar';
import MetricsCarousel from './components/MetricsCarousel';
import KanbanBoard from './components/KanbanBoard';
import PackingStationView from './components/PackingStationView';
import BayFleetView from './components/BayFleetView';
import IncidentsView from './components/IncidentsView';
import BottomDock from './components/BottomDock';
import DispatchDetailDrawer from './components/DispatchDetailDrawer';
import IncidentModal from './components/IncidentModal';
import PackageLabelModal from './components/PackageLabelModal';
import BarcodeScannerModal from './components/BarcodeScannerModal';
import ReturnsDrawer from './components/ReturnsDrawer';
import ToastNotification from './components/ToastNotification';

function AppContent() {
  const { activeDockTab } = useWms();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* 1. Header Compacto Mobile-First (h-14) */}
      <Header />

      {/* 2. Barra de Control con Búsqueda Compacta y Filtros Desplegables */}
      <ControlBar />

      {/* 3. Resumen de Métricas Operativas (< 64px) */}
      <MetricsCarousel />

      {/* 4. Contenido Principal con pb-24 para despejar el BottomDock */}
      <main className="flex-1 w-full max-w-7xl mx-auto pb-24">
        {activeDockTab === 'waves' && <KanbanBoard />}
        {activeDockTab === 'packing' && <PackingStationView />}
        {activeDockTab === 'bays' && <BayFleetView />}
        {activeDockTab === 'incidents' && <IncidentsView />}
      </main>

      {/* 5. Dock Inferior Táctil con Botón Destacado de Escáner */}
      <BottomDock />

      {/* 6. Modales y Bottom Sheets */}
      <DispatchDetailDrawer />
      <IncidentModal />
      <PackageLabelModal />
      <BarcodeScannerModal />
      <ReturnsDrawer />
      <ToastNotification />
    </div>
  );
}

export default function WmsDespachoApp() {
  return <AppContent />;
}
