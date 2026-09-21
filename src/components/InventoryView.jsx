import React, { useState, useMemo, useEffect } from 'react';
import { Search, Package, Hash, Box, Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const ITEMS_PER_PAGE = 100;

export default function InventoryView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [inventarioData, setInventarioData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Carga lazy del inventario desde /public (no entra al bundle)
  useEffect(() => {
    fetch('/inventario.json')
      .then(r => r.json())
      .then(data => {
        setInventarioData(data);
        setLoading(false);
      })
      .catch(err => {
        setLoadError('No se pudo cargar el catálogo.');
        setLoading(false);
        console.error('[InventoryView] Error cargando inventario:', err);
      });
  }, []);

  // Filtrado ultra rápido
  const filteredItems = useMemo(() => {
    if (!searchTerm) return inventarioData;
    const term = searchTerm.toLowerCase();
    return inventarioData.filter(
      (item) =>
        item.descripcion.toLowerCase().includes(term) ||
        item.codigo.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // Paginación
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-slate-500">
      <Loader2 className="w-6 h-6 animate-spin text-[#E11D24]" />
      <span className="font-semibold">Cargando catálogo...</span>
    </div>
  );

  if (loadError) return (
    <div className="flex items-center justify-center h-64 text-red-500 font-semibold">{loadError}</div>
  );

  return (
    <div className="p-4 lg:p-8 animate-fadeIn max-w-[1200px] mx-auto">
      {/* HEADER */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="w-7 h-7 text-[#E11D24]" />
            Catálogo de Productos
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Visualizando {filteredItems.length.toLocaleString()} artículos del maestro de inventario.
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código o descripción..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E11D24]/50 focus:border-[#E11D24] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">
                  <div className="flex items-center gap-1.5"><Hash className="w-4 h-4"/> Código</div>
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">
                  <div className="flex items-center gap-1.5"><Box className="w-4 h-4"/> U.Base</div>
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">
                  U.Alt
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-right">
                  Factor
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32 text-right">
                  <div className="flex items-center justify-end gap-1.5"><Calendar className="w-4 h-4"/> Ult. Fecha</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <tr key={item.codigo} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-mono font-bold text-slate-700">
                      {item.codigo}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-800">
                      {item.descripcion}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-medium">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{item.und_base || '-'}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-medium">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{item.und_alt || '-'}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 font-bold text-right font-mono">
                      {item.factor}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500 font-medium text-right">
                      {item.fecha_ultima ? new Date(item.fecha_ultima).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-semibold">No se encontraron productos</p>
                    <p className="text-sm">Intenta con otros términos de búsqueda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-sm text-slate-500 font-medium">
              Mostrando <span className="font-bold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a{' '}
              <span className="font-bold text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</span> de{' '}
              <span className="font-bold text-slate-800">{filteredItems.length}</span> resultados
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-3 text-sm font-bold text-slate-700">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
