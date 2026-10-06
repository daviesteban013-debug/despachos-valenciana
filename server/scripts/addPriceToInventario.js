import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbClient } from '../config/db.js';
import { CATALOGO_INICIAL_350 } from '../data/catalogoInicial.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🔄 Iniciando actualización de inventario.json con precios...');

  const rootDir = path.resolve(__dirname, '../../');
  const publicJsonPath = path.join(rootDir, 'public', 'inventario.json');
  const srcJsonPath = path.join(rootDir, 'src', 'data', 'inventario.json');

  if (!fs.existsSync(publicJsonPath)) {
    console.error('❌ No se encontró public/inventario.json');
    process.exit(1);
  }

  // 1. Obtener precios conocidos de Kardex
  const kardexMap = new Map();
  try {
    const client = await getDbClient();
    const { rows } = await client.query(`
      SELECT DISTINCT codigo_producto, precio_venta, precio_unitario 
      FROM kardex_ventas 
      WHERE precio_venta > 0 OR precio_unitario > 0
    `);
    rows.forEach(r => {
      const p = Number(r.precio_venta || r.precio_unitario || 0);
      if (p > 0) kardexMap.set(r.codigo_producto.trim(), p);
    });
    client.release();
    console.log(`📊 Precios cargados desde Kardex: ${kardexMap.size}`);
  } catch (err) {
    console.warn('⚠️ No se pudo consultar la DB para kardex_ventas, continuando sin DB:', err.message);
  }

  // 2. Obtener precios conocidos de Catálogo Inicial 350
  const catMap = new Map();
  if (CATALOGO_INICIAL_350?.productos) {
    CATALOGO_INICIAL_350.productos.forEach(p => {
      const precio = Number(p.precio_unitario || 0);
      if (precio > 0) catMap.set(p.sku.trim(), precio);
    });
  }
  console.log(`📊 Precios cargados desde CatalogoInicial: ${catMap.size}`);

  // 3. Leer inventario.json
  const rawData = fs.readFileSync(publicJsonPath, 'utf8');
  const items = JSON.parse(rawData);
  console.log(`📦 Total artículos a procesar: ${items.length}`);

  let conPrecioKardex = 0;
  let conPrecioCat = 0;
  let conPrecioCero = 0;

  const itemsActualizados = items.map(item => {
    const cod = (item.codigo || '').toString().trim();
    let precio = 0;

    if (kardexMap.has(cod)) {
      precio = kardexMap.get(cod);
      conPrecioKardex++;
    } else if (catMap.has(cod)) {
      precio = catMap.get(cod);
      conPrecioCat++;
    } else {
      conPrecioCero++;
    }

    return {
      codigo: item.codigo,
      descripcion: item.descripcion,
      und_base: item.und_base,
      und_alt: item.und_alt,
      factor: item.factor,
      precio: precio,
      fecha_ultima: item.fecha_ultima
    };
  });

  console.log(`✅ Con precio de Kardex: ${conPrecioKardex}`);
  console.log(`✅ Con precio de Catálogo: ${conPrecioCat}`);
  console.log(`ℹ️ Con precio 0 (pendientes de asignar): ${conPrecioCero}`);

  // 4. Guardar en public/inventario.json y src/data/inventario.json
  const formattedJson = JSON.stringify(itemsActualizados, null, 2);

  fs.writeFileSync(publicJsonPath, formattedJson, 'utf8');
  console.log(`💾 Guardado en: ${publicJsonPath}`);

  if (fs.existsSync(path.dirname(srcJsonPath))) {
    fs.writeFileSync(srcJsonPath, formattedJson, 'utf8');
    console.log(`💾 Guardado en: ${srcJsonPath}`);
  }

  console.log('🎉 Actualización finalizada exitosamente.');
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error ejecutando script:', e);
  process.exit(1);
});
