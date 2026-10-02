import React from 'react';
import { useWms } from './context/WmsContext';
import Header from './components/Header';
import ControlBar from './components/ControlBar';
import KanbanBoard from './components/KanbanBoard';
import IncidentsView from './components/IncidentsView';
import InventoryView from './components/InventoryView';
import BottomDock from './components/BottomDock';
import DispatchDetailDrawer from './components/DispatchDetailDrawer';
import IncidentModal from './components/IncidentModal';
import ReturnsDrawer from './components/ReturnsDrawer';
import ToastNotification from './components/ToastNotification';
import CreateDispatchModal from './components/CreateDispatchModal';
import HistorialView from './components/HistorialView';
import { Layers, AlertOctagon, Undo2, History, Truck, Package, ShieldCheck } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import GoogleAuthBadge from './components/GoogleAuthBadge';
import logoValenciana from './assets/logo-valenciana.jpg';

function AppContent({ user, setUser }) {
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
      {/* 1. Header Desktop-First (h-[68px]) con bloque de marca y badge de auth */}
      <Header rightContent={<GoogleAuthBadge user={user} setUser={setUser} />} />

      {/* Desktop Navigation Tabs (Hidden on mobile) */}
      <div className="hidden lg:flex items-center gap-2 w-full max-w-[1600px] mx-auto px-4 pt-4 pb-2">
        <button
          onClick={() => setActiveDockTab('waves')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeDockTab === 'waves'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Despachos</span>
          {kpis?.pendientesHoy > 0 && (
            <span className={`text-xs font-mono font-bold leading-none min-w-[20px] text-center px-1.5 py-0.5 rounded-lg ${activeDockTab === 'waves' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {kpis.pendientesHoy}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveDockTab('incidents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeDockTab === 'incidents'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertOctagon className="h-4 w-4" />
          <span>Novedades</span>
          {kpis?.conIncidencia > 0 && (
            <span className={`text-xs font-mono font-bold leading-none min-w-[20px] text-center px-1.5 py-0.5 rounded-lg ${activeDockTab === 'incidents' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'}`}>
              {kpis.conIncidencia}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveDockTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeDockTab === 'inventory'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Catálogo</span>
        </button>

        <button
          onClick={() => setReturnsDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
        >
          <Undo2 className="h-4 w-4 text-amber-600" />
          <span>Devoluciones</span>
          {devoluciones?.length > 0 && (
            <span className="text-xs font-mono font-bold leading-none min-w-[20px] text-center px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-800">
              {devoluciones.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveDockTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeDockTab === 'history'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Historial</span>
        </button>
      </div>

      </div>

      {/* 4. Contenido Principal con pb-24 para despejar el BottomDock */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto pb-24">
        {activeDockTab === 'waves' && <KanbanBoard />}
        {activeDockTab === 'incidents' && <IncidentsView />}
        {activeDockTab === 'inventory' && <InventoryView />}
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
  const [user, setUser] = React.useState(() => {
    const saved = localStorage.getItem('wms_google_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Client ID obtenido desde el portal de Google Cloud
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  if (!clientId) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4">
          <AlertOctagon className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Falta Google Client ID</h2>
          <p className="text-sm text-slate-600">
            Debes configurar <code>VITE_GOOGLE_CLIENT_ID</code> en el archivo <code>.env</code> para habilitar el inicio de sesión.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {!user ? (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#7a0d10] flex items-center justify-center p-4">
          {/* Fondo con patrón sutil */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          
          <div className="relative bg-white/95 backdrop-blur-sm p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/40 max-w-sm w-full text-center space-y-6 border border-white/20">
            {/* Logo y marca */}
            <div className="space-y-3">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-100 mx-auto">
                  <img
                    src="/logo-valenciana.jpg"
                    alt="La Valenciana Ferrehogar"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                {/* Badge de app */}
                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#E11D24] rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <Truck className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-[#E11D24] uppercase tracking-[0.15em]">La Valenciana FERREHOGAR</p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">Panel de Logística</h2>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">Control de despachos, inventario y entregas</p>
              </div>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Acceso seguro</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Componente de auth */}
            <div className="flex flex-col items-center gap-3">
              <GoogleAuthBadge user={user} setUser={setUser} />
              <p className="text-[10px] text-slate-400 max-w-[220px] leading-relaxed">
                Solo las cuentas autorizadas por el administrador pueden ingresar al sistema.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <AppContent user={user} setUser={setUser} />
      )}
    </GoogleOAuthProvider>
  );
}
