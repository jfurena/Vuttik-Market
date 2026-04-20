import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../vuttik.db');

const db = new sqlite3.Database(dbPath);

// Promisify database methods
const run = promisify(db.run.bind(db));
const all = promisify(db.all.bind(db));
const get = promisify(db.get.bind(db));

export async function initDB() {
  console.log('Initializing SQL database at:', dbPath);

  // Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT,
      photo_url TEXT,
      role TEXT DEFAULT 'user',
      plan_id TEXT DEFAULT 'free',
      is_banned BOOLEAN DEFAULT 0,
      created_at TEXT,
      password_hash TEXT,
      oauth_provider TEXT,
      oauth_id TEXT
    )
  `);

  // Add columns to existing DB if they don't exist
  try { await run("ALTER TABLE users ADD COLUMN password_hash TEXT"); } catch (e) {}
  try { await run("ALTER TABLE users ADD COLUMN oauth_provider TEXT"); } catch (e) {}
  try { await run("ALTER TABLE users ADD COLUMN oauth_id TEXT"); } catch (e) {}

  // Categories Table
  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      allowed_types TEXT, -- JSON array
      fields TEXT, -- JSON array
      system_fields TEXT -- JSON object
    )
  `);

  // Transaction Types Table
  await run(`
    CREATE TABLE IF NOT EXISTS transaction_types (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL
    )
  `);

  // Products Table
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price REAL,
      currency TEXT DEFAULT 'DOP',
      category_id TEXT,
      type_id TEXT,
      author_id TEXT,
      author_name TEXT,
      location TEXT,
      phone TEXT,
      lat REAL,
      lng REAL,
      barcode TEXT,
      is_on_sale BOOLEAN DEFAULT 0,
      sale_price REAL,
      images TEXT, -- JSON array
      custom_fields TEXT, -- JSON object
      created_at TEXT,
      FOREIGN KEY(category_id) REFERENCES categories(id),
      FOREIGN KEY(author_id) REFERENCES users(uid)
    )
  `);

  // Social Posts Table
  await run(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      author_name TEXT,
      author_avatar TEXT,
      content TEXT NOT NULL,
      image_url TEXT,
      location TEXT,
      is_verified BOOLEAN DEFAULT 0,
      created_at TEXT,
      FOREIGN KEY(author_id) REFERENCES users(uid)
    )
  `);

  // Post Likes Table (Relation)
  await run(`
    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT,
      user_id TEXT,
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES users(uid),
      UNIQUE(post_id, user_id)
    )
  `);

  // Metrics Table
  await run(`
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT,
      target_id TEXT,
      target_type TEXT,
      metadata TEXT, -- JSON object
      timestamp TEXT
    )
  `);

  // Daily Aggregated Stats (For performance)
  await run(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT PRIMARY KEY,
      views INTEGER DEFAULT 0,
      searches INTEGER DEFAULT 0,
      contacts INTEGER DEFAULT 0,
      total_p2p_volume REAL DEFAULT 0
    )
  `);

  // Indices for analytics performance
  await run('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)');
  await run('CREATE INDEX IF NOT EXISTS idx_metrics_action ON metrics(action)');
  await run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at)');

  console.log('Database schema created successfully.');
  
  // Seed initial categories if empty
  try {
    const result: any = await get('SELECT COUNT(*) as count FROM categories');
    const categoryCount = result?.count ?? 0;
    console.log('Current category count:', categoryCount);
    
    if (categoryCount === 0) {
      console.log('Seeding initial categories...');
      const initialCategories = [
        { 
          id: 'COMIDA', 
          name: 'Comida', 
          order: 1, 
          types: ['sell', 'buy'], 
          fields: [], 
          sys: { 
            title: { label: 'Nombre del producto', required: true }, 
            price: { label: 'Precio', required: true }, 
            location: { label: 'Ubicación', required: true }, 
            description: { label: 'Descripción', required: false }, 
            barcode: { label: 'Código de barras', required: false, active: true } 
          } 
        },
        { 
          id: 'TERRENOS', 
          name: 'Terrenos', 
          order: 2, 
          types: ['sell', 'buy'], 
          fields: [
            { id: 'size', name: 'Tamaño (m²)', type: 'number', required: true }
          ], 
          sys: { 
            title: { label: 'Título del terreno', required: true }, 
            price: { label: 'Precio', required: true }, 
            location: { label: 'Ubicación', required: true }, 
            description: { label: 'Descripción', required: true } 
          } 
        },
        { 
          id: 'DIVISAS', 
          name: 'Divisas', 
          order: 3, 
          types: ['sell', 'buy'], 
          fields: [], 
          sys: { 
            title: { label: 'Moneda / Activo', required: true }, 
            price: { label: 'Tasa/Precio', required: true }, 
            location: { label: 'Punto de intercambio', required: true }, 
            description: { label: 'Detalles finales', required: false } 
          } 
        },
        { 
          id: 'VEHICULOS', 
          name: 'Vehículos', 
          order: 4, 
          types: ['sell', 'buy'], 
          fields: [
            { id: 'brand', name: 'Marca', type: 'text', required: true },
            { id: 'model', name: 'Modelo', type: 'text', required: true },
            { id: 'year', name: 'Año', type: 'number', required: true },
            { id: 'km', name: 'Kilometraje', type: 'number', required: false }
          ], 
          sys: { 
            title: { label: 'Título del anuncio', required: true }, 
            price: { label: 'Precio', required: true }, 
            location: { label: 'Ubicación', required: true }, 
            description: { label: 'Descripción del vehículo', required: true } 
          } 
        },
        { 
          id: 'ELECTRONICA', 
          name: 'Electrónica', 
          order: 5, 
          types: ['sell', 'buy'], 
          fields: [], 
          sys: { 
            title: { label: 'Producto', required: true }, 
            price: { label: 'Precio', required: true }, 
            location: { label: 'Ubicación', required: true }, 
            description: { label: 'Estado y detalles', required: true } 
          } 
        },
        { 
          id: 'HOGAR', 
          name: 'Hogar', 
          order: 6, 
          types: ['sell', 'buy'], 
          fields: [], 
          sys: { 
            title: { label: 'Título', required: true }, 
            price: { label: 'Precio', required: true }, 
            location: { label: 'Ubicación', required: true }, 
            description: { label: 'Descripción', required: true } 
          } 
        },
        { 
          id: 'EMPLEO', 
          name: 'Empleo', 
          order: 7, 
          types: ['sell', 'buy'], 
          fields: [], 
          sys: { 
            title: { label: 'Puesto / Vacante', required: true }, 
            price: { label: 'Sueldo (opcional)', required: false }, 
            location: { label: 'Ubicación del trabajo', required: true }, 
            description: { label: 'Requisitos y funciones', required: true } 
          } 
        },
        { 
          id: 'ALQUILER', 
          name: 'Alquiler', 
          order: 8, 
          types: ['rent'], 
          fields: [], 
          sys: { 
            title: { label: 'Inmueble / Objeto', required: true }, 
            price: { label: 'Precio por período', required: true }, 
            location: { label: 'Ubicación', required: true }, 
            description: { label: 'Términos del alquiler', required: true } 
          } 
        },
        { 
          id: 'PRESTAMO', 
          name: 'Préstamo', 
          order: 9, 
          types: ['sell', 'buy'], 
          fields: [], 
          sys: { 
            title: { label: 'Tipo de préstamo', required: true }, 
            price: { label: 'Monto / Tasa', required: true }, 
            location: { label: 'Zona de servicio', required: true }, 
            description: { label: 'Requisitos', required: true } 
          } 
        }
      ];
      
      for (const cat of initialCategories) {
        await run(
          'INSERT OR REPLACE INTO categories (id, name, order_index, allowed_types, fields, system_fields) VALUES (?, ?, ?, ?, ?, ?)',
          [cat.id, cat.name, cat.order, JSON.stringify(cat.types), JSON.stringify(cat.fields), JSON.stringify(cat.sys)]
        );
      }
      
      await run('INSERT OR REPLACE INTO transaction_types (id, label) VALUES (?, ?)', ['sell', 'Venta']);
      await run('INSERT OR REPLACE INTO transaction_types (id, label) VALUES (?, ?)', ['buy', 'Compra']);
      await run('INSERT OR REPLACE INTO transaction_types (id, label) VALUES (?, ?)', ['rent', 'Renta']);
      console.log('Seeding completed successfully.');
    }
  } catch (err) {
    console.error('Error during seeding check:', err);
  }
}

export { db, run, all, get };
