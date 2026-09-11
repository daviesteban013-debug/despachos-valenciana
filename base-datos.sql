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
    bahia_asignada VARCHAR(20),
    numero_guia VARCHAR(100),
    valor_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    peso_total_kg NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    picking_operario VARCHAR(100),
    packing_mesa VARCHAR(50),
    manifiesto_despacho VARCHAR(100),
    hora_salida TIMESTAMPTZ,
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
