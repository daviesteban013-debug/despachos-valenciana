import React from 'react';
import { Link } from 'react-router-dom';
import logoValenciana from '../../../assets/logo-valenciana.jpg';
import {
  Receipt,
  ShoppingBag,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Truck,
  Sparkles,
  Boxes
} from 'lucide-react';

export default function SelectorPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900">
      <div className="max-w-6xl w-full space-y-8">
        {/* Cabecera / Identidad */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-200">
            <img
              src={logoValenciana}
              alt="La Valenciana FERREHOGAR"
              className="h-10 w-10 object-cover rounded-xl shadow-xs"
            />
            <div className="text-left">
              <span className="block text-sm font-black text-slate-900 leading-tight">
                LA VALENCIANA FERREHOGAR
              </span>
              <span className="block text-xs font-bold text-[#E11D24] uppercase tracking-wider">
                Control de Despacho en Mostrador
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            ¿Qué pantalla o estación eres?
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Cada equipo físico de la tienda opera su propia pantalla dedicada. Selecciona la estación correspondiente para comenzar o pruébalas abriendo ambas en pestañas separadas:
          </p>
        </div>

        {/* Tarjetas de Selección de Pantalla */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Estación 1: Facturación */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 hover:border-[#E11D24] transition-all p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-lg group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#E11D24] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-black text-[#E11D24] uppercase tracking-wider">
                  Ruta: /facturacion
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Estación de Facturación
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Quien genera la factura trabaja aquí. Define la sección/bodega obligatoria por ítem, visualiza el avance de vitrina, vigila alertas de faltantes y confirma el sello físico para descontar el inventario original.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Creación de pedidos con sección obligatoria por ítem</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bandeja de facturas congeladas por faltante</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Botón "Confirmar sello / Entregado" (descuento real)</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <Link
                to="/facturacion"
                className="w-full min-h-[48px] py-3.5 px-6 bg-[#E11D24] hover:bg-red-700 active:scale-95 text-white rounded-xl text-sm font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Abrir Estación Facturación</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="/facturacion"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <span>Abrir en nueva pestaña</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Estación 2: Vitrina */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 hover:border-amber-500 transition-all p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-lg group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-black text-amber-700 uppercase tracking-wider">
                  Ruta: /vitrina
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Estación de Vitrina
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Quien alista la mercancía trabaja aquí de pie, en modo solo consulta y confirmación de estado. Agrupa ítems por sección, filtra por pasillos de bodega y confirma entrega completa o reporta faltante sin editar cantidades.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ítems agrupados visualmente por sección de bodega</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Filtro superior rápido por sección (chips táctiles)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cero edición de cantidades (blindaje de inventario)</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <Link
                to="/vitrina"
                className="w-full min-h-[48px] py-3.5 px-6 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-sm font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Abrir Estación Vitrina</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="/vitrina"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <span>Abrir en nueva pestaña</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Estación 3: Panel de Inventario (Rol Admin) */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 hover:border-blue-600 transition-all p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-lg group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Boxes className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-black text-blue-600 uppercase tracking-wider">
                  Ruta: /inventario (Admin)
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Gestión de Inventario
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Panel de administración del catálogo de 350 productos y stock exacto por bodega. Importación y conciliación desde Excel del ERP sin sobrescrituras ciegas.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Catálogo maestro con 350+ productos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Stock por bodega con desglose expandible</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Importador y conciliador de Excel (.xlsx)</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <Link
                to="/inventario"
                className="w-full min-h-[48px] py-3.5 px-6 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-sm font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Abrir Panel Inventario</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="/inventario"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <span>Abrir en nueva pestaña</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Tip de Sincronización y Enlace al WMS Previo */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <b>Sincronización en tiempo real:</b> Al crear una factura en Facturación o confirmar en Vitrina, el cambio se refleja al instante entre pestañas abiertas sin recargar.
            </span>
          </div>

          <Link
            to="/wms"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-slate-500" />
            <span>Ver WMS Despacho a Domicilio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
