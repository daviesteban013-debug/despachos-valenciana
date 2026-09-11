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
import { Database, ShieldCheck } from 'lucide-react';

function AppContent() {
  const { activeDockTab } = useWms();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-red-600 selection:text-white pb-20 md:pb-24">
      {/* 1. Header con Identidad Corporativa La Valenciana FERREHOGAR */}
      <Header />

      {/* 2. Carousel de Métricas Superiores */}
      <MetricsCarousel />

      {/* 3. Contenido según pestaña activa del Bottom Dock */}
      <main className="flex-1">
        {activeDockTab === 'waves' && <KanbanBoard />}
        {activeDockTab === 'packing' && <PackingStationView />}
        {activeDockTab === 'bays' && <BayFleetView />}
        {activeDockTab === 'incidents' && <IncidentsView />}
      </main>

      {/* 4. Barra Inferior Táctil (Bottom Navigation Dock) para el Pulgar */}
      <BottomDock />

      {/* 5. Modales y Bottom Sheets Modulares */}
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
