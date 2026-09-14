import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { dbMemoria } from '../config/db.js';
import { 
  PLACAS_FLOTA, 
  crearPlantillaBase, 
  registrarDespachoEnPlantilla,
  exportarPlantillaBuffer,
  asegurarPlantillaLocal 
} from '../services/onedriveExcelService.js';
import { cambiarEstadoDespacho } from '../controllers/wmsController.js';

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

  for (const placa of PLACAS_FLOTA) {
    assert(sheetNames.includes(placa), `La plantilla debe contener la hoja "${placa}"`);
  }
  assert.strictEqual(sheetNames.length, 4, 'La plantilla debe contener exactamente 4 hojas');
  console.log(`  ✓ 4 hojas generadas exitosamente: ${sheetNames.join(', ')}`);

  // ---------------------------------------------------------------------------
  // TEST 2: ANEXAR FILA POR VEHÍCULO SIN SOBREESCRIBIR
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 2: Registrar despachos en hojas individuales por vehículo...');
  
  // Registro en WRO-482
  const r1 = await registrarDespachoEnPlantilla({
    placa: 'WRO-482',
    numeroFactura: 'FE-90001',
    valorFactura: 4500000
  });
  assert.strictEqual(r1.success, true);
  assert.strictEqual(r1.placa, 'WRO-482');

  // Registro en STZ-910
  const r2 = await registrarDespachoEnPlantilla({
    placa: 'STZ-910',
    numeroFactura: 'FE-90002',
    valorFactura: 1800000
  });
  assert.strictEqual(r2.success, true);
  assert.strictEqual(r2.placa, 'STZ-910');

  // Segundo registro en WRO-482 (debe quedar en la fila siguiente sin borrar la anterior)
  const r3 = await registrarDespachoEnPlantilla({
    placa: 'WRO-482',
    numeroFactura: 'FE-90003',
    valorFactura: 7200000
  });
  assert.strictEqual(r3.success, true);

  // Leer el archivo resultante y validar contenido
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(LOCAL_TEMPLATE_PATH);

  const sheetWRO = wb.getWorksheet('WRO-482');
  assert.strictEqual(sheetWRO.rowCount, 3, 'WRO-482 debe tener encabezado + 2 filas de datos');
  assert.strictEqual(sheetWRO.getRow(2).getCell(1).value, 'FE-90001');
  assert.strictEqual(sheetWRO.getRow(3).getCell(1).value, 'FE-90003');

  const sheetSTZ = wb.getWorksheet('STZ-910');
  assert.strictEqual(sheetSTZ.rowCount, 2, 'STZ-910 debe tener encabezado + 1 fila de datos');
  assert.strictEqual(sheetSTZ.getRow(2).getCell(1).value, 'FE-90002');

  const sheetENV = wb.getWorksheet('ENV-301');
  assert.strictEqual(sheetENV.rowCount, 1, 'ENV-301 debe tener solo el encabezado');

  console.log('  ✓ Despachos registrados en sus hojas correspondientes sin sobreescrituras.');

  // ---------------------------------------------------------------------------
  // TEST 3: CONCURRENCIA - COLA SECUENCIAL ASÍNCRONA (SIN CONDICIONES DE CARRERA)
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 3: Estrés de concurrencia (8 escrituras simultáneas con Promise.all)...');
  
  const dispatches = [
    { placa: 'ENV-301', numeroFactura: 'FE-CONC-1', valorFactura: 100000 },
    { placa: 'ENV-301', numeroFactura: 'FE-CONC-2', valorFactura: 200000 },
    { placa: 'MC-441',  numeroFactura: 'FE-CONC-3', valorFactura: 300000 },
    { placa: 'WRO-482', numeroFactura: 'FE-CONC-4', valorFactura: 400000 },
    { placa: 'MC-441',  numeroFactura: 'FE-CONC-5', valorFactura: 500000 },
    { placa: 'STZ-910', numeroFactura: 'FE-CONC-6', valorFactura: 600000 },
    { placa: 'ENV-301', numeroFactura: 'FE-CONC-7', valorFactura: 700000 },
    { placa: 'MC-441',  numeroFactura: 'FE-CONC-8', valorFactura: 800000 }
  ];

  // Ejecutar todos simultáneamente
  const results = await Promise.all(dispatches.map(d => registrarDespachoEnPlantilla(d)));
  assert.strictEqual(results.length, 8);
  results.forEach(r => assert.strictEqual(r.success, true));

  // Verificar que en ENV-301 se registraron exactamente 3 filas
  const wbConc = new ExcelJS.Workbook();
  await wbConc.xlsx.readFile(LOCAL_TEMPLATE_PATH);
  const sheetENVConc = wbConc.getWorksheet('ENV-301');
  // Encabezado (1) + 3 filas concurrentes = 4 filas
  assert.strictEqual(sheetENVConc.rowCount, 4, 'ENV-301 debe tener exactamente 4 filas (encabezado + 3 datos)');

  // En MC-441 debe haber encabezado (1) + 3 filas = 4 filas
  const sheetMCConc = wbConc.getWorksheet('MC-441');
  assert.strictEqual(sheetMCConc.rowCount, 4, 'MC-441 debe tener exactamente 4 filas');

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
      vehiculoPlaca: 'WRO-482',
      usuario: 'Operador Test'
    }
  }, mockRes);

  assert.strictEqual(resJson.despacho.estado_actual, 'DESPACHADO');
  assert.strictEqual(resJson.despacho.vehiculo_placa, 'WRO-482');
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
  assert(errJson.error.includes('inválida'));
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
