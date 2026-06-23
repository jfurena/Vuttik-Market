-- 1. Tablas principales (Vuttik Market - Antiguo SQLite)

CREATE TABLE vuttik_users (
    uid TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    business_name TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user',
    subscription_plan TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    subscription_expiry TEXT,
    verified BOOLEAN DEFAULT false,
    banned BOOLEAN DEFAULT false,
    warnings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    plan_id TEXT,
    multi_business_approved INTEGER DEFAULT 0,
    -- Columnas nuevas (ALTER TABLE)
    password_hash TEXT,
    oauth_provider TEXT,
    oauth_id TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    age INTEGER,
    gender TEXT,
    country TEXT,
    language TEXT,
    username TEXT,
    username_changes TEXT DEFAULT '[]',
    email_verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    next_billing_date TEXT,
    active_profile_mode TEXT DEFAULT 'personal',
    is_banned BOOLEAN DEFAULT false,
    strikes INTEGER DEFAULT 0,
    reset_password_token TEXT,
    reset_password_expires TEXT
);

CREATE TABLE vuttik_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon TEXT DEFAULT 'Tag',
    color TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    parent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by TEXT,
    is_service BOOLEAN DEFAULT false,
    requires_ean BOOLEAN DEFAULT false
);

CREATE TABLE vuttik_products (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category_id TEXT,
    subcategory_id TEXT,
    images TEXT, -- JSON array
    condition TEXT DEFAULT 'new',
    stock INTEGER DEFAULT 1,
    location TEXT,
    latitude REAL,
    longitude REAL,
    delivery_options TEXT,
    tags TEXT,
    views INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    chain_id TEXT,
    posted_as TEXT DEFAULT 'personal',
    barcode TEXT,
    phone TEXT,
    lat REAL,
    lng REAL,
    is_on_sale BOOLEAN DEFAULT false,
    sale_price REAL,
    chain TEXT,
    store_name TEXT,
    is_independent BOOLEAN DEFAULT false,
    country TEXT,
    province TEXT,
    FOREIGN KEY(owner_id) REFERENCES vuttik_users(uid)
);

CREATE TABLE vuttik_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    author_name TEXT,
    author_avatar TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    location TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    posted_as TEXT DEFAULT 'personal',
    FOREIGN KEY(author_id) REFERENCES vuttik_users(uid)
);

CREATE TABLE vuttik_business_profiles (
    uid TEXT PRIMARY KEY,
    owner_uid TEXT,
    name TEXT,
    description TEXT,
    location TEXT,
    phone TEXT,
    working_hours TEXT,
    logo TEXT,
    social_links TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY(owner_uid) REFERENCES vuttik_users(uid)
);

CREATE TABLE vuttik_ean_database (
    ean TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    category TEXT,
    image_url TEXT,
    created_by TEXT,
    created_at TEXT
);

-- Las otras tablas del market no se migran para ahorrar tiempo, 
-- pero garantizamos los permisos.

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
