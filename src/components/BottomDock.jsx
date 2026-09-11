import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Layers, 
  PackageCheck, 
  Truck, 
  AlertOctagon, 
  Undo2 
} from 'lucide-react';

export default function BottomDock() {
  const { 
    activeDockTab, 
    setActiveDockTab, 
    kpis, 
    setReturnsDrawerOpen 
  } = useWms();

  const TABS = [
    {
      id: 'waves',
      label: 'Tablero Olas',
      icon: Layers,
      badge: kpis.pendientesHoy,
      badgeColor: 'bg-slate-800 text-white'
    },
    {
      id: 'packing',
      label: 'Mesa Packing',
      icon: PackageCheck,
      badge: kpis.enPacking,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      id: 'bays',
      label: 'Bahías & Flota',
      icon: Truck,
      badge: kpis.enBahia,
      badgeColor: 'bg-purple-600 text-white'
    },
    {
      id: 'incidents',
      label: 'Incidencias',
      icon: AlertOctagon,
      badge: kpis.incidencias,
      badgeColor: kpis.incidencias > 0 ? 'bg-[#E11D24] text-white animate-pulse' : 'bg-slate-300 text-slate-700'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-1.5 px-3">
      <div className="max-w-xl mx-auto grid grid-cols-4 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeDockTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveDockTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-150 min-h-[52px] select-none active:scale-95 ${
                isActive
                  ? 'bg-red-50 text-[#E11D24] font-extrabold shadow-sm ring-1 ring-red-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge > 0 && (
                  <span className={`absolute -top-1.5 -right-3 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-sm ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
