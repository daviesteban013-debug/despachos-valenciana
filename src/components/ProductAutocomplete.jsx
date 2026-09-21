import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Package, Plus, Loader2 } from 'lucide-react';

// Cache global para no volver a fetchear si ya se cargó
let _cachedInventario = null;
let _fetchPromise = null;

function getInventario() {
  if (_cachedInventario) return Promise.resolve(_cachedInventario);
  if (!_fetchPromise) {
    _fetchPromise = fetch('/inventario.json')
      .then(r => r.json())
      .then(data => {
        _cachedInventario = data;
        return data;
      });
  }
  return _fetchPromise;
}

export default function ProductAutocomplete({ onAddProduct }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [inventario, setInventario] = useState(_cachedInventario || []);
  const [loading, setLoading] = useState(!_cachedInventario);
  const wrapperRef = useRef(null);

  // Carga lazy una sola vez (usa caché global si ya se cargó en InventoryView)
  useEffect(() => {
    if (_cachedInventario) return;
    setLoading(true);
    getInventario()
      .then(data => {
        setInventario(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filtrado optimizado para máximo 50 resultados
  const filteredProducts = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    let results = [];
    for (let i = 0; i < inventario.length; i++) {
      const item = inventario[i];
      if (item.descripcion.toLowerCase().includes(term) || item.codigo.toLowerCase().includes(term)) {
        results.push(item);
        if (results.length >= 50) break;
      }
    }
    return results;
  }, [searchTerm, inventario]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product) => {
    onAddProduct(product);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        {loading
          ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
          : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        }
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={loading ? 'Cargando catálogo...' : 'Buscar producto por código o descripción...'}
          disabled={loading}
          className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-300 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D24] transition-all disabled:opacity-60"
        />
      </div>

      {isOpen && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-60 overflow-y-auto">
          {filteredProducts.length > 0 ? (
            <ul className="py-1">
              {filteredProducts.map((product) => (
                <li
                  key={product.codigo}
                  onClick={() => handleSelect(product)}
                  className="px-3 py-2 hover:bg-red-50 cursor-pointer flex items-start gap-2 border-b border-slate-50 last:border-0 group"
                >
                  <Package className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {product.descripcion}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {product.codigo} • {product.und_base || 'UND'}
                    </p>
                  </div>
                  <div className="bg-red-100 text-[#E11D24] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-4 w-4" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              No se encontraron productos para "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
