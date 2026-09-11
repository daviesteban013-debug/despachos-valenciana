import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, 
  Printer, 
  QrCode, 
  Barcode, 
  CheckCircle2, 
  MapPin, 
  Truck, 
  Warehouse 
} from 'lucide-react';

export default function PackageLabelModal() {
  const { packageLabelDespacho, setPackageLabelDespacho, playBeep, showToast } = useWms();

  if (!packageLabelDespacho) return null;

  const handlePrint = () => {
    playBeep(1200);
    showToast(`Enviado a Impresora Térmica Zebra (Bahía ${packageLabelDespacho.bahia_asignada})`, 'success');
    window.print();
  };

  const totalPiezas = packageLabelDespacho.items?.reduce((acc, it) => acc + it.cantidad_solicitada, 0) || 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cabecera del Modal */}
        <div className="bg-[#E11D24] text-white p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            <span className="font-black text-xs uppercase tracking-wider">
              Etiqueta de Bulto & Remisión WMS
            </span>
          </div>
          <button
            onClick={() => setPackageLabelDespacho(null)}
            className="p-1 rounded-lg hover:bg-red-800 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ETIQUETA TÉRMICA ESTILO ZEBRA INDUSTRIAL (4x6 pulg) */}
        <div className="p-5 bg-white text-slate-950 font-sans border-b border-slate-200 print:m-0 print:p-2 space-y-4">
          
          {/* Logo y Encabezado Remitente */}
          <div className="border-2 border-slate-900 p-3 flex items-center justify-between">
            <div className="leading-tight">
              <span className="font-black text-base uppercase tracking-tight block">
                La Valenciana FERREHOGAR
              </span>
              <span className="text-[10px] text-slate-600 block">
                NIT: 890.501.240-1 • Cúcuta, N. de Santander
              </span>
              <span className="text-[10px] font-bold text-[#E11D24] block">
                DESPACHO DE BODEGA & FERRETERÍA
              </span>
            </div>
            <div className="h-10 w-10 border-2 border-slate-900 p-1 flex items-center justify-center font-mono font-black text-xs">
              BOG-01
            </div>
          </div>

          {/* Factura ERP y Orden en Tamaño Gigante */}
          <div className="border-2 border-slate-900 p-3 bg-slate-50 text-center space-y-1">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block">
              Factura Electrónica ERP / Pedido
            </span>
            <div className="font-mono text-2xl sm:text-3xl font-black text-slate-950 tracking-wider">
              {packageLabelDespacho.codigo_factura_erp || packageLabelDespacho.codigo_orden}
            </div>
            <span className="font-mono text-xs font-bold text-slate-600">
              Orden WMS: {packageLabelDespacho.codigo_orden}
            </span>
          </div>

          {/* Datos del Destinatario */}
          <div className="border-2 border-slate-900 p-3 space-y-1.5 text-xs">
            <span className="text-[9px] uppercase font-extrabold text-slate-500 block">DESTINATARIO:</span>
            <h3 className="font-black text-sm uppercase leading-tight">
              {packageLabelDespacho.cliente_nombre}
            </h3>
            <p className="font-semibold text-slate-700">
              Zona de Entrega: <strong className="text-slate-950">{packageLabelDespacho.zona_entrega}</strong>
            </p>
          </div>

          {/* Muelle, Transportadora, Peso y Bultos */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border-2 border-slate-900 p-2.5 text-center">
              <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Bahía de Carga</span>
              <span className="font-mono text-lg font-black text-purple-900 block">
                {packageLabelDespacho.bahia_asignada}
              </span>
            </div>
            <div className="border-2 border-slate-900 p-2.5 text-center">
              <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Transportadora</span>
              <span className="text-xs font-black block mt-1">
                {packageLabelDespacho.transportadora}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border-2 border-slate-900 p-2 text-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Peso Báscula</span>
              <span className="font-mono font-black text-sm">{packageLabelDespacho.peso_bascula_kg || packageLabelDespacho.peso_total_kg} kg</span>
            </div>
            <div className="border-2 border-slate-900 p-2 text-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Piezas</span>
              <span className="font-mono font-black text-sm">{totalPiezas} und</span>
            </div>
          </div>

          {/* Código QR y Código de Barras de Remisión */}
          <div className="border-2 border-slate-900 p-3 flex items-center justify-between gap-3 bg-white">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block">
                GUÍA DE REMISIÓN:
              </span>
              <span className="font-mono text-sm font-black tracking-wider block">
                {packageLabelDespacho.numero_guia}
              </span>
              <div className="flex items-center gap-1 text-[9px] text-slate-600 font-mono">
                <span>REVISADO WMS VALENCIANA</span>
              </div>
            </div>

            {/* Simulación Gráfica de Código QR */}
            <div className="h-16 w-16 bg-slate-950 p-1 rounded-md flex items-center justify-center shrink-0">
              <QrCode className="h-full w-full text-white" />
            </div>
          </div>

        </div>

        {/* Botones de Acción */}
        <div className="p-4 bg-slate-50 flex items-center justify-end gap-2.5 print:hidden">
          <button
            onClick={() => setPackageLabelDespacho(null)}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Etiqueta</span>
          </button>
        </div>

      </div>
    </div>
  );
}
