import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WmsProvider } from './context/WmsContext';
import { VentaMostradorProvider } from './modules/ventaMostrador/store/ventaMostrador';
import SelectorPage from './modules/ventaMostrador/pages/SelectorPage';
import FacturacionPage from './modules/ventaMostrador/pages/FacturacionPage';
import VitrinaPage from './modules/ventaMostrador/pages/VitrinaPage';
import CuadreInventarioPage from './modules/inventario/pages/CuadreInventarioPage';
import WmsDespachoApp from './WmsDespachoApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Selector inicial "¿Qué pantalla eres?" para pruebas locales */}
        <Route path="/" element={<SelectorPage />} />

        {/* Módulo aislado: Venta Mostrador (Facturación ↔ Vitrina) */}
        <Route
          path="/facturacion"
          element={
            <VentaMostradorProvider>
              <FacturacionPage />
            </VentaMostradorProvider>
          }
        />
        <Route
          path="/vitrina"
          element={
            <VentaMostradorProvider>
              <VitrinaPage />
            </VentaMostradorProvider>
          }
        />

        {/* Módulo Cuadre de Inventario: toma física anual (conteo, reconteo y cuadre vs TNS) */}
        <Route path="/inventario" element={<CuadreInventarioPage />} />

        {/* Módulo WMS de despacho a domicilio (aislado con su propio WmsProvider) */}
        <Route
          path="/wms"
          element={
            <WmsProvider>
              <WmsDespachoApp />
            </WmsProvider>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
