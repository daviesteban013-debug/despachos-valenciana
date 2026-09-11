import React from 'react';
import { useWms } from '../context/WmsContext';
import { 
  Warehouse, 
  MapPin
} from 'lucide-react';

export default function BayFleetView() {
  const { despachos, rutasVehiculos, setSelectedDespachoId } = useWms();

  const BAYS_CONFIG = [
    { bayCode: 'Bahía A-01', rutaId: 'rt-101', type: 'Muelle Principal' },
    { bayCode: 'Bahía A-02', rutaId: 'rt-102', type: 'Muelle Mediano' },
    { bayCode: 'Bahía B-01', rutaId: 'rt-103', type: 'Muelle Carga Pesada' },
    { bayCode: 'Bahía B-03', rutaId: 'rt-104', type: 'Muelle Express Moto' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 space-y-4">
      
      {/* Encabezado */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
            <Warehouse className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Mapa de Bahías & Flota
            </h2>
            <p className="text-xs text-slate-500">
              Control físico de estibas listas, cubicaje y despacho
            </p>
          </div>
        </div>
      </div>

      {/* Grilla de Bahías Físicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BAYS_CONFIG.map((bay) => {
          const ruta = rutasVehiculos.find((r) => r.id === bay.rutaId);
          if (!ruta) return null;

          // Despachos ubicados en esta bahía (en estado LISTO o PACKING)
          const ordenesEnBahia = despachos.filter(
            (d) => d.bahia_asignada === bay.bayCode && (d.estado_actual === 'LISTO' || d.estado_actual === 'PACKING')
          );

          const pesoTotalCargado = ordenesEnBahia.reduce((acc, d) => acc + (d.peso_total_kg || 0), 0);
          const capacidadCamion = ruta.vehiculo.capacidad_kg || 5000;
          const porcentajeOcupacion = Math.min(100, Math.round((pesoTotalCargado / capacidadCamion) * 100));

          return (
            <div 
              key={bay.bayCode}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5 hover:border-purple-300 transition-all"
            >
              {/* Encabezado Bahía */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center font-mono font-black text-purple-900 text-sm shrink-0">
                    {bay.bayCode.replace('Bahía ', '')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-sm">{bay.bayCode}</h3>
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {bay.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span>{ruta.zona}</span>
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                  ruta.estado === 'EN_CURSO'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-blue-50 text-blue-700 border-blue-300'
                }`}>
                  Ruta {ruta.estado}
                </span>
              </div>

              {/* Información del Vehículo y Conductor */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400 block">Vehículo / Placa</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-mono text-base font-black text-slate-900">{ruta.vehiculo.placa}</span>
                    <span className="text-xs text-slate-500 font-bold">({ruta.vehiculo.tipo})</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{ruta.vehiculo.modelo}</p>
                </div>

                <div>
                  <span className="text-xs uppercase font-bold text-slate-400 block">Conductor</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{ruta.conductor.nombre}</p>
                  <p className="text-xs text-purple-700 font-mono font-bold mt-0.5">{ruta.conductor.telefono}</p>
                </div>
              </div>

              {/* Medidor de Cubicaje / Peso Acumulado */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500 font-medium">Carga vs Capacidad:</span>
                  <span className="font-bold text-slate-900">
                    {Math.round(pesoTotalCargado)} kg / {capacidadCamion} kg ({porcentajeOcupacion}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      porcentajeOcupacion > 90 ? 'bg-red-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${porcentajeOcupacion}%` }}
                  />
                </div>
              </div>

              {/* Órdenes ubicadas físicamente en la bahía */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-bold">Estibas en Muelle:</span>
                  <span className="font-mono font-bold text-purple-700">{ordenesEnBahia.length} despachos</span>
                </div>

                {ordenesEnBahia.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-lg">
                    Bahía libre para recepción de estibas
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {ordenesEnBahia.map((ord) => (
                      <div 
                        key={ord.id}
                        onClick={() => setSelectedDespachoId(ord.id)}
                        className="min-h-[44px] flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 cursor-pointer border border-slate-200/80 text-xs transition-colors active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {ord.codigo_factura_erp || ord.codigo_orden}
                          </span>
                          <span className="text-slate-600 truncate max-w-[130px] font-medium">
                            {ord.cliente_nombre}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-700">{ord.peso_total_kg}kg</span>
                          <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            {ord.estado_actual}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
