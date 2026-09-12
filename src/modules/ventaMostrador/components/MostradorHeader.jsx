import React from 'react';
import { Link } from 'react-router-dom';
import logoValenciana from '../../../assets/logo-valenciana.jpg';
import { useVentaMostrador } from '../store/ventaMostrador';
import { Building2, RotateCcw, ExternalLink, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function MostradorHeader({ tituloModulo, subModulo, otraRuta, nombreOtraRuta }) {
  const { sedeActiva, setSedeActiva, reiniciarDatos, facturas, totalUnidadesBodega } = useVentaMostrador();

  const conteoPendientes = facturas.filter((f) => f.estado === 'pendiente').length;
  const conteoVitrina = facturas.filter((f) => f.estado === 'en_vitrina').length;
  const conteoSello = facturas.filter((f) => f.estado === 'lista_sello').length;
  const conteoFaltante = facturas.filter((f) => f.estado === 'faltante').length;

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* 1. Logotipo y Título de Marca e Identidad */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
            title="Volver al selector de estaciones"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <img
            src={logoValenciana}
            alt="La Valenciana Ferrehogar"
            className="h-9 w-9 object-cover rounded-lg shadow-sm shrink-0"
          />

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 leading-none tracking-tight">
                FERREHOGAR
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" /> Control por Sello
              </span>
            </div>
            <span className="text-xs font-bold text-[#E11D24] uppercase tracking-wider leading-tight truncate">
              {tituloModulo}
            </span>
          </div>
        </div>

        {/* 2. Mini-resumen de conteos operativos de fondo */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white border border-slate-700 font-bold">
            Unidades en Bodega: <b className="text-emerald-400 font-black">{totalUnidadesBodega || 0}</b>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Pendientes: <b className="text-slate-900">{conteoPendientes}</b>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            En Vitrina: <b>{conteoVitrina}</b>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
            Esperando Sello: <b className="text-purple-900">{conteoSello}</b>
          </span>
          {conteoFaltante > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 animate-pulse">
              Faltantes: <b>{conteoFaltante}</b>
            </span>
          )}
        </div>

        {/* 3. Controles Rápidos y Navegación entre estaciones */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="hidden sm:inline">En línea</span>
          </span>

          {/* Selector de Sede / Sede Única */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2.5 h-9">
            <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <select
              value={sedeActiva}
              onChange={(e) => setSedeActiva(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="BOG-VAL-01">Sede Principal Ferrehogar</option>
              <option value="BOG-VAL-02">Bodega Norte Mostrador</option>
            </select>
          </div>

          {/* Botón para abrir la otra estación en pestaña nueva (simulación multi-equipo) */}
          {otraRuta && (
            <a
              href={otraRuta}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
              title={`Abrir ${nombreOtraRuta} en una nueva pestaña`}
            >
              <span className="hidden sm:inline">Abrir</span> {nombreOtraRuta}
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          )}

          {/* Reiniciar datos demo */}
          <button
            onClick={() => {
              if (window.confirm('¿Deseas reiniciar los datos de demostración a su estado inicial?')) {
                reiniciarDatos();
              }
            }}
            className="h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex shrink-0"
            title="Reiniciar datos demo de mostrador"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
