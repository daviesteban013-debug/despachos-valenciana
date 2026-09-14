import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WmsProvider } from './context/WmsContext';
import { VentaMostradorProvider } from './modules/ventaMostrador/store/ventaMostrador';
import SelectorPage from './modules/ventaMostrador/pages/SelectorPage';
import FacturacionPage from './modules/ventaMostrador/pages/FacturacionPage';
import VitrinaPage from './modules/ventaMostrador/pages/VitrinaPage';
import InventarioPage from './modules/inventario/pages/InventarioPage';
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

        {/* Módulo de Gestión de Inventario (Rol Admin) */}
        <Route path="/inventario" element={<InventarioPage />} />

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
