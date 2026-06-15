import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

  // Auto-migration to add owner_uid to business profiles
  try {
    await run(`ALTER TABLE vuttik_business_profiles ADD COLUMN owner_uid TEXT`);
    console.log('Added owner_uid column to vuttik_business_profiles');
    // For existing profiles where uid === owner_uid, migrate them
    await run(`UPDATE vuttik_business_profiles SET owner_uid = uid WHERE owner_uid IS NULL`);
  } catch (e) {
    // Column might already exist or table doesn't exist yet
  }

  // Auto-migration: Sync POS db.json businesses to SQLite
  try {
    const dbJsonPath = process.env.USER_DATA_PATH ? path.join(process.env.USER_DATA_PATH, 'db.json') : path.join(__dirname, 'db.json');
    if (fs.existsSync(dbJsonPath)) {
      const posDb = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
      if (posDb.businesses && posDb.businesses.length > 0) {
        console.log(`Syncing ${posDb.businesses.length} POS businesses to SQLite...`);
        for (const biz of posDb.businesses) {
          const now = new Date().toISOString();
          try {
            await run(`
              INSERT OR IGNORE INTO vuttik_users (uid, email, display_name, role, created_at)
              VALUES (?, ?, ?, 'business', ?)
            `, [biz.id, `${biz.id}@business.local`, biz.nombre || 'Negocio', now]);
            
            await run(
              `INSERT INTO vuttik_business_profiles 
               (uid, owner_uid, name, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(uid) DO UPDATE SET owner_uid=excluded.owner_uid, name=excluded.name`,
              [biz.id, biz.owner_id, biz.nombre, biz.fecha_creacion || now, now]
            );

            // Sync all products for this business
            if (biz.products && Array.isArray(biz.products)) {
              for (const p of biz.products) {
                const sqliteProductId = 'pos-' + p.id;
                const ownerName = biz.nombre || 'Negocio POS';
                const locationObj = biz.settings?.allowed_location;
                const location = typeof locationObj === 'object' ? locationObj.address : (locationObj || 'Ubicación no especificada');
                const lat = typeof locationObj === 'object' ? locationObj.lat : null;
                const lng = typeof locationObj === 'object' ? locationObj.lng : null;

                await run(`
                  INSERT OR IGNORE INTO vuttik_products 
                  (id, title, price, author_id, author_name, location, lat, lng, store_name, is_independent, created_at, barcode) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  sqliteProductId,
                  p.nombre,
                  Number(p.precio_venta) || 0,
                  biz.id,
                  ownerName,
                  location,
                  lat,
                  lng,
                  ownerName,
                  1,
                  p.fecha_creacion || now,
                  p.codigo_barras || ''
                ]);
              }
            }
          } catch (e) {
            console.error('Error syncing individual biz:', biz.id, e);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error syncing db.json businesses to SQLite:', e);
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
      oauth_id TEXT,
      onboarding_completed BOOLEAN DEFAULT 0,
      active_profile_mode TEXT DEFAULT 'personal',
      age INTEGER,
      gender TEXT,
      country TEXT,
      username TEXT,
      username_changes TEXT DEFAULT '[]',
      email_verified BOOLEAN DEFAULT 0,
      verification_token TEXT,
      reset_password_token TEXT,
      reset_password_expires TEXT
    )
  `);

  try { await run("ALTER TABLE vuttik_users ADD COLUMN password_hash TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN oauth_provider TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN oauth_id TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN onboarding_completed BOOLEAN DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN age INTEGER"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN gender TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN country TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN language TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN username TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN username_changes TEXT DEFAULT '[]'"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN email_verified BOOLEAN DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN verification_token TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN next_billing_date TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN active_profile_mode TEXT DEFAULT 'personal'"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN is_banned BOOLEAN DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN strikes INTEGER DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN reset_password_token TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_users ADD COLUMN reset_password_expires TEXT"); } catch (e) {}

  // Notifications Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid)
    )
  `);
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON vuttik_notifications(user_id)');

  // Categories Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'Tag',
      order_index INTEGER DEFAULT 0,
      allowed_types TEXT, -- JSON array
      fields TEXT, -- JSON array
      system_fields TEXT -- JSON object
    )
  `);

  // Add icon column to existing categories if missing
  try { await run("ALTER TABLE vuttik_categories ADD COLUMN icon TEXT DEFAULT 'Tag'"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_categories ADD COLUMN created_by TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_categories ADD COLUMN is_service BOOLEAN DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_categories ADD COLUMN requires_ean BOOLEAN DEFAULT 0"); } catch (e) {}

  // Category Proposals Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_category_proposals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      suggested_by_id TEXT,
      suggested_by_name TEXT,
      status TEXT DEFAULT 'pending', -- pending, approved, rejected
      created_at TEXT
    )
  `);

  // Category Votes Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_category_votes (
      proposal_id TEXT,
      guardian_id TEXT,
      vote_type TEXT, -- 'up' or 'down'
      created_at TEXT,
      PRIMARY KEY (proposal_id, guardian_id),
      FOREIGN KEY(proposal_id) REFERENCES vuttik_category_proposals(id),
      FOREIGN KEY(guardian_id) REFERENCES vuttik_users(uid)
    )
  `);

  // Transaction Types Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_transaction_types (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      icon TEXT DEFAULT 'Tag',
      active BOOLEAN DEFAULT 1
    )
  `);

  // Add missing columns to existing transaction_types table
  try { await run("ALTER TABLE vuttik_transaction_types ADD COLUMN icon TEXT DEFAULT 'Tag'"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_transaction_types ADD COLUMN active BOOLEAN DEFAULT 1"); } catch (e) {}

  // Subscription Plans Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL DEFAULT 0,
      features TEXT, -- JSON array
      is_hidden BOOLEAN DEFAULT 0,
      is_coming_soon BOOLEAN DEFAULT 0,
      is_recommended BOOLEAN DEFAULT 0,
      order_index INTEGER DEFAULT 0
    )
  `);
  try { await run("ALTER TABLE vuttik_subscription_plans ADD COLUMN is_hidden BOOLEAN DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_subscription_plans ADD COLUMN is_coming_soon BOOLEAN DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_subscription_plans ADD COLUMN is_recommended BOOLEAN DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_subscription_plans ADD COLUMN order_index INTEGER DEFAULT 0"); } catch (e) {}

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
  try { await run("ALTER TABLE vuttik_products ADD COLUMN chain TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_products ADD COLUMN store_name TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_products ADD COLUMN is_independent BOOLEAN DEFAULT 0"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_products ADD COLUMN country TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_products ADD COLUMN province TEXT"); } catch (e) {}

  // Chains Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_chains (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT
    )
  `);

  // Insert default chains if they don't exist
  const defaultChains = [
    { id: 'nacional', name: 'Supermercados Nacional' },
    { id: 'sirena', name: 'La Sirena' },
    { id: 'jumbo', name: 'Jumbo' },
    { id: 'bravo', name: 'Supermercados Bravo' },
    { id: 'plaza-lama', name: 'Plaza Lama' },
    { id: 'carrefour', name: 'Carrefour' },
    { id: 'sirena-market', name: 'Sirena Market' },
    { id: 'aprezio', name: 'Aprezio' },
    { id: 'iberia', name: 'Hipermercados Iberia' },
    { id: 'ole', name: 'Hipermercados Olé' }
  ];

  for (const chain of defaultChains) {
    try {
      await run(
        'INSERT INTO vuttik_chains (id, name, created_at) VALUES (?, ?, ?)',
        [chain.id, chain.name, new Date().toISOString()]
      );
    } catch (e) {
      // Ignore if already exists (primary key constraint)
    }
  }

  // Product Votes Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_product_votes (
      product_id TEXT,
      user_id TEXT,
      vote_type TEXT, -- 'up' or 'down'
      created_at TEXT,
      PRIMARY KEY (product_id, user_id),
      FOREIGN KEY(product_id) REFERENCES vuttik_products(id),
      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid)
    )
  `);

  // Add posted_as to separate personal from business
  try { await run("ALTER TABLE vuttik_products ADD COLUMN posted_as TEXT DEFAULT 'personal'"); } catch (e) {}

  // Social Posts Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_name TEXT,
      author_avatar TEXT,
      content TEXT NOT NULL,
      image_url TEXT,
      location TEXT,
      is_verified BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL,
      posted_as TEXT DEFAULT 'personal',
      FOREIGN KEY(author_id) REFERENCES vuttik_users(uid)
    )
  `);
  
  try { await run("ALTER TABLE vuttik_posts ADD COLUMN posted_as TEXT DEFAULT 'personal'"); } catch (e) {}

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

  // Product Follows Table (Who follows which product)
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_product_follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      entity_type TEXT DEFAULT 'product_id',
      entity_value TEXT,
      created_at TEXT,
      UNIQUE(user_id, product_id),
      FOREIGN KEY(user_id) REFERENCES vuttik_users(uid),
      FOREIGN KEY(product_id) REFERENCES vuttik_products(id)
    )
  `);

  try { await run("ALTER TABLE vuttik_product_follows ADD COLUMN entity_type TEXT DEFAULT 'product_id'"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_product_follows ADD COLUMN entity_value TEXT"); } catch (e) {}

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

  try { await run("ALTER TABLE vuttik_conversations ADD COLUMN p1_name TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_conversations ADD COLUMN p1_photo TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_conversations ADD COLUMN p2_name TEXT"); } catch (e) {}
  try { await run("ALTER TABLE vuttik_conversations ADD COLUMN p2_photo TEXT"); } catch (e) {}

  // Seed the Guardian Global Chat if it doesn't exist
  await run(`
    INSERT OR IGNORE INTO vuttik_conversations (id, participant_1, participant_2, p1_name, p2_name, last_message, created_at)
    VALUES ('guardian_global_chat', 'system', 'system', 'Chat de Guardianes', 'Chat de Guardianes', 'Bienvenido al chat de guardianes', ?)
  `, [new Date().toISOString()]);

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

  // Business Profiles Table (persistent negocio/business profile data)
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_business_profiles (
      uid TEXT PRIMARY KEY,
      owner_uid TEXT,
      name TEXT,
      description TEXT,
      location TEXT,
      phone TEXT,
      working_hours TEXT,
      logo TEXT,
      social_links TEXT, -- JSON object {instagram, facebook, twitter, website}
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(owner_uid) REFERENCES vuttik_users(uid)
    )
  `);

  // Business Members Table (team management)
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_business_members (
      id TEXT PRIMARY KEY,
      business_uid TEXT NOT NULL,
      member_uid TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      FOREIGN KEY(business_uid) REFERENCES vuttik_business_profiles(uid),
      FOREIGN KEY(member_uid) REFERENCES vuttik_users(uid)
    )
  `);

  // Reports Table (Universal for posts, products, and users)
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL, -- 'user', 'post', 'product'
      target_title TEXT, -- Name of user or title of post/product for easy viewing
      author_id TEXT, -- Original author of the reported content (if applicable)
      author_name TEXT,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, resolved, dismissed
      created_at TEXT NOT NULL
    )
  `);

  try { await run("ALTER TABLE vuttik_notifications ADD COLUMN type TEXT"); } catch (e) {}

  // EAN Database Table
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_ean_database (
      ean TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      brand TEXT,
      category TEXT,
      image_url TEXT,
      created_by TEXT,
      created_at TEXT
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
    const result: any = await get("SELECT COUNT(*) as count FROM vuttik_categories WHERE id = 'TECNOLOGIA'");
    const hasNewCategories = (result?.count ?? 0) > 0;
    
    if (!hasNewCategories) {
      console.log('Seeding new initial categories...');
      await run('DELETE FROM vuttik_categories'); // Clear old categories

      const newCategoryNames = [
        "Tecnología", "Videojuegos", "Audio", "Cámaras", "Electrodomésticos", "Seguridad", "Vehículos", "Repuestos", "Motocicletas", "Maquinaria", "Muebles", "Ferretería", "Jardinería", "Mascotas", "Inmuebles", "Ropa", "Calzado", "Joyería", "Bolsos", "Cosmética", "Fitness", "Ciclismo", "Deportes", "Camping", "Libros", "Instrumentos", "Arte", "Coleccionables", "Juguetes", "Alimentos", "Bebidas", "Suplementos", "Repostería", "Plomería", "Electricidad", "Carpintería", "Limpieza", "Tutorías", "Mudanzas", "Préstamos", "Seguros", "Asesoría", "Empleos", "Químicos", "Papelería", "Embalajes", "Herramientas", "Software", "Entradas", "Catering", "Telefonía", "Relojería", "Computación", "Iluminación", "Climatización", "Llantas", "Neumáticos", "Bicicletas", "Perfumería", "Lencería", "Bisutería", "Óptica", "Cristalería", "Vajilla", "Tapicería", "Colchones", "Antigüedades", "Artesanías", "Pinturas", "Esculturas", "Cómics", "Música", "Películas", "Coleccionismo", "Caza", "Pesca", "Senderismo", "Gimnasios", "Nutrición", "Licorería", "Charcutería", "Panadería", "Heladería", "Lavandería", "Sastrería", "Peluquería", "Barbería", "Veterinaria", "Guarderías", "Fotografía", "Imprenta", "Contabilidad", "Notaría", "Logística", "Almacenaje", "Envases", "Maternidad", "Cotillón", "Hospedaje", "Turismo"
      ];
      
      const initialCategories = newCategoryNames.map((name, index) => ({
        id: name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_'),
        name: name,
        order: index + 1,
        types: ['sell', 'buy'],
        fields: [],
        sys: {
          title: { label: 'Título del anuncio', required: true }, 
          price: { label: 'Precio', required: true }, 
          location: { label: 'Ubicación', required: true }, 
          description: { label: 'Descripción', required: true }
        }
      }));
      
      for (const cat of initialCategories) {
        await run(
          'INSERT OR REPLACE INTO vuttik_categories (id, name, icon, order_index, allowed_types, fields, system_fields) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [cat.id, cat.name, 'Tag', cat.order, JSON.stringify(cat.types), JSON.stringify(cat.fields), JSON.stringify(cat.sys)]
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
