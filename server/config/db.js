import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

let pgPool = null;

if (!databaseUrl) {
  console.error('❌ FATAL: DATABASE_URL no definida. El sistema requiere PostgreSQL.');
  process.exit(1);
}

pgPool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

console.log('✅ Pool PostgreSQL configurado correctamente.');

export async function getDbClient() {
  if (pgPool) {
    try {
      return await pgPool.connect();
    } catch (e) {
      console.warn("Base de datos no accesible:", e.message);
      return null;
    }
  }
  return null;
}
