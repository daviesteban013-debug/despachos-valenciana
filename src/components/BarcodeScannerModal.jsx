import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  X, 
  ScanLine, 
  Barcode, 
  QrCode, 
  Check, 
  Sparkles, 
  Search, 
  ArrowRight 
} from 'lucide-react';

export default function BarcodeScannerModal() {
  const { 
    scannerModalOpen, 
    setScannerModalOpen, 
    setSearchQuery, 
    setSelectedDespachoId, 
    despachos, 
    playBeep, 
    showToast 
  } = useWms();

  const [inputCode, setInputCode] = useState('');

  if (!scannerModalOpen) return null;

  const handleScanSample = (code) => {
    playBeep(1200); // Beep de pistola RF
    setSearchQuery(code);
    
    // Si coincide con una orden, la abre directamente
    const matched = despachos.find(
      (d) => d.codigo_orden.toLowerCase() === code.toLowerCase() || 
             d.codigo_factura_erp.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      setSelectedDespachoId(matched.id);
      showToast(`¡Código escaneado! Orden ${matched.codigo_factura_erp} localizada.`, 'success');
    } else {
      showToast(`Filtrado por código escaneado: "${code}"`, 'info');
    }

    setScannerModalOpen(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    handleScanSample(inputCode.trim());
  };

  const SAMPLE_BARCODES = [
    { label: 'Factura FE-80297 (La Campana - Urgente)', code: 'FE-80297' },
    { label: 'Factura 1M-56752 (Const. Viviendas del Norte)', code: '1M-56752' },
    { label: 'Factura FE-80280 (Hidrosanitaria)', code: 'FE-80280' },
    { label: 'SKU Cemento Gris 50kg Argos', code: 'SKU-CEM-50' },
    { label: 'SKU Varilla Corrugada 1/2" Diaco', code: 'SKU-VAR-12' },
    { label: 'SKU Taladro DeWalt Inalámbrico', code: 'SKU-TAL-DEW' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Encabezado */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 text-[#E11D24]">
              <ScanLine className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                Simulador de Pistola RF & Lector Láser
              </h3>
              <p className="text-[11px] text-slate-400">Escaneo de Códigos de Barras 1D / QR</p>
            </div>
          </div>

          <button
            onClick={() => setScannerModalOpen(false)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          
          {/* Animación del Visor Láser */}
          <div className="relative h-32 bg-black rounded-xl border-2 border-slate-700 flex flex-col items-center justify-center overflow-hidden">
            {/* Línea roja láser animada */}
            <div className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_12px_#E11D24] animate-bounce" />
            
            <Barcode className="h-14 w-40 text-slate-600 opacity-60" />
            <span className="text-[10px] font-mono text-red-400 font-bold tracking-widest mt-1">
              APUNTE AL CÓDIGO DE BARRAS O QR
            </span>
          </div>

          {/* Formulario Manual / Pistoleo */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
              Entrada de Lector / Digitar Código:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Ej. FE-80297 o SKU-CEM-50..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#E11D24]"
              />
              <button
                type="submit"
                className="bg-[#E11D24] hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95"
              >
                Pistolear
              </button>
            </div>
          </form>

          {/* Códigos de Prueba Rápidos para Simulación */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Códigos de Prueba Rápidos (Hacer Clic):
            </span>
            <div className="space-y-1.5">
              {SAMPLE_BARCODES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleScanSample(item.code)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 hover:bg-red-950/40 hover:border-red-500/40 border border-slate-700/80 text-left transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-slate-400 group-hover:text-red-400 transition-colors" />
                    <span className="text-xs font-bold text-slate-200">{item.label}</span>
                  </div>
                  <span className="font-mono text-xs font-black text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    {item.code}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
