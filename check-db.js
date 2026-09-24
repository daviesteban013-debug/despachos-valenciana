import { getDbClient } from './server/config/db.js';
getDbClient().then(client => {
  client.query("SELECT num_factura, valor_total, codigo_producto FROM kardex_ventas WHERE num_factura LIKE '%57273%'")
    .then(res => { console.table(res.rows); client.release(); process.exit(0); });
});
