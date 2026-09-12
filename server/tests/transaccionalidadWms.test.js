import assert from 'assert';
import { dbMemoria } from '../config/db.js';
import { descontarInventario } from '../services/descuentoInventarioService.js';
import { cambiarEstadoFactura } from '../controllers/facturasController.js';

console.log('🧪 ========================================================');
console.log('🧪 INICIANDO TEST SUITE: TRANSACCIONALIDAD, IDEMPOTENCIA Y FSM');
console.log('🧪 ========================================================');

// -----------------------------------------------------------------------------
// TEST 1: IDEMPOTENCIA DEL SELLO DE FACTURA EN BACKEND
// -----------------------------------------------------------------------------
async function testIdempotenciaBackend() {
  console.log('\n▶ TEST 1: Idempotencia en confirmación de sello de factura...');

  // Resetear stock de ELE-001 a 40 en bodega 5
  dbMemoria.actualizarStock('ELE-001', 5, 40);
  const stockInicial = dbMemoria.obtenerStockFila('ELE-001', 5).cantidad;
  assert.strictEqual(stockInicial, 40, 'Stock inicial de ELE-001 debe ser 40');

  // Asegurar que la factura FAC-80993 está en lista_sello
  const fac80993 = dbMemoria.facturas.get('FAC-80993');
  fac80993.estado = 'lista_sello';
  fac80993.sellada = false;

  // Mock de Request y Response para primer sellado
  let status1 = null;
  let json1 = null;
  const res1 = {
    status: (code) => { status1 = code; return res1; },
    json: (data) => { json1 = data; return res1; }
  };

  await cambiarEstadoFactura({
    params: { id: 'FAC-80993' },
    body: { nuevoEstado: 'ENTREGADA Y SELLADA', usuario: 'Cajero 01 Test' }
  }, res1);

  const stockTrasSello1 = dbMemoria.obtenerStockFila('ELE-001', 5).cantidad;
  assert.strictEqual(stockTrasSello1, 30, 'Primer sellado debe descontar 10 unidades (40 -> 30)');
  assert.strictEqual(fac80993.sellada, true, 'Factura debe quedar sellada = true');
  console.log('  ✓ Primer sellado exitoso: stock descontado de 40 a 30.');

  // Segundo intento de sellado sobre la misma factura (Ataque de concurrencia / doble clic)
  let status2 = null;
  let json2 = null;
  const res2 = {
    status: (code) => { status2 = code; return res2; },
    json: (data) => { json2 = data; return res2; }
  };

  await cambiarEstadoFactura({
    params: { id: 'FAC-80993' },
    body: { nuevoEstado: 'ENTREGADA Y SELLADA', usuario: 'Cajero 01 Test' }
  }, res2);

  const stockTrasSello2 = dbMemoria.obtenerStockFila('ELE-001', 5).cantidad;
  assert.strictEqual(stockTrasSello2, 30, 'Segundo sellado NO debe descontar de nuevo (debe mantenerse en 30)');
  assert.strictEqual(json2.yaSellada, true, 'Debe reportar yaSellada: true de forma idempotente');
  console.log('  ✓ Segundo sellado bloqueado por idempotencia: stock se mantuvo estrictamente en 30.');
}

// -----------------------------------------------------------------------------
// TEST 2: LÓGICA DE DEDUCCIÓN ATÓMICA E IDEMPOTENCIA EN CLIENTE (SIMULADA WMS CONTEXT)
// -----------------------------------------------------------------------------
function testLogicaWmsContext() {
  console.log('\n▶ TEST 2: Lógica de Idempotencia y Trazabilidad en WmsContext...');

  let inventario = [
    { sku: 'ELE-001', nombre: 'Cable Cobre THHN #12', stockTotal: 40, stock: 40 },
    { sku: 'MAT-001', nombre: 'Cemento Gris 50kg', stockTotal: 150, stock: 150 }
  ];

  let facturas = [
    {
      id: 'FAC-80993',
      numeroFactura: 'FE-80993',
      estado: 'lista_sello',
      sellada: false,
      items: [{ sku: 'ELE-001', cantidad: 10 }]
    }
  ];

  let trazabilidadStock = [];

  // Implementación exacta de confirmarSelloFactura de WmsContext
  const confirmarSello = (facturaId, metadataOperador = 'Cajero 01') => {
    const factura = facturas.find(f => f.id === facturaId || f.numeroFactura === facturaId);
    if (!factura) return { success: false, reason: 'NOT_FOUND' };

    // Idempotencia guard
    if (factura.sellada || factura.estado === 'ENTREGADA Y SELLADA') {
      return { success: false, reason: 'ALREADY_SEALED', factura };
    }

    const timestamp = new Date().toISOString();
    const nuevosMovimientos = [];

    inventario = inventario.map(prod => {
      const itemFacturado = factura.items?.find(it => it.sku === prod.sku);
      if (itemFacturado) {
        const previo = prod.stockTotal;
        const nuevo = Math.max(0, previo - itemFacturado.cantidad);
        nuevosMovimientos.push({
          logId: `log-test-${prod.sku}`,
          tipo: 'SALIDA_VENTA_MOSTRADOR',
          facturaId: factura.numeroFactura,
          sku: prod.sku,
          cantidadDescontada: itemFacturado.cantidad,
          stockPrevio: previo,
          stockPosterior: nuevo,
          operador: metadataOperador,
          timestamp
        });
        return { ...prod, stockTotal: nuevo, stock: nuevo, ultimaActualizacionStock: timestamp };
      }
      return prod;
    });

    trazabilidadStock = [...nuevosMovimientos, ...trazabilidadStock];

    facturas = facturas.map(f =>
      f.id === facturaId ? { ...f, estado: 'ENTREGADA Y SELLADA', sellada: true, fechaSello: timestamp } : f
    );

    return { success: true, movimientos: nuevosMovimientos };
  };

  // 1. Primer intento
  const r1 = confirmarSello('FAC-80993');
  assert.strictEqual(r1.success, true, 'Primer sello debe ser exitoso');
  assert.strictEqual(inventario.find(p => p.sku === 'ELE-001').stockTotal, 30, 'Stock de ELE-001 debe ser 30');
  assert.strictEqual(trazabilidadStock.length, 1, 'Debe existir 1 movimiento en trazabilidad');
  assert.strictEqual(trazabilidadStock[0].stockPrevio, 40);
  assert.strictEqual(trazabilidadStock[0].stockPosterior, 30);
  assert.strictEqual(trazabilidadStock[0].cantidadDescontada, 10);
  console.log('  ✓ Primer intento descontó stock (40 -> 30) y generó registro de trazabilidad.');

  // 2. Segundo intento duplicado
  const r2 = confirmarSello('FAC-80993');
  assert.strictEqual(r2.success, false, 'Segundo intento debe retornar success: false');
  assert.strictEqual(r2.reason, 'ALREADY_SEALED', 'Razón debe ser ALREADY_SEALED');
  assert.strictEqual(inventario.find(p => p.sku === 'ELE-001').stockTotal, 30, 'Stock debe permanecer en 30');
  assert.strictEqual(trazabilidadStock.length, 1, 'No se deben agregar movimientos duplicados');
  console.log('  ✓ Segundo intento bloqueado: idempotencia garantizada, stock se mantuvo en 30.');
}

// -----------------------------------------------------------------------------
// TEST 3: MÁQUINA DE ESTADOS FINITOS (FSM) DE DESPACHOS
// -----------------------------------------------------------------------------
function testFsmDespachos() {
  console.log('\n▶ TEST 3: Máquina de Estados Finitos (FSM) de Despachos...');

  const NEXT_STAGE_MAP = {
    COLA: 'PICKING',
    PICKING: 'PACKING',
    PACKING: 'LISTO',
    LISTO: 'DESPACHADO'
  };

  let despacho = {
    id: 'dsp-test-01',
    codigo_orden: 'PVSW-TEST',
    estado_actual: 'COLA',
    history: []
  };

  const avanzar = (d, metadataOperador = 'Líder') => {
    const current = d.estado_actual;
    const next = NEXT_STAGE_MAP[current];
    if (!next) return { success: false, reason: 'INVALID_TRANSITION', despacho: d };

    const now = new Date().toISOString();
    const timestamps = {};
    if (next === 'PICKING') timestamps.fechaInicioEscogiendo = now;
    if (next === 'PACKING') { timestamps.fechaFinEscogiendo = now; timestamps.fechaInicioEmpaque = now; }
    if (next === 'LISTO') { timestamps.fechaFinEmpaque = now; timestamps.fechaLlegadaBodega = now; }
    if (next === 'DESPACHADO') timestamps.fechaDespacho = now;

    return {
      success: true,
      despacho: {
        ...d,
        ...timestamps,
        estado_actual: next,
        history: [...d.history, { anterior: current, nuevo: next, operador: metadataOperador, now }]
      }
    };
  };

  // 1. COLA -> PICKING
  let res = avanzar(despacho);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.despacho.estado_actual, 'PICKING');
  assert(res.despacho.fechaInicioEscogiendo, 'Debe registrar fechaInicioEscogiendo');
  despacho = res.despacho;
  console.log('  ✓ Transición COLA -> PICKING válida con fechaInicioEscogiendo.');

  // 2. PICKING -> PACKING
  res = avanzar(despacho);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.despacho.estado_actual, 'PACKING');
  assert(res.despacho.fechaFinEscogiendo && res.despacho.fechaInicioEmpaque);
  despacho = res.despacho;
  console.log('  ✓ Transición PICKING -> PACKING válida con marcas de tiempo.');

  // 3. PACKING -> LISTO
  res = avanzar(despacho);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.despacho.estado_actual, 'LISTO');
  assert(res.despacho.fechaFinEmpaque && res.despacho.fechaLlegadaBodega);
  despacho = res.despacho;
  console.log('  ✓ Transición PACKING -> LISTO válida.');

  // 4. LISTO -> DESPACHADO
  res = avanzar(despacho);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.despacho.estado_actual, 'DESPACHADO');
  assert(res.despacho.fechaDespacho);
  despacho = res.despacho;
  console.log('  ✓ Transición LISTO -> DESPACHADO válida con fechaDespacho.');

  // 5. Intento de avanzar más allá de DESPACHADO (debe ser rechazado)
  res = avanzar(despacho);
  assert.strictEqual(res.success, false, 'No se puede avanzar más allá del estado terminal DESPACHADO');
  assert.strictEqual(res.reason, 'INVALID_TRANSITION');
  console.log('  ✓ Estado terminal DESPACHADO protegido contra transiciones.');
}

// Ejecutar todos los tests
async function runAllTests() {
  try {
    await testIdempotenciaBackend();
    testLogicaWmsContext();
    testFsmDespachos();
    console.log('\n🎉 ========================================================');
    console.log('🎉 TODOS LOS TESTS DE TRANSACCIONALIDAD Y FSM PASARON (100%)');
    console.log('🎉 ========================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS UNITARIAS:', error);
    process.exit(1);
  }
}

runAllTests();
