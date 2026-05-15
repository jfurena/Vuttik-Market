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

  // Auto-migration to new table prefixes
  const tables_to_migrate = [
    "users", "categories", "transaction_types", "subscription_plans",
    "products", "posts", "post_likes", "metrics", "daily_stats",
    "follows", "conversations", "messages", "comments", "post_verifications"
  ];
  for (const t of tables_to_migrate) {
    try {
      const exists = await get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [t]);
      if (exists) {
        console.log(`Migrating table ${t} to vuttik_${t}...`);
        await run(`ALTER TABLE ${t} RENAME TO vuttik_${t}`);
      }
    } catch (e) {
      console.error(`Migration error for ${t}:`, e);
    }
  }


  // Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_users (
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
  try { await run("ALTER TABLE vuttik_users ADD COLUMN password_hash TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN oauth_provider TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN oauth_id TEXT"); } catch (e) {}

  // Categories Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_categories (
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
    CREATE TABLE IF NOT EXISTS vuttik_transaction_types (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      icon TEXT,
      active BOOLEAN DEFAULT 1
    )
  `);

  // Subscription Plans Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL DEFAULT 0,
      features TEXT -- JSON array
    )
  `);

  // Products Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_products (
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
      FOREIGN KEY(category_id) REFERENCES vuttik_categories(id),
      FOREIGN KEY(author_id) REFERENCES vuttik_users(uid)
    )
  `);

  // Migrations for products table
  try { await run("ALTER TABLE vuttik_products ADD COLUMN barcode TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_products ADD COLUMN phone TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_products ADD COLUMN lat REAL"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_products ADD COLUMN lng REAL"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_products ADD COLUMN is_on_sale BOOLEAN DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_products ADD COLUMN sale_price REAL"); } catch (e) {}

  // Social Posts Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      author_name TEXT,
      author_avatar TEXT,
      content TEXT NOT NULL,
      image_url TEXT,
      location TEXT,
      is_verified BOOLEAN DEFAULT 0,
      created_at TEXT,
      FOREIGN KEY(author_id) REFERENCES vuttik_users(uid)
    )
  `);

  // Post Likes Table (Relation)
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT,
      user_id TEXT,
      FOREIGN KEY(post_id) REFERENCES vuttik_posts(id),
      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid),
      UNIQUE(post_id, user_id)
    )
  `);

  // Metrics Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_metrics (
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
    CREATE TABLE IF NOT EXISTS vuttik_daily_stats (
      date TEXT PRIMARY KEY,
      views INTEGER DEFAULT 0,
      searches INTEGER DEFAULT 0,
      contacts INTEGER DEFAULT 0,
      total_p2p_volume REAL DEFAULT 0
    )
  `);

  // Indices for analytics performance
  await run('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON vuttik_metrics(timestamp)');
  await run('CREATE INDEX IF NOT EXISTS idx_metrics_action ON vuttik_metrics(action)');
  await run('CREATE INDEX IF NOT EXISTS idx_products_category ON vuttik_products(category_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_products_created ON vuttik_products(created_at)');

  // Follows Table (Who follows whom)
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT,
      UNIQUE(follower_id, following_id),
      FOREIGN KEY(follower_id) REFERENCES vuttik_users(uid),
      FOREIGN KEY(following_id) REFERENCES vuttik_users(uid)
    )
  `);

  // Conversations Table (like WhatsApp chats)
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_conversations (
      id TEXT PRIMARY KEY,
      participant_1 TEXT NOT NULL,
      participant_2 TEXT NOT NULL,
      last_message TEXT,
      last_message_at TEXT,
      created_at TEXT,
      FOREIGN KEY(participant_1) REFERENCES vuttik_users(uid),
      FOREIGN KEY(participant_2) REFERENCES vuttik_users(uid)
    )
  `);

  // Messages Table (persistent messages per conversation)
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      FOREIGN KEY(conversation_id) REFERENCES vuttik_conversations(id),
      FOREIGN KEY(sender_id) REFERENCES vuttik_users(uid)
    )
  `);

  // Comments Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      author_id TEXT,
      author_name TEXT,
      author_avatar TEXT,
      content TEXT NOT NULL,
      created_at TEXT,
      FOREIGN KEY(post_id) REFERENCES vuttik_posts(id),
      FOREIGN KEY(author_id) REFERENCES vuttik_users(uid)
    )
  `);

  // Post Verifications Table (Veracity Votes)
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_post_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT,
      user_id TEXT,
      is_veracious BOOLEAN, -- 1 for True, 0 for False
      created_at TEXT,
      UNIQUE(post_id, user_id),
      FOREIGN KEY(post_id) REFERENCES vuttik_posts(id),
      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid)
    )
  `);

  // Indices for performance
  await run('CREATE INDEX IF NOT EXISTS idx_comments_post ON vuttik_comments(post_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_verifications_post ON vuttik_post_verifications(post_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON vuttik_messages(conversation_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_messages_sent ON vuttik_messages(sent_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_follows_follower ON vuttik_follows(follower_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_follows_following ON vuttik_follows(following_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON vuttik_conversations(participant_1)');
  await run('CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON vuttik_conversations(participant_2)');

  console.log('Database schema created successfully.');
  
  // Seed initial categories if empty
  try {
    const result: any = await get('SELECT COUNT(*) as count FROM vuttik_categories');
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
          'INSERT OR REPLACE INTO vuttik_categories (id, name, order_index, allowed_types, fields, system_fields) VALUES (?, ?, ?, ?, ?, ?)',
          [cat.id, cat.name, cat.order, JSON.stringify(cat.types), JSON.stringify(cat.fields), JSON.stringify(cat.sys)]
        );
      }
      
      await run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['sell', 'Venta', 'ArrowUpCircle', 1]);
      await run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['buy', 'Compra', 'ArrowDownCircle', 1]);
      await run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['rent', 'Alquiler', 'Key', 1]);
      await run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['loan', 'Préstamo', 'Banknote', 1]);
      await run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['hire', 'Contratación', 'BriefcaseBusiness', 1]);
      await run('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', ['service', 'Servicio', 'ShieldCheck', 1]);
      
      const initialPlans = [
        { id: 'free', name: 'Gratis', price: 0, features: ['market', 'social'] },
        { id: 'business', name: 'Empresa', price: 29.99, features: ['market', 'social', 'business_dash', 'priority_support'] },
        { id: 'negocio', name: 'Negocio', price: 9.99, features: ['market', 'social', 'negocio_dash'] },
        { id: 'guardian', name: 'Guardian', price: 0, features: ['market', 'social', 'guardian_dash'] },
      ];
      
      for (const plan of initialPlans) {
        await run('INSERT OR REPLACE INTO vuttik_subscription_plans (id, name, price, features) VALUES (?, ?, ?, ?)', [plan.id, plan.name, plan.price, JSON.stringify(plan.features)]);
      }

      console.log('Seeding completed successfully.');
    }
  } catch (err) {
    console.error('Error during seeding check:', err);
  }
}

export { db, run, all, get };
