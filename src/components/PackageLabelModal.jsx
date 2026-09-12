import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, 
  Printer, 
  QrCode 
} from 'lucide-react';

export default function PackageLabelModal() {
  const { packageLabelDespacho, setPackageLabelDespacho, playBeep, showToast } = useWms();

  if (!packageLabelDespacho) return null;

  const handlePrint = () => {
    playBeep(1200);
    showToast(`Enviado a Impresora Térmica Zebra (${packageLabelDespacho.bahia_asignada})`, 'success');
    window.print();
  };

  const totalPiezas = packageLabelDespacho.items?.reduce((acc, it) => acc + it.cantidad_solicitada, 0) || 1;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 animate-fadeIn"
      onClick={() => setPackageLabelDespacho(null)}
    >
      <div 
        className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-300 overflow-hidden max-h-[92vh] flex flex-col animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull handle móvil */}
        <div className="pt-2 pb-1 bg-[#E11D24] md:hidden cursor-pointer" onClick={() => setPackageLabelDespacho(null)}>
          <div className="w-12 h-1.5 bg-white/40 rounded-full mx-auto" />
        </div>

        {/* Cabecera del Modal */}
        <div className="bg-[#E11D24] text-white p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            <span className="font-bold text-xs uppercase tracking-wider">
              Etiqueta de Bulto & Remisión WMS
            </span>
          </div>
          <button
            onClick={() => setPackageLabelDespacho(null)}
            className="h-11 w-11 flex items-center justify-center rounded-xl hover:bg-red-800 text-white transition-colors active:scale-95"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ETIQUETA TÉRMICA ESTILO ZEBRA INDUSTRIAL */}
        <div className="p-4 bg-white text-slate-950 font-sans border-b border-slate-200 overflow-y-auto space-y-3">
          
          {/* Logo y Encabezado */}
          <div className="border-2 border-slate-900 p-2.5 flex items-center justify-between">
            <div className="leading-tight">
              <span className="font-bold text-sm uppercase tracking-tight block">
                La Valenciana FERREHOGAR
              </span>
              <span className="text-xs text-slate-600 block font-semibold">
                Cúcuta • Despacho de Materiales
              </span>
            </div>
            <div className="h-9 w-9 border-2 border-slate-900 p-1 flex items-center justify-center font-mono font-bold text-xs">
              01
            </div>
          </div>

          {/* Factura ERP y Orden */}
          <div className="border-2 border-slate-900 p-2.5 bg-slate-50 text-center space-y-0.5">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
              Factura Electrónica ERP / Pedido
            </span>
            <div className="font-mono text-2xl font-bold text-slate-950 tracking-wider">
              {packageLabelDespacho.codigo_factura_erp || packageLabelDespacho.codigo_orden}
            </div>
            <span className="font-mono text-xs font-bold text-slate-600">
              WMS: {packageLabelDespacho.codigo_orden}
            </span>
          </div>

          {/* Destinatario */}
          <div className="border-2 border-slate-900 p-2.5 space-y-1 text-xs">
            <span className="text-xs uppercase font-bold text-slate-500 block">DESTINATARIO:</span>
            <h3 className="font-bold text-sm uppercase leading-tight">
              {packageLabelDespacho.cliente_nombre}
            </h3>
            <p className="font-medium text-slate-700">
              Zona: <strong className="text-slate-950">{packageLabelDespacho.zona_entrega}</strong>
            </p>
          </div>

          {/* Muelle y Transportadora */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border-2 border-slate-900 p-2 text-center">
              <span className="text-xs font-bold uppercase text-slate-500 block">Bahía Carga</span>
              <span className="font-mono text-base font-bold text-purple-900 block">
                {packageLabelDespacho.bahia_asignada}
              </span>
            </div>
            <div className="border-2 border-slate-900 p-2 text-center">
              <span className="text-xs font-bold uppercase text-slate-500 block">Flota / Guía</span>
              <span className="text-xs font-bold block mt-0.5 truncate">
                {packageLabelDespacho.transportadora}
              </span>
            </div>
          </div>

          {/* Peso y Bultos */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border-2 border-slate-900 p-2 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase block">Peso Báscula</span>
              <span className="font-mono font-bold text-sm">{packageLabelDespacho.peso_bascula_kg || packageLabelDespacho.peso_total_kg} kg</span>
            </div>
            <div className="border-2 border-slate-900 p-2 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase block">Total Piezas</span>
              <span className="font-mono font-bold text-sm">{totalPiezas} und</span>
            </div>
          </div>

          {/* QR de Remisión */}
          <div className="border-2 border-slate-900 p-2.5 flex items-center justify-between gap-2 bg-white">
            <div className="space-y-0.5 text-xs font-mono">
              <span className="text-xs font-bold text-slate-500 block">GUÍA DE REMISIÓN:</span>
              <span className="font-bold tracking-wider block text-sm">{packageLabelDespacho.numero_guia}</span>
              <span className="text-xs text-emerald-700 font-bold block">✓ AUDITADO VALENCIANA</span>
            </div>
            <div className="h-14 w-14 bg-slate-950 p-1 rounded-md flex items-center justify-center shrink-0">
              <QrCode className="h-full w-full text-white" />
            </div>
          </div>

        </div>

        {/* Acciones */}
        <div className="p-3 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={() => setPackageLabelDespacho(null)}
            className="h-11 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 active:scale-95"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="h-11 px-5 bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Etiqueta</span>
          </button>
        </div>

      </div>
    </div>
  );
}
