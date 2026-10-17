import * as XLSX from 'xlsx';
import { getDbClient } from '../config/db.js';
import { fechaSqlAIso } from '../utils/fechas.js';

// ============================================================================
// CUADRE DE INVENTARIO (toma física anual)
//
// Reemplaza el Access "Formulario_Reconteo / inventarioReconteo_be":
//   t_Articulo + t_UndArt  → cuadre_articulos (unidad menor, mayor y factor)
//   t_Bodega               → cuadre_bodegas
//   t_Inventario           → cuadre_existencias (lo que dice el TNS, por jornada)
//   t_Conteo               → cuadre_planillas (CONTEO / RECONTEO)
//   t_ConteoPerso          → cuadre_planilla_equipo
//   t_ArtContado           → cuadre_lineas
//   t_Reconteo             → cuadre_reconteo_items
// Nuevo: cuadre_jornadas (un inventario por año en la misma base, con historial).
//
// Todas las cantidades se comparan en UNIDAD MENOR del artículo.
// ============================================================================

// Bodegas del TNS (tomadas de t_Bodega del Access)
const BODEGAS_INICIALES = [
  ['00', 'RETAIL'], ['01', 'BODEGA 01'], ['02', 'BODEGA 02'], ['03', 'BODEGA 03'],
  ['04', 'BODEGA 04'], ['05', 'PENDIENTE POR LLEGAR'], ['06', 'NO TOCAR (ANGY)'],
  ['A', 'DISTRIBUCION'], ['B', 'GARANTIA'], ['B2', 'GARANTIA PROVEEDOR'], ['C', 'FALTANTES'],
  ['D', 'MAL ESTADO'], ['E', 'CORTAS'], ['F', 'CONSTRUCCION E INDUSTRIA'], ['G', 'STOCK'],
  ['H', 'EXHIBICION'], ['P', 'PATIOS'], ['Y', 'DESPACHOS']
];

export class CuadreError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function conCliente(fn) {
  const client = await getDbClient();
  if (!client) throw new CuadreError(500, 'Base de datos no disponible');
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

async function enTransaccion(fn) {
  return conCliente(async (client) => {
    await client.query('BEGIN');
    try {
      const r = await fn(client);
      await client.query('COMMIT');
      return r;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    }
  });
}

const num = (v) => (v === null || v === undefined ? null : Number(v));

// ────────────────────────────────────────────────────────────────────────────
// ESQUEMA
// ────────────────────────────────────────────────────────────────────────────
export async function inicializarTablasCuadre() {
  const client = await getDbClient();
  if (!client) {
    console.warn('[CUADRE] PostgreSQL no disponible al iniciar. Se omitió la creación de tablas cuadre_*.');
    return;
  }
  try {
    // Candado: si arrancan dos instancias a la vez, una espera a la otra
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(727001)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cuadre_bodegas (
        codigo VARCHAR(4) PRIMARY KEY,
        nombre VARCHAR(60) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cuadre_articulos (
        codigo VARCHAR(60) PRIMARY KEY,
        descripcion TEXT NOT NULL DEFAULT '',
        unidad_menor VARCHAR(20) NOT NULL DEFAULT 'UND',
        unidad_mayor VARCHAR(20) NOT NULL DEFAULT 'UND',
        factor NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK (factor > 0),
        inactivo BOOLEAN NOT NULL DEFAULT FALSE,
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cuadre_jornadas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        fecha_corte DATE NOT NULL,
        estado VARCHAR(12) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
        creado_por VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cerrada_en TIMESTAMPTZ,
        archivo_existencias TEXT,
        existencias_cargadas_en TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS cuadre_jornada_bodegas (
        jornada_id INT NOT NULL REFERENCES cuadre_jornadas(id) ON DELETE CASCADE,
        bodega_codigo VARCHAR(4) NOT NULL REFERENCES cuadre_bodegas(codigo),
        PRIMARY KEY (jornada_id, bodega_codigo)
      );

      CREATE TABLE IF NOT EXISTS cuadre_existencias (
        jornada_id INT NOT NULL REFERENCES cuadre_jornadas(id) ON DELETE CASCADE,
        articulo_codigo VARCHAR(60) NOT NULL,
        bodega_codigo VARCHAR(4) NOT NULL,
        cantidad NUMERIC(16,4) NOT NULL,            -- en unidad menor
        unidad_origen VARCHAR(20),
        cantidad_origen NUMERIC(16,4),
        PRIMARY KEY (jornada_id, articulo_codigo, bodega_codigo)
      );

      CREATE TABLE IF NOT EXISTS cuadre_planillas (
        id SERIAL PRIMARY KEY,
        jornada_id INT NOT NULL REFERENCES cuadre_jornadas(id) ON DELETE CASCADE,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('CONTEO', 'RECONTEO')),
        planilla_padre_id INT REFERENCES cuadre_planillas(id) ON DELETE SET NULL,
        bodega_codigo VARCHAR(4) NOT NULL REFERENCES cuadre_bodegas(codigo),
        ubicacion VARCHAR(80) NOT NULL DEFAULT '',
        lider_email VARCHAR(255) NOT NULL,
        estado VARCHAR(10) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
        creado_por VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cerrada_en TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_cuadre_planillas_jornada ON cuadre_planillas(jornada_id);

      CREATE TABLE IF NOT EXISTS cuadre_planilla_equipo (
        id SERIAL PRIMARY KEY,
        planilla_id INT NOT NULL REFERENCES cuadre_planillas(id) ON DELETE CASCADE,
        nombre VARCHAR(120) NOT NULL,
        email VARCHAR(255),
        rol VARCHAR(30) NOT NULL DEFAULT 'Contador'
      );

      CREATE TABLE IF NOT EXISTS cuadre_lineas (
        id SERIAL PRIMARY KEY,
        planilla_id INT NOT NULL REFERENCES cuadre_planillas(id) ON DELETE CASCADE,
        articulo_codigo VARCHAR(60) NOT NULL,
        bodega_codigo VARCHAR(4) NOT NULL REFERENCES cuadre_bodegas(codigo),
        unidad_tipo VARCHAR(5) NOT NULL DEFAULT 'MENOR' CHECK (unidad_tipo IN ('MENOR', 'MAYOR')),
        unidad VARCHAR(20) NOT NULL,
        cantidad NUMERIC(16,4) NOT NULL CHECK (cantidad >= 0),
        cantidad_menor NUMERIC(16,4) NOT NULL CHECK (cantidad_menor >= 0),
        contado_por VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cuadre_lineas_planilla ON cuadre_lineas(planilla_id);
      CREATE INDEX IF NOT EXISTS idx_cuadre_lineas_art_bod ON cuadre_lineas(articulo_codigo, bodega_codigo);

      CREATE TABLE IF NOT EXISTS cuadre_reconteo_items (
        planilla_id INT NOT NULL REFERENCES cuadre_planillas(id) ON DELETE CASCADE,
        articulo_codigo VARCHAR(60) NOT NULL,
        bodega_codigo VARCHAR(4) NOT NULL,
        cantidad_sistema NUMERIC(16,4),
        cantidad_conteo NUMERIC(16,4),
        PRIMARY KEY (planilla_id, articulo_codigo, bodega_codigo)
      );
    `);

    const valores = BODEGAS_INICIALES.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
    await client.query(
      `INSERT INTO cuadre_bodegas (codigo, nombre) VALUES ${valores} ON CONFLICT (codigo) DO NOTHING`,
      BODEGAS_INICIALES.flat()
    );
    await client.query('COMMIT');
    console.log('✅ Tablas cuadre_* verificadas (cuadre de inventario).');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[CUADRE] Error creando tablas cuadre_*:', err.message);
  } finally {
    client.release();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// BODEGAS Y ARTÍCULOS
// ────────────────────────────────────────────────────────────────────────────
export function listarBodegas() {
  return conCliente(async (c) => (await c.query('SELECT codigo, nombre FROM cuadre_bodegas ORDER BY codigo')).rows);
}

export function buscarArticulos(q = '', limite = 20) {
  const texto = String(q || '').trim();
  if (!texto) return Promise.resolve([]);
  return conCliente(async (c) => {
    const { rows } = await c.query(`
      SELECT codigo, descripcion, unidad_menor, unidad_mayor, factor, inactivo
      FROM cuadre_articulos
      WHERE codigo ILIKE $1 OR descripcion ILIKE $2
      ORDER BY (codigo = $3) DESC, (codigo ILIKE $1) DESC, codigo
      LIMIT $4
    `, [`${texto}%`, `%${texto}%`, texto.toUpperCase(), Math.min(Number(limite) || 20, 50)]);
    return rows.map(r => ({ ...r, factor: num(r.factor) }));
  });
}

// ────────────────────────────────────────────────────────────────────────────
// JORNADAS
// ────────────────────────────────────────────────────────────────────────────
// Fecha de corte como 'AAAA-MM-DD' (sin corrimiento por la zona horaria del servidor)
const normalizarJornada = (j) => ({ ...j, fecha_corte: fechaSqlAIso(j.fecha_corte) });

export function listarJornadas() {
  return conCliente(async (c) => {
    const { rows } = await c.query(`
      SELECT j.*,
             COALESCE(ARRAY_AGG(jb.bodega_codigo ORDER BY jb.bodega_codigo) FILTER (WHERE jb.bodega_codigo IS NOT NULL), '{}') AS bodegas,
             (SELECT COUNT(*) FROM cuadre_existencias e WHERE e.jornada_id = j.id)::int AS total_existencias,
             (SELECT COUNT(*) FROM cuadre_planillas p WHERE p.jornada_id = j.id)::int AS total_planillas
      FROM cuadre_jornadas j
      LEFT JOIN cuadre_jornada_bodegas jb ON jb.jornada_id = j.id
      GROUP BY j.id
      ORDER BY j.fecha_corte DESC, j.id DESC
    `);
    return rows.map(normalizarJornada);
  });
}

export async function obtenerJornada(id, client = null) {
  const consulta = async (c) => {
    const { rows } = await c.query(`
      SELECT j.*,
             COALESCE(ARRAY_AGG(jb.bodega_codigo ORDER BY jb.bodega_codigo) FILTER (WHERE jb.bodega_codigo IS NOT NULL), '{}') AS bodegas
      FROM cuadre_jornadas j
      LEFT JOIN cuadre_jornada_bodegas jb ON jb.jornada_id = j.id
      WHERE j.id = $1
      GROUP BY j.id
    `, [id]);
    if (rows.length === 0) throw new CuadreError(404, 'Jornada no encontrada.');
    return normalizarJornada(rows[0]);
  };
  return client ? consulta(client) : conCliente(consulta);
}

async function validarBodegas(c, bodegas) {
  const lista = [...new Set((bodegas || []).map(b => String(b).trim().toUpperCase()).filter(Boolean))];
  if (lista.length === 0) throw new CuadreError(400, 'Selecciona al menos una bodega para la jornada.');
  const { rows } = await c.query('SELECT codigo FROM cuadre_bodegas WHERE codigo = ANY($1)', [lista]);
  const validas = new Set(rows.map(r => r.codigo));
  const invalidas = lista.filter(b => !validas.has(b));
  if (invalidas.length) throw new CuadreError(400, `Bodegas inexistentes: ${invalidas.join(', ')}`);
  return lista;
}

export function crearJornada({ nombre, fecha_corte, bodegas }, email) {
  const nombreLimpio = String(nombre || '').trim();
  if (!nombreLimpio) throw new CuadreError(400, 'El nombre de la jornada es obligatorio.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha_corte || ''))) {
    throw new CuadreError(400, 'La fecha de corte debe tener formato AAAA-MM-DD.');
  }
  return enTransaccion(async (c) => {
    const lista = await validarBodegas(c, bodegas);
    const { rows } = await c.query(
      'INSERT INTO cuadre_jornadas (nombre, fecha_corte, creado_por) VALUES ($1, $2, $3) RETURNING id',
      [nombreLimpio.slice(0, 120), fecha_corte, email]
    );
    const id = rows[0].id;
    for (const b of lista) {
      await c.query('INSERT INTO cuadre_jornada_bodegas (jornada_id, bodega_codigo) VALUES ($1, $2)', [id, b]);
    }
    return obtenerJornada(id, c);
  });
}

export function actualizarJornada(id, { estado, bodegas, nombre }) {
  return enTransaccion(async (c) => {
    await obtenerJornada(id, c);
    if (nombre !== undefined) {
      const n = String(nombre).trim();
      if (!n) throw new CuadreError(400, 'El nombre no puede quedar vacío.');
      await c.query('UPDATE cuadre_jornadas SET nombre = $1 WHERE id = $2', [n.slice(0, 120), id]);
    }
    if (estado !== undefined) {
      if (!['ABIERTA', 'CERRADA'].includes(estado)) throw new CuadreError(400, 'Estado inválido.');
      await c.query(
        `UPDATE cuadre_jornadas SET estado = $1::text, cerrada_en = CASE WHEN $1::text = 'CERRADA' THEN NOW() ELSE NULL END WHERE id = $2`,
        [estado, id]
      );
    }
    if (bodegas !== undefined) {
      const lista = await validarBodegas(c, bodegas);
      await c.query('DELETE FROM cuadre_jornada_bodegas WHERE jornada_id = $1', [id]);
      for (const b of lista) {
        await c.query('INSERT INTO cuadre_jornada_bodegas (jornada_id, bodega_codigo) VALUES ($1, $2)', [id, b]);
      }
    }
    return obtenerJornada(id, c);
  });
}

async function exigirJornadaAbierta(c, jornadaId) {
  const j = await obtenerJornada(jornadaId, c);
  if (j.estado !== 'ABIERTA') throw new CuadreError(409, 'La jornada está cerrada: no admite cambios.');
  return j;
}

// ────────────────────────────────────────────────────────────────────────────
// IMPORTACIÓN DESDE EXCEL DEL TNS
// Acepta el export del TNS o el de las tablas del Access (t_Articulo, t_Inventario).
// ────────────────────────────────────────────────────────────────────────────
const normalizarEncabezado = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

const ALIAS_ARTICULOS = {
  codigo: ['codigo', 'idart', 'cod', 'codigoarticulo', 'codarticulo', 'referencia', 'item', 'codigoproducto'],
  descripcion: ['descripcion', 'descripart', 'nombre', 'articulo', 'nombrearticulo', 'producto'],
  unidad_menor: ['unidadmenor', 'umenorart', 'undmenor', 'unidaddetal', 'unidad', 'und', 'unidadmedida'],
  unidad_mayor: ['unidadmayor', 'umayorart', 'undmayor', 'unidadempaque', 'empaque'],
  factor: ['factor', 'factart', 'conversion', 'factorconversion'],
  inactivo: ['inactivo', 'inacart']
};

const ALIAS_EXISTENCIAS = {
  codigo: ['codigo', 'idartfk', 'idart', 'cod', 'codigoarticulo', 'codarticulo', 'referencia', 'item', 'codigoproducto'],
  bodega: ['bodega', 'bodinv', 'codbodega', 'codigobodega', 'idbodega'],
  cantidad: ['cantidad', 'cantinv', 'existencia', 'existencias', 'saldo', 'saldocantidad', 'stock', 'cant'],
  unidad: ['unidad', 'undinv', 'und', 'unidadmedida']
};

/** Lee la primera hoja que tenga un encabezado reconocible y devuelve filas con campos normalizados. */
function leerFilas(buffer, alias, obligatorios) {
  // raw: los CSV se leen como texto (no se pierden ceros a la izquierda en los códigos)
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: true });
  for (const nombreHoja of wb.SheetNames) {
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[nombreHoja], { header: 1, defval: '', raw: true });
    for (let i = 0; i < Math.min(filas.length, 30); i++) {
      const encabezado = (filas[i] || []).map(normalizarEncabezado);
      const indices = {};
      for (const [campo, nombres] of Object.entries(alias)) {
        const idx = encabezado.findIndex(h => nombres.includes(h));
        if (idx >= 0) indices[campo] = idx;
      }
      if (obligatorios.every(c => indices[c] !== undefined)) {
        const datos = filas.slice(i + 1).map(f => {
          const o = {};
          for (const [campo, idx] of Object.entries(indices)) o[campo] = f[idx];
          return o;
        });
        return { hoja: nombreHoja, columnas: Object.keys(indices), filas: datos };
      }
    }
  }
  const esperado = obligatorios.map(c => alias[c][0]).join(', ');
  throw new CuadreError(400, `No se encontró una hoja con las columnas requeridas (${esperado}).`);
}

const textoCodigo = (v) => String(v ?? '').trim().toUpperCase();
const textoBodega = (v) => {
  const b = String(v ?? '').trim().toUpperCase();
  return /^\d$/.test(b) ? b.padStart(2, '0') : b;   // 0 → "00", 1 → "01"
};
const numero = (v) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (!s) return NaN;
  // Admite "1.234,5" y "1234.5"
  const normal = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Number(normal);
};
const esVerdadero = (v) => ['1', 'true', 'si', 'sí', 'x', '-1', 'verdadero'].includes(String(v ?? '').trim().toLowerCase());

export async function importarArticulos(buffer) {
  const { hoja, columnas, filas } = leerFilas(buffer, ALIAS_ARTICULOS, ['codigo', 'descripcion']);
  const mapa = new Map();
  for (const f of filas) {
    const codigo = textoCodigo(f.codigo);
    if (!codigo || codigo === 'CODIGO' || codigo === 'ID_ART') continue;
    const factor = numero(f.factor);
    mapa.set(codigo, {
      codigo: codigo.slice(0, 60),
      descripcion: String(f.descripcion ?? '').trim(),
      unidad_menor: (String(f.unidad_menor ?? '').trim().toUpperCase() || 'UND').slice(0, 20),
      unidad_mayor: (String(f.unidad_mayor ?? '').trim().toUpperCase() || String(f.unidad_menor ?? '').trim().toUpperCase() || 'UND').slice(0, 20),
      factor: Number.isFinite(factor) && factor > 0 ? factor : 1,
      inactivo: f.inactivo !== undefined ? esVerdadero(f.inactivo) : false
    });
  }
  const lista = [...mapa.values()];
  if (lista.length === 0) throw new CuadreError(400, 'El archivo de artículos no tiene filas válidas.');

  await enTransaccion(async (c) => {
    const LOTE = 2000;
    for (let i = 0; i < lista.length; i += LOTE) {
      const lote = lista.slice(i, i + LOTE);
      await c.query(`
        INSERT INTO cuadre_articulos (codigo, descripcion, unidad_menor, unidad_mayor, factor, inactivo, actualizado_en)
        SELECT * , NOW() FROM UNNEST($1::varchar[], $2::text[], $3::varchar[], $4::varchar[], $5::numeric[], $6::boolean[])
        ON CONFLICT (codigo) DO UPDATE SET
          descripcion = EXCLUDED.descripcion,
          unidad_menor = EXCLUDED.unidad_menor,
          unidad_mayor = EXCLUDED.unidad_mayor,
          factor = EXCLUDED.factor,
          inactivo = EXCLUDED.inactivo,
          actualizado_en = NOW()
      `, [
        lote.map(a => a.codigo), lote.map(a => a.descripcion), lote.map(a => a.unidad_menor),
        lote.map(a => a.unidad_mayor), lote.map(a => a.factor), lote.map(a => a.inactivo)
      ]);
    }
  });
  return { hoja, columnas, articulos: lista.length };
}

export async function importarExistencias(jornadaId, buffer, nombreArchivo) {
  const { hoja, columnas, filas } = leerFilas(buffer, ALIAS_EXISTENCIAS, ['codigo', 'bodega', 'cantidad']);

  return enTransaccion(async (c) => {
    await exigirJornadaAbierta(c, jornadaId);

    const { rows: arts } = await c.query('SELECT codigo, unidad_menor, unidad_mayor, factor FROM cuadre_articulos');
    if (arts.length === 0) throw new CuadreError(409, 'Primero carga el archivo de artículos del TNS.');
    const articulos = new Map(arts.map(a => [a.codigo, a]));
    const { rows: bods } = await c.query('SELECT codigo FROM cuadre_bodegas');
    const bodegasValidas = new Set(bods.map(b => b.codigo));

    const acumulado = new Map();   // codigo|bodega → { cantidad menor, unidad, cantidad origen }
    const sinArticulo = new Set();
    const bodegasDesconocidas = new Set();
    let filasInvalidas = 0;

    for (const f of filas) {
      const codigo = textoCodigo(f.codigo);
      const bodega = textoBodega(f.bodega);
      const cantidad = numero(f.cantidad);
      if (!codigo && !bodega) continue;
      if (!codigo || !bodega || !Number.isFinite(cantidad)) { filasInvalidas++; continue; }
      const art = articulos.get(codigo);
      if (!art) { sinArticulo.add(codigo); continue; }
      if (!bodegasValidas.has(bodega)) { bodegasDesconocidas.add(bodega); continue; }

      // La cantidad viene en la unidad indicada; si es la unidad mayor se convierte a menor
      const unidad = String(f.unidad ?? '').trim().toUpperCase() || art.unidad_menor;
      const factor = Number(art.factor) || 1;
      const esMayor = unidad === art.unidad_mayor && unidad !== art.unidad_menor;
      const cantidadMenor = esMayor ? cantidad * factor : cantidad;

      const clave = `${codigo}|${bodega}`;
      const previo = acumulado.get(clave);
      acumulado.set(clave, {
        codigo, bodega,
        cantidad: (previo?.cantidad || 0) + cantidadMenor,
        unidad,
        cantidad_origen: (previo?.cantidad_origen || 0) + cantidad
      });
    }

    const lista = [...acumulado.values()];
    if (lista.length === 0) throw new CuadreError(400, 'El archivo de existencias no tiene filas válidas para los artículos cargados.');

    // La foto del sistema se reemplaza completa para la jornada
    await c.query('DELETE FROM cuadre_existencias WHERE jornada_id = $1', [jornadaId]);
    const LOTE = 2000;
    for (let i = 0; i < lista.length; i += LOTE) {
      const lote = lista.slice(i, i + LOTE);
      await c.query(`
        INSERT INTO cuadre_existencias (jornada_id, articulo_codigo, bodega_codigo, cantidad, unidad_origen, cantidad_origen)
        SELECT $1, * FROM UNNEST($2::varchar[], $3::varchar[], $4::numeric[], $5::varchar[], $6::numeric[])
      `, [
        jornadaId, lote.map(e => e.codigo), lote.map(e => e.bodega), lote.map(e => e.cantidad),
        lote.map(e => e.unidad.slice(0, 20)), lote.map(e => e.cantidad_origen)
      ]);
    }
    await c.query(
      'UPDATE cuadre_jornadas SET archivo_existencias = $1, existencias_cargadas_en = NOW() WHERE id = $2',
      [String(nombreArchivo || '').slice(0, 200), jornadaId]
    );

    return {
      hoja, columnas,
      existencias: lista.length,
      filas_invalidas: filasInvalidas,
      codigos_sin_articulo: sinArticulo.size,
      ejemplos_sin_articulo: [...sinArticulo].slice(0, 10),
      bodegas_desconocidas: [...bodegasDesconocidas]
    };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// PLANILLAS DE CONTEO / RECONTEO
// ────────────────────────────────────────────────────────────────────────────
export function listarPlanillas(jornadaId) {
  return conCliente(async (c) => {
    const { rows } = await c.query(`
      SELECT p.*, b.nombre AS bodega_nombre,
             (SELECT COUNT(*) FROM cuadre_lineas l WHERE l.planilla_id = p.id)::int AS total_lineas,
             (SELECT COUNT(*) FROM cuadre_reconteo_items r WHERE r.planilla_id = p.id)::int AS total_items_reconteo,
             COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('nombre', e.nombre, 'email', e.email, 'rol', e.rol) ORDER BY e.id)
                       FROM cuadre_planilla_equipo e WHERE e.planilla_id = p.id), '[]') AS equipo
      FROM cuadre_planillas p
      JOIN cuadre_bodegas b ON b.codigo = p.bodega_codigo
      WHERE p.jornada_id = $1
      ORDER BY p.created_at DESC
    `, [jornadaId]);
    return rows;
  });
}

function normalizarEquipo(equipo) {
  return (Array.isArray(equipo) ? equipo : [])
    .map(e => ({
      nombre: String(e?.nombre || '').trim().slice(0, 120),
      email: String(e?.email || '').trim().toLowerCase().slice(0, 255) || null,
      rol: (String(e?.rol || '').trim() || 'Contador').slice(0, 30)
    }))
    .filter(e => e.nombre);
}

export function crearPlanilla(jornadaId, { bodega, ubicacion, equipo }, usuario) {
  return enTransaccion(async (c) => {
    const j = await exigirJornadaAbierta(c, jornadaId);
    const bod = textoBodega(bodega);
    if (!j.bodegas.includes(bod)) throw new CuadreError(400, `La bodega ${bod || '(vacía)'} no está incluida en esta jornada.`);
    const { rows } = await c.query(`
      INSERT INTO cuadre_planillas (jornada_id, tipo, bodega_codigo, ubicacion, lider_email, creado_por)
      VALUES ($1, 'CONTEO', $2, $3, $4, $4) RETURNING id
    `, [jornadaId, bod, String(ubicacion || '').trim().slice(0, 80), usuario.email]);
    const id = rows[0].id;
    const miembros = normalizarEquipo(equipo);
    if (!miembros.some(m => m.email === usuario.email)) {
      miembros.unshift({ nombre: usuario.nombre || usuario.email, email: usuario.email, rol: 'Líder' });
    }
    for (const m of miembros) {
      await c.query('INSERT INTO cuadre_planilla_equipo (planilla_id, nombre, email, rol) VALUES ($1, $2, $3, $4)',
        [id, m.nombre, m.email, m.rol]);
    }
    return obtenerPlanilla(id, c);
  });
}

export async function obtenerPlanilla(id, client = null) {
  const consulta = async (c) => {
    const { rows } = await c.query(`
      SELECT p.*, b.nombre AS bodega_nombre, j.estado AS jornada_estado, j.nombre AS jornada_nombre,
             COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('nombre', e.nombre, 'email', e.email, 'rol', e.rol) ORDER BY e.id)
                       FROM cuadre_planilla_equipo e WHERE e.planilla_id = p.id), '[]') AS equipo
      FROM cuadre_planillas p
      JOIN cuadre_bodegas b ON b.codigo = p.bodega_codigo
      JOIN cuadre_jornadas j ON j.id = p.jornada_id
      WHERE p.id = $1
    `, [id]);
    if (rows.length === 0) throw new CuadreError(404, 'Planilla no encontrada.');
    const planilla = rows[0];

    const { rows: lineas } = await c.query(`
      SELECT l.*, a.descripcion, a.unidad_menor, a.unidad_mayor, a.factor
      FROM cuadre_lineas l
      LEFT JOIN cuadre_articulos a ON a.codigo = l.articulo_codigo
      WHERE l.planilla_id = $1
      ORDER BY l.id
    `, [id]);
    const { rows: items } = await c.query(`
      SELECT r.*, a.descripcion, a.unidad_menor
      FROM cuadre_reconteo_items r
      LEFT JOIN cuadre_articulos a ON a.codigo = r.articulo_codigo
      WHERE r.planilla_id = $1
      ORDER BY r.bodega_codigo, r.articulo_codigo
    `, [id]);

    return {
      ...planilla,
      lineas: lineas.map((l, i) => ({
        ...l, numero: i + 1,
        cantidad: num(l.cantidad), cantidad_menor: num(l.cantidad_menor), factor: num(l.factor)
      })),
      items_reconteo: items.map(r => ({ ...r, cantidad_sistema: num(r.cantidad_sistema), cantidad_conteo: num(r.cantidad_conteo) }))
    };
  };
  return client ? consulta(client) : conCliente(consulta);
}

function puedeGestionarPlanilla(planilla, usuario) {
  return usuario.esAdmin || planilla.lider_email === usuario.email || planilla.creado_por === usuario.email;
}

export function actualizarPlanilla(id, { estado }, usuario) {
  return enTransaccion(async (c) => {
    const p = await obtenerPlanilla(id, c);
    if (p.jornada_estado !== 'ABIERTA') throw new CuadreError(409, 'La jornada está cerrada.');
    if (!puedeGestionarPlanilla(p, usuario)) throw new CuadreError(403, 'Solo el líder de la planilla o un administrador puede cerrarla o reabrirla.');
    if (!['ABIERTA', 'CERRADA'].includes(estado)) throw new CuadreError(400, 'Estado inválido.');
    await c.query(
      `UPDATE cuadre_planillas SET estado = $1::text, cerrada_en = CASE WHEN $1::text = 'CERRADA' THEN NOW() ELSE NULL END WHERE id = $2`,
      [estado, id]
    );
    return obtenerPlanilla(id, c);
  });
}

async function planillaEditable(c, planillaId) {
  const p = await obtenerPlanilla(planillaId, c);
  if (p.jornada_estado !== 'ABIERTA') throw new CuadreError(409, 'La jornada está cerrada: no admite cambios.');
  if (p.estado !== 'ABIERTA') throw new CuadreError(409, 'La planilla está cerrada: pide al líder que la reabra.');
  return p;
}

async function prepararLinea(c, planilla, { articulo_codigo, bodega, unidad_tipo, cantidad }) {
  const codigo = textoCodigo(articulo_codigo);
  const { rows } = await c.query('SELECT * FROM cuadre_articulos WHERE codigo = $1', [codigo]);
  if (rows.length === 0) throw new CuadreError(400, `El artículo ${codigo || '(vacío)'} no existe en el catálogo cargado.`);
  const art = rows[0];

  const bod = textoBodega(bodega || planilla.bodega_codigo);
  const { rows: jb } = await c.query(
    'SELECT 1 FROM cuadre_jornada_bodegas WHERE jornada_id = $1 AND bodega_codigo = $2',
    [planilla.jornada_id, bod]
  );
  if (jb.length === 0) throw new CuadreError(400, `La bodega ${bod} no está incluida en esta jornada.`);

  const cant = numero(cantidad);
  if (!Number.isFinite(cant) || cant < 0) throw new CuadreError(400, 'La cantidad debe ser un número mayor o igual a 0.');

  const tipo = unidad_tipo === 'MAYOR' ? 'MAYOR' : 'MENOR';
  const factor = Number(art.factor) || 1;
  return {
    codigo, bodega: bod, tipo,
    unidad: tipo === 'MAYOR' ? art.unidad_mayor : art.unidad_menor,
    cantidad: cant,
    cantidad_menor: tipo === 'MAYOR' ? cant * factor : cant
  };
}

export function agregarLinea(planillaId, datos, usuario) {
  return enTransaccion(async (c) => {
    const p = await planillaEditable(c, planillaId);
    const l = await prepararLinea(c, p, datos);
    const { rows } = await c.query(`
      INSERT INTO cuadre_lineas (planilla_id, articulo_codigo, bodega_codigo, unidad_tipo, unidad, cantidad, cantidad_menor, contado_por)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `, [planillaId, l.codigo, l.bodega, l.tipo, l.unidad, l.cantidad, l.cantidad_menor, usuario.email]);
    return { id: rows[0].id, planilla: await obtenerPlanilla(planillaId, c) };
  });
}

async function obtenerLineaConPermiso(c, lineaId, usuario) {
  const { rows } = await c.query('SELECT * FROM cuadre_lineas WHERE id = $1', [lineaId]);
  if (rows.length === 0) throw new CuadreError(404, 'Línea no encontrada.');
  const linea = rows[0];
  const p = await planillaEditable(c, linea.planilla_id);
  if (!(usuario.esAdmin || linea.contado_por === usuario.email || puedeGestionarPlanilla(p, usuario))) {
    throw new CuadreError(403, 'Solo quien registró la línea, el líder o un administrador puede modificarla.');
  }
  return { linea, planilla: p };
}

export function actualizarLinea(lineaId, datos, usuario) {
  return enTransaccion(async (c) => {
    const { linea, planilla } = await obtenerLineaConPermiso(c, lineaId, usuario);
    const l = await prepararLinea(c, planilla, {
      articulo_codigo: datos.articulo_codigo ?? linea.articulo_codigo,
      bodega: datos.bodega ?? linea.bodega_codigo,
      unidad_tipo: datos.unidad_tipo ?? linea.unidad_tipo,
      cantidad: datos.cantidad ?? linea.cantidad
    });
    await c.query(`
      UPDATE cuadre_lineas
      SET articulo_codigo = $1, bodega_codigo = $2, unidad_tipo = $3, unidad = $4, cantidad = $5, cantidad_menor = $6, updated_at = NOW()
      WHERE id = $7
    `, [l.codigo, l.bodega, l.tipo, l.unidad, l.cantidad, l.cantidad_menor, lineaId]);
    return obtenerPlanilla(linea.planilla_id, c);
  });
}

export function eliminarLinea(lineaId, usuario) {
  return enTransaccion(async (c) => {
    const { linea } = await obtenerLineaConPermiso(c, lineaId, usuario);
    await c.query('DELETE FROM cuadre_lineas WHERE id = $1', [lineaId]);
    return obtenerPlanilla(linea.planilla_id, c);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// CUADRE: SISTEMA vs CONTADO (unidad menor)
// Cantidad final = reconteo si existe para (artículo, bodega); si no, el conteo.
// Los artículos con existencia en el sistema que nadie contó quedan como
// "sin contar" y NO entran en la medición del error.
// ────────────────────────────────────────────────────────────────────────────
async function calcularFilasCuadre(c, jornadaId) {
  const { rows } = await c.query(`
    WITH bods AS (
      SELECT bodega_codigo FROM cuadre_jornada_bodegas WHERE jornada_id = $1
    ),
    sis AS (
      SELECT articulo_codigo AS a, bodega_codigo AS b, cantidad
      FROM cuadre_existencias
      WHERE jornada_id = $1 AND bodega_codigo IN (SELECT bodega_codigo FROM bods)
    ),
    lin AS (
      SELECT l.articulo_codigo AS a, l.bodega_codigo AS b, p.tipo,
             SUM(l.cantidad_menor) AS total
      FROM cuadre_lineas l
      JOIN cuadre_planillas p ON p.id = l.planilla_id
      WHERE p.jornada_id = $1 AND l.bodega_codigo IN (SELECT bodega_codigo FROM bods)
      GROUP BY 1, 2, 3
    ),
    con AS (SELECT a, b, total FROM lin WHERE tipo = 'CONTEO'),
    rec AS (SELECT a, b, total FROM lin WHERE tipo = 'RECONTEO'),
    pend AS (
      SELECT DISTINCT ri.articulo_codigo AS a, ri.bodega_codigo AS b
      FROM cuadre_reconteo_items ri
      JOIN cuadre_planillas p ON p.id = ri.planilla_id
      WHERE p.jornada_id = $1
    ),
    uni AS (
      SELECT a, b FROM sis UNION SELECT a, b FROM con UNION SELECT a, b FROM rec
    )
    SELECT u.a AS articulo_codigo, u.b AS bodega_codigo,
           art.descripcion, COALESCE(art.unidad_menor, 'UND') AS unidad,
           COALESCE(sis.cantidad, 0) AS sistema,
           con.total AS conteo,
           rec.total AS reconteo,
           (pend.a IS NOT NULL) AS marcado_reconteo
    FROM uni u
    LEFT JOIN sis ON sis.a = u.a AND sis.b = u.b
    LEFT JOIN con ON con.a = u.a AND con.b = u.b
    LEFT JOIN rec ON rec.a = u.a AND rec.b = u.b
    LEFT JOIN pend ON pend.a = u.a AND pend.b = u.b
    LEFT JOIN cuadre_articulos art ON art.codigo = u.a
    ORDER BY u.b, u.a
  `, [jornadaId]);

  return rows.map(r => {
    const sistema = num(r.sistema) || 0;
    const conteo = num(r.conteo);
    const reconteo = num(r.reconteo);
    const contado = conteo !== null || reconteo !== null;
    const final = reconteo !== null ? reconteo : (conteo !== null ? conteo : null);
    const diferencia = contado ? redondear(final - sistema) : null;
    let estado;
    if (!contado) estado = r.marcado_reconteo ? 'PENDIENTE_RECONTEO' : 'SIN_CONTAR';
    else if (r.marcado_reconteo && reconteo === null) estado = 'PENDIENTE_RECONTEO';
    else if (diferencia === 0) estado = 'CUADRA';
    else estado = diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
    return {
      articulo_codigo: r.articulo_codigo,
      bodega_codigo: r.bodega_codigo,
      descripcion: r.descripcion || '(no está en el catálogo)',
      unidad: r.unidad,
      sistema, conteo, reconteo,
      final, diferencia,
      marcado_reconteo: r.marcado_reconteo,
      estado
    };
  });
}

const redondear = (n) => Math.round(n * 10000) / 10000;

function resumir(filas) {
  const base = () => ({
    articulos: 0, contados: 0, cuadran: 0, con_diferencia: 0,
    sobrante_unidades: 0, faltante_unidades: 0, sin_contar: 0, pendientes_reconteo: 0
  });
  const total = base();
  const porBodega = {};
  for (const f of filas) {
    const grupos = [total, (porBodega[f.bodega_codigo] ||= base())];
    for (const g of grupos) {
      g.articulos++;
      if (f.estado === 'SIN_CONTAR') { g.sin_contar++; continue; }
      if (f.estado === 'PENDIENTE_RECONTEO') g.pendientes_reconteo++;
      if (f.diferencia === null) continue;
      g.contados++;
      if (f.diferencia === 0) g.cuadran++;
      else {
        g.con_diferencia++;
        if (f.diferencia > 0) g.sobrante_unidades += f.diferencia;
        else g.faltante_unidades += -f.diferencia;
      }
    }
  }
  const cerrar = (g) => ({
    ...g,
    sobrante_unidades: redondear(g.sobrante_unidades),
    faltante_unidades: redondear(g.faltante_unidades),
    exactitud_pct: g.contados ? Math.round((g.cuadran / g.contados) * 1000) / 10 : null
  });
  return {
    total: cerrar(total),
    por_bodega: Object.fromEntries(Object.entries(porBodega).map(([b, g]) => [b, cerrar(g)]))
  };
}

const FILTROS = {
  todos: () => true,
  diferencias: f => f.estado === 'SOBRANTE' || f.estado === 'FALTANTE',
  sobrantes: f => f.estado === 'SOBRANTE',
  faltantes: f => f.estado === 'FALTANTE',
  cuadran: f => f.estado === 'CUADRA',
  sin_contar: f => f.estado === 'SIN_CONTAR',
  reconteo: f => f.estado === 'PENDIENTE_RECONTEO'
};

export function obtenerCuadre(jornadaId, { bodega, filtro = 'todos', q = '', limite = 300, desde = 0 } = {}) {
  return conCliente(async (c) => {
    const jornada = await obtenerJornada(jornadaId, c);
    const filas = await calcularFilasCuadre(c, jornadaId);
    const resumen = resumir(filas);

    const texto = String(q || '').trim().toLowerCase();
    const bod = bodega ? textoBodega(bodega) : null;
    const filtradas = filas.filter(f =>
      (!bod || f.bodega_codigo === bod) &&
      (FILTROS[filtro] || FILTROS.todos)(f) &&
      (!texto || f.articulo_codigo.toLowerCase().includes(texto) || f.descripcion.toLowerCase().includes(texto))
    );
    // Las diferencias más grandes primero
    filtradas.sort((a, b) => Math.abs(b.diferencia ?? 0) - Math.abs(a.diferencia ?? 0));

    const inicio = Math.max(Number(desde) || 0, 0);
    const tam = Math.min(Math.max(Number(limite) || 300, 1), 1000);
    return {
      jornada,
      resumen,
      total_filas: filtradas.length,
      filas: filtradas.slice(inicio, inicio + tam)
    };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// RECONTEO: genera una planilla RECONTEO con los artículos seleccionados
// ────────────────────────────────────────────────────────────────────────────
export function crearReconteo(jornadaId, { bodega, ubicacion, items }, usuario) {
  return enTransaccion(async (c) => {
    const j = await exigirJornadaAbierta(c, jornadaId);
    const lista = (Array.isArray(items) ? items : [])
      .map(i => ({ codigo: textoCodigo(i.articulo_codigo), bodega: textoBodega(i.bodega_codigo) }))
      .filter(i => i.codigo && i.bodega);
    if (lista.length === 0) throw new CuadreError(400, 'Selecciona al menos un artículo para recontar.');
    const fuera = lista.filter(i => !j.bodegas.includes(i.bodega));
    if (fuera.length) throw new CuadreError(400, 'Hay artículos de bodegas que no pertenecen a la jornada.');

    const bodPlanilla = textoBodega(bodega) || lista[0].bodega;
    if (!j.bodegas.includes(bodPlanilla)) throw new CuadreError(400, `La bodega ${bodPlanilla} no está incluida en esta jornada.`);

    const filas = await calcularFilasCuadre(c, jornadaId);
    const porClave = new Map(filas.map(f => [`${f.articulo_codigo}|${f.bodega_codigo}`, f]));

    const { rows } = await c.query(`
      INSERT INTO cuadre_planillas (jornada_id, tipo, bodega_codigo, ubicacion, lider_email, creado_por)
      VALUES ($1, 'RECONTEO', $2, $3, $4, $4) RETURNING id
    `, [jornadaId, bodPlanilla, String(ubicacion || 'Reconteo de diferencias').trim().slice(0, 80), usuario.email]);
    const id = rows[0].id;
    await c.query('INSERT INTO cuadre_planilla_equipo (planilla_id, nombre, email, rol) VALUES ($1, $2, $3, $4)',
      [id, usuario.nombre || usuario.email, usuario.email, 'Líder']);

    const vistos = new Set();
    for (const i of lista) {
      const clave = `${i.codigo}|${i.bodega}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const f = porClave.get(clave);
      await c.query(`
        INSERT INTO cuadre_reconteo_items (planilla_id, articulo_codigo, bodega_codigo, cantidad_sistema, cantidad_conteo)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, i.codigo, i.bodega, f ? f.sistema : null, f ? f.conteo : null]);
    }
    return obtenerPlanilla(id, c);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTAR A EXCEL
// ────────────────────────────────────────────────────────────────────────────
export function exportarCuadreExcel(jornadaId) {
  return conCliente(async (c) => {
    const jornada = await obtenerJornada(jornadaId, c);
    const filas = await calcularFilasCuadre(c, jornadaId);
    const resumen = resumir(filas);
    const { rows: bodegas } = await c.query('SELECT codigo, nombre FROM cuadre_bodegas');
    const nombreBodega = Object.fromEntries(bodegas.map(b => [b.codigo, b.nombre]));

    const wb = XLSX.utils.book_new();
    const t = resumen.total;
    const hojaResumen = [
      ['Cuadre de inventario', jornada.nombre],
      ['Fecha de corte', jornada.fecha_corte],
      ['Estado', jornada.estado],
      [],
      ['Artículos en el cuadre', t.articulos],
      ['Artículos contados', t.contados],
      ['Cuadran exacto', t.cuadran],
      ['Con diferencia', t.con_diferencia],
      ['Exactitud del sistema (%)', t.exactitud_pct],
      ['Sobrante total (unidades)', t.sobrante_unidades],
      ['Faltante total (unidades)', t.faltante_unidades],
      ['Sin contar', t.sin_contar],
      ['Pendientes de reconteo', t.pendientes_reconteo],
      [],
      ['Bodega', 'Nombre', 'Contados', 'Cuadran', 'Con diferencia', 'Exactitud %', 'Sobrante', 'Faltante', 'Sin contar'],
      ...Object.entries(resumen.por_bodega).map(([b, g]) => [
        b, nombreBodega[b] || '', g.contados, g.cuadran, g.con_diferencia, g.exactitud_pct,
        g.sobrante_unidades, g.faltante_unidades, g.sin_contar
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hojaResumen), 'Resumen');

    const hojaDetalle = [
      ['Bodega', 'Código', 'Descripción', 'Unidad', 'Sistema', 'Conteo', 'Reconteo', 'Cantidad final', 'Diferencia', 'Estado'],
      ...filas.map(f => [
        f.bodega_codigo, f.articulo_codigo, f.descripcion, f.unidad, f.sistema,
        f.conteo ?? '', f.reconteo ?? '', f.final ?? '', f.diferencia ?? '', f.estado.replace('_', ' ')
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hojaDetalle), 'Detalle');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const nombre = `Cuadre_${jornada.nombre.replace(/[^\w-]+/g, '_')}.xlsx`;
    return { buffer, nombre };
  });
}
