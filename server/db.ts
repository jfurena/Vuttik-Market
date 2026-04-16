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
      created_at TEXT
    )
  `);

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

  console.log('Database schema created successfully.');
  
  // Seed initial categories if empty
  const count = await get('SELECT COUNT(*) as count FROM categories');
  if (count.count === 0) {
    console.log('Seeding initial categories...');
    const initialCategories = [
      { id: 'ALIMENTOS', name: 'Alimentos', order: 1, types: ['sell', 'buy'], fields: [], sys: { title: { label: 'Nombre del producto', required: true }, price: { label: 'Precio', required: true }, location: { label: 'Ubicación', required: true }, description: { label: 'Descripción', required: false }, barcode: { label: 'Código de barras', required: false, active: true } } },
      { id: 'HOGAR', name: 'Hogar', order: 2, types: ['sell', 'buy'], fields: [], sys: { title: { label: 'Título', required: true }, price: { label: 'Precio', required: true }, location: { label: 'Ubicación', required: true }, description: { label: 'Descripción', required: true } } },
    ];
    
    for (const cat of initialCategories) {
      await run(
        'INSERT INTO categories (id, name, order_index, allowed_types, fields, system_fields) VALUES (?, ?, ?, ?, ?, ?)',
        [cat.id, cat.name, cat.order, JSON.stringify(cat.types), JSON.stringify(cat.fields), JSON.stringify(cat.sys)]
      );
    }
    
    await run('INSERT INTO transaction_types (id, label) VALUES (?, ?)', ['sell', 'Venta']);
    await run('INSERT INTO transaction_types (id, label) VALUES (?, ?)', ['buy', 'Compra']);
  }
}

export { db, run, all, get };
