import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import logoValenciana from '../../../assets/logo-valenciana.jpg';
import { SECCIONES, getSeccionInfo } from '../../ventaMostrador/data/secciones';
import {
  obtenerInventario,
  obtenerDiferencias,
  resolverDiferencia,
  importarArchivoExcel,
  importarDemoExcel
} from '../services/inventarioApi';
import {
  Package,
  Boxes,
  Upload,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  DollarSign,
  ArrowLeft,
  X
} from 'lucide-react';

export default function InventarioPage() {
  // Estado de rol para demostración de seguridad
  const [rolUsuario, setRolUsuario] = useState('admin'); // 'admin' | 'operativo'

  // Datos
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroSeccion, setFiltroSeccion] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [skuExpandido, setSkuExpandido] = useState(null);

  // Modales
  const [modalImportar, setModalImportar] = useState(false);
  const [modalDiferencias, setModalDiferencias] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [procesandoImportacion, setProcesandoImportacion] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState(null);

  // Diferencias
  const [diferenciasPendientes, setDiferenciasPendientes] = useState([]);
  const [historialDiferencias, setHistorialDiferencias] = useState([]);

  // Cargar inventario y diferencias
  const recargarTodo = async () => {
    try {
      setCargando(true);
      const dataInv = await obtenerInventario({ seccion: filtroSeccion, buscar: busqueda });
      setProductos(dataInv.productos || []);

      const dataDif = await obtenerDiferencias(rolUsuario);
      setDiferenciasPendientes(dataDif.pendientes || []);
      setHistorialDiferencias(dataDif.historial || []);
    } catch (err) {
      console.error('Error cargando inventario:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    recargarTodo();
  }, [filtroSeccion, busqueda, rolUsuario]);

  // Manejador de resolución de diferencia
  const handleResolverDiferencia = async (id, accion) => {
    try {
      await resolverDiferencia(id, accion, rolUsuario);
      setMensajeAlerta({
        tipo: 'success',
        texto: `Diferencia ${accion === 'aplicar' ? 'aplicada al sistema' : 'descartada'} con éxito.`
      });
      recargarTodo();
      setTimeout(() => setMensajeAlerta(null), 4000);
    } catch (err) {
      setMensajeAlerta({ tipo: 'error', texto: err.message });
    }
  };

  // Manejador de importación de archivo
  const handleSubirArchivo = async (e) => {
    e.preventDefault();
    if (!archivoSeleccionado) return;

    try {
      setProcesandoImportacion(true);
      const res = await importarArchivoExcel(archivoSeleccionado, rolUsuario);
      setModalImportar(false);
      setArchivoSeleccionado(null);
      setMensajeAlerta({
        tipo: 'success',
        texto: `Importación completada: ${res.resumen.total_filas} filas procesadas. ${res.resumen.diferencias_detectadas} diferencias detectadas para conciliar.`
      });
      recargarTodo();
      if (res.resumen.diferencias_detectadas > 0) {
        setModalDiferencias(true);
      }
    } catch (err) {
      setMensajeAlerta({ tipo: 'error', texto: err.message });
    } finally {
      setProcesandoImportacion(false);
    }
  };

  // Cargar demo de Excel con 1 click
  const handleCargarDemoExcel = async () => {
    try {
      setProcesandoImportacion(true);
      const res = await importarDemoExcel(rolUsuario);
      setModalImportar(false);
      setMensajeAlerta({
        tipo: 'success',
        texto: `Simulación ERP completada: ${res.resumen.total_filas} filas evaluadas. ${res.resumen.diferencias_detectadas} diferencias detectadas para revisión.`
      });
      recargarTodo();
      setModalDiferencias(true);
    } catch (err) {
      setMensajeAlerta({ tipo: 'error', texto: err.message });
    } finally {
      setProcesandoImportacion(false);
    }
  };

  // Métricas agregadas
  const metricas = useMemo(() => {
    const totalSkus = productos.length;
    const totalUnidades = productos.reduce((acc, p) => acc + (p.stockTotal ?? p.stock ?? p.stock_total ?? 0), 0);
    const totalValor = productos.reduce(
      (acc, p) => acc + (p.stockTotal ?? p.stock ?? p.stock_total ?? 0) * (p.precio_unitario || 0),
      0
    );
    return { totalSkus, totalUnidades, totalValor };
  }, [productos]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-16">
      {/* 1. Header del Panel de Inventario */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
              title="Volver al selector de estaciones"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <img
              src={logoValenciana}
              alt="La Valenciana FERREHOGAR"
              className="h-9 w-9 object-cover rounded-lg shadow-sm shrink-0"
            />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 leading-none">
                  FERREHOGAR
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-900 text-white uppercase tracking-wider">
                  Módulo Inventario
                </span>
              </div>
              <span className="text-xs font-bold text-[#E11D24] uppercase tracking-wider">
                Catálogo Maestro & Conciliación ERP
              </span>
            </div>
          </div>

          {/* Selector de Rol para demo de seguridad */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-600 hidden sm:inline">Rol activo:</span>
              <select
                value={rolUsuario}
                onChange={(e) => setRolUsuario(e.target.value)}
                className="bg-transparent font-black text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="admin">Administrador (Permiso Total)</option>
                <option value="operativo">Operativo (Solo Consulta)</option>
              </select>
            </div>

            <button
              onClick={recargarTodo}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refrescar catálogo y diferencias"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner de Estado y Alertas */}
        {mensajeAlerta && (
          <div
            className={`p-4 rounded-xl border text-sm font-bold flex items-center justify-between gap-2 shadow-sm ${
              mensajeAlerta.tipo === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <span>{mensajeAlerta.texto}</span>
            <button onClick={() => setMensajeAlerta(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. Tarjetas de Resumen de Inventario */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
              <span>Catálogo Maestro</span>
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {metricas.totalSkus}
            </div>
            <span className="text-[11px] text-slate-400 font-semibold block">SKUs activos en sistema</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
              <span>Unidades en Bodega</span>
              <Boxes className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {metricas.totalUnidades.toLocaleString('es-CO')}
            </div>
            <span className="text-[11px] text-slate-400 font-semibold block">Stock físico disponible</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
              <span>Valorización Total</span>
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 truncate">
              ${(metricas.totalValor / 1000000).toFixed(1)}M COP
            </div>
            <span className="text-[11px] text-slate-400 font-semibold block">Costo estimado de existencias</span>
          </div>

          <div
            onClick={() => setModalDiferencias(true)}
            className={`rounded-2xl border p-4 shadow-sm space-y-1 cursor-pointer transition-all hover:scale-[1.02] ${
              diferenciasPendientes.length > 0
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase">
              <span>Diferencias ERP</span>
              <AlertTriangle className={`w-4 h-4 ${diferenciasPendientes.length > 0 ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
            </div>
            <div className="text-2xl sm:text-3xl font-black">
              {diferenciasPendientes.length}
            </div>
            <span className="text-[11px] font-bold text-red-700 block">
              {diferenciasPendientes.length > 0 ? 'Pendientes de revisión admin →' : 'Sin diferencias pendientes'}
            </span>
          </div>
        </div>

        {/* 3. Barra de Herramientas y Filtros */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por SKU, Nombre o Descripción..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#E11D24]"
              />
            </div>

            {/* Botones de Acción Admin */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {rolUsuario === 'admin' ? (
                <>
                  <button
                    onClick={() => setModalImportar(true)}
                    className="min-h-[44px] px-4 bg-[#E11D24] hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importar desde Excel</span>
                  </button>

                  <button
                    onClick={() => setModalDiferencias(true)}
                    className="min-h-[44px] px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <span>Diferencias ({diferenciasPendientes.length})</span>
                  </button>
                </>
              ) : (
                <span className="text-xs font-bold text-slate-400 px-3 py-2 bg-slate-100 rounded-xl">
                  Modo Operativo: Solo Consulta de Stock
                </span>
              )}
            </div>
          </div>

          {/* Chips de Secciones */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setFiltroSeccion('todas')}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                filtroSeccion === 'todas'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
              }`}
            >
              Todas las Secciones
            </button>

            {SECCIONES.map((sec) => {
              const activo = filtroSeccion === sec.slug;
              return (
                <button
                  key={sec.slug}
                  onClick={() => setFiltroSeccion(sec.slug)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                    activo
                      ? `${sec.badgeColor} shadow-sm ring-2 ring-slate-900`
                      : `${sec.color} hover:opacity-90`
                  }`}
                >
                  {sec.nombre}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Tabla de Productos con Desglose Expandible */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Sección</th>
                  <th className="py-3 px-4 text-center">Unidad</th>
                  <th className="py-3 px-4 text-right">Precio Unit.</th>
                  <th className="py-3 px-4 text-center">Stock Total</th>
                  <th className="py-3 px-4 text-center">Bodegas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                      Cargando catálogo maestro...
                    </td>
                  </tr>
                ) : productos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                      No se encontraron productos con el filtro aplicado.
                    </td>
                  </tr>
                ) : (
                  productos.map((prod) => {
                    const expandido = skuExpandido === prod.sku;
                    const sec = getSeccionInfo(prod.categoria_slug);

                    return (
                      <React.Fragment key={prod.sku}>
                        <tr
                          onClick={() => setSkuExpandido(expandido ? null : prod.sku)}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                            expandido ? 'bg-slate-50/80 font-medium' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-black text-slate-900">
                            {prod.sku}
                            {prod.es_codigo_interno && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                INT
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">
                            <div className="truncate">{prod.nombre}</div>
                            <div className="text-[10px] text-slate-400 font-normal truncate">
                              {prod.descripcion}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sec.color}`}>
                              {sec.nombre}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-600">
                            {prod.unidad_medida}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                            ${Number(prod.precio_unitario).toLocaleString('es-CO')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full font-mono text-xs font-black ${
                                prod.stock_total > 20
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : prod.stock_total > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {prod.stock_total} UNID
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-slate-200 text-slate-500"
                              title="Ver desglose por bodega física"
                            >
                              {expandido ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Fila expandible con el stock exacto por bodega (sku, bodega_id) */}
                        {expandido && (
                          <tr className="bg-slate-100/60 border-y border-slate-300">
                            <td colSpan={7} className="p-4">
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-slate-500" />
                                  <span>Desglose exacto de existencias por bodega física:</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                  {prod.desglose_bodegas.map((b) => (
                                    <div
                                      key={b.bodega_id}
                                      className={`p-2.5 rounded-xl border bg-white shadow-xs ${
                                        b.cantidad > 0
                                          ? 'border-slate-300'
                                          : 'border-slate-200 opacity-60'
                                      }`}
                                    >
                                      <div className="text-[10px] font-bold text-slate-500 truncate">
                                        {b.nombre_bodega}
                                      </div>
                                      <div className="font-mono text-base font-black text-slate-900 mt-1">
                                        {b.cantidad} un.
                                      </div>
                                      <div className="text-[9px] text-slate-400">
                                        ID {b.bodega_id} &bull; {b.codigo_bodega}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ===================================================================== */}
      {/* MODAL 1: IMPORTAR DESDE EXCEL / ERP */}
      {/* ===================================================================== */}
      {modalImportar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E11D24] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Importación y Conciliación desde Excel ERP
                  </h3>
                  <span className="text-xs text-slate-500">
                    Upsert de catálogo y detección de diferencias de stock
                  </span>
                </div>
              </div>
              <button onClick={() => setModalImportar(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
              <b>Política de Conciliación Estricta:</b> El sistema <u>nunca sobrescribe el stock automáticamente</u>. Si una fila del Excel difiere del inventario real, se genera una alerta para que un administrador la revise y autorice manualmente.
            </div>

            <form onSubmit={handleSubirArchivo} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-red-500 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <label className="block text-xs font-bold text-slate-700 cursor-pointer">
                  <span>Haz clic para seleccionar archivo .xlsx</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setArchivoSeleccionado(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                {archivoSeleccionado ? (
                  <div className="text-xs font-bold text-emerald-700 mt-2">
                    ✓ {archivoSeleccionado.name} ({Math.round(archivoSeleccionado.size / 1024)} KB)
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 block mt-1">Formato compatible con ERP</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                {/* Botón de prueba rápida 1-click */}
                <button
                  type="button"
                  onClick={handleCargarDemoExcel}
                  disabled={procesandoImportacion}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200"
                  title="Cargar archivo Excel de prueba con discrepancias"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Probar con Excel ERP de Ejemplo</span>
                </button>

                <button
                  type="submit"
                  disabled={!archivoSeleccionado || procesandoImportacion}
                  className="px-5 py-2.5 bg-[#E11D24] hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2"
                >
                  {procesandoImportacion ? 'Procesando...' : 'Subir y Conciliar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: BANDEJA DE DIFERENCIAS DE INVENTARIO (ADMIN) */}
      {/* ===================================================================== */}
      {modalDiferencias && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl border border-slate-300 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Conciliación de Diferencias Detectadas ({diferenciasPendientes.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Revisa y autoriza si el sistema debe ajustarse o si se descarta el reporte del Excel
                  </span>
                </div>
              </div>
              <button onClick={() => setModalDiferencias(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {diferenciasPendientes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">
                    ¡No hay diferencias pendientes de conciliación!
                  </p>
                  <p className="text-xs">
                    El inventario del sistema coincide exactamente con los registros del ERP.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3">Bodega</th>
                        <th className="py-2.5 px-3 text-center">Stock Sistema</th>
                        <th className="py-2.5 px-3 text-center">Stock Excel</th>
                        <th className="py-2.5 px-3 text-center">Diferencia</th>
                        <th className="py-2.5 px-3 text-center">Resolución Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {diferenciasPendientes.map((dif) => (
                        <tr key={dif.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {dif.sku}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 max-w-xs truncate">
                            {dif.producto_nombre}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-600">
                            {dif.bodega_nombre}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 bg-slate-50">
                            {dif.cantidad_sistema}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-blue-800 bg-blue-50/50">
                            {dif.cantidad_excel}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                dif.diferencia > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {dif.diferencia > 0 ? `+${dif.diferencia}` : dif.diferencia}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleResolverDiferencia(dif.id, 'aplicar')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black transition-all"
                                title="Ajustar el stock del sistema al valor del Excel"
                              >
                                Aplicar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResolverDiferencia(dif.id, 'descartar')}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition-all"
                                title="Descartar reporte del Excel y conservar valor del sistema"
                              >
                                Descartar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setModalDiferencias(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
