import React from 'react';
import { WmsProvider, useWms } from './context/WmsContext';
import Header from './components/Header';
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
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-red-600 selection:text-white pb-24">
      {/* 1. Header Compacto Mobile-First */}
      <Header />

      {/* 2. Resumen / Acordeón de Métricas Operativas */}
      <MetricsCarousel />

      {/* 3. Contenido Principal según Pestaña Activa */}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {activeDockTab === 'waves' && <KanbanBoard />}
        {activeDockTab === 'packing' && <PackingStationView />}
        {activeDockTab === 'bays' && <BayFleetView />}
        {activeDockTab === 'incidents' && <IncidentsView />}
      </main>

      {/* 4. Dock Inferior Táctil con Botón Destacado de Escáner */}
      <BottomDock />

      {/* 5. Modales y Bottom Sheets */}
      <DispatchDetailDrawer />
      <IncidentModal />
      <PackageLabelModal />
      <BarcodeScannerModal />
      <ReturnsDrawer />
      <ToastNotification />
    </div>
  );
}

export default function App() {
  return (
    <WmsProvider>
      <AppContent />
    </WmsProvider>
  );
}
