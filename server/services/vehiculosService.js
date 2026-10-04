import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbClient } from '../config/db.js';
import { FLOTA_VEHICULOS } from '../config/flota.js';
import { agregarVehiculoEnPlantilla } from './plantillaExcelService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const LOCAL_VEHICULOS_FILE = path.join(DATA_DIR, 'vehiculos.json');

/**
 * Lee la lista local de vehículos en caso de fallback offline
 */
function leerVehiculosLocal() {
  try {
    if (fs.existsSync(LOCAL_VEHICULOS_FILE)) {
      const data = fs.readFileSync(LOCAL_VEHICULOS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[VEHICULOS] Error leyendo vehiculos.json local:', err.message);
  }

  // Si no existe, crear con la flota inicial
  const flotaInicial = FLOTA_VEHICULOS.map(v => {
    const partes = v.split(' ');
    const placa = partes[0] || v;
    const conductor = partes.slice(1).join(' ') || '';
    return {
      placa: v,
      placa_corta: placa,
      conductor: conductor,
      modelo: 'Camión Reparto',
      activo: true
    };
  });

  guardarVehiculosLocal(flotaInicial);
  return flotaInicial;
}

/**
 * Guarda la lista local de vehículos para fallback
 */
function guardarVehiculosLocal(vehiculos) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_VEHICULOS_FILE, JSON.stringify(vehiculos, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[VEHICULOS] Error guardando vehiculos.json local:', err.message);
  }
}

/**
 * Inicializa la tabla de vehículos en PostgreSQL si no existe
 * y asegura que los vehículos de la flota base estén registrados.
 */
export async function inicializarTablaVehiculos() {
  const client = await getDbClient();
  if (!client) {
    console.warn('[VEHICULOS] PostgreSQL no disponible al iniciar. Se usará almacenamiento local.');
    return;
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehiculos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        placa VARCHAR(100) NOT NULL UNIQUE,
        conductor VARCHAR(150),
        modelo VARCHAR(100),
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Verificar si hay registros
    const { rows } = await client.query('SELECT COUNT(*) as count FROM vehiculos');
    if (parseInt(rows[0].count, 10) === 0) {
      console.log('🚛 Inicializando vehículos base en PostgreSQL...');
      for (const v of FLOTA_VEHICULOS) {
        const partes = v.split(' ');
        const conductor = partes.slice(1).join(' ') || 'Conductor';
        await client.query(`
          INSERT INTO vehiculos (placa, conductor, activo)
          VALUES ($1, $2, TRUE)
          ON CONFLICT (placa) DO NOTHING
        `, [v, conductor]);
      }
    }
    console.log('✅ Tabla vehiculos verificada/inicializada en PostgreSQL.');
  } catch (err) {
    console.error('[VEHICULOS] Error inicializando tabla vehiculos:', err.message);
  } finally {
    client.release();
  }
}

/**
 * Obtiene la lista completa de vehículos activos (desde DB o fallback local)
 */
export async function listarVehiculos() {
  const client = await getDbClient();
  if (client) {
    try {
      const { rows } = await client.query(`
        SELECT id, placa, conductor, modelo, activo, created_at
        FROM vehiculos
        WHERE activo = TRUE
        ORDER BY created_at ASC
      `);

      if (rows && rows.length > 0) {
        // Asegurar que contenga al menos los 4 vehículos base
        const existentes = new Set(rows.map(r => r.placa.trim().toUpperCase()));
        const faltantesBase = FLOTA_VEHICULOS.filter(b => !existentes.has(b.trim().toUpperCase()));

        if (faltantesBase.length > 0) {
          for (const fb of faltantesBase) {
            const conductor = fb.split(' ').slice(1).join(' ') || 'Conductor';
            try {
              const { rows: inserted } = await client.query(`
                INSERT INTO vehiculos (placa, conductor, activo)
                VALUES ($1, $2, TRUE)
                ON CONFLICT (placa) DO NOTHING
                RETURNING id, placa, conductor, modelo, activo, created_at
              `, [fb, conductor]);
              if (inserted[0]) rows.push(inserted[0]);
            } catch (_) {}
          }
        }

        // Actualizar fallback local
        guardarVehiculosLocal(rows);
        return rows;
      }
    } catch (err) {
      console.warn('[VEHICULOS] Error consultando PostgreSQL, usando fallback local:', err.message);
    } finally {
      client.release();
    }
  }

  // Fallback local
  return leerVehiculosLocal();
}

/**
 * Registra un nuevo vehículo en la flota:
 * 1. Lo guarda en PostgreSQL y archivo local
 * 2. Agrega la nueva hoja al Excel en Google Drive / Local con membrete
 */
export async function registrarVehiculo({ placa, conductor = '', modelo = '', identificador = '' }) {
  if (!placa || !placa.trim()) {
    throw new Error('La placa del vehículo es obligatoria.');
  }

  const placaLimpia = placa.trim().toUpperCase();
  const conductorLimpio = (conductor || '').trim().toUpperCase();
  
  // Si no se proporcionó un identificador personalizado,
  // usar formato estándar "PLACA CONDUCTOR" (ej. "ABC-123 CARLOS") o simplemente "PLACA"
  let identificadorFinal = (identificador || '').trim().toUpperCase();
  if (!identificadorFinal) {
    identificadorFinal = conductorLimpio ? `${placaLimpia} ${conductorLimpio}` : placaLimpia;
  }

  // 1. Guardar o actualizar en PostgreSQL
  let vehiculoGuardado = {
    placa: identificadorFinal,
    conductor: conductorLimpio,
    modelo: (modelo || '').trim(),
    activo: true
  };

  const client = await getDbClient();
  if (client) {
    try {
      const { rows } = await client.query(`
        INSERT INTO vehiculos (placa, conductor, modelo, activo)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (placa) DO UPDATE SET
          activo = TRUE,
          conductor = COALESCE(NULLIF(EXCLUDED.conductor, ''), vehiculos.conductor),
          modelo = COALESCE(NULLIF(EXCLUDED.modelo, ''), vehiculos.modelo),
          updated_at = NOW()
        RETURNING id, placa, conductor, modelo, activo, created_at
      `, [identificadorFinal, conductorLimpio, modelo || '']);
      if (rows && rows[0]) {
        vehiculoGuardado = rows[0];
      }
    } catch (err) {
      console.warn('[VEHICULOS] Advertencia al guardar en PostgreSQL:', err.message);
    } finally {
      client.release();
    }
  }

  // 2. Sincronizar con el archivo Excel (crea la hoja con membrete)
  let excelSyncResult = { destino: 'Servidor Local (Modo Fallback)' };
  try {
    excelSyncResult = await agregarVehiculoEnPlantilla(identificadorFinal);
  } catch (errExcel) {
    console.error('[VEHICULOS] Error sincronizando nueva hoja en Excel:', errExcel.message);
    excelSyncResult = {
      success: false,
      error: errExcel.message,
      destino: 'No sincronizado en Excel'
    };
  }

  // 3. Actualizar respaldo local JSON
  const listaLocal = leerVehiculosLocal();
  const index = listaLocal.findIndex(v => v.placa.trim().toUpperCase() === identificadorFinal);
  if (index >= 0) {
    listaLocal[index] = { ...listaLocal[index], ...vehiculoGuardado };
  } else {
    listaLocal.push(vehiculoGuardado);
  }
  guardarVehiculosLocal(listaLocal);

  return {
    success: true,
    vehiculo: vehiculoGuardado,
    excel: excelSyncResult,
    destino: excelSyncResult.destino || 'Google Drive / Local'
  };
}
