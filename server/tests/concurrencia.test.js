import { dbMemoria } from '../config/db.js';
import { descontarInventario, StockInsuficienteError } from '../services/descuentoInventarioService.js';

async function ejecutarPruebaConcurrencia() {
  console.log('================================================================');
  console.log('🧪 PRUEBA DE CONCURRENCIA REAL: BLOQUEO PESIMISTA SELECT FOR UPDATE');
  console.log('================================================================\n');

  // 1. Preparar un ítem de prueba con stock limitado de 10 unidades
  const SKU_TEST = 'TEST-CONCURRENTE-01';
  const BODEGA_TEST = 1; // Materiales de Construcción
  const STOCK_INICIAL = 10;

  dbMemoria.productos.set(SKU_TEST, {
    sku: SKU_TEST,
    nombre: 'Cemento Especial Test Concurrencia',
    descripcion: 'Producto de prueba para verificar candados SELECT FOR UPDATE',
    categoria_slug: 'materiales_construccion',
    unidad_medida: 'BULTO',
    precio_unitario: 35000,
    peso_unitario_kg: 50
  });

  dbMemoria.actualizarStock(SKU_TEST, BODEGA_TEST, STOCK_INICIAL);

  const stockAntes = dbMemoria.obtenerStockFila(SKU_TEST, BODEGA_TEST).cantidad;
  console.log(`📌 Estado inicial:`);
  console.log(`   - Producto: ${SKU_TEST}`);
  console.log(`   - Bodega: ${BODEGA_TEST}`);
  console.log(`   - Stock inicial en base de datos: ${stockAntes} unidades\n`);

  console.log(`🎯 Escenario de estrés concurrente:`);
  console.log(`   - Transacción 1 (Facturación Mostrador): solicita 8 unidades.`);
  console.log(`   - Transacción 2 (WMS Despacho Domicilio): solicita 7 unidades simultáneamente.`);
  console.log(`   - Total demandado: 8 + 7 = 15 unidades (Supera el stock de 10).`);
  console.log(`   - Sin candado FOR UPDATE: dirty read restaría ambas y dejaría el stock en -5 (desastre).`);
  console.log(`   - Con candado FOR UPDATE: Tx 2 debe quedar bloqueada esperando a Tx 1; Tx 1 debe descontar 8 (queda 2); Tx 2 debe despertar, ver 2 < 7, fallar y hacer ROLLBACK.\n`);

  let resultadoTx1 = null;
  let errorTx1 = null;
  let tiempoInicioTx1 = 0;
  let tiempoFinTx1 = 0;

  let resultadoTx2 = null;
  let errorTx2 = null;
  let tiempoInicioTx2 = 0;
  let tiempoFinTx2 = 0;

  const RETARDO_TX1_MS = 250; // Tx 1 retiene el candado 250ms mientras procesa su transacción

  // Lanzar Transacción 1 (Facturación)
  const promesaTx1 = (async () => {
    try {
      tiempoInicioTx1 = Date.now();
      console.log(`[T = 0ms] 🟢 Tx 1 (Facturación) inicia transacción y adquiere candado FOR UPDATE sobre (${SKU_TEST}, Bodega ${BODEGA_TEST})...`);
      resultadoTx1 = await descontarInventario({
        items: [{ sku: SKU_TEST, bodegaId: BODEGA_TEST, cantidad: 8, nombre: 'Cemento Test' }],
        origen: 'venta_mostrador',
        referenciaId: 'FE-TEST-CONCURRENTE-01',
        delayArtificialMs: RETARDO_TX1_MS
      });
      tiempoFinTx1 = Date.now();
      console.log(`[T = +${tiempoFinTx1 - tiempoInicioTx1}ms] ✅ Tx 1 (Facturación) completó descuento de 8 unidades y ejecutó COMMIT.`);
    } catch (err) {
      errorTx1 = err;
      tiempoFinTx1 = Date.now();
      console.error('❌ Tx 1 falló inesperadamente:', err.message);
    }
  })();

  // Esperar 25ms para garantizar que Tx 1 ya entró y tiene el candado, luego lanzar Tx 2 (WMS)
  await new Promise((r) => setTimeout(r, 25));

  const promesaTx2 = (async () => {
    try {
      tiempoInicioTx2 = Date.now();
      console.log(`[T = +25ms] 🟡 Tx 2 (WMS Despacho) intenta entrar a (${SKU_TEST}, Bodega ${BODEGA_TEST})... DEBE QUEDAR EN ESPERA DEL CANDADO DE TX 1...`);
      resultadoTx2 = await descontarInventario({
        items: [{ sku: SKU_TEST, bodegaId: BODEGA_TEST, cantidad: 7, nombre: 'Cemento Test' }],
        origen: 'despacho_domicilio',
        referenciaId: 'ORD-TEST-CONCURRENTE-01',
        delayArtificialMs: 0
      });
      tiempoFinTx2 = Date.now();
      console.log(`[T = +${tiempoFinTx2 - tiempoInicioTx1}ms] Tx 2 completó.`);
    } catch (err) {
      errorTx2 = err;
      tiempoFinTx2 = Date.now();
      console.log(`[T = +${tiempoFinTx2 - tiempoInicioTx1}ms] 🛑 Tx 2 (WMS) despertó tras COMMIT de Tx 1, detectó stock insuficiente (disponible 2 < solicitado 7) y ejecutó ROLLBACK.`);
    }
  })();

  // Esperar a que ambas transacciones concluyan
  await Promise.all([promesaTx1, promesaTx2]);

  const tiempoEsperaTx2 = tiempoFinTx2 - tiempoInicioTx2;
  const stockFinal = dbMemoria.obtenerStockFila(SKU_TEST, BODEGA_TEST).cantidad;

  console.log('\n================================================================');
  console.log('📊 RESULTADOS Y AUDITORÍA DE CONCURRENCIA:');
  console.log('================================================================');
  console.log(`1. Tx 1 (Facturación): ${resultadoTx1?.exito ? '✅ ÉXITO (Descontó 8 un)' : '❌ FALLÓ'}`);
  console.log(`2. Tx 2 (WMS Despacho): ${errorTx2 instanceof StockInsuficienteError ? '✅ RECHAZO CORRECTO POR STOCK INSUFICIENTE (HTTP 409)' : '❌ ERROR INESPERADO'}`);
  console.log(`3. Tiempo de espera/bloqueo de Tx 2: ${tiempoEsperaTx2} ms (Demuestra que Tx 2 esperó activamente a Tx 1)`);
  console.log(`4. Stock final en base de datos: ${stockFinal} unidades (10 inicial - 8 de Tx 1 = 2)`);
  console.log(`5. Saldo negativo prevenido: ${stockFinal >= 0 ? '✅ GARANTIZADO (Stock >= 0)' : '❌ FALLA GRAVE: SALDO NEGATIVO'}\n`);

  // Verificaciones asertivas
  if (!resultadoTx1?.exito) {
    throw new Error('Fallo de aserción: Tx 1 debió ser exitosa.');
  }
  if (!errorTx2 || !(errorTx2 instanceof StockInsuficienteError)) {
    throw new Error('Fallo de aserción: Tx 2 debió ser rechazada con StockInsuficienteError.');
  }
  if (stockFinal !== 2) {
    throw new Error(`Fallo de aserción: El stock final debió ser 2, pero es ${stockFinal}.`);
  }
  if (tiempoEsperaTx2 < 200) {
    throw new Error(`Fallo de aserción: Tx 2 no esperó al candado de Tx 1 (esperó solo ${tiempoEsperaTx2}ms).`);
  }

  console.log('🎉 ¡TODAS LAS ASERCIONES DE CONCURRENCIA PASARON CON ÉXITO ABSOLUTO!\n');
}

ejecutarPruebaConcurrencia().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBA DE CONCURRENCIA:', err);
  process.exit(1);
});
