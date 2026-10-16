// ============================================================================
// Máscara de facturas de la empresa: PREFIJO + guion + 5 dígitos.
// Ejemplos válidos: 1M-43567, RM-00064, JC-34567, A-12345, C-00010
// ============================================================================

export const PREFIJOS_FACTURA = ['1M', 'FE', 'JC', 'JM', 'RM', 'A', 'C'];

export const FACTURA_REGEX = /^(1M|FE|JC|JM|RM|A|C)-\d{5}$/;

export const MENSAJE_FORMATO_FACTURA =
  'Formato: prefijo (1M, FE, JC, JM, RM, A, C), guion y 5 dígitos. Ej: 1M-43567';

const PREFIJOS_DOS_LETRAS = PREFIJOS_FACTURA.filter(p => p.length === 2);
// Primeros caracteres de un prefijo de dos letras todavía incompleto
const INICIOS_PREFIJO = [...new Set(PREFIJOS_DOS_LETRAS.map(p => p[0]))];

function detectarPrefijo(limpio) {
  const dos = PREFIJOS_DOS_LETRAS.find(p => limpio.startsWith(p));
  if (dos) return dos;
  if (limpio[0] === 'A' || limpio[0] === 'C') return limpio[0];
  return null;
}

/**
 * Aplica la máscara mientras el operador escribe.
 * - Fuerza mayúsculas y descarta caracteres que no encajan en el formato.
 * - El guion se agrega solo al escribir el primer dígito, para que borrar
 *   con retroceso no quede atascado en "JC-".
 */
export function formatearFactura(valor) {
  const limpio = String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!limpio) return '';

  const prefijo = detectarPrefijo(limpio);
  if (!prefijo) {
    // Prefijo a medio escribir (ej. "J" antes de "JC")
    return INICIOS_PREFIJO.includes(limpio[0]) ? limpio[0] : '';
  }

  const digitos = limpio.slice(prefijo.length).replace(/\D/g, '').slice(0, 5);
  return digitos ? `${prefijo}-${digitos}` : prefijo;
}

/**
 * Convierte el número que devuelve el kardex al formato de la empresa.
 * Si el kardex trae solo dígitos (sin prefijo), se usa el prefijo que el
 * operador ya escribió.
 */
export function facturaDesdeKardex(numKardex, facturaEscrita = '') {
  const formateada = formatearFactura(numKardex);
  if (FACTURA_REGEX.test(formateada)) return formateada;

  const digitos = String(numKardex || '').replace(/\D/g, '');
  const prefijo = detectarPrefijo(String(facturaEscrita || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
  if (prefijo && digitos && digitos.length <= 5) {
    return `${prefijo}-${digitos.padStart(5, '0')}`;
  }
  return facturaEscrita;
}
