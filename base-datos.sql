-- ============================================================================
-- ESQUEMA RELACIONAL POSTGRESQL - SISTEMA WMS LOGÍSTICA Y TRAZABILIDAD DE DESPACHOS
-- ============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS (ENUMS DE DOMINIO)
-- ----------------------------------------------------------------------------
CREATE TYPE estado_despacho AS ENUM (
    'COLA', 
    'PICKING', 
    'PACKING', 
    'LISTO', 
    'DESPACHADO', 
    'INCIDENCIA'
);

CREATE TYPE estado_ruta AS ENUM (
    'PLANEADA', 
    'EN_CURSO', 
    'FINALIZADA'
);

CREATE TYPE tipo_incidencia AS ENUM (
    'FALTANTE', 
    'DIVERGENCIA_PESO', 
    'AVERIA', 
    'ERROR_GUIA'
);

CREATE TYPE motivo_devolucion AS ENUM (
    'NO_PAGO', 
    'AVERIA', 
    'DIRECCION_ERRONEA', 
    'CLIENTE_AUSENTE', 
    'RECHAZO_CLIENTE'
);

CREATE TYPE estado_devolucion AS ENUM (
    'SOLICITADA', 
    'RECIBIDA', 
    'INSPECCIONADA',
    'REINGRESADO',
    'DADO_DE_BAJA'
);

-- ----------------------------------------------------------------------------
-- 2. TABLA: RUTAS DE TRANSPORTE
-- ----------------------------------------------------------------------------
CREATE TABLE rutas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_ruta VARCHAR(50) NOT NULL UNIQUE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    zona VARCHAR(100) NOT NULL,
    vehiculo_placa VARCHAR(10) NOT NULL,
    vehiculo_modelo VARCHAR(50),
    vehiculo_capacidad_kg NUMERIC(10, 2) NOT NULL CHECK (vehiculo_capacidad_kg > 0),
    conductor_nombre VARCHAR(150) NOT NULL,
    conductor_telefono VARCHAR(20),
    estado estado_ruta NOT NULL DEFAULT 'PLANEADA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. TABLA: DESPACHOS (CABECERA OPERATIVA DE ORDEN)
-- ----------------------------------------------------------------------------
CREATE TABLE despachos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_orden VARCHAR(50) NOT NULL UNIQUE,
    codigo_factura_erp VARCHAR(50) NOT NULL,
    cliente_nombre VARCHAR(200) NOT NULL,
    cliente_direccion TEXT,
    cliente_ciudad VARCHAR(100) NOT NULL DEFAULT 'Bogotá D.C.',
    transportadora VARCHAR(100) NOT NULL,
    ruta_id UUID REFERENCES rutas(id) ON DELETE SET NULL,
    estado_actual estado_despacho NOT NULL DEFAULT 'COLA',
    prioridad SMALLINT NOT NULL DEFAULT 2 CHECK (prioridad IN (1, 2, 3)), -- 1: Urgente, 2: Normal, 3: Consolidado
    horario_corte TIMESTAMPTZ NOT NULL,
    vehiculo_placa VARCHAR(100),
    bahia_asignada VARCHAR(20),
    numero_guia VARCHAR(100),
    valor_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    peso_total_kg NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    picking_operario VARCHAR(100),
    packing_mesa VARCHAR(50),
    manifiesto_despacho VARCHAR(100),
    hora_salida TIMESTAMPTZ,
    jornada VARCHAR(5) DEFAULT 'AM',
    observaciones TEXT,
    fecha_despacho DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. TABLA: DETALLE DE DESPACHO (LÍNEAS / ITEMS DE PEDIDO)
-- ----------------------------------------------------------------------------
CREATE TABLE despacho_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    despacho_id UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL,
    descripcion_producto VARCHAR(250) NOT NULL,
    cantidad_solicitada INT NOT NULL CHECK (cantidad_solicitada > 0),
    cantidad_auditada INT NOT NULL DEFAULT 0 CHECK (cantidad_auditada >= 0),
    ubicacion_bodega VARCHAR(50) NOT NULL, -- Ej: 'P02-E04-N3' (Pasillo 2, Estante 4, Nivel 3)
    peso_unitario_kg NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cantidad_auditada CHECK (cantidad_auditada <= cantidad_solicitada)
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: TRAZABILIDAD INMUTABLE (HISTORIAL DE ESTADOS)
-- ----------------------------------------------------------------------------
CREATE TABLE historial_estados_despacho (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    despacho_id UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
    estado_anterior estado_despacho,
    estado_nuevo estado_despacho NOT NULL,
    usuario_operador VARCHAR(100) NOT NULL,
    tiempo_estancia_seg INT DEFAULT 0,
    nota TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. TABLA: INCIDENCIAS DE DESPACHO (BLOQUEOS Y RETENCIONES)
-- ----------------------------------------------------------------------------
CREATE TABLE incidencias_despacho (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    despacho_id UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
    tipo tipo_incidencia NOT NULL,
    resuelta BOOLEAN NOT NULL DEFAULT FALSE,
    descripcion TEXT NOT NULL,
    reportado_por VARCHAR(100) NOT NULL,
    resuelto_por VARCHAR(100),
    solucion_aplicada TEXT,
    fecha_reporte TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_resolucion TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 7. TABLA: LOGÍSTICA INVERSA (DEVOLUCIONES)
-- ----------------------------------------------------------------------------
CREATE TABLE devoluciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    despacho_id UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
    codigo_devolucion VARCHAR(50) NOT NULL UNIQUE,
    motivo motivo_devolucion NOT NULL,
    estado estado_devolucion NOT NULL DEFAULT 'SOLICITADA',
    accion_destino VARCHAR(50), -- 'REINGRESO_INVENTARIO', 'BAJA_MERMA', 'REACONDICIONAMIENTO'
    observacion TEXT,
    inspeccionado_por VARCHAR(100),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_inspeccion TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 8. ÍNDICES DE RENDIMIENTO PARA TIEMPO REAL WMS
-- ----------------------------------------------------------------------------
CREATE INDEX idx_despachos_estado ON despachos(estado_actual);
CREATE INDEX idx_despachos_prioridad_corte ON despachos(prioridad ASC, horario_corte ASC);
CREATE INDEX idx_despachos_transportadora ON despachos(transportadora);
CREATE INDEX idx_despachos_ruta ON despachos(ruta_id);
CREATE INDEX idx_despacho_items_despacho ON despacho_items(despacho_id);
CREATE INDEX idx_historial_despacho ON historial_estados_despacho(despacho_id, created_at DESC);
CREATE INDEX idx_incidencias_activas ON incidencias_despacho(despacho_id) WHERE resuelta = FALSE;
CREATE INDEX idx_devoluciones_estado ON devoluciones(estado);

-- ----------------------------------------------------------------------------
-- 9. TRIGGER DE AUDITORÍA AUTOMÁTICA DE TRAZA INMUTABLE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_despacho_transicion()
RETURNS TRIGGER AS $$
DECLARE
    v_estancia_seg INT := 0;
    v_ultimo_cambio TIMESTAMPTZ;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO historial_estados_despacho (
            despacho_id, estado_anterior, estado_nuevo, usuario_operador, tiempo_estancia_seg, nota
        ) VALUES (
            NEW.id, NULL, NEW.estado_actual, 'SISTEMA_ERP_INTEGRACION', 0, 'Ingreso inicial a cola de despacho WMS'
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.estado_actual IS DISTINCT FROM NEW.estado_actual) THEN
        -- Calcular tiempo de estancia en el estado previo
        SELECT created_at INTO v_ultimo_cambio 
        FROM historial_estados_despacho 
        WHERE despacho_id = NEW.id 
        ORDER BY created_at DESC 
        LIMIT 1;

        IF v_ultimo_cambio IS NOT NULL THEN
            v_estancia_seg := EXTRACT(EPOCH FROM (NOW() - v_ultimo_cambio))::INT;
        END IF;

        INSERT INTO historial_estados_despacho (
            despacho_id, estado_anterior, estado_nuevo, usuario_operador, tiempo_estancia_seg, nota
        ) VALUES (
            NEW.id, OLD.estado_actual, NEW.estado_actual, COALESCE(NEW.picking_operario, 'LIDER_BODEGA'), v_estancia_seg, 
            'Transición de estado: ' || OLD.estado_actual || ' -> ' || NEW.estado_actual
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_despacho_estado_audit
AFTER INSERT OR UPDATE OF estado_actual ON despachos
FOR EACH ROW
EXECUTE FUNCTION fn_audit_despacho_transicion();

-- ----------------------------------------------------------------------------
-- 10. MÓDULO DE GESTIÓN DE INVENTARIO MULTI-BODEGA Y CONCILIACIÓN ERP
-- ----------------------------------------------------------------------------

-- Tabla maestra de bodegas / secciones físicas
CREATE TABLE IF NOT EXISTS bodegas (
    id SMALLINT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    seccion_slug VARCHAR(50) NOT NULL UNIQUE,
    ubicacion_fisica TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- Catálogo maestro de productos (datos que no varían por bodega)
CREATE TABLE IF NOT EXISTS productos (
    sku VARCHAR(40) PRIMARY KEY,
    codigo_barras VARCHAR(50),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria_slug VARCHAR(50) NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL DEFAULT 'UNIDAD',
    peso_unitario_kg NUMERIC(8,2) DEFAULT 0.00,
    precio_unitario NUMERIC(14,2) DEFAULT 0.00,
    es_codigo_interno BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock real por producto y bodega (CHECK cantidad >= 0 como defensa estricta)
CREATE TABLE IF NOT EXISTS inventario_por_bodega (
    id              BIGSERIAL PRIMARY KEY,
    sku             VARCHAR(40) NOT NULL REFERENCES productos(sku) ON DELETE CASCADE,
    bodega_id       SMALLINT NOT NULL REFERENCES bodegas(id),
    cantidad        INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_inventario_sku_bodega UNIQUE (sku, bodega_id)
);

CREATE INDEX IF NOT EXISTS idx_inventario_sku ON inventario_por_bodega(sku);
CREATE INDEX IF NOT EXISTS idx_inventario_bodega ON inventario_por_bodega(bodega_id);

-- Log de corridas de importación desde Excel/ERP
CREATE TABLE IF NOT EXISTS importaciones_inventario (
    id BIGSERIAL PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archivo VARCHAR(255) NOT NULL,
    total_filas INT NOT NULL DEFAULT 0,
    productos_nuevos INT NOT NULL DEFAULT 0,
    productos_actualizados INT NOT NULL DEFAULT 0,
    diferencias_detectadas INT NOT NULL DEFAULT 0,
    estado VARCHAR(50) NOT NULL DEFAULT 'COMPLETADO',
    usuario_admin VARCHAR(100) NOT NULL DEFAULT 'admin'
);

-- Tabla de conciliación de diferencias (revisión obligatoria por rol admin)
CREATE TABLE IF NOT EXISTS diferencias_inventario (
    id BIGSERIAL PRIMARY KEY,
    importacion_id BIGINT NOT NULL REFERENCES importaciones_inventario(id) ON DELETE CASCADE,
    sku VARCHAR(40) NOT NULL REFERENCES productos(sku),
    bodega_id SMALLINT NOT NULL REFERENCES bodegas(id),
    cantidad_sistema INT NOT NULL,
    cantidad_excel INT NOT NULL,
    diferencia INT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aplicada', 'descartada')),
    resuelto_por VARCHAR(100),
    resuelto_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_diferencias_pendientes ON diferencias_inventario(importacion_id, estado) WHERE estado = 'pendiente';

-- Seed de las 7 bodegas/secciones oficiales fijas
INSERT INTO bodegas (id, codigo, nombre, seccion_slug, ubicacion_fisica) VALUES
(1, 'BOD-MAT', 'Materiales de Construcción', 'materiales_construccion', 'Nave A - Patios y Silos'),
(2, 'BOD-PIN', 'Pinturas', 'pinturas', 'Pasillo 4 - Tintometría'),
(3, 'BOD-HER', 'Herramienta Eléctrica', 'herramienta_electrica', 'Vitrina Central de Seguridad'),
(4, 'BOD-PLO', 'Plomería', 'plomeria', 'Pasillo 8 - Tuberías y Grifería'),
(5, 'BOD-ELE', 'Eléctrico', 'electrico', 'Pasillo 6 - Cables y Tableros'),
(6, 'BOD-JAR', 'Jardín y Exteriores', 'jardin_exteriores', 'Área Exterior - Vivero y Cercas'),
(7, 'BOD-FER', 'Ferretería General', 'ferreteria_general', 'Pasillo 1 y 2 - Mostrador Central')
ON CONFLICT (id) DO NOTHING;

