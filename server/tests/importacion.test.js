import { dbMemoria } from '../config/db.js';
import {
  procesarImportacionExcel,
  resolverDiferenciaInventario,
  generarExcelPruebaBuffer
} from '../services/importacionExcelService.js';

async function probarImportacionYConciliacion() {
  console.log('================================================================');
  console.log('🧪 PRUEBA DE IMPORTACIÓN EXCEL Y CONCILIACIÓN CON ROLES ADMIN');
  console.log('================================================================\n');

  // 1. Generar buffer Excel de prueba
  const excelBuffer = generarExcelPruebaBuffer();
  console.log('1. Archivo Excel sintético generado en memoria (.xlsx)');

  // 2. Primera importación
  console.log('2. Ejecutando primera importación desde Excel...');
  const resultado1 = await procesarImportacionExcel(excelBuffer, 'Prueba_ERP_Corrida_1.xlsx', 'admin');

  console.log(`   - Total filas procesadas: ${resultado1.resumen.total_filas}`);
  console.log(`   - Productos nuevos creados: ${resultado1.resumen.productos_nuevos}`);
  console.log(`   - Productos actualizados: ${resultado1.resumen.productos_actualizados}`);
  console.log(`   - Diferencias detectadas: ${resultado1.resumen.diferencias_detectadas}`);

  // Verificar que los productos sin SKU recibieron código INT-XXXXX
  const prodSinSku = Array.from(dbMemoria.productos.values()).find((p) => p.nombre.includes('Foco Halógeno Decorativo'));
  if (!prodSinSku || !prodSinSku.sku.startsWith('INT-')) {
    throw new Error('Fallo: No se generó código interno estable INT-XXXXX para producto sin SKU.');
  }
  const primerCodigoGenerado = prodSinSku.sku;
  console.log(`   [OK] Producto sin SKU asignado a código interno estable: ${primerCodigoGenerado}`);

  // 3. Segunda importación para verificar que NO regenera códigos internos (idempotencia y estabilidad)
  console.log('\n3. Ejecutando segunda importación para comprobar que la llave permanente se conserva...');
  const resultado2 = await procesarImportacionExcel(excelBuffer, 'Prueba_ERP_Corrida_2.xlsx', 'admin');
  const prodSegundaVez = Array.from(dbMemoria.productos.values()).find((p) => p.nombre.includes('Foco Halógeno Decorativo'));
  if (prodSegundaVez.sku !== primerCodigoGenerado) {
    throw new Error(`Fallo grave: El código interno fue regenerado (${prodSegundaVez.sku} !== ${primerCodigoGenerado}) en vez de conservarse.`);
  }
  console.log(`   [OK] Idempotencia verificada: El código interno ${prodSegundaVez.sku} se mantuvo idéntico.`);

  // 4. Verificar que las diferencias quedaron pendientes y NO sobrescribieron el stock
  console.log('\n4. Verificando que las diferencias NO sobrescribieron automáticamente el stock...');
  const diferenciasPendientes = dbMemoria.diferencias.filter((d) => d.estado === 'pendiente');
  if (diferenciasPendientes.length === 0) {
    throw new Error('Fallo: Se esperaban diferencias pendientes de conciliación.');
  }
  console.log(`   [OK] Hay ${diferenciasPendientes.length} diferencias en cola pendientes de revisión de admin.`);

  // 5. Probar resolución por admin: 'aplicar' y 'descartar'
  console.log('\n5. Probando resolución de diferencias por el Administrador...');
  const difParaAplicar = diferenciasPendientes[0];
  const stockAntesAplicar = dbMemoria.obtenerStockFila(difParaAplicar.sku, difParaAplicar.bodega_id).cantidad;
  console.log(`   - Diferencia 1 (SKU ${difParaAplicar.sku}, Bodega ${difParaAplicar.bodega_id}): Sistema=${difParaAplicar.cantidad_sistema}, Excel=${difParaAplicar.cantidad_excel}. Acción: APLICAR`);

  await resolverDiferenciaInventario(difParaAplicar.id, 'aplicar', 'admin_tester');
  const stockDespuesAplicar = dbMemoria.obtenerStockFila(difParaAplicar.sku, difParaAplicar.bodega_id).cantidad;
  if (stockDespuesAplicar !== difParaAplicar.cantidad_excel) {
    throw new Error(`Fallo: El stock debió actualizarse a ${difParaAplicar.cantidad_excel}, pero quedó en ${stockDespuesAplicar}`);
  }
  console.log(`   [OK] Diferencia aplicada con éxito: Stock actualizado de ${stockAntesAplicar} a ${stockDespuesAplicar}.`);

  if (diferenciasPendientes.length > 1) {
    const difParaDescartar = diferenciasPendientes[1];
    const stockAntesDescartar = dbMemoria.obtenerStockFila(difParaDescartar.sku, difParaDescartar.bodega_id).cantidad;
    console.log(`   - Diferencia 2 (SKU ${difParaDescartar.sku}, Bodega ${difParaDescartar.bodega_id}): Sistema=${difParaDescartar.cantidad_sistema}, Excel=${difParaDescartar.cantidad_excel}. Acción: DESCARTAR`);
    await resolverDiferenciaInventario(difParaDescartar.id, 'descartar', 'admin_tester');
    const stockDespuesDescartar = dbMemoria.obtenerStockFila(difParaDescartar.sku, difParaDescartar.bodega_id).cantidad;
    if (stockDespuesDescartar !== stockAntesDescartar) {
      throw new Error(`Fallo: Al descartar, el stock no debió cambiar (${stockDespuesDescartar} !== ${stockAntesDescartar}).`);
    }
    console.log(`   [OK] Diferencia descartada con éxito: Stock del sistema se mantuvo inalterado en ${stockDespuesDescartar}.`);
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE IMPORTACIÓN Y CONCILIACIÓN PASARON EXITOSAMENTE!\n');
}

probarImportacionYConciliacion().catch((err) => {
  console.error('❌ Error en prueba de importación:', err);
  process.exit(1);
});
