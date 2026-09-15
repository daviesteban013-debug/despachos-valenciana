import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { dbMemoria } from '../config/db.js';
import { 
  crearPlantillaBase, 
  registrarDespachoEnPlantilla,
  exportarPlantillaBuffer,
  asegurarPlantillaLocal 
} from '../services/onedriveExcelService.js';
import { cambiarEstadoDespacho } from '../controllers/wmsController.js';
import { FLOTA_VEHICULOS } from '../config/flota.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const LOCAL_TEMPLATE_PATH = path.join(DATA_DIR, 'plantilla_despachos_vehiculos.xlsx');

console.log('🧪 ========================================================');
console.log('🧪 INICIANDO TEST SUITE: ONEDRIVE EXCEL AUTOMATION & WMS 2 ESTADOS');
console.log('🧪 ========================================================');

async function runTests() {
  // Limpiar archivo local de pruebas previo si existe
  if (fs.existsSync(LOCAL_TEMPLATE_PATH)) {
    fs.unlinkSync(LOCAL_TEMPLATE_PATH);
  }

  // ---------------------------------------------------------------------------
  // TEST 1: INICIALIZACIÓN DE LA PLANTILLA CON 4 HOJAS FIJAS
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 1: Verificar estructura de 4 hojas de vehículos...');
  const baseWorkbook = await crearPlantillaBase();
  const sheetNames = baseWorkbook.worksheets.map(ws => ws.name);

  for (const placa of FLOTA_VEHICULOS) {
    assert(sheetNames.includes(placa), `La plantilla debe contener la hoja "${placa}"`);
  }
  assert.strictEqual(sheetNames.length, 4, 'La plantilla debe contener exactamente 4 hojas');
  console.log(`  ✓ 4 hojas generadas exitosamente: ${sheetNames.join(', ')}`);

  // ---------------------------------------------------------------------------
  // TEST 2: ANEXAR FILA POR VEHÍCULO SIN SOBREESCRIBIR
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 2: Registrar despachos en hojas individuales por vehículo...');
  
  // Registro en Vehiculo 0
  const r1 = await registrarDespachoEnPlantilla({
    vehiculo: FLOTA_VEHICULOS[0],
    numeroFactura: 'FE-90001',
    valorFactura: 4500000
  });
  assert.strictEqual(r1.success, true);
  assert.strictEqual(r1.placa, FLOTA_VEHICULOS[0]);

  // Registro en Vehiculo 1
  const r2 = await registrarDespachoEnPlantilla({
    vehiculo: FLOTA_VEHICULOS[1],
    numeroFactura: 'FE-90002',
    valorFactura: 1800000
  });
  assert.strictEqual(r2.success, true);
  assert.strictEqual(r2.placa, FLOTA_VEHICULOS[1]);

  // Segundo registro en Vehiculo 0 (debe quedar en el bloque)
  const r3 = await registrarDespachoEnPlantilla({
    vehiculo: FLOTA_VEHICULOS[0],
    numeroFactura: 'FE-90003',
    valorFactura: 7200000
  });
  assert.strictEqual(r3.success, true);

  // Leer el archivo resultante y validar contenido
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(LOCAL_TEMPLATE_PATH);

  // Cada hoja inicia con 4 filas de membrete corporativo
  // Un bloque nuevo agrega 4 filas (Fecha, Header, Data, Subtotal)
  // Al insertar un dato extra en el bloque, se suma 1 fila
  const sheet0 = wb.getWorksheet(FLOTA_VEHICULOS[0]);
  assert.strictEqual(sheet0.rowCount, 4 + 4 + 1, 'Vehiculo 0 debe tener membrete + bloque inicial + 1 extra (9)');
  assert.strictEqual(sheet0.getRow(7).getCell(5).value, 'FE-90001'); // Columna E (5) = Numero Factura
  assert.strictEqual(sheet0.getRow(8).getCell(5).value, 'FE-90003');

  const sheet1 = wb.getWorksheet(FLOTA_VEHICULOS[1]);
  assert.strictEqual(sheet1.rowCount, 4 + 4, 'Vehiculo 1 debe tener membrete + bloque inicial (8)');
  assert.strictEqual(sheet1.getRow(7).getCell(5).value, 'FE-90002');

  const sheet2 = wb.getWorksheet(FLOTA_VEHICULOS[2]);
  assert.strictEqual(sheet2.rowCount, 4, 'Vehiculo 2 debe tener solo el membrete');

  console.log('  ✓ Despachos registrados en sus hojas correspondientes agrupados por bloques.');

  // ---------------------------------------------------------------------------
  // TEST 3: CONCURRENCIA - COLA SECUENCIAL ASÍNCRONA (SIN CONDICIONES DE CARRERA)
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 3: Estrés de concurrencia (8 escrituras simultáneas con Promise.all)...');
  
  const dispatches = [
    { vehiculo: FLOTA_VEHICULOS[2], numeroFactura: 'FE-CONC-1', valorFactura: 100000 },
    { vehiculo: FLOTA_VEHICULOS[2], numeroFactura: 'FE-CONC-2', valorFactura: 200000 },
    { vehiculo: FLOTA_VEHICULOS[3], numeroFactura: 'FE-CONC-3', valorFactura: 300000 },
    { vehiculo: FLOTA_VEHICULOS[0], numeroFactura: 'FE-CONC-4', valorFactura: 400000 },
    { vehiculo: FLOTA_VEHICULOS[3], numeroFactura: 'FE-CONC-5', valorFactura: 500000 },
    { vehiculo: FLOTA_VEHICULOS[1], numeroFactura: 'FE-CONC-6', valorFactura: 600000 },
    { vehiculo: FLOTA_VEHICULOS[2], numeroFactura: 'FE-CONC-7', valorFactura: 700000 },
    { vehiculo: FLOTA_VEHICULOS[3], numeroFactura: 'FE-CONC-8', valorFactura: 800000 }
  ];

  // Ejecutar todos simultáneamente
  const results = await Promise.all(dispatches.map(d => registrarDespachoEnPlantilla(d)));
  assert.strictEqual(results.length, 8);
  results.forEach(r => assert.strictEqual(r.success, true));

  // Verificar que en Vehiculo 2 se registraron exactamente 3 filas
  const wbConc = new ExcelJS.Workbook();
  await wbConc.xlsx.readFile(LOCAL_TEMPLATE_PATH);
  const sheetENVConc = wbConc.getWorksheet(FLOTA_VEHICULOS[2]);
  // Membrete (4) + Bloque (4) + 2 extra = 10
  assert.strictEqual(sheetENVConc.rowCount, 10, 'Vehiculo 2 debe tener exactamente 10 filas (membrete + bloque 3 datos)');

  // En Vehiculo 3 debe haber membrete (4) + bloque (4) + 2 extra = 10
  const sheetMCConc = wbConc.getWorksheet(FLOTA_VEHICULOS[3]);
  assert.strictEqual(sheetMCConc.rowCount, 10, 'Vehiculo 3 debe tener exactamente 10 filas');

  console.log('  ✓ Cola secuencial procesó 8 despachos simultáneos sin perder ninguna fila.');

  // ---------------------------------------------------------------------------
  // TEST 4: DESACOPLAMIENTO TOTAL DE INVENTARIO EN ENDPOINT WMS
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 4: Desacoplamiento de inventario en PATCH /api/despachos/:id/estado...');

  // Verificar stock de MAT-001 antes del despacho
  const stockInicialMat = dbMemoria.obtenerStockFila('MAT-001', 1)?.cantidad || 50;

  // Despachar orden demo dsp-101
  let resStatus = null;
  let resJson = null;
  const mockRes = {
    status: (code) => { resStatus = code; return mockRes; },
    json: (data) => { resJson = data; return mockRes; }
  };

  await cambiarEstadoDespacho({
    params: { id: 'dsp-101' },
    body: {
      nuevoEstado: 'DESPACHADO',
      vehiculoPlaca: FLOTA_VEHICULOS[0],
      usuario: 'Operador Test'
    }
  }, mockRes);

  assert.strictEqual(resJson.despacho.estado_actual, 'DESPACHADO');
  assert.strictEqual(resJson.despacho.vehiculo_placa, FLOTA_VEHICULOS[0]);
  assert(resJson.syncExcel, 'Debe incluir estado de sincronización Excel');

  // Comprobar que el stock físico de MAT-001 NO cambió
  const stockFinalMat = dbMemoria.obtenerStockFila('MAT-001', 1)?.cantidad || 50;
  assert.strictEqual(
    stockFinalMat, 
    stockInicialMat, 
    'EL STOCK FÍSICO NO DEBE SER TOCADO POR EL DESPACHO WMS'
  );
  console.log(`  ✓ Stock de MAT-001 intacto en ${stockFinalMat} unidades (desacoplamiento total garantizado).`);

  // ---------------------------------------------------------------------------
  // TEST 5: VALIDACIÓN DE PLACA ESTRICTA (RECHAZO DE PLACAS NO PERMITIDAS)
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 5: Validación de placa estricta en despacho...');

  let errStatus = null;
  let errJson = null;
  const mockErrRes = {
    status: (code) => { errStatus = code; return mockErrRes; },
    json: (data) => { errJson = data; return mockErrRes; }
  };

  await cambiarEstadoDespacho({
    params: { id: 'dsp-102' },
    body: {
      nuevoEstado: 'DESPACHADO',
      vehiculoPlaca: 'ABC-999', // Placa inválida ajena a la flota
      usuario: 'Operador Test'
    }
  }, mockErrRes);

  assert.strictEqual(errStatus, 400);
  assert(errJson.error.includes('inválido'));
  console.log('  ✓ Placa "ABC-999" rechazada correctamente con código 400.');

  // ---------------------------------------------------------------------------
  // TEST 6: EXPORTACIÓN DE COPIA EXCEL
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 6: Exportación de copia completa de la plantilla...');
  const exportBuffer = await exportarPlantillaBuffer();
  assert(exportBuffer && exportBuffer.length > 0, 'El buffer exportado no puede estar vacío');
  
  const wbExp = new ExcelJS.Workbook();
  await wbExp.xlsx.load(exportBuffer);
  assert.strictEqual(wbExp.worksheets.length, 4, 'La copia exportada debe incluir las 4 hojas');
  console.log(`  ✓ Copia exportada válida con tamaño ${exportBuffer.length} bytes y 4 hojas.`);

  console.log('\n🎉 ========================================================');
  console.log('🎉 TODOS LOS TESTS DE ONEDRIVE EXCEL Y WMS PASARON EXITOSAMENTE');
  console.log('🎉 ========================================================');
}

runTests().catch(err => {
  console.error('❌ Error ejecutando test suite:', err);
  process.exit(1);
});
