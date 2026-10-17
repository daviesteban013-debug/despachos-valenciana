// ============================================================================
// Catálogo de artículos del ERP para el WMS de despachos.
//
// Fuente: public/inventario.json (código, descripción, unidad menor/mayor y
// factor). Es independiente del módulo de inventario: el WMS no lee stock ni
// datos de la pantalla /inventario. Para actualizar los artículos se reemplaza
// el archivo y se vuelve a desplegar.
// ============================================================================

const RUTA_CATALOGO = '/inventario.json';

let catalogoEnCache = null;
let cargaEnCurso = null;

/**
 * Devuelve la lista de artículos (cargada una sola vez y compartida por toda la app).
 * @returns {Promise<Array<{ codigo, descripcion, und_base, und_alt, factor, fecha_ultima }>>}
 */
export function obtenerCatalogoArticulos() {
  if (catalogoEnCache) return Promise.resolve(catalogoEnCache);
  if (!cargaEnCurso) {
    cargaEnCurso = fetch(RUTA_CATALOGO)
      .then(r => {
        if (!r.ok) throw new Error(`No se pudo cargar el catálogo (${r.status})`);
        return r.json();
      })
      .then(data => {
        // Descartar la fila de encabezados que trae el export del ERP
        catalogoEnCache = (Array.isArray(data) ? data : []).filter(
          a => a && a.codigo && a.codigo !== 'codigo' && a.codigo !== '...'
        );
        return catalogoEnCache;
      })
      .catch(err => {
        cargaEnCurso = null; // permitir reintentar
        throw err;
      });
  }
  return cargaEnCurso;
}

/** Catálogo ya cargado (o null si aún no se ha cargado). */
export function catalogoArticulosEnCache() {
  return catalogoEnCache;
}
