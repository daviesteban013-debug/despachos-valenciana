// ============================================================================
// Fechas de negocio en la zona horaria de la operación (Cúcuta, Colombia).
// El servidor puede correr en UTC (Railway/Render): nunca usar toISOString()
// para obtener "la fecha de hoy", porque después de las 7 pm en Colombia
// devuelve la fecha de mañana.
// ============================================================================

export const ZONA_HORARIA = process.env.APP_TIMEZONE || 'America/Bogota';

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Devuelve 'YYYY-MM-DD' del instante dado, visto en la zona horaria de la operación.
 */
export function fechaEnZona(instante = new Date()) {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(instante);
}

/**
 * Normaliza una fecha recibida del cliente a 'YYYY-MM-DD'.
 * - 'YYYY-MM-DD' se respeta tal cual (ya es fecha de negocio).
 * - Un timestamp (ISO u otro) se convierte a la fecha en la zona de la operación.
 * - Vacío o inválido → hoy en la zona de la operación.
 */
export function normalizarFechaEntrada(valor) {
  if (typeof valor === 'string' && FECHA_ISO.test(valor.trim())) return valor.trim();
  if (valor) {
    const d = new Date(valor);
    if (!isNaN(d.getTime())) return fechaEnZona(d);
  }
  return fechaEnZona();
}

/**
 * Convierte el valor de una columna DATE de PostgreSQL a 'YYYY-MM-DD'.
 * node-pg construye los DATE como medianoche en la hora LOCAL del servidor,
 * por eso se leen con los getters locales (no UTC ni zona de la operación).
 */
export function fechaSqlAIso(valor) {
  if (!valor) return null;
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    const y = valor.getFullYear();
    const m = String(valor.getMonth() + 1).padStart(2, '0');
    const d = String(valor.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(valor).slice(0, 10);
}

/**
 * Formato DD/MM/YYYY para los bloques de la plantilla Excel.
 */
export function formatearFechaDDMMYYYY(valor) {
  let iso = null;
  if (valor instanceof Date) {
    iso = fechaSqlAIso(valor);
  } else if (valor) {
    iso = normalizarFechaEntrada(valor);
  }
  if (!iso) iso = fechaEnZona();
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
