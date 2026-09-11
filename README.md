# 🚚 La Valenciana FERREHOGAR - WMS Despachos & Trazabilidad

Prototipo interactivo frontend (SPA Mobile-First / Tablet Friendly) para la gestión, auditoría y trazabilidad inmutable de despachos en centros de distribución y bodegas de ferretería y materiales de construcción, basado en el modelo de datos relacional de PostgreSQL.

---

## 🏗️ Identidad de Marca y Sistema UI/UX

- **Marca:** La Valenciana FERREHOGAR.
- **Isotipo:** Hexágono rojo con chevron blanco interior estilizado.
- **Paleta de Colores:**
  - Primario: Rojo Valenciana (`#E11D24` / `red-600`), en barra superior, acentos de alerta y botones de acción rápida.
  - Superficies: `slate-100` en modo claro para ergonomía y reducción de fatiga visual en bodega.
  - Acentos de Estado: Verde Esmeralda (Listo/Despachado), Ámbar (Packing), Púrpura (Bahías de Carga), Rojo parpadeante (Corte próximo < 30 min o Incidencia).
- **Diseño Táctil Industrial:**
  - Botones táctiles de mínimo 48px de alto para uso con guantes.
  - Facturas ERP (`FE-80297`, `1M-56752`, `PVSW6307`) y nombres de cliente legibles a 1.5 metros.
  - Barra de navegación inferior (**Bottom Navigation Dock**) para uso con el pulgar.

---

## 📦 Módulos Principales

1. **📋 Tablero de Olas (Kanban & Lista Rápida):**
   - 5 fases de flujo: `COLA`, `PICKING`, `PACKING`, `LISTO`, `DESPACHADO` + Columna de `INCIDENCIAS/RETENCIÓN`.
   - Temporizador dinámico regresivo de corte de ruta SLA.
   - Switch para alternar entre vista Kanban horizontal y vista Lista rápida para smartphones.

2. **📦 Mesa de Packing & Auditoría 1:1:**
   - Checklist de materiales de ferretería (Cemento 50kg, Varillas corrugadas, Cerraduras Yale, Pinturas Galón, Taladros).
   - Pistoleo táctil individual o masivo (simulación de lector láser RF con sonido/vibración).
   - **Comparador de Báscula Certificada (Tolerancia ±3%):** Semáforo visual verde/rojo que valida el peso en estación contra el peso teórico.
   - **Generación de Etiqueta Térmica de Bulto (Zebra style):** Con código QR de remisión, remitente La Valenciana, destinatario, bahía y transportadora.

3. **🚚 Mapa de Bahías de Carga & Flota:**
   - Visualización de muelles `Bahía A-01`, `A-02`, `B-01`, `B-03`.
   - Asignación de vehículos (Camión NHR, Turbo, Camioneta LUV, Motocarro express) con capacidad en kg y porcentaje de ocupación acumulado.

4. **⚠️ Triage de Incidencias & Retención en Muelle:**
   - Gestión de bloqueos operativos por Faltante de Inventario, Divergencia de Peso, Avería de Producto o Error de Guía.
   - Resolución y reincorporación inmediata de la orden a la fase seleccionada.

5. **🔄 Logística Inversa (Devoluciones):**
   - Gestión de pedidos retornados por No Pago, Avería o Dirección Errónea con opción de Reingreso a Inventario o Baja por Merma.

---

## 🗄️ Modelo Relacional PostgreSQL

El esquema de base de datos se encuentra documentado en [`base-datos.sql`](./base-datos.sql), incluyendo:
- Tipos `ENUM`: `estado_despacho`, `tipo_incidencia`, `estado_devolucion`, `tipo_vehiculo`.
- Tablas maestras: `bodegas`, `productos`, `transportadoras`, `conductores`, `vehiculos`, `rutas`.
- Tablas transaccionales: `despachos`, `despacho_items`, `historial_estados_despacho`, `incidencias_despacho`, `devoluciones`, `detalle_devolucion`.
- Triggers `PL/pgSQL` para auditoría automática inmutable en cada cambio de estado.

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- Node.js v18+ o superior
- npm o yarn

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/daviesteban013-debug/despachos-valenciana.git
cd despachos-valenciana

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible localmente en `http://localhost:3000/`.

### Compilación para Producción
```bash
npm run build
```
Genera la versión optimizada para despliegue en la carpeta `/dist`.

---

## 🛠️ Tecnologías Utilizadas

- **Framework:** React 18 / Vite
- **Estilos:** Tailwind CSS con tokens industriales personalizados
- **Iconografía:** Lucide Icons
- **Efectos de Audio/Hápticos:** Web Audio API & Vibration API
