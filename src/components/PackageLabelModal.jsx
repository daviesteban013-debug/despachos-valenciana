import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';

export default function PackageLabelModal({ despacho, onClose }) {
  const ticketRef = useRef(null);

  if (!despacho) return null;

  const now = new Date();
  const fecha = now.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const jornada = now.getHours() < 12 ? 'AM' : 'PM';

  const totalBultos = despacho.items?.reduce((acc, it) => acc + (it.cantidad_solicitada || 0), 0) || despacho.bultos_total || 0;

  // Cuadrillas reales de La Valenciana
  const CUADRILLAS = {
    'WRO-482': 'LEO - JULIAN',
    'STZ-910': 'ANDERSON - JHOAN',
    'ENV-301': 'JEFFERSON - MAURICIO',
    'MC-441':  'JESUS - ALEJANDRO'
  };
  const cuadrilla = CUADRILLAS[despacho.vehiculo_placa] || despacho.vehiculo_placa || 'Sin asignar';

  const qrData = encodeURIComponent(despacho.id || despacho.codigo_orden);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

  const handlePrint = () => {
    const printContent = ticketRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=320,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tirilla Despacho - ${despacho.codigo_factura_erp || despacho.codigo_orden}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.4;
            width: 76mm;
            color: #000;
          }
          .ticket { padding: 4mm 2mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }
          .subtitle { font-size: 10px; color: #555; margin-top: 2px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .label { color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
          .value { font-weight: bold; font-size: 12px; }
          .big-value { font-weight: bold; font-size: 18px; text-align: center; margin: 4px 0; }
          .qr { text-align: center; margin: 8px 0; }
          .qr img { width: 100px; height: 100px; }
          .firma { border-bottom: 1px solid #000; height: 40px; margin: 12px 8px 4px 8px; }
          .firma-label { text-align: center; font-size: 9px; color: #555; }
          .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
          .items-table th { text-align: left; font-size: 9px; color: #555; border-bottom: 1px solid #ccc; padding: 2px 0; }
          .items-table td { font-size: 10px; padding: 2px 0; }
          .items-table td:last-child { text-align: right; font-weight: bold; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="bg-[#E11D24] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            <span className="text-sm font-bold">Tirilla de Despacho</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-red-800/60 hover:bg-red-900 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview del Ticket */}
        <div className="p-4 max-h-[65vh] overflow-y-auto bg-slate-50">
          <div 
            ref={ticketRef}
            className="bg-white border border-slate-200 rounded-lg p-4 shadow-inner"
            style={{ fontFamily: "'Courier New', monospace", fontSize: '11px', lineHeight: '1.5' }}
          >
            {/* Encabezado */}
            <div className="center" style={{ textAlign: 'center' }}>
              <div className="title" style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                LA VALENCIANA FERREHOGAR
              </div>
              <div className="subtitle" style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                Control de Despacho a Domicilio
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Factura */}
            <div>
              <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Remisión / Factura:</span>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                # {despacho.codigo_factura_erp || despacho.id}
              </div>
            </div>

            {/* Fecha y Jornada */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', marginTop: '4px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#555' }}>FECHA:</span>
                <div style={{ fontWeight: 'bold' }}>{fecha}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: '#555' }}>HORA / JORNADA:</span>
                <div style={{ fontWeight: 'bold' }}>{hora} - {jornada}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Cliente */}
            <div>
              <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Cliente:</span>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{despacho.cliente_nombre}</div>
            </div>

            {/* Destino */}
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Destino:</span>
              <div style={{ fontWeight: 'bold' }}>{despacho.zona_entrega}</div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Cuadrilla / Vehículo */}
            <div>
              <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Cuadrilla / Vehículo:</span>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                {cuadrilla} ({despacho.vehiculo_placa || 'N/A'})
              </div>
            </div>

            {/* Total Bultos */}
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Total Bultos:</span>
              <div style={{ fontWeight: 'bold', fontSize: '20px', textAlign: 'center', margin: '4px 0' }}>
                {totalBultos} bultos
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Detalle de ítems */}
            <div>
              <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Detalle:</span>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontSize: '9px', color: '#555', borderBottom: '1px solid #ccc', padding: '2px 0' }}>Producto</th>
                    <th style={{ textAlign: 'right', fontSize: '9px', color: '#555', borderBottom: '1px solid #ccc', padding: '2px 0' }}>Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {despacho.items?.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontSize: '10px', padding: '2px 0', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.descripcion_producto}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10px', padding: '2px 0' }}>
                        {item.cantidad_solicitada} {item.unidad || 'UND'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Guía */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#555' }}>GUÍA:</span>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{despacho.numero_guia}</div>
              </div>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: 'center', margin: '10px 0' }}>
              <img 
                src={qrUrl} 
                alt="QR Despacho" 
                style={{ width: '100px', height: '100px', display: 'inline-block' }}
                crossOrigin="anonymous"
              />
              <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                {despacho.codigo_orden}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Firma de Recibido */}
            <div>
              <div style={{ borderBottom: '1px solid #000', height: '40px', margin: '8px 0' }} />
              <div style={{ textAlign: 'center', fontSize: '9px', color: '#555' }}>
                Firma de Recibido en Obra / Destino
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Pie */}
            <div style={{ textAlign: 'center', fontSize: '9px', color: '#888' }}>
              La Valenciana FERREHOGAR - Cúcuta, N. de Santander
            </div>
          </div>
        </div>

        {/* Botón de Impresión */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <button
            onClick={handlePrint}
            className="w-full min-h-[44px] bg-[#E11D24] hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
          >
            <Printer className="h-5 w-5" />
            <span>Imprimir Tirilla (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
