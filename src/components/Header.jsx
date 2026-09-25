import React from 'react';
import logoValenciana from '../assets/logo-valenciana.jpg';
import { useWms } from '../context/WmsContext';
import { Plus, WifiOff } from 'lucide-react';

export default function Header({ rightContent }) {
  const {
    setCreateModalOpen,
    kpis
  } = useWms();

  const sinConfirmarCount = kpis?.sinConfirmarEnServidor || 0;

  return (
    <header className="w-full h-[68px] bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shadow-sm border-t-4 border-t-[#E11D24] relative z-40">
      {/* 1. Bloque de Marca Premium */}
      <div className="h-full flex items-center gap-3 pl-4 pr-5 sm:pl-6 shrink-0 relative">
        <div className="relative">
          <img
            src={logoValenciana}
            alt="La Valenciana Ferrehogar"
            className="h-10 w-10 sm:h-11 sm:w-11 object-cover rounded-xl shadow-sm border border-slate-100"
          />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 leading-tight truncate">
            LA VALENCIANA <span className="text-[#E11D24]">FERREHOGAR</span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-widest uppercase leading-none mt-0.5">
            Logística Despachos
          </span>
        </div>
      </div>

      {/* 2. Estado En Línea y Controles Operativos */}
      <div className="flex items-center gap-2 shrink-0 pr-3 sm:pr-4">
        {rightContent}
        {/* Estado En Línea */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 mr-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-700">En línea</span>
        </div>

        {/* Badge: despachos sin confirmar en el servidor (solo visible si hay alguno) */}
        {sinConfirmarCount > 0 && (
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-400 mr-1 animate-pulse"
            title={`${sinConfirmarCount} despacho(s) creado(s) offline sin confirmación del servidor. Se reintentarán automáticamente.`}
          >
            <WifiOff className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <span className="text-xs font-bold text-amber-900">
              {sinConfirmarCount} sin confirmar
            </span>
          </div>
        )}

        {/* Botón Principal: Nuevo Despacho */}
        <button
          onClick={() => setCreateModalOpen(true)}
          className="h-10 px-4 bg-gradient-to-r from-[#E11D24] to-[#B9121B] hover:from-[#f02229] hover:to-[#cc141d] text-white rounded-xl font-bold transition-all duration-300 shadow-[0_4px_12px_rgba(225,29,36,0.25)] hover:shadow-[0_6px_16px_rgba(225,29,36,0.4)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 flex items-center gap-2 shrink-0"
          title="Registrar nuevo pedido de despacho"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm tracking-wide">Nuevo Despacho</span>
        </button>
      </div>
    </header>
  );
}
