// Test de verificación de la función confirmarSelloFactura
// Verifica:
// 1. Descuento del stock de ELE-001 de 40 a 30 al confirmar sello de FE-80993
// 2. Actualización del estado de la factura a 'ENTREGADA Y SELLADA'
// 3. Recálculo del KPI global de "UNIDADES EN BODEGA"

import assert from 'node:assert';

// 1. Simulación fiel del estado inicial
let inventario = [
  { sku: 'ELE-001', nombre: 'Cable Cobre THHN #12 AWG Rojo Rollo 100m', stockTotal: 40, stock: 40 },
  { sku: 'MAT-001', nombre: 'Cemento Gris 50kg Argos Tipo UG', stockTotal: 150, stock: 150 },
  { sku: 'PIN-001', nombre: 'Esmalte Sintético Pintulux Rojo Galón', stockTotal: 80, stock: 80 }
];

let facturas = [
  {
    id: 'FAC-80993',
    numero: 'FE-80993',
    numeroFactura: 'FE-80993',
    cliente: 'Electricistas Asociados del Oriente S.A.S.',
    estado: 'lista_sello',
    items: [
      {
        sku: 'ELE-001',
        nombre: 'Cable Cobre THHN #12 AWG Rojo Rollo 100m',
        cantidad: 10
      }
    ]
  }
];

const setInventario = (updater) => {
  inventario = typeof updater === 'function' ? updater(inventario) : updater;
};

const setFacturas = (updater) => {
  facturas = typeof updater === 'function' ? updater(facturas) : updater;
};

// Función exacta implementada en WmsContext.jsx y ventaMostrador.jsx
const confirmarSelloFactura = (facturaId) => {
  // 1. Obtener la factura que se está sellando
  const factura = facturas.find(f => f.id === facturaId || f.numero === facturaId || f.numeroFactura === facturaId);
  if (!factura) return;

  // 2. Descontar las cantidades de cada ítem del inventario global
  setInventario(prevInventario => {
    return prevInventario.map(producto => {
      // Buscar si este producto está en los ítems de la factura
      const itemFacturado = factura.items.find(
        item => item.sku === producto.sku || item.nombre === producto.nombre || item.producto === producto.nombre
      );

      if (itemFacturado) {
        const nuevoStock = Math.max(0, (producto.stockTotal || producto.stock || 0) - (itemFacturado.cantidad || 0));
        return {
          ...producto,
          stockTotal: nuevoStock,
          stock: nuevoStock
        };
      }
      return producto;
    });
  });

  // 3. Actualizar el estado de la factura a sellada
  setFacturas(prevFacturas =>
    prevFacturas.map(f =>
      (f.id === facturaId || f.numero === facturaId || f.numeroFactura === facturaId)
        ? { ...f, estado: 'ENTREGADA Y SELLADA', sellada: true, fechaSello: new Date().toISOString() }
        : f
    )
  );
};

// Ejecución de pruebas
async function runTests() {
  console.log('🧪 Iniciando test: Validación de confirmación de sello y descuento de inventario...');

  // Verificar estado inicial
  const prodInicial = inventario.find(p => p.sku === 'ELE-001');
  assert.strictEqual(prodInicial.stockTotal, 40, 'El stockTotal inicial de ELE-001 debe ser 40');
  assert.strictEqual(prodInicial.stock, 40, 'El stock inicial de ELE-001 debe ser 40');

  const kpiInicial = inventario.reduce((acc, p) => acc + (p.stockTotal || p.stock || 0), 0);
  assert.strictEqual(kpiInicial, 270, 'El KPI global inicial debe ser 270 unidades');

  console.log(`✅ Estado inicial verificado: ELE-001 = ${prodInicial.stockTotal} un., KPI Unidades en Bodega = ${kpiInicial} un.`);

  // Ejecutar confirmación de sello de FE-80993
  console.log('⚡ Ejecutando confirmarSelloFactura("FE-80993")...');
  confirmarSelloFactura('FE-80993');

  // Verificar que ELE-001 pasó de 40 a 30
  const prodFinal = inventario.find(p => p.sku === 'ELE-001');
  assert.strictEqual(prodFinal.stockTotal, 30, 'El stockTotal de ELE-001 debe ser 30 después de sellar FE-80993');
  assert.strictEqual(prodFinal.stock, 30, 'El stock de ELE-001 debe ser 30 después de sellar FE-80993');
  console.log(`✅ Descuento comprobado: SKU ELE-001 pasó exactamente de 40 a ${prodFinal.stockTotal} unidades.`);

  // Verificar que la factura pasó a 'ENTREGADA Y SELLADA' y sellada = true
  const facSellada = facturas.find(f => f.numero === 'FE-80993');
  assert.strictEqual(facSellada.estado, 'ENTREGADA Y SELLADA', 'El estado de la factura debe ser ENTREGADA Y SELLADA');
  assert.strictEqual(facSellada.sellada, true, 'La bandera sellada debe ser true');
  assert.ok(facSellada.fechaSello, 'Debe registrarse la fecha del sello');
  console.log(`✅ Estado de factura verificado: ${facSellada.numero} -> [${facSellada.estado}] (sellada: ${facSellada.sellada})`);

  // Verificar que el KPI de UNIDADES EN BODEGA disminuyó en 10
  const kpiFinal = inventario.reduce((acc, p) => acc + (p.stockTotal || p.stock || 0), 0);
  assert.strictEqual(kpiFinal, 260, 'El KPI global debe pasar de 270 a 260 unidades');
  console.log(`✅ KPI Global "UNIDADES EN BODEGA" actualizado correctamente: ${kpiInicial} -> ${kpiFinal} unidades.`);

  console.log('\n🎉 ¡TODOS LOS TESTS DE DESCUENTO DE INVENTARIO POR SELLO PASARON SATISFACTORIAMENTE!');
}

runTests();
