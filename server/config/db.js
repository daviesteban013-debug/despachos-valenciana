import pg from 'pg';
import dotenv from 'dotenv';
import { CATALOGO_INICIAL_350 } from '../data/catalogoInicial.js';

dotenv.config();

const { Pool } = pg;

// Variables de entorno para el túnel WireGuard/Tailscale hacia el servidor físico dedicado
const databaseUrl = process.env.DATABASE_URL;

let pgPool = null;

if (databaseUrl) {
  pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
  console.log('✅ Pool PostgreSQL configurado hacia túnel VPN/privado.');
} else {
  console.info('ℹ️ DATABASE_URL no definida: operando con motor de base de datos relacional en memoria (alta fidelidad transaccional y bloqueo FOR UPDATE).');
}

// ============================================================================
// MOTOR TRANSACCIONAL CON BLOQUEO PESIMISTA 'FOR UPDATE' Y RESTRICCIONES CHECK
// Permite evaluar concurrencia real y desarrollo local sin depender del túnel físico
// ============================================================================
class MotorRelacionalEnMemoria {
  constructor() {
    this.bodegas = [
      { id: 1, codigo: 'BOD-MAT', nombre: 'Materiales de Construcción', seccion_slug: 'materiales_construccion' },
      { id: 2, codigo: 'BOD-PIN', nombre: 'Pinturas', seccion_slug: 'pinturas' },
      { id: 3, codigo: 'BOD-HER', nombre: 'Herramienta Eléctrica', seccion_slug: 'herramienta_electrica' },
      { id: 4, codigo: 'BOD-PLO', nombre: 'Plomería', seccion_slug: 'plomeria' },
      { id: 5, codigo: 'BOD-ELE', nombre: 'Eléctrico', seccion_slug: 'electrico' },
      { id: 6, codigo: 'BOD-JAR', nombre: 'Jardín y Exteriores', seccion_slug: 'jardin_exteriores' },
      { id: 7, codigo: 'BOD-FER', nombre: 'Ferretería General', seccion_slug: 'ferreteria_general' }
    ];

    this.productos = new Map();
    this.inventario = new Map(); // Llave: `${sku}__${bodega_id}` -> { id, sku, bodega_id, cantidad, actualizado_en }
    this.importaciones = [];
    this.diferencias = [];
    this.movimientos = [];
    this.facturas = new Map();
    this.despachos = new Map();

    // Candados de fila para simular con rigor 'SELECT ... FOR UPDATE' en concurrencia
    this.candadosFila = new Map(); // Llave: `${sku}__${bodega_id}` -> Promise / Queue
    this.secuenciaInventario = 1;
    this.secuenciaImportacion = 1;
    this.secuenciaDiferencia = 1;
    this.secuenciaCodigoInterno = 1;

    this.inicializarDatos();
  }

  inicializarDatos() {
    // Cargar los 350 productos
    CATALOGO_INICIAL_350.productos.forEach((p) => {
      this.productos.set(p.sku, { ...p, created_at: new Date(), updated_at: new Date() });
    });

    // Cargar stock por bodega
    CATALOGO_INICIAL_350.stockPorBodega.forEach((s) => {
      const key = `${s.sku}__${s.bodega_id}`;
      this.inventario.set(key, {
        id: this.secuenciaInventario++,
        sku: s.sku,
        bodega_id: Number(s.bodega_id),
        cantidad: Number(s.cantidad),
        actualizado_en: new Date()
      });
    });

    console.log(`📦 Motor cargado con ${this.productos.size} productos y ${this.inventario.size} registros de stock por bodega.`);
  }

  // Adquisición de bloqueo pesimista FOR UPDATE a nivel de fila
  async bloquearFila(sku, bodega_id, delayMs = 0) {
    const key = `${sku}__${bodega_id}`;
    while (this.candadosFila.has(key)) {
      await this.candadosFila.get(key);
    }

    let resolverBloqueo;
    const promesaBloqueo = new Promise((resolve) => {
      resolverBloqueo = resolve;
    });

    this.candadosFila.set(key, promesaBloqueo);

    // Opcional: retardo artificial para demostrar el bloqueo en tests concurrentes
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    return () => {
      this.candadosFila.delete(key);
      resolverBloqueo();
    };
  }

  // Obtener fila de inventario
  obtenerStockFila(sku, bodega_id) {
    const key = `${sku}__${bodega_id}`;
    return this.inventario.get(key) || null;
  }

  // Actualizar stock con CHECK (cantidad >= 0)
  actualizarStock(sku, bodega_id, nuevaCantidad) {
    if (nuevaCantidad < 0) {
      throw new Error(`VIOLACIÓN DE RESTRICCIÓN CHECK (cantidad >= 0) en (${sku}, bodega ${bodega_id}): no se permite saldo negativo (${nuevaCantidad})`);
    }
    const key = `${sku}__${bodega_id}`;
    const existente = this.inventario.get(key);
    if (existente) {
      existente.cantidad = nuevaCantidad;
      existente.actualizado_en = new Date();
      return existente;
    } else {
      const nuevo = {
        id: this.secuenciaInventario++,
        sku,
        bodega_id: Number(bodega_id),
        cantidad: nuevaCantidad,
        actualizado_en: new Date()
      };
      this.inventario.set(key, nuevo);
      return nuevo;
    }
  }
}

export const dbMemoria = new MotorRelacionalEnMemoria();

export async function getDbClient() {
  if (pgPool) {
    return await pgPool.connect();
  }
  return null;
}
