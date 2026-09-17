import React, { useState, useMemo } from 'react';
import { useWms } from '../context/WmsContext';
import DispatchCard from './DispatchCard';
import { FLOTA_VEHICULOS } from '../data/flota';
import { History, Calendar, Truck, Search, Clock } from 'lucide-react';

export default function HistorialView() {
  const { despachos } = useWms();

  const [dateRange, setDateRange] = useState('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedVehiculo, setSelectedVehiculo] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    return despachos.filter(d => {
      // 1. Solo despachados
      if (d.estado_actual !== 'DESPACHADO') return false;

      // 2. Filtro de fecha
      if (d.fecha_despacho) {
        const dDate = new Date(d.fecha_despacho);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateRange === 'today') {
          if (dDate < today) return false;
        } else if (dateRange === '7d') {
          const limit = new Date(today);
          limit.setDate(limit.getDate() - 7);
          if (dDate < limit) return false;
        } else if (dateRange === 'this_month') {
          if (dDate.getMonth() !== today.getMonth() || dDate.getFullYear() !== today.getFullYear()) return false;
        } else if (dateRange === 'custom') {
          if (customStartDate && new Date(customStartDate) > dDate) return false;
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (end < dDate) return false;
          }
        }
      }

      // 3. Filtro de vehículo
      if (selectedVehiculo !== 'TODOS' && d.vehiculo_placa !== selectedVehiculo) {
        return false;
      }

      // 4. Búsqueda de texto
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchInvoice = d.codigo_factura_erp?.toLowerCase().includes(q);
        const matchClient = d.cliente_nombre?.toLowerCase().includes(q);
        const matchOrder = d.codigo_orden?.toLowerCase().includes(q);
        if (!matchInvoice && !matchClient && !matchOrder) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = a.hora_salida ? new Date(a.hora_salida).getTime() : 0;
      const timeB = b.hora_salida ? new Date(b.hora_salida).getTime() : 0;
      return timeB - timeA;
    });
  }, [despachos, dateRange, customStartDate, customEndDate, selectedVehiculo, searchQuery]);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Cabecera de la sección */}
      <div className="flex items-center gap-2">
        <History className="h-6 w-6 text-slate-700" />
        <h2 className="text-lg font-bold text-slate-900">Historial Global de Despachos</h2>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col lg:flex-row gap-4 shadow-sm">
        {/* Filtro Fecha */}
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Rango de Fechas
          </label>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full border-slate-300 rounded-lg text-sm font-medium focus:ring-slate-800 focus:border-slate-800"
          >
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="this_month">Este mes</option>
            <option value="all">Todo el historial</option>
            <option value="custom">Personalizado...</option>
          </select>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full border-slate-300 rounded-lg text-xs"
              />
              <span className="text-slate-400 text-xs">a</span>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full border-slate-300 rounded-lg text-xs"
              />
            </div>
          )}
        </div>

        {/* Filtro Vehículo */}
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="h-4 w-4" />
            Vehículo de Entrega
          </label>
          <select 
            value={selectedVehiculo}
            onChange={(e) => setSelectedVehiculo(e.target.value)}
            className="w-full border-slate-300 rounded-lg text-sm font-medium focus:ring-slate-800 focus:border-slate-800"
          >
            <option value="TODOS">Todos los vehículos</option>
            {FLOTA_VEHICULOS.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Búsqueda por Texto */}
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            Búsqueda
          </label>
          <input 
            type="text"
            placeholder="Cliente, Factura o Nro de Orden..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-slate-300 rounded-lg text-sm placeholder:text-slate-400 focus:ring-slate-800 focus:border-slate-800"
          />
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 min-h-[400px]">
        <div className="mb-4">
          <span className="text-sm font-bold text-slate-700">
            Mostrando {filteredHistory.length} despacho(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredHistory.length === 0 ? (
            <div className="col-span-full h-44 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-4 text-center space-y-2">
              <Clock className="h-8 w-8 text-slate-400" />
              <p className="text-base font-bold text-slate-700">No hay despachos en el rango seleccionado</p>
              <p className="text-sm text-slate-500">Ajusta los filtros de fecha, vehículo o búsqueda para encontrar más resultados.</p>
            </div>
          ) : (
            filteredHistory.map((despacho) => (
              <DispatchCard key={despacho.id} despacho={despacho} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
