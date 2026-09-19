import pg from 'pg';

const dbUrl = 'postgresql://valenciana_db_user:9wmYBBZOqgAX6aZXSp47Xjl8mnaTj66C@dpg-damrj6rncjis73cj7rog-a.oregon-postgres.render.com/valenciana_db?sslmode=require';

async function runMigration() {
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a Render Postgres.');

    const sql = `
      BEGIN;

      -- 1. Actualizar Trigger
      CREATE OR REPLACE FUNCTION fn_audit_despacho_transicion()
      RETURNS TRIGGER AS $$
      DECLARE
          v_estancia_seg INT := 0;
          v_ultimo_cambio TIMESTAMPTZ;
      BEGIN
          IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.estado_actual IS DISTINCT FROM NEW.estado_actual) THEN
              SELECT created_at INTO v_ultimo_cambio
              FROM historial_estados_despacho
              WHERE despacho_id = NEW.id
              ORDER BY created_at DESC LIMIT 1;

              IF v_ultimo_cambio IS NOT NULL THEN
                  v_estancia_seg := EXTRACT(EPOCH FROM (NOW() - v_ultimo_cambio))::INT;
              END IF;

              INSERT INTO historial_estados_despacho (
                  despacho_id, estado_anterior, estado_nuevo, usuario_operador, tiempo_estancia_seg, nota
              ) VALUES (
                  NEW.id, OLD.estado_actual, NEW.estado_actual, 'SISTEMA', v_estancia_seg, 
                  'Transición de estado: ' || OLD.estado_actual || ' -> ' || NEW.estado_actual
              );
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- 2. Eliminar temporalmente el trigger que usa la columna estado_actual
      DROP TRIGGER IF EXISTS trg_despacho_estado_audit ON despachos;

      -- 3. Migración ENUM y datos (EL UPDATE PREVIO FUE ELIMINADO PORQUE EL CAST USING LO HACE TODO)
      ALTER TYPE estado_despacho RENAME TO estado_despacho_old;
      
      CREATE TYPE estado_despacho AS ENUM (
          'PENDIENTE',
          'DESPACHADO'
      );
      
      ALTER TABLE despachos ALTER COLUMN estado_actual DROP DEFAULT;
      
      ALTER TABLE despachos 
          ALTER COLUMN estado_actual TYPE estado_despacho 
          USING (CASE 
                  WHEN estado_actual::text = 'COLA' THEN 'PENDIENTE' 
                  WHEN estado_actual::text = 'PICKING' THEN 'PENDIENTE'
                  WHEN estado_actual::text = 'PACKING' THEN 'PENDIENTE'
                  WHEN estado_actual::text = 'LISTO' THEN 'PENDIENTE'
                  WHEN estado_actual::text = 'INCIDENCIA' THEN 'PENDIENTE'
                  ELSE estado_actual::text 
                END)::estado_despacho;
          
      ALTER TABLE despachos ALTER COLUMN estado_actual SET DEFAULT 'PENDIENTE';

      -- También hacer el cast de historial_estados_despacho
      ALTER TABLE historial_estados_despacho 
          ALTER COLUMN estado_anterior TYPE estado_despacho 
          USING (CASE 
                  WHEN estado_anterior IS NULL THEN NULL
                  WHEN estado_anterior::text = 'COLA' THEN 'PENDIENTE' 
                  WHEN estado_anterior::text = 'PICKING' THEN 'PENDIENTE'
                  WHEN estado_anterior::text = 'PACKING' THEN 'PENDIENTE'
                  WHEN estado_anterior::text = 'LISTO' THEN 'PENDIENTE'
                  WHEN estado_anterior::text = 'INCIDENCIA' THEN 'PENDIENTE'
                  ELSE estado_anterior::text 
                END)::estado_despacho,
          ALTER COLUMN estado_nuevo TYPE estado_despacho 
          USING (CASE 
                  WHEN estado_nuevo::text = 'COLA' THEN 'PENDIENTE' 
                  WHEN estado_nuevo::text = 'PICKING' THEN 'PENDIENTE'
                  WHEN estado_nuevo::text = 'PACKING' THEN 'PENDIENTE'
                  WHEN estado_nuevo::text = 'LISTO' THEN 'PENDIENTE'
                  WHEN estado_nuevo::text = 'INCIDENCIA' THEN 'PENDIENTE'
                  ELSE estado_nuevo::text 
                END)::estado_despacho;
      
      DROP TYPE estado_despacho_old;

      -- 4. Borrar columnas viejas
      ALTER TABLE despachos
          DROP COLUMN IF EXISTS picking_operario,
          DROP COLUMN IF EXISTS packing_mesa,
          DROP COLUMN IF EXISTS manifiesto_despacho,
          DROP COLUMN IF EXISTS bahia_asignada,
          DROP COLUMN IF EXISTS horario_corte;

      -- 5. Recrear el trigger
      CREATE TRIGGER trg_despacho_estado_audit
      AFTER INSERT OR UPDATE OF estado_actual ON despachos
      FOR EACH ROW
      EXECUTE FUNCTION fn_audit_despacho_transicion();

      COMMIT;
    `;

    console.log('⏳ Ejecutando transacción de migración SQL...');
    await client.query(sql);
    console.log('🎉 ¡Migración ejecutada con éxito! Commit realizado.');
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO DURANTE LA MIGRACIÓN:');
    console.error(error.message);
    console.log('🔄 Dado que usamos BEGIN, Postgres ha hecho ROLLBACK automáticamente. La base de datos está intacta.');
  } finally {
    await client.end();
  }
}

runMigration();
