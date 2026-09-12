import React, { useState } from 'react';
import { useWms } from '../context/WmsContext';
import { 
  PackageCheck, 
  Scale, 
  Barcode, 
  Check, 
  ScanLine, 
  ArrowRight, 
  MapPin, 
  Printer 
} from 'lucide-react';

export default function PackingStationView() {
  const { 
    despachos, 
    auditItem, 
    auditAllItems, 
    updateScaleWeight, 
    advanceStage, 
    setPackageLabelDespacho,
    setIncidentModalTarget
  } = useWms();

  // Órdenes candidatas para packing (PACKING o PICKING)
  const packingOrders = despachos.filter(
    (d) => d.estado_actual === 'PACKING' || d.estado_actual === 'PICKING'
  );

  const [selectedOrderId, setSelectedOrderId] = useState(
    packingOrders[0]?.id || despachos[0]?.id
  );

  const activeOrder = despachos.find((d) => d.id === selectedOrderId) || packingOrders[0];

  if (!activeOrder) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        <PackageCheck className="h-12 w-12 mx-auto text-slate-300 mb-3" />
        <h3 className="text-base font-bold text-slate-700">No hay órdenes en proceso de empaque</h3>
        <p className="text-xs">Todas las órdenes han sido auditadas y trasladadas a bahía de cargue.</p>
      </div>
    );
  }

  const totalSolicitado = activeOrder.items?.reduce((acc, it) => acc + it.cantidad_solicitada, 0) || 0;
  const totalAuditado = activeOrder.items?.reduce((acc, it) => acc + (it.cantidad_auditada || 0), 0) || 0;
  const auditPercent = totalSolicitado > 0 ? Math.round((totalAuditado / totalSolicitado) * 100) : 100;
  const isFullyAudited = auditPercent === 100;

  // Comparativa de Báscula vs. Peso Teórico (±3% tolerancia)
  const pesoTeorico = activeOrder.peso_total_kg || 1;
  const pesoBascula = activeOrder.peso_bascula_kg || pesoTeorico;
  const diffPercent = ((pesoBascula - pesoTeorico) / pesoTeorico) * 100;
  const isToleranceOk = Math.abs(diffPercent) <= 3.0;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 space-y-4">
      
      {/* 1. SELECTOR TÁCTIL DE ORDEN EN MESA DE TRABAJO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Mesa de Packing & Aforo 1:1
            </h2>
            <p className="text-xs text-slate-500">Estación con báscula certificada y pistola RF</p>
          </div>
        </div>

        {/* Selector de órdenes activas en packing */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full sm:w-auto bg-slate-100 border border-slate-300 rounded-xl px-3 h-11 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E11D24]"
          >
            {despachos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.codigo_factura_erp || d.codigo_orden} - {d.cliente_nombre.substring(0, 24)}... ({d.estado_actual})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. RESUMEN DE LA ORDEN ACTIVA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-slate-900">
                {activeOrder.codigo_factura_erp || activeOrder.codigo_orden}
              </span>
              <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md">
                {activeOrder.estado_actual}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800 mt-1">
              Cliente: {activeOrder.cliente_nombre}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Destino: {activeOrder.zona_entrega} • Transportadora: {activeOrder.transportadora}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => auditAllItems(activeOrder.id)}
              className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-black text-white px-4 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
            >
              <ScanLine className="h-4 w-4 text-amber-400" />
              <span>Escanear Todo</span>
            </button>

            <button
              onClick={() => setPackageLabelDespacho(activeOrder)}
              className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 bg-[#E11D24] hover:bg-red-700 text-white px-4 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Etiqueta Bulto</span>
            </button>
          </div>
        </div>

        {/* 3. COMPARADOR DE BÁSCULA CERTIFICADA (TOLERANCIA ±3%) */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          isToleranceOk 
            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950' 
            : 'bg-red-50 border-red-300 text-red-950 ring-2 ring-red-400/30'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Scale className={`h-5 w-5 shrink-0 ${isToleranceOk ? 'text-emerald-600' : 'text-[#E11D24]'}`} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Aforo de Báscula (Tolerancia Normativa ±3%)
                </h4>
                <p className="text-xs opacity-80 mt-0.5">
                  {isToleranceOk 
                    ? '✓ Peso en báscula validado dentro del margen permitido' 
                    : '⚠️ ALERTA: Divergencia de peso excede la tolerancia ±3%'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono">
              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase block">Teórico:</span>
                <span className="text-sm font-bold">{pesoTeorico.toFixed(1)} kg</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase block">Báscula:</span>
                <span className={`text-base font-bold ${isToleranceOk ? 'text-emerald-700' : 'text-[#E11D24]'}`}>
                  {pesoBascula.toFixed(1)} kg
                </span>
              </div>
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                isToleranceOk ? 'bg-emerald-200 text-emerald-900' : 'bg-red-600 text-white animate-pulse'
              }`}>
                {diffPercent > 0 ? `+${diffPercent.toFixed(1)}%` : `${diffPercent.toFixed(1)}%`}
              </span>
            </div>
          </div>

          {/* Botones de simulación de báscula */}
          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-200/60 text-xs overflow-x-auto">
            <span className="font-bold text-slate-500 shrink-0">Simular Báscula:</span>
            <button
              onClick={() => updateScaleWeight(activeOrder.id, pesoTeorico)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold hover:bg-slate-50 shrink-0 active:scale-95"
            >
              Exacto ({pesoTeorico}kg)
            </button>
            <button
              onClick={() => updateScaleWeight(activeOrder.id, pesoTeorico * 1.02)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold hover:bg-slate-50 shrink-0 text-emerald-700 active:scale-95"
            >
              +2% Tol. OK
            </button>
            <button
              onClick={() => updateScaleWeight(activeOrder.id, pesoTeorico * 1.35)}
              className="px-2.5 py-1.5 bg-red-100 border border-red-300 rounded-lg font-bold hover:bg-red-200 shrink-0 text-red-800 active:scale-95"
            >
              +35% Sobrepeso
            </button>
            <button
              onClick={() => updateScaleWeight(activeOrder.id, pesoTeorico * 0.70)}
              className="px-2.5 py-1.5 bg-red-100 border border-red-300 rounded-lg font-bold hover:bg-red-200 shrink-0 text-red-800 active:scale-95"
            >
              -30% Faltante
            </button>
          </div>
        </div>

      </div>

      {/* 4. LISTA DE MATERIALES DE CONSTRUCCIÓN Y PISTOLEO TÁCTIL */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Checklist de Materiales & Ferretería ({activeOrder.items?.length || 0} Líneas)
          </span>
          <span className="text-xs font-mono font-bold text-slate-600">
            Auditoría: {totalAuditado}/{totalSolicitado} und ({auditPercent}%)
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {activeOrder.items?.map((item) => {
            const isCompleted = item.cantidad_auditada >= item.cantidad_solicitada;

            return (
              <div 
                key={item.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  isCompleted ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      {item.sku}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      <MapPin className="h-3 w-3 text-emerald-700" />
                      {item.ubicacion_bodega}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {item.unidad || 'UND'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {item.descripcion_producto}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    Peso unitario: {item.peso_unitario_kg} kg
                  </p>
                </div>

                {/* Contador y Botón Pistoleo */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right font-mono">
                    <div className="text-sm">
                      <span className={`font-bold text-base ${isCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {item.cantidad_auditada || 0}
                      </span>
                      <span className="text-slate-400 font-bold"> / {item.cantidad_solicitada}</span>
                    </div>
                    <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {isCompleted ? 'Verificado OK' : 'Pendiente'}
                    </span>
                  </div>

                  {/* Botón táctil grande de pistoleo */}
                  <button
                    onClick={() => auditItem(activeOrder.id, item.id)}
                    disabled={isCompleted}
                    className={`min-h-[46px] px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                        : 'bg-[#E11D24] hover:bg-red-700 text-white shadow-md active:scale-95'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-700" />
                        <span>Verificado</span>
                      </>
                    ) : (
                      <>
                        <Barcode className="h-4 w-4" />
                        <span>+1 Pistolear</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. ACCIÓN FINAL DE PACKING */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          <span>Bahía asignada para cargue: </span>
          <strong className="text-purple-700 font-mono text-sm">{activeOrder.bahia_asignada}</strong>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIncidentModalTarget(activeOrder)}
            className="flex-1 sm:flex-none min-h-[48px] px-4 bg-slate-100 hover:bg-red-50 hover:text-[#E11D24] text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
          >
            Reportar Discrepancia
          </button>

          <button
            onClick={() => advanceStage(activeOrder.id)}
            disabled={!isFullyAudited}
            className={`flex-1 sm:flex-none min-h-[48px] px-6 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md ${
              isFullyAudited
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Confirmar Listo en Bahía</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
