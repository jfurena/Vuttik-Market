import express from 'express';
import multer from 'multer';
import 'express-async-errors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { get, run, all } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import rateLimit from 'express-rate-limit';
import { enviarAlerta, DEFAULT_ALERT_SETTINGS } from './alerts.js';

const __dirname = path.dirname(fileURLToPath((import.meta as any)?.url || `file://${process.cwd()}/placeholder.js`));
const DB_FILE = process.env.VUTTIK_DB_JSON_PATH 
  || (process.env.USER_DATA_PATH ? path.join(process.env.USER_DATA_PATH, 'db.json') : path.join(__dirname, 'db.json'));

// === DB STRUCTURE ===
export const emptyBusiness = (id: string, nombre: string, codigo: string, owner_id: string) => ({
  id,
  codigo,
  nombre,
  owner_id,
  fecha_creacion: new Date(),
  employees: [],
  products: [],
  sales: [],
  shifts: [],
  expenses: [],
  cash_movements: [],
  inventory_movements: [],
  commissions: [],
  activity_log: [],
  approval_requests: [],
  clientes: [],
  pagos_clientes: [],
  transfers: [],
  ncf_counter: 1,
  settings: { allowed_location: null, whitelisted_locations: [] }
});

const initialDB = {
  owners: [] as any[],
  businesses: [] as any[]
};

// === DB HELPERS ===
let inMemoryDB: any = null;

export const getDB = () => {
  if (inMemoryDB) return inMemoryDB;

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
    inMemoryDB = JSON.parse(JSON.stringify(initialDB));
    return inMemoryDB;
  }
  let db;
  let raw = '';
  try {
    raw = fs.readFileSync(DB_FILE, 'utf8');
    db = JSON.parse(raw);
  } catch (err) {
    console.error('FATAL: db.json is corrupted!', err);
    let repaired = false;
    const appendOptions = ['}', ']}', ']}}', '}]}', '}}]}', '"]}', '"}'];
    for (const suffix of appendOptions) {
      try {
        db = JSON.parse(raw + suffix);
        repaired = true;
        console.error('SUCCESS: Repaired db.json by appending: ' + suffix);
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        break;
      } catch (e) {}
    }
    if (!repaired) {
       console.error('RAW CORRUPTED JSON TAIL:', raw.slice(-200));
       fs.copyFileSync(DB_FILE, `${DB_FILE}.corrupted.${Date.now()}`);
       db = JSON.parse(JSON.stringify(initialDB));
       fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
  }
  if (!db.owners) db.owners = [];
  if (!db.businesses) db.businesses = [];
  inMemoryDB = db;
  return inMemoryDB;
};

let isSaving = false;
let pendingSaveData: any = null;

export const saveDB = (data: any) => {
  inMemoryDB = data;
  if (isSaving) {
    pendingSaveData = data;
    return;
  }
  isSaving = true;
  fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), (err) => {
    isSaving = false;
    if (err) console.error("Error saving DB_FILE:", err);
    if (pendingSaveData) {
      const nextData = pendingSaveData;
      pendingSaveData = null;
      saveDB(nextData);
    }
  });
};

// Get the business data object (throws if not found)
const getBiz = (db: any, bizId: string) => {
  const biz = db.businesses.find((b: any) => b.id === bizId);
  if (!biz) throw new Error('Negocio no encontrado');
  if (!biz.clientes) biz.clientes = [];
  if (!biz.pagos_clientes) biz.pagos_clientes = [];
  if (!biz.products) biz.products = [];
  if (!biz.employees) biz.employees = [];
  if (!biz.sales) biz.sales = [];
  if (!biz.shifts) biz.shifts = [];
  if (!biz.expenses) biz.expenses = [];
  if (!biz.cash_movements) biz.cash_movements = [];
  if (!biz.inventory_movements) biz.inventory_movements = [];
  if (!biz.activity_log) biz.activity_log = [];
  if (!biz.approval_requests) biz.approval_requests = [];
  if (!biz.transfers) biz.transfers = [];
  return biz;
};

// Generate a short code like SOL-001
export const generateCode = (nombre: string, existingCodes: string[]) => {
  const prefix = nombre.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3) || 'NEG';
  let num = 1;
  let code = `${prefix}-${String(num).padStart(3, '0')}`;
  while (existingCodes.includes(code)) {
    num++;
    code = `${prefix}-${String(num).padStart(3, '0')}`;
  }
  return code;
};

// Log helper
const logActivity = (biz: any, activity: { usuario_id: string, usuario_nombre: string, accion: string, detalles: string, modulo: string }) => {
  if (!biz.activity_log) biz.activity_log = [];
  biz.activity_log.push({
    id: 'log-' + Date.now() + Math.random(),
    fecha: new Date(),
    ...activity
  });
};

// === MIDDLEWARES ===
const requireOwnerAuth = (req: any, res: any, next: any) => {
  const s = req.session as any;
  if (!s.owner_id) return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
  next();
};

/**
 * True when the session identity genuinely belongs to the business: either as
 * its owner, or as one of its active employees.
 *
 * Checked here rather than trusting `session.business_id` on its own, so that a
 * mistake in how the session was populated cannot by itself grant access.
 */
const sessionBelongsToBusiness = (s: any, biz: any): boolean => {
  if (!biz) return false;
  if (s.owner_id && biz.owner_id === s.owner_id) return true;
  if (s.employee_id) {
    return (biz.employees || []).some((e: any) => e.id === s.employee_id && e.estado === 'activo');
  }
  return false;
};

const requireBizAccess = (req: any, res: any, next: any) => {
  const s = req.session as any;
  if (!s.business_id) return res.status(401).json({ error: 'Selecciona un negocio primero.' });
  if (!s.owner_id && !s.employee_id) return res.status(401).json({ error: 'No autorizado.' });

  const db = getDB();
  const biz = db.businesses.find((b: any) => b.id === s.business_id);
  if (!biz) {
    // Stale session — the business no longer exists in the DB
    s.business_id = null;
    return res.status(401).json({ error: 'Tu sesión de negocio ya no es válida. Por favor selecciona el negocio nuevamente.' });
  }
  if (biz.is_suspended) return res.status(403).json({ error: 'Este negocio ha sido suspendido por administración.' });
  if (!sessionBelongsToBusiness(s, biz)) {
    return res.status(403).json({ error: 'No tienes acceso a este negocio.' });
  }

  return next();
};


const requireAdminBizAccess = (req: any, res: any, next: any) => {
  const s = req.session as any;
  if (!s.business_id) return res.status(403).json({ error: 'No autorizado' });

  const db = getDB();
  const biz = db.businesses.find((b: any) => b.id === s.business_id);
  if (!biz) return res.status(403).json({ error: 'Negocio no encontrado' });

  // Being some business's owner did not previously imply being this one's.
  if (s.owner_id) {
    if (biz.owner_id !== s.owner_id) return res.status(403).json({ error: 'No eres el dueño de este negocio.' });
    return next();
  }

  const emp = (biz.employees || []).find((e: any) => e.id === s.employee_id && e.estado === 'activo');
  if (emp && emp.rol === 'supervisor') return next();

  return res.status(403).json({ error: 'Requiere nivel administrador o supervisor.' });
};

const requireOwnerBizAccess = (req: any, res: any, next: any) => {
  const s = req.session as any;
  if (!s.owner_id || !s.business_id) return res.status(403).json({ error: 'Solo el dueño puede realizar esta acción.' });

  const db = getDB();
  const biz = db.businesses.find((b: any) => b.id === s.business_id);
  if (!biz) {
    s.business_id = null;
    return res.status(401).json({ error: 'Tu sesión de negocio ya no es válida. Por favor selecciona el negocio nuevamente.' });
  }
  if (biz.is_suspended) return res.status(403).json({ error: 'Este negocio ha sido suspendido por administración.' });
  // Owning the session is not enough: it has to be *this* business.
  if (biz.owner_id !== s.owner_id) {
    return res.status(403).json({ error: 'No eres el dueño de este negocio.' });
  }

  next();
};


// SEC-007 FIX: Rate limiting to prevent brute-force attacks on authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 attempts per 15 minutes
  message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Validación de enlaces sociales del negocio.
 *
 * Se muestran en el perfil público del marketplace con el icono oficial de cada
 * red, así que un dominio suplantado (1nstagram.com, faceb00k-login.com) engaña
 * con facilidad: el usuario ve el logo de Instagram y confía. Antes se
 * almacenaban sin comprobación alguna.
 */
const SOCIAL_DOMINIOS: Record<string, string[]> = {
  instagram: ['instagram.com', 'instagr.am'],
  facebook: ['facebook.com', 'fb.com', 'fb.me', 'm.facebook.com'],
  twitter: ['twitter.com', 'x.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  linkedin: ['linkedin.com'],
};

function validarEnlacesSociales(entrada: any): { links: Record<string, string>; errores: string[] } {
  const links: Record<string, string> = {};
  const errores: string[] = [];
  if (!entrada || typeof entrada !== 'object') return { links, errores };

  for (const [red, valor] of Object.entries(entrada)) {
    const bruto = String(valor ?? '').trim();
    if (!bruto) continue;
    if (bruto.length > 500) { errores.push(`${red}: enlace demasiado largo`); continue; }

    let url: URL;
    try { url = new URL(bruto); }
    catch { errores.push(`${red}: no es una URL válida`); continue; }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      errores.push(`${red}: solo se permiten enlaces http o https`);
      continue;
    }
    const permitidos = SOCIAL_DOMINIOS[red.toLowerCase()];
    if (permitidos) {
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (!permitidos.some(d => host === d || host.endsWith('.' + d))) {
        errores.push(`${red}: el enlace debe apuntar a ${permitidos[0]}`);
        continue;
      }
    }
    links[red] = url.toString();
  }
  return { links, errores };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ==========================================
  // MARKETPLACE SYNC RECEIVER ENDPOINTS
  // ==========================================
  /**
   * Receives product changes pushed from a POS instance into the public
   * marketplace.
   *
   * The "API key" is the owner id. It used to be accepted with no verification
   * at all — any non-empty header passed — and `bizId` came straight from the
   * body, so anyone could publish or delete marketplace listings in any
   * business's name. Both are now checked against the POS database.
   */
  app.post('/api/market-sync/product', async (req: any, res: any) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Missing API Key' });

    const ownerId = String(apiKey);
    const { action, product, bizId, ownerName, locationObj } = req.body;

    if (!bizId || !product?.id) return res.status(400).json({ error: 'Faltan datos del producto' });

    // The key must correspond to a real owner, and the business named in the
    // body must actually belong to them.
    const posDb = getDB();
    const biz = posDb.businesses.find((b: any) => b.id === bizId);
    if (!biz || biz.owner_id !== ownerId) {
      return res.status(403).json({ error: 'Clave no válida para este negocio' });
    }

    try {
      const sqliteProductId = 'pos-' + product.id;

      /**
       * El marketplace guarda las imágenes como un array JSON y su endpoint
       * /api/images/product redirige a la primera entrada. Una ruta relativa
       * daría 404 en vuttik.com, que no sirve /uploads, así que se convierte en
       * URL absoluta apuntando al dominio del POS.
       */
      const POS_ORIGIN = process.env.POS_PUBLIC_URL || 'https://pos.vuttik.com';
      const imagenAbsoluta = (ruta: any): string | null => {
        if (typeof ruta !== 'string' || !ruta.trim()) return null;
        if (/^https?:\/\//i.test(ruta) || ruta.startsWith('data:')) return ruta;
        return POS_ORIGIN.replace(/\/$/, '') + (ruta.startsWith('/') ? ruta : '/' + ruta);
      };
      const img = imagenAbsoluta(product.imagen);
      const imagesJson = img ? JSON.stringify([img]) : JSON.stringify([]);

      // Una oferta solo cuenta si está activa y dentro de su ventana de fechas.
      const ahora = new Date();
      const ofertaVigente =
        !!product.oferta_activa &&
        Number(product.precio_oferta) > 0 &&
        (!product.oferta_inicio || new Date(product.oferta_inicio) <= ahora) &&
        (!product.oferta_fin || new Date(product.oferta_fin) >= ahora);
      const precioOferta = ofertaVigente ? Number(product.precio_oferta) : null;

      if (action === 'create') {
        const location = typeof locationObj === 'object' ? (locationObj as any).address : (locationObj || 'Ubicación no especificada');
        const lat = typeof locationObj === 'object' ? (locationObj as any).lat : null;
        const lng = typeof locationObj === 'object' ? (locationObj as any).lng : null;
        
        await run(`
          INSERT INTO vuttik_products 
          (id, title, price, author_id, author_name, location, lat, lng, store_name, is_independent, created_at, barcode, type_id, posted_as, stock, images, is_on_sale, sale_price) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sqliteProductId, product.nombre, Number(product.precio_venta) || 0,
          bizId, ownerName, location, lat, lng, ownerName, 1,
          new Date().toISOString(), product.codigo_barras || '', 'sell', 'business',
          Number(product.cantidad_disponible) || 0,
          imagesJson, ofertaVigente ? 1 : 0, precioOferta
        ]);
      } else if (action === 'update') {
        const location = typeof locationObj === 'object' ? (locationObj as any).address : (locationObj || 'Ubicación no especificada');
        const lat = typeof locationObj === 'object' ? (locationObj as any).lat : null;
        const lng = typeof locationObj === 'object' ? (locationObj as any).lng : null;
        
        await run(`
          UPDATE vuttik_products 
          SET title = ?, price = ?, barcode = ?, location = ?, lat = ?, lng = ?, author_id = ?,
              images = ?, is_on_sale = ?, sale_price = ?, stock = ?
          WHERE id = ? AND author_id = ?
        `, [
          product.nombre, Number(product.precio_venta) || 0, product.codigo_barras || '',
          location, lat, lng, bizId,
          imagesJson, ofertaVigente ? 1 : 0, precioOferta,
          Number(product.cantidad_disponible) || 0,
          sqliteProductId, bizId
        ]);
      } else if (action === 'delete') {
        await run('DELETE FROM vuttik_products WHERE id = ? AND author_id = ?', [sqliteProductId, ownerId]);
      }
      
      res.json({ success: true });
    } catch (err: any) {
      console.error('API Sync Error:', err);
      res.status(500).json({ error: err.message });
    }
  });


const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });


  // Produccion: servir la carpeta uploads
  app.use('/uploads', express.static(UPLOADS_DIR));

  /**
   * Image upload. Requires an authenticated business session: it used to be
   * open to anyone, which allowed unlimited anonymous writes into a
   * publicly-served directory.
   *
   * The extension is taken from a fixed allow-list rather than from the data
   * URI. The previous version derived it from the MIME type, so a payload
   * declaring `data:image/html;base64,...` was written as a .html file inside
   * /uploads and served back as markup — stored XSS on the POS domain.
   */
  const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    jpeg: 'jpg',
    jpg: 'jpg',
    png: 'png',
    webp: 'webp',
    gif: 'gif',
  };
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  app.post('/api/upload', requireBizAccess, (req: any, res: any) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'No se envió ninguna imagen.' });
      }

      const matches = String(imageBase64).match(/^data:image\/([A-Za-z0-9+.-]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Formato de imagen inválido' });
      }

      const extension = ALLOWED_IMAGE_TYPES[matches[1].toLowerCase()];
      if (!extension) {
        return res.status(400).json({ error: 'Tipo de imagen no permitido. Usa JPG, PNG, WEBP o GIF.' });
      }

      const buffer = Buffer.from(matches[2], 'base64');
      if (buffer.length > MAX_IMAGE_BYTES) {
        return res.status(413).json({ error: 'La imagen supera el tamaño máximo de 8 MB.' });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'prod-' + uniqueSuffix + '.' + extension;
      const filepath = path.join(UPLOADS_DIR, filename);

      fs.writeFileSync(filepath, buffer);

      res.json({ url: '/uploads/' + filename });
    } catch (e) {
      console.error('Error procesando archivo:', e);
      res.status(500).json({ error: 'Error interno guardando la imagen' });
    }
  });


  /**
   * Restores session state when the cookie is missing (the POS is served from a
   * different host than the marketplace, so the session cookie is not always
   * present).
   *
   * The identity is rebuilt ONLY from a signed JWT. The X-Business-ID header is
   * accepted only after confirming that the authenticated user actually owns
   * that business: previously the header was copied straight into the session,
   * which meant anyone holding any valid Vuttik token could send
   * `X-Business-ID: <someone else's business>` and every downstream guard would
   * wave them through, because those guards only checked that the business
   * existed — never that it was theirs.
   */
  app.use(async (req: any, _res: any, next: any) => {
      if (!req.session) req.session = {};

      // Rebuild the owner identity from the token when the session lost it.
      if (!req.session.owner_id && !req.session.employee_id && req.headers['authorization']) {
          const parts = String(req.headers['authorization']).split(' ');
          const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
          if (token) {
              const secret = process.env.JWT_SECRET;
              // No fallback secret: without a configured key, refuse to derive
              // an identity rather than trusting a publicly known default.
              if (secret) {
                  try {
                      const jwt = (await import('jsonwebtoken')).default;
                      const user: any = jwt.verify(token, secret);
                      if (user?.uid) req.session.owner_id = user.uid;
                  } catch {
                      // Invalid or expired token: stay anonymous.
                  }
              }
          }
      }

      // Adopt the requested business only if the caller genuinely belongs to it.
      const headerBizId = req.headers['x-business-id'];
      if (headerBizId && !req.session.business_id && req.session.owner_id) {
          const db = getDB();
          const biz = db.businesses.find((b: any) => b.id === headerBizId);
          if (biz && biz.owner_id === req.session.owner_id) {
              req.session.business_id = biz.id;
          }
      }

      next();
  });

  // =============================================
  // === AUTH ROUTES ===
  // =============================================

  // Register new owner
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const { nombre, correo, password } = req.body;
    if (!nombre || !correo || !password) return res.status(400).json({ error: 'Completa todos los campos.' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

    try {
      const exists = await get('SELECT uid FROM vuttik_users WHERE email = ?', [correo.toLowerCase().trim()]);
      if (exists) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo en Vuttik.' });

      const password_hash = await bcrypt.hash(password, 10);
      const uid = uuidv4();
      await run(
        'INSERT INTO vuttik_users (uid, email, display_name, role, plan_id, created_at, password_hash, oauth_provider, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uid, correo.toLowerCase().trim(), nombre.trim(), 'user', 'free', new Date().toISOString(), password_hash, 'local', 1]
      );

      (req.session as any).owner_id = uid;
      (req.session as any).owner_nombre = nombre.trim();
      res.json({ owner: { id: uid, nombre: nombre.trim(), correo: correo.toLowerCase().trim() } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Select business (owner switches into a business)
  app.post('/api/auth/select-business', requireOwnerAuth, (req, res) => {
    const { business_id } = req.body;
    const db = getDB();
    const s = req.session as any;
    const biz = db.businesses.find((b: any) => b.id === business_id && b.owner_id === s.owner_id);
    if (!biz) return res.status(404).json({ error: 'Negocio no encontrado.' });
    s.business_id = biz.id;
    res.json({ business: { id: biz.id, nombre: biz.nombre, codigo: biz.codigo } });
  });

  // Exit business (owner goes back to business selector)
  app.post('/api/auth/exit-business', requireOwnerAuth, (req, res) => {
    (req.session as any).business_id = null;
    res.json({ success: true });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const s = req.session as any;
    const db = getDB();
    if (s.employee_id && s.business_id) {
      const biz = db.businesses.find((b: any) => b.id === s.business_id);
      if (biz) {
        const emp = biz.employees?.find((e: any) => e.id === s.employee_id);
        if (emp) {
          logActivity(biz, { usuario_id: emp.id, usuario_nombre: emp.nombre, accion: 'Cierre de Sesión', detalles: `El empleado ${emp.nombre} salió del sistema.`, modulo: 'Seguridad' });
          saveDB(db);
        }
      }
    }
    req.session.destroy(() => res.json({ success: true }));
  });



  const sessionSecret = process.env.SESSION_SECRET || 'fallback-dev-secret-change-in-production';
  app.use(session({
    name: 'vuttik_pos_sid',
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  }) as any);


  // =============================================
  // === AUTH ROUTES ===
  // =============================================

  // Register new owner
  // NOTE: a second, byte-identical /api/auth/register handler used to sit
  // here. Express matches the first registration, so it was unreachable.

  // Owner login
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const { password } = req.body;
    const correo = req.body.correo || req.body.email;
    if (!correo || !password) return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });

    try {
      const user: any = await get('SELECT * FROM vuttik_users WHERE email = ?', [correo.toLowerCase().trim()]);
      if (!user) return res.status(404).json({ error: 'No existe una cuenta con ese correo.' });
      if (!user.password_hash) return res.status(401).json({ error: 'Contraseña incorrecta o cuenta de Google.' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta.' });

      (req.session as any).owner_id = user.uid;
      (req.session as any).owner_nombre = user.display_name;
      (req.session as any).business_id = null;
      (req.session as any).employee_id = null;

      res.json({ owner: { id: user.uid, nombre: user.display_name, correo: user.email } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Employee login
  app.post('/api/auth/employee-login', authLimiter, async (req, res) => {
    const { business_codigo, username, password } = req.body;
    if (!business_codigo || !username || !password) return res.status(400).json({ error: 'Completa todos los campos.' });

    const db = getDB();
    const biz = db.businesses.find((b: any) => b.codigo === business_codigo.toUpperCase().trim());
    if (!biz) return res.status(404).json({ error: 'Código de negocio incorrecto.' });

    const employee = biz.employees?.find((e: any) => e.username === username.trim() && e.estado === 'activo');
    if (!employee) return res.status(404).json({ error: 'Usuario no encontrado en este negocio.' });

    const valid = await bcrypt.compare(password, employee.password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta.' });

    (req.session as any).employee_id = employee.id;
    (req.session as any).business_id = biz.id;
    (req.session as any).owner_id = null;

    logActivity(biz, {
      usuario_id: employee.id,
      usuario_nombre: employee.nombre,
      accion: 'Inicio de Sesión (Empleado)',
      detalles: `El empleado ${employee.nombre} ingresó al sistema.`,
      modulo: 'Seguridad'
    });
    saveDB(db);

    res.json({
      user: {
        id: employee.id,
        nombre: employee.nombre,
        username: employee.username,
        rol: employee.rol,
        estado: employee.estado,
        business_id: biz.id,
        business_nombre: biz.nombre,
      }
    });
  });
    
    // NOTE: a /api/debug-files endpoint used to live here. It listed the server
    // directory with file sizes to any unauthenticated caller, which handed an
    // attacker a map of the deployment for free. Removed.

    // Get current session user
  app.get('/api/pos/me', async (req, res) => {
    const s = req.session as any;
    if (!s.owner_id && !s.employee_id) return res.json(null);

    const db = getDB();

    if (s.owner_id && !s.business_id) {
      // Owner without business selected -> return owner info
      let owner = db.owners.find((o: any) => o.id === s.owner_id);
      if (!owner) {
        // Fallback to SQLite (Vuttik Market DB)
        const user: any = await get('SELECT * FROM vuttik_users WHERE uid = ?', [s.owner_id]);
        if (user) {
          owner = { id: user.uid, nombre: user.display_name, correo: user.email };
        }
      }
      if (!owner) return res.json(null);
      return res.json({ id: owner.id, nombre: owner.nombre, correo: owner.correo, rol: 'admin', estado: 'activo' });
    }

    if (s.owner_id && s.business_id) {
      // Owner inside a business
      let owner = db.owners.find((o: any) => o.id === s.owner_id);
      if (!owner) {
        const user: any = await get('SELECT * FROM vuttik_users WHERE uid = ?', [s.owner_id]);
        if (user) {
          owner = { id: user.uid, nombre: user.display_name, correo: user.email };
        }
      }
      const biz = db.businesses.find((b: any) => b.id === s.business_id);
      if (!owner || !biz) return res.json(null);
      return res.json({
        id: owner.id,
        nombre: owner.nombre,
        correo: owner.correo,
        rol: 'admin',
        estado: 'activo',
        business_id: biz.id,
        business_nombre: biz.nombre,
        business_codigo: biz.codigo,
        owner_id: owner.id
      });
    }

    if (s.employee_id && s.business_id) {
      const biz = db.businesses.find((b: any) => b.id === s.business_id);
      if (!biz) return res.json(null);
      const emp = biz.employees?.find((e: any) => e.id === s.employee_id);
      if (!emp) return res.json(null);
      return res.json({
        id: emp.id,
        nombre: emp.nombre,
        username: emp.username,
        rol: emp.rol,
        estado: emp.estado,
        business_id: biz.id,
        business_nombre: biz.nombre,
        business_codigo: biz.codigo,
        owner_id: biz.owner_id
      });
    }

    res.json(null);
  });

  // Use global unified auth router to support Google Auth and JWT in POS (fallback)
  const { authRouter } = await import('./auth.js');
  app.use('/api/auth', authRouter);

  // =============================================
  // === BUSINESS ROUTES ===
  // =============================================

  // List my businesses
  app.get('/api/businesses', requireOwnerAuth, async (req, res) => {
    const s = req.session as any;
    const db = getDB();

    // Auto-sync SQLite profile data into db.json for this user's businesses
    let dbUpdated = false;
    for (let b of db.businesses) {
      if (b.owner_id === s.owner_id) {
        try {
          const profile = await get(`SELECT * FROM vuttik_business_profiles WHERE uid = ?`, [b.id]);
          if (profile) {
            if (profile.name && profile.name !== b.nombre) { b.nombre = profile.name; dbUpdated = true; }
            if (profile.description !== undefined && profile.description !== b.description) { b.description = profile.description; dbUpdated = true; }
            if (profile.phone !== undefined && profile.phone !== b.phone) { b.phone = profile.phone; dbUpdated = true; }
            if (profile.working_hours !== undefined && profile.working_hours !== b.working_hours) { b.working_hours = profile.working_hours; dbUpdated = true; }
            if (profile.logo !== undefined && profile.logo !== b.logo) { b.logo = profile.logo; dbUpdated = true; }
            
            if (profile.location) {
              try {
                const parsedLoc = JSON.parse(profile.location);
                if (JSON.stringify(parsedLoc) !== JSON.stringify(b.location)) {
                  b.location = parsedLoc;
                  dbUpdated = true;
                }
              } catch (e) {}
            }
            if (profile.social_links) {
              try {
                const parsedLinks = JSON.parse(profile.social_links);
                if (JSON.stringify(parsedLinks) !== JSON.stringify(b.social_links)) {
                  b.social_links = parsedLinks;
                  dbUpdated = true;
                }
              } catch (e) {}
            }
          }
        } catch (err) {
          console.error('Error auto-syncing profile from SQLite', err);
        }
      }
    }
    if (dbUpdated) {
      saveDB(db);
    }

    const myBizList = db.businesses
      .filter((b: any) => b.owner_id === s.owner_id)
      .map((b: any) => {
        const sales = b.sales || [];
        const expenses = b.expenses || [];
        
        const cobradoSales = sales.filter((s: any) => s.estado === 'completada' || s.estado === 'pagada');
        const totalVendido = cobradoSales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
        
        const isCompraMercancia = (e: any) => e.es_compra_mercancia || (e.categoria && typeof e.categoria === 'string' && e.categoria.toUpperCase() === 'COMPRAS DE MERCANCÍA');
        const comprasMercancia = expenses.filter(isCompraMercancia);
        const gastosOperativos = expenses.filter((e: any) => e.categoria !== 'TRANSFERENCIA' && !isCompraMercancia(e));
        
        const totalComprasMercancia = comprasMercancia.reduce((acc: number, e: any) => acc + (e.monto || 0), 0);
        const totalGastosOperativos = gastosOperativos.reduce((acc: number, e: any) => acc + (e.monto || 0), 0);
        const gananciaNeta = totalVendido - totalComprasMercancia - totalGastosOperativos;

        return {
          id: b.id,
          nombre: b.nombre,
          codigo: b.codigo,
          fecha_creacion: b.fecha_creacion,
          employee_count: (b.employees || []).length,
          product_count: (b.products || []).length,
          sales_count: (b.sales || []).length,
          ganancia_neta: gananciaNeta,
          location: b.location,
          is_suspended: b.is_suspended || false,
          logo: b.logo,
          description: b.description,
          working_hours: b.working_hours,
          phone: b.phone,
          social_links: typeof b.social_links === 'string' ? (() => { try { return JSON.parse(b.social_links as string); } catch { return {}; } })() : (b.social_links || {})
        };
      });

    // Also fetch pending, rejected, and approved requests
    const requests = await all(`SELECT * FROM vuttik_business_requests WHERE user_id = ? AND status IN ('pending', 'rejected', 'approved')`, [s.owner_id]);
    for (const req of requests || []) {
      myBizList.push({
        id: req.id,
        nombre: req.business_name || 'Negocio Solicitado',
        codigo: '---',
        logo: req.logo || undefined,
        location: req.location ? JSON.parse(req.location) : undefined,
        fecha_creacion: req.created_at,
        employee_count: 0,
        product_count: 0,
        sales_count: 0,
        is_pending: req.status === 'pending',
        is_rejected: req.status === 'rejected',
        is_approved: req.status === 'approved'
      });
    }

    res.json(myBizList);
  });

  // Create business
  app.post('/api/businesses', requireOwnerAuth, async (req, res) => {
    const { nombre, location, logo, description, working_hours, phone, market_sync_url, market_api_key } = req.body;
    const { links: social_links, errores: erroresSociales } = validarEnlacesSociales(req.body.social_links);
    if (erroresSociales.length) return res.status(400).json({ error: erroresSociales.join('. ') });
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre del negocio es obligatorio.' });
    const s = req.session as any;
    const db = getDB();

    // Check business limit
    const userBusinessesCount = db.businesses.filter((b: any) => b.owner_id === s.owner_id).length;
    if (userBusinessesCount >= 1) {
      try {
        const user = await get(`SELECT multi_business_approved, display_name, email FROM vuttik_users WHERE uid = ?`, [s.owner_id]);
        if (!user || !user.multi_business_approved) {
          // Create a pending request with user info embedded for Mega Guardian visibility
          const reqId = 'req-' + Date.now();
          await run(
            `INSERT INTO vuttik_business_requests (id, user_id, user_name, user_email, status, business_name, logo, location, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`, 
            [reqId, s.owner_id, user?.display_name || '', user?.email || '', nombre || '', '', location ? JSON.stringify(location) : null, new Date().toISOString()]
          );
          return res.json({ id: reqId, nombre, is_pending: true });
        }
      } catch (err) {
        console.error('Error checking multi_business_approved:', err);
        return res.status(500).json({ error: 'Error del servidor al verificar permisos.' });
      }
    }

    const existingCodes = db.businesses.map((b: any) => b.codigo);
    const codigo = generateCode(nombre, existingCodes);
    const newBizId = 'biz-' + Date.now();
    const newBiz = emptyBusiness(newBizId, nombre.trim(), codigo, s.owner_id);
    if (location !== undefined) (newBiz as any).location = location;
    if (logo !== undefined) (newBiz as any).logo = logo;
    if (description !== undefined) (newBiz as any).description = description;
    if (working_hours !== undefined) (newBiz as any).working_hours = working_hours;
    if (phone !== undefined) (newBiz as any).phone = phone;
    if (social_links !== undefined) (newBiz as any).social_links = social_links;
    db.businesses.push(newBiz);
    saveDB(db);

    const now = new Date().toISOString();
    try {
      await run(
        `INSERT INTO vuttik_business_profiles (uid, owner_uid, name, location, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [newBizId, s.owner_id, nombre.trim(), location ? JSON.stringify(location) : null, now, now]
      );
    } catch(err) {
      console.error('Error creating business profile:', err);
    }

    res.json({ id: newBiz.id, nombre: newBiz.nombre, codigo: newBiz.codigo, fecha_creacion: newBiz.fecha_creacion });
  });

  // Request multiple businesses
  app.post('/api/pos/request-multi-business', requireOwnerAuth, async (req, res) => {
    const s = req.session as any;
    const { nombre, location, logo } = req.body;
    try {
      // Fetch user info so the request is self-contained for the Mega Guardian panel
      const userInfo = await get(`SELECT display_name, email FROM vuttik_users WHERE uid = ?`, [s.owner_id]);
      const reqId = 'req-' + Date.now();
      await run(
        `INSERT INTO vuttik_business_requests (id, user_id, user_name, user_email, status, business_name, logo, location, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`, 
        [reqId, s.owner_id, userInfo?.display_name || '', userInfo?.email || '', nombre || '', logo || '', location ? JSON.stringify(location) : null, new Date().toISOString()]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Error submitting business request:', err);
      res.status(500).json({ error: 'Error al enviar la solicitud.' });
    }
  });

  // Dismiss a rejected business request
  app.post('/api/businesses/dismiss-rejected', requireOwnerAuth, async (req, res) => {
    const { request_id } = req.body;
    const s = req.session as any;
    if (!request_id) return res.status(400).json({ error: 'Falta request_id.' });

    try {
      await run(`DELETE FROM vuttik_business_requests WHERE id = ? AND user_id = ? AND status = 'rejected'`, [request_id, s.owner_id]);
      res.json({ success: true });
    } catch (err) {
      console.error('Error dismissing rejected request:', err);
      res.status(500).json({ error: 'Error al limpiar la solicitud rechazada.' });
    }
  });

  // Claim an approved business request
  app.post('/api/businesses/claim-approved', requireOwnerAuth, async (req, res) => {
    const { request_id } = req.body;
    const s = req.session as any;
    if (!request_id) return res.status(400).json({ error: 'Falta request_id.' });

    try {
      const request: any = await get(`SELECT * FROM vuttik_business_requests WHERE id = ? AND user_id = ? AND status = 'approved'`, [request_id, s.owner_id]);
      if (!request) return res.status(404).json({ error: 'Solicitud aprobada no encontrada.' });

      const db = getDB();
      const existingCodes = db.businesses.map((b: any) => b.codigo);
      const nombre = request.business_name || 'Negocio Aprobado';
      const codigo = generateCode(nombre, existingCodes);
      const newBizId = 'biz-' + Date.now();
      const newBiz = emptyBusiness(newBizId, nombre.trim(), codigo, s.owner_id);
      if (request.location) (newBiz as any).location = JSON.parse(request.location);
      if (request.logo) (newBiz as any).logo = request.logo;
      db.businesses.push(newBiz);
      saveDB(db);

      const now = new Date().toISOString();
      try {
        await run(
          `INSERT INTO vuttik_business_profiles (uid, owner_uid, name, location, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [newBizId, s.owner_id, nombre.trim(), request.location || null, now, now]
        );
      } catch(err) {
        console.error('Error creating business profile:', err);
      }

      await run(`DELETE FROM vuttik_business_requests WHERE id = ?`, [request_id]);
      res.json({ id: newBiz.id, nombre: newBiz.nombre, codigo: newBiz.codigo, fecha_creacion: newBiz.fecha_creacion });
    } catch (err) {
      console.error('Error claiming approved request:', err);
      res.status(500).json({ error: 'Error al procesar la solicitud aprobada.' });
    }
  });

  // Update business name and location
  app.patch('/api/businesses/:bizId', requireOwnerAuth, (req, res) => {
    const { bizId } = req.params;
    const { nombre, location, logo, description, working_hours, phone, market_sync_url, market_api_key } = req.body;
    const { links: social_links, errores: erroresSociales } = validarEnlacesSociales(req.body.social_links);
    if (erroresSociales.length) return res.status(400).json({ error: erroresSociales.join('. ') });
    const s = req.session as any;
    const db = getDB();
    const idx = db.businesses.findIndex((b: any) => b.id === bizId && b.owner_id === s.owner_id);
    if (idx === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });
    if (nombre) db.businesses[idx].nombre = nombre.trim();
    if (location !== undefined) db.businesses[idx].location = location;
    saveDB(db);
    res.json({ id: db.businesses[idx].id, nombre: db.businesses[idx].nombre, codigo: db.businesses[idx].codigo });
  });

  // Update a business
  app.put('/api/businesses/:bizId', requireOwnerAuth, async (req, res) => {
    const { bizId } = req.params;
    const { nombre, location, logo, description, working_hours, phone, market_sync_url, market_api_key } = req.body;
    const { links: social_links, errores: erroresSociales } = validarEnlacesSociales(req.body.social_links);
    if (erroresSociales.length) return res.status(400).json({ error: erroresSociales.join('. ') });
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre inválido.' });

    const s = req.session as any;
    const db = getDB();
    const idx = db.businesses.findIndex((b: any) => b.id === bizId && b.owner_id === s.owner_id);
    if (idx === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

    db.businesses[idx].nombre = nombre.trim();
    if (logo !== undefined) db.businesses[idx].logo = logo;
    if (description !== undefined) db.businesses[idx].description = description;
    if (working_hours !== undefined) db.businesses[idx].working_hours = working_hours;
    if (phone !== undefined) db.businesses[idx].phone = phone;
    if (social_links !== undefined) db.businesses[idx].social_links = social_links;

    if (location !== undefined) {
      db.businesses[idx].location = location;
      
      // Update SQLite database so Market sees the new location for the business and its existing products
      const address = typeof location === 'object' ? location.address : (location || 'Ubicación no especificada');
      const lat = typeof location === 'object' ? location.lat : null;
      const lng = typeof location === 'object' ? location.lng : null;
      const now = new Date().toISOString();
      
      try {
        await run(`UPDATE vuttik_business_profiles SET name = ?, location = ?, logo = ?, description = ?, working_hours = ?, phone = ?, social_links = ?, updated_at = ? WHERE uid = ?`, 
          [nombre.trim(), JSON.stringify(location), logo || null, description || null, working_hours || null, phone || null, social_links ? JSON.stringify(social_links) : null, now, bizId]);
          
        await run(`UPDATE vuttik_products SET location = ?, lat = ?, lng = ?, author_name = ?, store_name = ? WHERE author_id = ?`,
          [address, lat, lng, nombre.trim(), nombre.trim(), bizId]);
      } catch (err) {
        console.error('Error updating SQLite business/products:', err);
      }
    } else {
      // Just update name if location wasn't provided
      const now = new Date().toISOString();
      try {
        await run(`UPDATE vuttik_business_profiles SET name = ?, logo = ?, description = ?, working_hours = ?, phone = ?, social_links = ?, updated_at = ? WHERE uid = ?`, 
          [nombre.trim(), logo || null, description || null, working_hours || null, phone || null, social_links ? JSON.stringify(social_links) : null, now, bizId]);
        await run(`UPDATE vuttik_products SET author_name = ?, store_name = ? WHERE author_id = ?`,
          [nombre.trim(), nombre.trim(), bizId]);
      } catch (err) {
        console.error('Error updating SQLite business/products name:', err);
      }
    }
    
    saveDB(db);
    res.json(db.businesses[idx]);
  });

  // Delete business
  app.delete('/api/businesses/:bizId', requireOwnerAuth, async (req, res) => {
    const { bizId } = req.params;
    const s = req.session as any;
    const db = getDB();
    const idx = db.businesses.findIndex((b: any) => b.id === bizId && b.owner_id === s.owner_id);
    if (idx === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });
    
    db.businesses.splice(idx, 1);
    saveDB(db);

    // Remove products and business profile from vuttik market
    try {
      await run('DELETE FROM vuttik_products WHERE author_id = ?', [bizId]);
      await run('DELETE FROM vuttik_business_profiles WHERE uid = ?', [bizId]);
    } catch (err) {
      console.error('Error deleting business info from Vuttik SQLite:', err);
    }

    res.json({ success: true });
  });

  // =============================================
  // === EMPLOYEE MANAGEMENT ROUTES ===
  // =============================================

  // List employees of current business
  app.get('/api/employees', requireOwnerBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const safe = (biz.employees || []).map(({ password_hash, ...e }: any) => e);
    res.json(safe);
  });

  // Add employee
  app.post('/api/employees', requireOwnerBizAccess, async (req, res) => {
    const { nombre, username, password, rol, permisos } = req.body;
    if (!nombre || !username || !password) return res.status(400).json({ error: 'Nombre, usuario y contraseña son obligatorios.' });
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    if (!biz.employees) biz.employees = [];
    const dup = biz.employees.find((e: any) => e.username === username.trim());
    if (dup) return res.status(409).json({ error: 'Ya existe un empleado con ese nombre de usuario.' });
    const password_hash = await bcrypt.hash(password, 10);
    const newEmp = {
      id: 'emp-' + Date.now(),
      nombre: nombre.trim(),
      username: username.trim(),
      password_hash,
      rol: rol || 'cajero',
      estado: 'activo',
      fecha_creacion: new Date()
    };
    biz.employees.push(newEmp);
    saveDB(db);
    const { password_hash: _, ...safe } = newEmp;
    res.json(safe);
  });

  // Update employee
  app.put('/api/employees/:empId', requireOwnerBizAccess, async (req, res) => {
    const { empId } = req.params;
    const { nombre, username, password, rol, estado, permisos } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const idx = (biz.employees || []).findIndex((e: any) => e.id === empId);
    if (idx === -1) return res.status(404).json({ error: 'Empleado no encontrado.' });
    if (nombre) biz.employees[idx].nombre = nombre.trim();
    if (username) biz.employees[idx].username = username.trim();
    if (rol) biz.employees[idx].rol = rol;
    if (estado) biz.employees[idx].estado = estado;
      if (permisos !== undefined) biz.employees[idx].permisos = permisos;
    if (password && password.length >= 6) {
      biz.employees[idx].password_hash = await bcrypt.hash(password, 10);
    }
    saveDB(db);
    const { password_hash: _, ...safe } = biz.employees[idx];
    res.json(safe);
  });

  // Delete employee
  app.delete('/api/employees/:empId', requireOwnerBizAccess, (req, res) => {
    const { empId } = req.params;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    biz.employees = (biz.employees || []).filter((e: any) => e.id !== empId);
    saveDB(db);
    res.json({ success: true });
  });

  // =============================================
  // === BUSINESS DATA ROUTES (require biz access) ===
  // =============================================

  // Settings
  app.get('/api/settings', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    res.json(biz.settings || { allowed_location: null });
  });

  app.post('/api/settings/loyalty', requireOwnerBizAccess, (req, res) => {
    const { loyalty_config } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    
    biz.loyalty_config = loyalty_config;
    saveDB(db);
    res.json({ success: true, loyalty_config: biz.loyalty_config });
  });

  app.get('/api/settings/loyalty', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    res.json(biz.loyalty_config || { activa: false, tipo_regla: 'monto', meta: 1000, recompensa_credito: 100, mes_evaluacion: 'historico' });
  });

  app.post('/api/settings', requireOwnerBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    biz.settings = { ...(biz.settings || {}), ...req.body };
    saveDB(db);
    res.json(biz.settings);
  });

  app.post('/api/settings/log-location', requireBizAccess, (req, res) => {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'Latitud y longitud requeridas' });
    
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    
    if (!biz.settings) biz.settings = {};
    if (!biz.settings.login_locations) biz.settings.login_locations = [];
    
    biz.settings.login_locations.push({
      lat: Number(lat),
      lng: Number(lng),
      timestamp: new Date().toISOString(),
      usuario_id: s.owner_id || s.employee_id
    });
    
    const locations = biz.settings.login_locations;
    if (locations.length >= 1) {
      const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      let bestPoint = { lat: Number(lat), lng: Number(lng) };
      let maxNeighbors = 0;
      
      for (const p of locations) {
        let neighbors = 0;
        for (const other of locations) {
          if (getDistance(p.lat, p.lng, other.lat, other.lng) <= 50) {
            neighbors++;
          }
        }
        if (neighbors > maxNeighbors) {
          maxNeighbors = neighbors;
          bestPoint = { lat: p.lat, lng: p.lng };
        }
      }
      
      biz.settings.most_frequent_location = {
        lat: bestPoint.lat,
        lng: bestPoint.lng,
        count: maxNeighbors
      };
      
      if (!biz.settings.allowed_location) {
        biz.settings.allowed_location = {
          lat: bestPoint.lat,
          lng: bestPoint.lng,
          radius_meters: 200,
          address: "Ubicación sugerida automáticamente (la más concurrida)"
        };
      }
    }
    
    saveDB(db);
    res.json({ success: true, most_frequent: biz.settings.most_frequent_location });
  });

  // Users (employees list for compatibility)
  app.get('/api/users', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const safe = (biz.employees || []).map(({ password_hash, ...e }: any) => ({
      ...e,
      correo: `${e.username}@${biz.codigo.toLowerCase()}.local`
    }));
    res.json(safe);
  });
  // Products - Read directly from db.json which is the POS source of truth
  app.get('/api/products', requireBizAccess, (req, res) => {
    try {
      const s = req.session as any;
      const db = getDB();
      const biz = getBiz(db, s.business_id);
      res.json(biz.products || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products', requireBizAccess, async (req, res) => {
    const s = req.session as any;
    const { usuario_id, ...productData } = req.body;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const newProduct = { ...productData, id: Date.now().toString(), fecha_creacion: new Date(), fecha_actualizacion: new Date() };
    biz.products.push(newProduct);

    // Sync to Vuttik Market (Hibrid)
      const ownerName = biz.nombre || 'Negocio POS';
      const locationObj = (biz as any).location || biz.settings?.allowed_location;
      
      if (biz.settings && biz.settings.market_sync_url && biz.settings.market_api_key) {
        // Enviar por API externa
        try {
          await fetch(`${biz.settings.market_sync_url}/api/market-sync/product`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': biz.settings.market_api_key },
            body: JSON.stringify({ action: 'create', product: newProduct, bizId: biz.id, ownerName, locationObj })
          });
        } catch(e) { console.error('Error syncing remote:', e); }
      } else {
        // Escribir localmente a SQLite
        try {
          const sqliteProductId = 'pos-' + newProduct.id;
          const location = typeof locationObj === 'object' ? (locationObj as any).address : (locationObj || 'Ubicación no especificada');
          const lat = typeof locationObj === 'object' ? (locationObj as any).lat : null;
          const lng = typeof locationObj === 'object' ? (locationObj as any).lng : null;
          await run(`
            INSERT INTO vuttik_products 
            (id, title, price, author_id, author_name, location, lat, lng, store_name, is_independent, created_at, barcode, type_id, posted_as, stock) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            sqliteProductId, newProduct.nombre, Number(newProduct.precio_venta) || 0,
            biz.id, ownerName, location, lat, lng, ownerName, 1,
            new Date().toISOString(), newProduct.codigo_barras || '', 'sell', 'business', Number(newProduct.cantidad_disponible) || 0
          ]);
        } catch (err) {
          console.error('Error syncing POS product to Vuttik SQLite:', err);
        }
      }

    
    if (Number(newProduct.cantidad_disponible) > 0 && Number(newProduct.costo_compra) > 0) {
      const montoTotal = Number(newProduct.cantidad_disponible) * Number(newProduct.costo_compra);
      const fuente_pago = productData.fuente_pago || 'Caja';
      const uid = usuario_id || s.owner_id || s.employee_id;
      
      const newExpense = {
        id: 'exp-compra-' + Date.now(),
        descripcion: `Compra Inicial: ${newProduct.nombre} (${newProduct.cantidad_disponible} ${newProduct.unidad_venta || 'und'} a RD$${newProduct.costo_compra})`,
        monto: montoTotal,
        categoria: 'Compras de Mercancía',
        fecha: new Date(),
        usuario_id: uid,
        fuente_pago: fuente_pago,
        es_compra_mercancia: true,
        producto_id: newProduct.id,
        pagado_desde_caja: fuente_pago === 'Caja'
      };
      if (!biz.expenses) biz.expenses = [];
      biz.expenses.push(newExpense);

      if (!biz.inventory_movements) biz.inventory_movements = [];
      biz.inventory_movements.push({ 
        id: 'mov-' + Date.now() + Math.random(), 
        producto_id: newProduct.id, 
        tipo_movimiento: 'Compra', 
        cantidad: Number(newProduct.cantidad_disponible), 
        costo_unitario: Number(newProduct.costo_compra),
        monto_total: montoTotal,
        fuente_pago: fuente_pago,
        usuario_id: uid, 
        fecha: new Date(), 
        motivo: 'Inventario inicial de nuevo producto', 
        metadata: null 
      });

      if (fuente_pago === 'Caja') {
        const activeShift = (biz.shifts || []).find((sh: any) => sh.usuario_id === uid && sh.estado === 'abierto')
                         || (biz.shifts || []).find((sh: any) => sh.estado === 'abierto');
        if (activeShift) {
          const movement = { id: 'mov-caja-' + Date.now(), turno_id: activeShift.id, usuario_id: uid, tipo: 'salida', monto: montoTotal, motivo: `Compra Inicial: ${newProduct.nombre}`, fecha: new Date() };
          if (!biz.cash_movements) biz.cash_movements = [];
          biz.cash_movements.push(movement);
          activeShift.total_salidas += montoTotal;
          activeShift.monto_esperado = activeShift.monto_inicial + activeShift.total_ventas + activeShift.total_entradas - activeShift.total_salidas;
          activeShift.fecha_actualizacion = new Date();
        }
      } else if (fuente_pago === 'Banco') {
        biz.bank_balance = (biz.bank_balance || 0) - montoTotal;
      }
    }
    
    logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Creación de Producto', detalles: `Producto creado: ${newProduct.nombre}`, modulo: 'Inventario' });
    saveDB(db);
    res.json(newProduct);
  });

  app.put('/api/products/:id', requireBizAccess, async (req, res) => {
    const { id } = req.params;
    const { usuario_id, ...updateData } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const index = biz.products.findIndex((p: any) => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Producto no encontrado' });
    
    const oldProduct = { ...biz.products[index] };
    biz.products[index] = { ...biz.products[index], ...updateData, fecha_actualizacion: new Date() };
    
    const deltaCantidad = Number(updateData.cantidad_disponible || oldProduct.cantidad_disponible) - Number(oldProduct.cantidad_disponible);
    const oldMonto = Number(oldProduct.cantidad_disponible) * Number(oldProduct.costo_compra);
    const newMonto = Number(updateData.cantidad_disponible || oldProduct.cantidad_disponible) * Number(updateData.costo_compra || oldProduct.costo_compra);
    const deltaMonto = newMonto - oldMonto;

    let details = `Producto editado: ${biz.products[index].nombre}. Motivo: ${updateData.motivo_edicion || 'Ninguno'}. `;
    if (deltaCantidad !== 0) details += `Stock: ${oldProduct.cantidad_disponible} -> ${updateData.cantidad_disponible}. `;
    if (oldProduct.costo_compra !== updateData.costo_compra) details += `Costo: ${oldProduct.costo_compra} -> ${updateData.costo_compra}. `;
    if (oldProduct.precio_venta !== updateData.precio_venta) details += `Precio: ${oldProduct.precio_venta} -> ${updateData.precio_venta}. `;

    // If stock or cost changed, log a movement and financial adjustment
    if (deltaCantidad !== 0 || deltaMonto !== 0) {
      if (!biz.inventory_movements) biz.inventory_movements = [];
      biz.inventory_movements.push({ 
        id: 'mov-' + Date.now() + Math.random(), 
        producto_id: id, 
        tipo_movimiento: 'Ajuste', 
        cantidad: deltaCantidad !== 0 ? deltaCantidad : 0, 
        costo_unitario: Number(updateData.costo_compra || oldProduct.costo_compra),
        monto_total: deltaMonto,
        usuario_id: usuario_id || s.owner_id || s.employee_id, 
        fecha: new Date(), 
        motivo: `Ajuste por edición. Motivo: ${updateData.motivo_edicion || 'Corrección de error'}`
      });

      if (deltaMonto !== 0) {
        if (!biz.expenses) biz.expenses = [];
        biz.expenses.push({
          id: 'exp-adj-' + Date.now(),
          descripcion: `Ajuste de inventario: ${oldProduct.nombre} (${updateData.motivo_edicion || 'Corrección'})`,
          monto: deltaMonto,
          categoria: 'Compras de Mercancía',
          fecha: new Date(),
          usuario_id: usuario_id || s.owner_id || s.employee_id,
          fuente_pago: 'Ajuste',
          es_compra_mercancia: true,
          producto_id: id,
          pagado_desde_caja: false
        });
      }
    }

    logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Edición de Producto', detalles: details, modulo: 'Inventario' });
    saveDB(db);

    // Sync update to Vuttik SQLite (Hibrid)
      if (biz.settings && biz.settings.market_sync_url && biz.settings.market_api_key) {
        try {
          const locationObj = (biz as any).location || biz.settings?.allowed_location;
          await fetch(`${biz.settings.market_sync_url}/api/market-sync/product`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': biz.settings.market_api_key },
            body: JSON.stringify({ action: 'update', product: biz.products[index], bizId: biz.id, ownerName: biz.nombre, locationObj })
          });
        } catch(e) { console.error('Error syncing remote update:', e); }
      } else {
        try {
          const sqliteProductId = 'pos-' + id;
          const product = biz.products[index];
          const locationObj = (biz as any).location || biz.settings?.allowed_location;
          const location = typeof locationObj === 'object' ? (locationObj as any).address : (locationObj || 'Ubicación no especificada');
          const lat = typeof locationObj === 'object' ? (locationObj as any).lat : null;
          const lng = typeof locationObj === 'object' ? (locationObj as any).lng : null;
          await run(`
            UPDATE vuttik_products 
            SET title = ?, price = ?, barcode = ?, location = ?, lat = ?, lng = ?, author_id = ?
            WHERE id = ? AND author_id IN (?, ?)
          `, [
            product.nombre, Number(product.precio_venta) || 0, product.codigo_barras || '',
            location, lat, lng, biz.id, sqliteProductId, biz.id, biz.owner_id
          ]);
        } catch (err) {
          console.error('Error updating POS product in Vuttik SQLite:', err);
        }
      }

    res.json(biz.products[index]);
  });

  app.delete('/api/products/:id', requireOwnerBizAccess, async (req, res) => {
    const { id } = req.params;
    const { usuario_id, usuario_nombre } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const index = biz.products.findIndex((p: any) => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Producto no encontrado' });
    const product = biz.products[index];
    logActivity(biz, { usuario_id: usuario_id || s.owner_id, usuario_nombre: usuario_nombre || 'Dueño', accion: 'Eliminación de Producto', detalles: `Eliminado: ${product.nombre}`, modulo: 'Inventario' });
    biz.products.splice(index, 1);
    saveDB(db);

    // Sync delete to Vuttik SQLite (Hibrid)
      if (biz.settings && biz.settings.market_sync_url && biz.settings.market_api_key) {
        try {
          await fetch(`${biz.settings.market_sync_url}/api/market-sync/product`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': biz.settings.market_api_key },
            body: JSON.stringify({ action: 'delete', product: { id }, bizId: biz.id })
          });
        } catch(e) { console.error('Error syncing remote delete:', e); }
      } else {
        try {
          const sqliteProductId = 'pos-' + id;
          await run('DELETE FROM vuttik_products WHERE id = ? AND author_id = ?', [sqliteProductId, biz.owner_id]);
        } catch (err) {
          console.error('Error deleting POS product in Vuttik SQLite:', err);
        }
      }

    res.json({ success: true });
  });

  app.patch('/api/products/:id/stock', requireBizAccess, (req, res) => {
    const { id } = req.params;
    const { cantidad, tipo_movimiento, motivo, usuario_id } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const pIndex = biz.products.findIndex((p: any) => p.id === id);
    if (pIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });
    const product = biz.products[pIndex];
    product.cantidad_disponible += Number(cantidad);
    product.fecha_actualizacion = new Date();
    if (!biz.inventory_movements) biz.inventory_movements = [];
    biz.inventory_movements.push({ id: 'mov-' + Date.now() + Math.random(), producto_id: id, tipo_movimiento, cantidad: Number(cantidad), usuario_id, fecha: new Date(), motivo: motivo || 'Ajuste manual', metadata: req.body.metadata || null });
    logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Ajuste de Stock', detalles: `${product.nombre}: ${tipo_movimiento} de ${cantidad}. Motivo: ${motivo || 'Ajuste manual'}.`, modulo: 'Inventario' });
    saveDB(db);
    res.json(product);
  });
  app.post('/api/products/:id/restock', requireBizAccess, (req, res) => {
    const { id } = req.params;
    const { cantidad, costo_unitario, motivo, usuario_id, usuario_nombre, fuente_pago } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const pIndex = biz.products.findIndex((p: any) => p.id === id);
    if (pIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });
    
    const product = biz.products[pIndex];
    const montoTotal = Number(cantidad) * Number(costo_unitario);
    product.cantidad_disponible += Number(cantidad);
    product.costo_compra = Number(costo_unitario); // Update current cost to new restock cost
    product.fecha_actualizacion = new Date();
    
    // Register inventory movement
    if (!biz.inventory_movements) biz.inventory_movements = [];
    biz.inventory_movements.push({ 
      id: 'mov-' + Date.now() + Math.random(), 
      producto_id: id, 
      tipo_movimiento: 'Compra', 
      cantidad: Number(cantidad), 
      costo_unitario: Number(costo_unitario),
      monto_total: montoTotal,
      fuente_pago: fuente_pago || 'Caja',
      usuario_id: usuario_id || s.owner_id || s.employee_id, 
      fecha: new Date(), 
      motivo: motivo || 'Compra de mercancía', 
      metadata: req.body.metadata || null 
    });

    // Auto-register expense for this purchase
    const newExpense = {
      id: 'exp-compra-' + Date.now(),
      descripcion: `Compra: ${product.nombre} (${cantidad} ${product.unidad_venta || 'und'} × RD$${costo_unitario})`,
      monto: montoTotal,
      categoria: 'Compras de Mercancía',
      fecha: new Date(),
      usuario_id: usuario_id || s.owner_id || s.employee_id,
      fuente_pago: fuente_pago || 'Caja',
      es_compra_mercancia: true,
      producto_id: id,
      pagado_desde_caja: fuente_pago === 'Caja'
    };
    if (!biz.expenses) biz.expenses = [];
    biz.expenses.push(newExpense);

    // If paid from cash register, deduct from active shift
    if (fuente_pago === 'Caja') {
      const uid = usuario_id || s.owner_id || s.employee_id;
      const activeShift = (biz.shifts || []).find((sh: any) => sh.usuario_id === uid && sh.estado === 'abierto')
                       || (biz.shifts || []).find((sh: any) => sh.estado === 'abierto');
      if (activeShift) {
        const movement = { id: 'mov-caja-' + Date.now(), turno_id: activeShift.id, usuario_id: uid, tipo: 'salida', monto: montoTotal, motivo: `Compra: ${product.nombre}`, fecha: new Date() };
        if (!biz.cash_movements) biz.cash_movements = [];
        biz.cash_movements.push(movement);
        activeShift.total_salidas += montoTotal;
        activeShift.monto_esperado = activeShift.monto_inicial + activeShift.total_ventas + activeShift.total_entradas - activeShift.total_salidas;
        activeShift.fecha_actualizacion = new Date();
      }
    }
    
    logActivity(biz, { 
      usuario_id: usuario_id || s.owner_id || s.employee_id, 
      usuario_nombre: usuario_nombre || 'Sistema', 
      accion: 'Compra de Mercancía', 
      detalles: `${product.nombre}: ${cantidad} uds a RD$${costo_unitario} c/u = RD$${montoTotal}. Fuente: ${fuente_pago || 'Caja'}.`, 
      modulo: 'Inventario' 
    });
    
    saveDB(db);
    res.json(product);
  });

  app.get('/api/products/:id/history', requireBizAccess, (req, res) => {
    const { id } = req.params;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    
    const movements = (biz.inventory_movements || [])
      .filter((m: any) => m.producto_id === id)
      .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
    res.json(movements);
  });

  // Expenses
  app.get('/api/expenses', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const owner = (db.owners || db.users || []).find((u: any) => u.id === biz.propietario_id || u.id === biz.owner_id);
    const employees = biz.empleados || [];
    
    const expenses = (biz.expenses || []).map((exp: any) => {
      let usuario_nombre = exp.usuario_nombre;
      if (!usuario_nombre && exp.usuario_id) {
        if (exp.usuario_id === owner?.id) usuario_nombre = owner?.nombre;
        else {
          const emp = employees.find((e: any) => e.id === exp.usuario_id);
          if (emp) usuario_nombre = emp.nombre;
        }
      }
      return { ...exp, usuario_nombre: usuario_nombre || 'Desconocido' };
    });
    
    res.json(expenses);
  });

  app.post('/api/expenses', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const { monto, pagado_desde_caja, usuario_id, metadata, fecha: customFecha } = req.body;
    let expenseFecha = new Date();
    if (customFecha) {
      const parts = customFecha.split('-');
      if (parts.length === 3) { const d = new Date(); d.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])); expenseFecha = d; }
    }
    const newExpense = { ...req.body, id: 'exp-' + Date.now(), fecha: expenseFecha, metadata: metadata || null };
    if (!biz.expenses) biz.expenses = [];
    biz.expenses.push(newExpense);
    logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Registro de Gasto', detalles: `Gasto: ${newExpense.descripcion} - Monto: ${newExpense.monto}${pagado_desde_caja ? ' (Pagado desde caja)' : ''}`, modulo: 'Gastos' });
    if (pagado_desde_caja) {
      const activeShift = (biz.shifts || []).find((sh: any) => sh.usuario_id === usuario_id && sh.estado === 'abierto');
      if (activeShift) {
        const movement = { id: 'mov-' + Date.now(), turno_id: activeShift.id, usuario_id, tipo: 'salida', monto: Number(monto), motivo: `Gasto: ${newExpense.descripcion}`, fecha: new Date() };
        if (!biz.cash_movements) biz.cash_movements = [];
        biz.cash_movements.push(movement);
        activeShift.total_salidas += Number(monto);
        activeShift.monto_esperado -= Number(monto);
        activeShift.fecha_actualizacion = new Date();
        newExpense.turno_id = activeShift.id;
      }
    }
    saveDB(db);
    res.json(newExpense);
  });

  // Sales
  app.get('/api/sales', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const salesWithDetails = (biz.sales || []).map((sale: any) => {
      const emp = (biz.employees || []).find((e: any) => e.id === sale.usuario_id);
      const enrichedItems = (sale.items || []).map((item: any) => {
        const product = (biz.products || []).find((p: any) => p.id === item.producto_id);
        return { ...item, nombre: item.nombre || (product ? product.nombre : 'Producto Eliminado'), unidad_venta: item.unidad_venta || (product ? product.unidad_venta : 'Unidad') };
      });
      return { ...sale, usuario_nombre: emp ? emp.nombre : (sale.usuario_nombre || 'Desconocido'), items: enrichedItems };
    });
    res.json(salesWithDetails);
  });

  app.post('/api/sales', requireBizAccess, (req, res) => {
    const { sale, items } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);

    // SECURITY FIX: Prevent sales if the shift is from a previous day
    if (sale.turno_id) {
      const shift = (biz.shifts || []).find((sh: any) => sh.id === sale.turno_id);
      if (shift && shift.fecha_apertura) {
        const shiftDate = new Date(shift.fecha_apertura).toDateString();
        const serverDate = new Date().toDateString();
        if (shiftDate !== serverDate) {
          return res.status(400).json({ error: 'El turno activo pertenece a un día anterior. Por favor cierra la caja y abre una nueva.' });
        }
      }
    }

    // BIZ-001 FIX: Validate stock on the server before processing — prevents negative inventory
    // from direct API calls that bypass frontend validation
    for (const item of items) {
      const product = (biz.products || []).find((p: any) => p.id === item.producto_id);
      if (!product) {
        return res.status(400).json({ error: `Producto no encontrado: ${item.nombre || item.producto_id}` });
      }
      if (product.cantidad_disponible < item.cantidad) {
        return res.status(400).json({
          error: `Stock insuficiente para "${product.nombre}". Disponible: ${product.cantidad_disponible}, solicitado: ${item.cantidad}.`
        });
      }
    }

    // BIZ-004 FIX: Validate credit limit on the server BEFORE saving the sale
    if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
      if (!biz.clientes) biz.clientes = [];
      const creditCliente = biz.clientes.find((c: any) => c.id === sale.cliente_id);
      if (creditCliente && creditCliente.limite_credito > 0) {
        const newDebt = (creditCliente.deuda_actual || 0) + sale.total;
        if (newDebt > creditCliente.limite_credito) {
          return res.status(400).json({
            error: `Límite de crédito excedido para "${creditCliente.nombre}". Deuda actual: RD$${creditCliente.deuda_actual}, Límite: RD$${creditCliente.limite_credito}, Venta: RD$${sale.total}.`
          });
        }
      }
    }

    let costoTotal = 0;
    items.forEach((item: any) => {
      const pIndex = (biz.products || []).findIndex((p: any) => p.id === item.producto_id);
      if (pIndex !== -1) {
        biz.products[pIndex].cantidad_disponible -= item.cantidad;
        biz.products[pIndex].fecha_actualizacion = new Date();
        costoTotal += (biz.products[pIndex].costo_compra || 0) * item.cantidad;
      }
      if (!biz.inventory_movements) biz.inventory_movements = [];
      biz.inventory_movements.push({ id: 'mov-' + Date.now() + Math.random(), producto_id: item.producto_id, tipo_movimiento: 'Venta', cantidad: -item.cantidad, usuario_id: sale.usuario_id, fecha: new Date(), motivo: `Venta ${sale.codigo_recibo}` });
    });
    const newSale = { ...sale, id: 'sale-' + Date.now(), fecha: new Date(), costo_total: costoTotal, metadata: req.body.metadata || sale.metadata || null, items };

    // SEC-003 FIX: Generate NCF on the server with an atomic counter to ensure uniqueness and sequence
    if (!biz.ncf_counter) biz.ncf_counter = 1;
    if (sale.tipo_comprobante && sale.tipo_comprobante !== 'Sin Comprobante') {
      newSale.ncf = `B01${String(biz.ncf_counter).padStart(9, '0')}`;
      biz.ncf_counter++;
    }

    if (!biz.sales) biz.sales = [];
    biz.sales.push(newSale);

    // Increment client debt if fiao
    if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
      if (!biz.clientes) biz.clientes = [];
      const clIdx = biz.clientes.findIndex((c: any) => c.id === sale.cliente_id);
      if (clIdx !== -1) {
        biz.clientes[clIdx].deuda_actual += sale.total;
      }
    }
    const shiftIndex = (biz.shifts || []).findIndex((sh: any) => sh.id === sale.turno_id);
    if (shiftIndex !== -1) {
      const shift = biz.shifts[shiftIndex];
      shift.total_ventas += sale.total;
      if (sale.metodo_pago === 'Efectivo') { shift.total_efectivo += sale.total; shift.monto_esperado += sale.total; }
      else if (sale.metodo_pago === 'Tarjeta') shift.total_tarjeta += sale.total;
      else if (sale.metodo_pago === 'Transferencia') shift.total_transferencia += sale.total;
      else if (sale.metodo_pago === 'Mixto') { shift.total_mixto += sale.total; if (sale.payment_breakdown) { shift.total_efectivo += (sale.payment_breakdown.cash || 0); shift.total_tarjeta += (sale.payment_breakdown.card || 0); shift.total_transferencia += (sale.payment_breakdown.transfer || 0); shift.monto_esperado += (sale.payment_breakdown.cash || 0); } }
      shift.fecha_actualizacion = new Date();
    }
    logActivity(biz, { usuario_id: sale.usuario_id, usuario_nombre: sale.usuario_nombre || 'Empleado', accion: 'Venta Realizada', detalles: `Venta #${sale.codigo_recibo} por ${sale.total}. Método: ${sale.metodo_pago}`, modulo: 'Ventas' });
    // Process Commissions
    if (!biz.commissions) biz.commissions = [];
    for (const item of items) {
      const product = (biz.products || []).find((p: any) => p.id === item.producto_id);
      if (product && product.comision_activa && product.comision_porcentaje && product.comision_porcentaje > 0) {
        const commissionAmount = (item.cantidad * (item.precio || item.precio_unitario || 0)) * (product.comision_porcentaje / 100);
        if (commissionAmount > 0) {
          biz.commissions.push({
            id: uuidv4(),
            employee_id: sale.usuario_id,
            employee_nombre: sale.usuario_nombre || 'Empleado',
            sale_id: newSale.id,
            product_id: product.id,
            product_nombre: product.nombre,
            monto: commissionAmount,
            porcentaje: product.comision_porcentaje,
            fecha: new Date(),
            estado: 'pendiente'
          });
        }
      }
    }

    saveDB(db);
    res.json(newSale);
  });


  app.post('/api/sales/refund/:saleId', requireBizAccess, async (req, res) => {
    const { saleId } = req.params;
    const { password, motivo, usuario_nombre, usuario_id } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    // Validate using owner password — check db.owners first, then fall back to SQLite
    let valid = false;
    const owner = db.owners.find((o: any) => o.id === biz.owner_id);
    if (owner && owner.password_hash) {
      valid = await bcrypt.compare(password, owner.password_hash);
    } else {
      // Owner is stored in SQLite (new system)
      const sqliteOwner: any = await get('SELECT password_hash FROM vuttik_users WHERE uid = ?', [biz.owner_id]);
      if (sqliteOwner && sqliteOwner.password_hash) {
        valid = await bcrypt.compare(password, sqliteOwner.password_hash);
      }
    }
    if (!valid) return res.status(401).json({ error: 'La clave de seguridad ingresada es incorrecta.' });
    if (!motivo || motivo.trim().length === 0) return res.status(400).json({ error: 'El motivo del reembolso es obligatorio' });
    const saleIndex = (biz.sales || []).findIndex((sale: any) => sale.id === saleId);
    if (saleIndex === -1) return res.status(404).json({ error: 'Venta no encontrada' });
    const sale = biz.sales[saleIndex];
    if (sale.estado !== 'completada') return res.status(400).json({ error: `No se puede reembolsar una venta con estado: ${sale.estado}` });
    sale.estado = 'reembolsada'; sale.fecha_actualizacion = new Date(); sale.motivo_reembolso = motivo; sale.reembolsado_por = usuario_nombre || 'Dueño';
    
    // Deduct client debt if fiao
    if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
      if (!biz.clientes) biz.clientes = [];
      const clIdx = biz.clientes.findIndex((c: any) => c.id === sale.cliente_id);
      if (clIdx !== -1) {
        biz.clientes[clIdx].deuda_actual -= sale.total;
        if (biz.clientes[clIdx].deuda_actual < 0) biz.clientes[clIdx].deuda_actual = 0;
      }
    }
    
    logActivity(biz, { usuario_id: usuario_id || s.owner_id, usuario_nombre: usuario_nombre || 'Dueño', accion: 'Reembolso de Venta', detalles: `Venta #${sale.codigo_recibo} reembolsada. Monto: ${sale.total}. Motivo: ${motivo}`, modulo: 'Ventas' });
    enviarAlerta(db, biz, 'sale_refunded', {
      usuario: usuario_nombre || 'Dueño',
      monto: sale.total,
      filas: [['Recibo', '#' + sale.codigo_recibo], ['Motivo', motivo || 'No especificado']],
    });
    if (sale.items) { sale.items.forEach((item: any) => { const pIndex = (biz.products || []).findIndex((p: any) => p.id === item.producto_id); if (pIndex !== -1) { biz.products[pIndex].cantidad_disponible += item.cantidad; biz.products[pIndex].fecha_actualizacion = new Date(); } if (!biz.inventory_movements) biz.inventory_movements = []; biz.inventory_movements.push({ id: 'mov-' + Date.now() + Math.random(), producto_id: item.producto_id, tipo_movimiento: 'Reembolso', cantidad: item.cantidad, usuario_id: sale.usuario_id, fecha: new Date(), motivo: `Reembolso Venta ${sale.codigo_recibo}` }); }); }
    const shiftIndex = (biz.shifts || []).findIndex((sh: any) => sh.id === sale.turno_id);
    if (shiftIndex !== -1) { const shift = biz.shifts[shiftIndex]; shift.total_reembolsos += sale.total; shift.total_ventas -= sale.total; if (sale.metodo_pago === 'Efectivo') { shift.total_efectivo -= sale.total; shift.monto_esperado -= sale.total; } else if (sale.metodo_pago === 'Tarjeta') shift.total_tarjeta -= sale.total; else if (sale.metodo_pago === 'Transferencia') shift.total_transferencia -= sale.total; shift.fecha_actualizacion = new Date(); }
    saveDB(db);
    res.json(sale);
  });

  app.post('/api/sales/cancel/:saleId', requireBizAccess, (req, res) => {
    const { saleId } = req.params;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const saleIndex = (biz.sales || []).findIndex((sale: any) => sale.id === saleId);
    if (saleIndex === -1) return res.status(404).json({ error: 'Venta no encontrada' });
    const sale = biz.sales[saleIndex];
    if (sale.estado !== 'completada') return res.status(400).json({ error: 'No se puede cancelar esta venta' });
    sale.estado = 'cancelada'; sale.fecha_actualizacion = new Date();
    
    // Deduct client debt if fiao
    if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
      if (!biz.clientes) biz.clientes = [];
      const clIdx = biz.clientes.findIndex((c: any) => c.id === sale.cliente_id);
      if (clIdx !== -1) {
        biz.clientes[clIdx].deuda_actual -= sale.total;
        if (biz.clientes[clIdx].deuda_actual < 0) biz.clientes[clIdx].deuda_actual = 0;
      }
    }
    
    logActivity(biz, { usuario_id: s.owner_id || s.employee_id, usuario_nombre: 'Administrador', accion: 'Cancelación de Venta', detalles: `Venta #${sale.codigo_recibo} cancelada. Monto: ${sale.total}`, modulo: 'Ventas' });
    enviarAlerta(db, biz, 'sale_cancelled', {
      usuario: 'Administrador',
      monto: sale.total,
      filas: [['Recibo', '#' + sale.codigo_recibo]],
    });
    if (sale.items) { sale.items.forEach((item: any) => { const pIndex = (biz.products || []).findIndex((p: any) => p.id === item.producto_id); if (pIndex !== -1) { biz.products[pIndex].cantidad_disponible += item.cantidad; biz.products[pIndex].fecha_actualizacion = new Date(); } }); }
    const shiftIndex = (biz.shifts || []).findIndex((sh: any) => sh.id === sale.turno_id);
    if (shiftIndex !== -1) { const shift = biz.shifts[shiftIndex]; shift.total_cancelaciones += sale.total; shift.total_ventas -= sale.total; if (sale.metodo_pago === 'Efectivo') { shift.total_efectivo -= sale.total; shift.monto_esperado -= sale.total; } else if (sale.metodo_pago === 'Tarjeta') shift.total_tarjeta -= sale.total; else if (sale.metodo_pago === 'Transferencia') shift.total_transferencia -= sale.total; shift.fecha_actualizacion = new Date(); }
    saveDB(db);
    res.json(sale);
  });

  // Shifts
  app.get('/api/shifts/active/:userId', requireBizAccess, (req, res) => {
    const { userId } = req.params;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const shift = (biz.shifts || []).find((sh: any) => sh.usuario_id === userId && sh.estado === 'abierto');
    res.json(shift || null);
  });

  app.get('/api/shifts', requireBizAccess, (req, res) => {
    const { userId, date, status } = req.query;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    let shifts = biz.shifts || [];
    if (userId) shifts = shifts.filter((sh: any) => sh.usuario_id === userId);
    if (status) shifts = shifts.filter((sh: any) => sh.estado === status);
    if (date) { const d = new Date(date as string).toDateString(); shifts = shifts.filter((sh: any) => new Date(sh.fecha_apertura).toDateString() === d); }
    res.json(shifts.sort((a: any, b: any) => new Date(b.fecha_apertura).getTime() - new Date(a.fecha_apertura).getTime()));
  });

  app.post('/api/shifts/open', requireBizAccess, (req, res) => {
    const { userId, userName, montoInicial } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    if (!biz.shifts) biz.shifts = [];
    const existing = biz.shifts.find((sh: any) => sh.usuario_id === userId && sh.estado === 'abierto');
    if (existing) return res.status(400).json({ error: 'Ya tienes un turno abierto' });
    
    // Check for opening discrepancy
    const lastShift = biz.shifts.length > 0 ? biz.shifts[biz.shifts.length - 1] : null;
    let diferencia_apertura = 0;
    if (lastShift && lastShift.monto_contado !== undefined) {
      diferencia_apertura = Number(montoInicial) - lastShift.monto_contado;
    }

    const newShift = { id: 'shift-' + Date.now(), usuario_id: userId, usuario_nombre: userName, fecha_apertura: new Date(), monto_inicial: Number(montoInicial), total_ventas: 0, total_efectivo: 0, total_tarjeta: 0, total_transferencia: 0, total_mixto: 0, total_reembolsos: 0, total_cancelaciones: 0, total_entradas: 0, total_salidas: 0, monto_esperado: Number(montoInicial), diferencia_apertura, estado: 'abierto', fecha_creacion: new Date(), fecha_actualizacion: new Date() };
    biz.shifts.push(newShift);

    logActivity(biz, {
      usuario_id: userId,
      usuario_nombre: userName || 'Sistema',
      accion: 'Apertura de Caja',
      detalles: `El usuario ${userName || 'Sistema'} abrió la caja con un monto inicial de RD$${Number(montoInicial)}${diferencia_apertura !== 0 ? `. Diferencia con cierre anterior: RD$${diferencia_apertura}` : ''}.`,
      modulo: 'Caja'
    });

    // If it is the first time a shift is opened, register it as Inversión Externa
    if (!lastShift && Number(montoInicial) > 0) {
      if (!biz.transfers) biz.transfers = [];
      biz.transfers.push({
        id: 'trans-' + Date.now(),
        origen: 'Inversion Externa',
        destino: 'Caja',
        monto: Number(montoInicial),
        fecha: new Date().toISOString(),
        usuario_id: userId,
        usuario_nombre: userName,
        notas: 'Capital Inicial de Primera Caja',
        fecha_creacion: new Date()
      });
      if (!biz.activity_log) biz.activity_log = [];
      biz.activity_log.unshift({
        id: `act-${Date.now()}-inv`,
        usuario_nombre: userName,
        accion: 'Inversión Externa',
        detalle: `Se registró Inversión Externa por RD$${Number(montoInicial)} como apertura de la primera caja.`,
        fecha: new Date().toISOString(),
        modulo: 'Finanzas'
      });
    }

    saveDB(db);
    res.json(newShift);
  });

  app.post('/api/shifts/close/:shiftId', requireBizAccess, (req, res) => {
    const { shiftId } = req.params;
    const { montoContado, desglose, motivoDiferencia } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const index = (biz.shifts || []).findIndex((sh: any) => sh.id === shiftId);
    if (index === -1) return res.status(404).json({ error: 'Turno no encontrado' });
    const shift = biz.shifts[index];
    
    const diff = Number(montoContado) - shift.monto_esperado;
    shift.estado = diff === 0 ? 'cerrado' : 'con_diferencia'; 
    shift.fecha_cierre = new Date(); 
    shift.monto_contado = Number(montoContado); 
    shift.desglose_denominaciones = desglose; 
    shift.diferencia = diff; 
    shift.motivo_diferencia = motivoDiferencia; 
    shift.fecha_actualizacion = new Date();

    // Aviso al dueño: es el evento que más directamente señala dinero que falta.
    if (diff !== 0) {
      enviarAlerta(db, biz, 'cash_discrepancy', {
        usuario: shift.usuario_nombre || 'Sistema',
        monto: diff,
        detalle: diff < 0
          ? 'Falta dinero en caja respecto a lo esperado.'
          : 'Hay más dinero en caja del esperado.',
        filas: [
          ['Esperado en caja', 'RD$' + Number(shift.monto_esperado || 0).toFixed(2)],
          ['Contado', 'RD$' + Number(montoContado).toFixed(2)],
          ['Motivo indicado', motivoDiferencia || 'No especificado'],
        ],
      });
    }
    
    const usuarioNombre = shift.usuario_nombre || 'Sistema';
    logActivity(biz, {
      usuario_id: shift.usuario_id || s.owner_id || s.employee_id,
      usuario_nombre: usuarioNombre,
      accion: 'Cierre de Caja',
      detalles: `El usuario ${usuarioNombre} cerró la caja. Efectivo contado: RD$${Number(montoContado)}. Diferencia: RD$${diff}${motivoDiferencia ? ` (${motivoDiferencia})` : ''}.`,
      modulo: 'Caja'
    });

    if (diff !== 0) {
      if (!biz.notifications) biz.notifications = [];
      const notifId = uuidv4();
      biz.notifications.push({
        id: notifId,
        type: 'descuadre',
        title: 'Descuadre en Cierre de Caja',
        message: `El cajero ${usuarioNombre} cerró su turno con un descuadre de RD$${diff}. ${motivoDiferencia ? `Motivo: ${motivoDiferencia}` : ''}`,
        isRead: false,
        timestamp: new Date().toISOString(),
        metadata: { shiftId: shift.id }
      });
    }

    saveDB(db);
    res.json(shift);
  });

  // =============================================
  // === NOTIFICATIONS ROUTES ===
  // =============================================
  app.get('/api/notifications', requireAdminBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    res.json(biz.notifications || []);
  });

  app.post('/api/notifications/read', requireAdminBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const { notificationId } = req.body;
    
    if (!biz.notifications) biz.notifications = [];
    
    if (notificationId) {
      const notif = biz.notifications.find((n: any) => n.id === notificationId);
      if (notif) notif.isRead = true;
    } else {
      biz.notifications.forEach((n: any) => n.isRead = true);
    }
    
    saveDB(db);
    res.json({ success: true });
  });

  app.patch('/api/shifts/:shiftId/status', requireOwnerBizAccess, (req, res) => {
    const { shiftId } = req.params;
    const { status, notaAdmin, reviewedBy } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const index = (biz.shifts || []).findIndex((sh: any) => sh.id === shiftId);
    if (index === -1) return res.status(404).json({ error: 'Turno no encontrado' });
    biz.shifts[index] = { ...biz.shifts[index], estado: status, nota_admin: notaAdmin, revisado_por: reviewedBy, fecha_revision: new Date(), fecha_actualizacion: new Date() };
    saveDB(db);
    res.json(biz.shifts[index]);
  });

  // Cash Movements
  app.get('/api/cash-movements/:shiftId', requireBizAccess, (req, res) => {
    const { shiftId } = req.params;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    res.json((biz.cash_movements || []).filter((m: any) => m.turno_id === shiftId));
  });

  app.post('/api/cash-movements', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const movement = { ...req.body, id: 'mov-' + Date.now(), fecha: new Date() };
    if (!biz.cash_movements) biz.cash_movements = [];
    biz.cash_movements.push(movement);
    const shiftIndex = (biz.shifts || []).findIndex((sh: any) => sh.id === movement.turno_id);
    if (shiftIndex !== -1) {
      const shift = biz.shifts[shiftIndex];
      if (movement.tipo === 'entrada') { shift.total_entradas += Number(movement.monto); shift.monto_esperado += Number(movement.monto); }
      else { shift.total_salidas += Number(movement.monto); shift.monto_esperado -= Number(movement.monto); }
      shift.fecha_actualizacion = new Date();
    }
    saveDB(db);
    res.json(movement);
  });
  // Transfers
  app.post('/api/transfers', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const { origen, destino, monto, usuario_id } = req.body;
    
    if (!biz.transfers) biz.transfers = [];
    
    const newTransfer = {
      id: 'trans-' + Date.now(),
      origen,
      destino,
      monto: Number(monto),
      fecha: new Date().toISOString(),
      usuario_id
    };
    
    biz.transfers.push(newTransfer);

    // If Caja is involved, update the active shift's cash movements
    const activeShift = biz.shifts?.find((sh: any) => sh.estado === 'abierto');
    if (activeShift) {
      if (origen === 'Caja') {
        const movement = {
          id: 'mov-' + Date.now(),
          turno_id: activeShift.id,
          usuario_id,
          tipo: 'salida',
          monto: Number(monto),
          motivo: `Transferencia a ${destino}`,
          fecha: new Date().toISOString()
        };
        if (!biz.cash_movements) biz.cash_movements = [];
        biz.cash_movements.push(movement);
        activeShift.total_salidas += Number(monto);
        activeShift.monto_esperado -= Number(monto);
      } else if (destino === 'Caja') {
        const movement = {
          id: 'mov-' + Date.now(),
          turno_id: activeShift.id,
          usuario_id,
          tipo: 'entrada',
          monto: Number(monto),
          motivo: `Transferencia desde ${origen}`,
          fecha: new Date().toISOString()
        };
        if (!biz.cash_movements) biz.cash_movements = [];
        biz.cash_movements.push(movement);
        activeShift.total_entradas += Number(monto);
        activeShift.monto_esperado += Number(monto);
      }
    }

    // Record in Expenses for visibility
    const expenseRecord = {
      id: 'exp-trans-' + Date.now(),
      descripcion: `Transferencia: ${origen} a ${destino}`,
      monto: Number(monto),
      categoria: 'Transferencia',
      fecha: new Date().toISOString(),
      usuario_id,
      pagado_desde_caja: origen === 'Caja',
      es_transferencia: true
    };
    if (!biz.expenses) biz.expenses = [];
    biz.expenses.push(expenseRecord);

    // Record in Activity Log
    const user = biz.users?.find((u: any) => u.id === usuario_id) || biz.clientes?.find((c: any) => c.id === usuario_id);
    const userName = user ? user.nombre : 'Cajero / Dueño';
    enviarAlerta(db, biz, 'funds_withdrawn', {
      usuario: userName,
      monto: Number(monto),
      detalle: `Transferencia de fondos de ${origen} a ${destino}.`,
    });
    if (!biz.activity_log) biz.activity_log = [];
    biz.activity_log.unshift({
      id: `act-${Date.now()}`,
      usuario_nombre: userName,
      accion: 'Transferencia de Fondos',
      detalle: `Se transfirió RD$${monto} de ${origen} a ${destino}`,
      fecha: new Date().toISOString()
    });

    saveDB(db);
    res.json(newTransfer);
  });

  // Stats
  app.get('/api/stats', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthParam = req.query.month !== undefined ? parseInt(req.query.month as string) : -1;
    const yearParam = req.query.year !== undefined ? parseInt(req.query.year as string) : -1;
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;
    let filteredSales = biz.sales || [];
    let filteredExpenses = biz.expenses || [];
    let rawInvestments = (biz.inventory_movements || []).filter((m: any) => m.tipo_movimiento === 'entrada' || m.tipo_movimiento === 'Compra' || m.tipo_movimiento?.toLowerCase() === 'entrada');
    if (startDateParam || endDateParam) {
      const start = startDateParam ? new Date(startDateParam) : null; if (start) start.setHours(0, 0, 0, 0);
      const end = endDateParam ? new Date(endDateParam) : null; if (end) end.setHours(23, 59, 59, 999);
      if (start && end) { filteredSales = filteredSales.filter((s: any) => { const d = new Date(s.fecha); return d >= start && d <= end; }); filteredExpenses = filteredExpenses.filter((e: any) => { const d = new Date(e.fecha); return d >= start! && d <= end; }); rawInvestments = rawInvestments.filter((m: any) => { const d = new Date(m.fecha); return d >= start! && d <= end!; }); }
    } else if (monthParam !== -1 && yearParam !== -1) {
      filteredSales = filteredSales.filter((s: any) => { const d = new Date(s.fecha); return d.getMonth() === monthParam && d.getFullYear() === yearParam; });
      filteredExpenses = filteredExpenses.filter((e: any) => { const d = new Date(e.fecha); return d.getMonth() === monthParam && d.getFullYear() === yearParam; });
      rawInvestments = rawInvestments.filter((m: any) => { const d = new Date(m.fecha); return d.getMonth() === monthParam && d.getFullYear() === yearParam; });
    }
    const todaySales = (biz.sales || []).filter((s: any) => new Date(s.fecha) >= today);
    const lowStock = (biz.products || []).filter((p: any) => p.cantidad_disponible <= p.stock_minimo);
    // Separate fiao sales from real (collected) sales
    const fiadoSales = filteredSales.filter((s: any) => s.metodo_pago === 'A Crédito (Fiao)' && s.estado !== 'cancelada' && s.estado !== 'reembolsada');
    const cobradoSales = filteredSales.filter((s: any) => s.metodo_pago !== 'A Crédito (Fiao)' && s.estado !== 'cancelada' && s.estado !== 'reembolsada');
    const cancelledSales = filteredSales.filter((s: any) => s.estado === 'cancelada' || s.estado === 'reembolsada');

    const totalVendido = cobradoSales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
    const totalFiado = fiadoSales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
    const totalCostoVentas = cobradoSales.reduce((acc: number, s: any) => acc + (s.costo_total || 0), 0);
    const totalGastos = filteredExpenses.reduce((acc: number, e: any) => acc + (e.monto || 0), 0);
    
    // Separate operational expenses from mercancía purchases and transfers
    const isCompraMercancia = (e: any) => e.es_compra_mercancia || (e.categoria && typeof e.categoria === 'string' && e.categoria.toUpperCase() === 'COMPRAS DE MERCANCÍA');
    const gastosOperativos = filteredExpenses.filter((e: any) => !isCompraMercancia(e) && !e.es_transferencia && e.categoria !== 'TRANSFERENCIA');
    const comprasMercancia = filteredExpenses.filter(isCompraMercancia);
    const totalGastosOperativos = gastosOperativos.reduce((acc: number, e: any) => acc + (e.monto || 0), 0);
    const totalComprasMercancia = comprasMercancia.reduce((acc: number, e: any) => acc + (e.monto || 0), 0);

    // Financial source tracking (ALL TIME, not filtered by date)
    const allExpenses = biz.expenses || [];
    const allTransfers = biz.transfers || [];
    
    // Ido al banco: Dinero enviado de Caja a Banco + Ventas al Banco - Compras/Gastos desde Banco - Transferencias desde Banco
    const bancoEntradasItems = allTransfers.filter((t: any) => t.destino === 'Banco');
    const bancoEntradas = bancoEntradasItems.reduce((acc: number, t: any) => acc + t.monto, 0);
    
    const bancoSalidasTransItems = allTransfers.filter((t: any) => t.origen === 'Banco');
    const bancoSalidasTrans = bancoSalidasTransItems.reduce((acc: number, t: any) => acc + t.monto, 0);
    
    const bancoSalidasGastosItems = allExpenses.filter((e: any) => e.fuente_pago === 'Banco' && !e.es_transferencia);
    const bancoSalidasGastos = bancoSalidasGastosItems.reduce((acc: number, e: any) => acc + (e.monto || 0), 0);
    
    const allSales = biz.sales || [];
    const ventasBancoItems = allSales.filter((s: any) => (s.metodo_pago === 'Tarjeta' || s.metodo_pago === 'Transferencia') && s.estado !== 'cancelada' && s.estado !== 'reembolsada');
    const ventasBanco = ventasBancoItems.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
    
    const totalIdoBanco = bancoEntradas + ventasBanco - bancoSalidasTrans - bancoSalidasGastos;
    
    // Inversión externa: Dinero del bolsillo del dueño 
    const transferenciasDesdeInversionItems = allTransfers.filter((t: any) => t.origen === 'Inversion Externa');
    const transferenciasDesdeInversion = transferenciasDesdeInversionItems.reduce((acc: number, t: any) => acc + t.monto, 0);
    
    const transferenciasHaciaInversionItems = allTransfers.filter((t: any) => t.destino === 'Inversion Externa');
    const transferenciasHaciaInversion = transferenciasHaciaInversionItems.reduce((acc: number, t: any) => acc + t.monto, 0);
    
    const comprasInversionItems = allExpenses.filter((e: any) => e.fuente_pago === 'Inversion Externa' && !e.es_transferencia);
    const comprasInversion = comprasInversionItems.reduce((acc: number, e: any) => acc + (e.monto || 0), 0);
    
    const totalInversionExterna = (transferenciasDesdeInversion - transferenciasHaciaInversion) + comprasInversion;

    // Estimado en Caja: Tiempo real (Monto esperado del turno activo, o del último turno si no hay activo)
    const activeShift = (biz.shifts || []).find((s: any) => s.estado === 'abierto');
    let dineroEstimadoCaja = 0;
    if (activeShift) {
      dineroEstimadoCaja = activeShift.monto_esperado || 0;
    } else {
      const lastShift = (biz.shifts || []).length > 0 ? biz.shifts[biz.shifts.length - 1] : null;
      dineroEstimadoCaja = lastShift ? (lastShift.monto_esperado || 0) : 0;
    }
    
    // Keep this for other uses if needed
    const allCompras = allExpenses.filter((e: any) => e.es_compra_mercancia);
    const totalCompradosDeCaja = allCompras.filter((e: any) => e.fuente_pago === 'Caja').reduce((acc: number, e: any) => acc + (e.monto || 0), 0);

    const totalVentasEfectivo = allSales.filter((s: any) => s.metodo_pago === 'Efectivo' && s.estado !== 'cancelada' && s.estado !== 'reembolsada').reduce((acc: number, s: any) => acc + (s.total || 0), 0);

    // Build fiao history with client info and dates
    const fiadoHistory = fiadoSales.map((s: any) => {
      const cliente = (biz.clientes || []).find((c: any) => c.id === s.cliente_id);
      return {
        id: s.id,
        fecha: s.fecha,
        cliente_nombre: s.cliente_nombre || cliente?.nombre || 'Cliente desconocido',
        cliente_id: s.cliente_id,
        total: s.total,
        codigo_recibo: s.codigo_recibo,
        items: s.items || []
      };
    }).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Total outstanding fiao from all clients (regardless of date filter)
    const totalFiadoPendienteGlobal = (biz.clientes || []).reduce((acc: number, c: any) => acc + (c.deuda_actual || 0), 0);
    const filteredInvestments = rawInvestments.map((m: any) => { const product = (biz.products || []).find((p: any) => p.id === m.producto_id); return { ...m, producto_nombre: product?.nombre || 'Producto Desconocido', monto: m.cantidad * (product?.costo_compra || 0) }; });
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) { 
      const date = new Date(); date.setDate(date.getDate() - i); date.setHours(0, 0, 0, 0); 
      const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1); 
      const daySales = (biz.sales || []).filter((s: any) => { const d = new Date(s.fecha); return d >= date && d < nextDay; }); 
      const dayExpenses = (biz.expenses || []).filter((e: any) => { const d = new Date(e.fecha); return d >= date && d < nextDay; });
      const dayTotalVendido = daySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0); 
      const dayTotalCosto = daySales.reduce((acc: number, s: any) => acc + (s.costo_total || 0), 0); 
      const dayTotalGastos = dayExpenses.reduce((acc: number, e: any) => acc + (e.monto || 0), 0);
      weeklyData.push({ 
        day: date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''), 
        ventas: dayTotalVendido, 
        ganancia: dayTotalVendido - dayTotalCosto - dayTotalGastos 
      }); 
    }
    res.json({ 
      todaySales: todaySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0), 
      totalSalesCount: todaySales.length, 
      lowStock: lowStock.length, 
      weeklyData, 
      details: { 
        sales: filteredSales.map((s: any) => ({ id: s.id, fecha: s.fecha, cliente: s.cliente_nombre || 'General', total: s.total, ganancia: s.total - (s.costo_total || 0), metodo_pago: s.metodo_pago })), 
        expenses: filteredExpenses, 
        investments: filteredInvestments,
        todaySalesData: todaySales.map((s: any) => ({ id: s.id, fecha: s.fecha, cliente: s.cliente_nombre || 'General', total: s.total, metodo_pago: s.metodo_pago })),
        lowStockData: lowStock.map((p: any) => ({ id: p.id, nombre: p.nombre, cantidad: p.cantidad_disponible, minimo: p.stock_minimo }))
      }, 
      profitStats: { 
        totalVendido, 
        totalCostoVentas, 
        totalGastos, 
        totalGastosOperativos,
        totalComprasMercancia,
        gananciaBruta: totalVendido - totalComprasMercancia, 
        gananciaNeta: totalVendido - totalComprasMercancia - totalGastosOperativos
      }, 
      financieroStats: {
        dineroEstimadoCaja,
        totalIdoBanco,
        totalInversionExterna,
        totalCompradosDeCaja,
        totalVentasEfectivo,
        bancoDetails: {
          bancoEntradas,
          bancoEntradasItems,
          ventasBanco,
          ventasBancoItems,
          bancoSalidasTrans,
          bancoSalidasTransItems,
          bancoSalidasGastos,
          bancoSalidasGastosItems
        },
        inversionDetails: {
          transferenciasDesdeInversion,
          transferenciasDesdeInversionItems,
          transferenciasHaciaInversion,
          transferenciasHaciaInversionItems,
          comprasInversion,
          comprasInversionItems
        }
      },
      fiadoStats: { totalFiado, count: fiadoSales.length, history: fiadoHistory, totalPendienteGlobal: totalFiadoPendienteGlobal } 
    });
  });

  // Inventory Movements
  app.get('/api/inventory/movements', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    res.json((biz.inventory_movements || []).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
  });

  // Activity Log
  /**
   * Registro de actividad.
   *
   * El dueño y los supervisores ven el negocio entero; un cajero ve solo sus
   * propias entradas. La interfaz ya lo restringía, pero la API no, así que un
   * empleado podía consultarla directamente y ver la actividad de sus compañeros
   * y del dueño.
   */
  app.get('/api/activity-log', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const registro = (biz.activity_log || [])
      .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    if (s.owner_id) return res.json(registro);

    const emp = (biz.employees || []).find((e: any) => e.id === s.employee_id);
    if (emp?.rol === 'supervisor') return res.json(registro);

    return res.json(registro.filter((r: any) => r.usuario_id === s.employee_id));
  });

  app.post('/api/activity-log', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    // La autoría sale SIEMPRE de la sesión. Antes se tomaba usuario_id y
    // usuario_nombre del cuerpo, así que un empleado podía escribir entradas
    // atribuidas a otra persona o al dueño, justo en el registro que existe
    // para poder auditarle.
    const { accion, detalles, modulo } = req.body;

    let autorId = s.owner_id;
    let autorNombre = 'Dueño';
    if (s.employee_id) {
      const emp = (biz.employees || []).find((e: any) => e.id === s.employee_id);
      autorId = s.employee_id;
      autorNombre = emp?.nombre || 'Empleado';
    }

    logActivity(biz, {
      usuario_id: autorId,
      usuario_nombre: autorNombre,
      accion: typeof accion === 'string' ? accion.slice(0, 120) : 'Acción General',
      detalles: typeof detalles === 'string' ? detalles.slice(0, 500) : '',
      modulo: typeof modulo === 'string' ? modulo.slice(0, 60) : 'General'
    });
    saveDB(db);
    res.json({ success: true });
  });

  /**
   * Ajustes de alertas. Solo el dueño: es quien las recibe y no tendría sentido
   * que un empleado pudiera desactivar los avisos sobre su propia actividad.
   */
  app.get('/api/alerts/settings', requireOwnerBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    res.json({
      alerts: { ...DEFAULT_ALERT_SETTINGS, ...(biz.settings?.alerts || {}) },
      alertEmail: biz.settings?.alert_email || null,
      minAmount: biz.settings?.alert_min_amount ?? 100,
    });
  });

  app.post('/api/alerts/settings', requireOwnerBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const { alerts, alertEmail, minAmount } = req.body;

    if (!biz.settings) biz.settings = {};

    if (alerts && typeof alerts === 'object') {
      const limpio: Record<string, boolean> = {};
      for (const clave of Object.keys(DEFAULT_ALERT_SETTINGS)) {
        if (clave in alerts) limpio[clave] = !!alerts[clave];
      }
      biz.settings.alerts = { ...DEFAULT_ALERT_SETTINGS, ...limpio };
    }

    if (alertEmail !== undefined) {
      const correo = String(alertEmail || '').trim();
      if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return res.status(400).json({ error: 'Correo inválido' });
      }
      biz.settings.alert_email = correo || null;
    }

    if (minAmount !== undefined) {
      const n = Number(minAmount);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: 'El importe mínimo debe ser un número positivo' });
      }
      biz.settings.alert_min_amount = n;
    }

    saveDB(db);
    res.json({ success: true });
  });

  /** Envía una alerta de prueba para que el dueño confirme que le llega. */
  app.post('/api/alerts/test', requireOwnerBizAccess, async (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    // Se salta el filtro de importe mínimo forzando el tipo y un monto alto.
    await enviarAlerta(db, biz, 'cash_discrepancy', {
      usuario: 'Prueba',
      monto: 9999,
      detalle: 'Esto es una alerta de prueba. Si la recibes, los avisos funcionan.',
    });
    res.json({ success: true, message: 'Alerta de prueba enviada al correo del dueño.' });
  });

  // Approval requests
  app.get('/api/approval-requests', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    res.json((biz.approval_requests || []).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
  });

  app.get('/api/approval-requests/status/:userId', requireBizAccess, (req, res) => {
    const { userId } = req.params;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const userReqs = (biz.approval_requests || []).filter((r: any) => r.usuario_id === userId).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    res.json(userReqs[0] || null);
  });

  app.post('/api/approval-requests', requireBizAccess, (req, res) => {
    const { usuario_id, usuario_nombre, lat, lng, address } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    if (!biz.approval_requests) biz.approval_requests = [];
    const existingIndex = biz.approval_requests.findIndex((r: any) => r.usuario_id === usuario_id && r.estado === 'pendiente');
    const requestData = { id: existingIndex >= 0 ? biz.approval_requests[existingIndex].id : 'aprv-' + Date.now(), usuario_id, usuario_nombre, lat: Number(lat), lng: Number(lng), address: address || `Lat: ${lat}, Lng: ${lng}`, fecha: new Date(), estado: 'pendiente' };
    if (existingIndex >= 0) biz.approval_requests[existingIndex] = requestData;
    else biz.approval_requests.push(requestData);
    logActivity(biz, { usuario_id, usuario_nombre, accion: 'Solicitud de Ubicación', detalles: `El empleado ${usuario_nombre} solicitó aprobación remota desde: ${requestData.address}`, modulo: 'Seguridad' });
    saveDB(db);
    res.json(requestData);
  });

  app.post('/api/approval-requests/:id/action', requireOwnerBizAccess, (req, res) => {
    const { id } = req.params;
    const { action, guardarEnListaBlanca, adminId, adminNombre } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const rIndex = (biz.approval_requests || []).findIndex((r: any) => r.id === id);
    if (rIndex === -1) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const request = biz.approval_requests[rIndex];
    request.estado = action === 'aprobar' ? 'aprobado' : 'rechazado'; request.fecha_actualizacion = new Date();
    if (action === 'aprobar' && guardarEnListaBlanca) { if (!biz.settings) biz.settings = {}; if (!biz.settings.whitelisted_locations) biz.settings.whitelisted_locations = []; biz.settings.whitelisted_locations.push({ id: 'wl-' + Date.now(), lat: request.lat, lng: request.lng, address: request.address, radius_meters: 200, fecha_creacion: new Date() }); }
    logActivity(biz, { usuario_id: adminId || s.owner_id, usuario_nombre: adminNombre || 'Dueño', accion: action === 'aprobar' ? 'Aprobar Ubicación' : 'Rechazar Ubicación', detalles: `El dueño ${action === 'aprobar' ? 'aprobó' : 'rechazó'} el login remoto para ${request.usuario_nombre}.`, modulo: 'Seguridad' });
    saveDB(db);
    res.json(request);
  });

  // === CLIENTS & CREDITS ENDPOINTS ===
  app.get('/api/clientes', requireBizAccess, (req, res) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    res.json(biz.clientes || []);
  });


// Fidelidad: Calcula el límite de crédito dinámico
function calculateDynamicCredit(cliente: any, biz: any) {
  let limite = cliente.limite_credito || 0;
  if (!biz.loyalty_config || !biz.loyalty_config.activa) return limite;

  const conf = biz.loyalty_config;
  let ventasFiltradas = (biz.sales || []).filter((s: any) => s.cliente_id === cliente.id && s.estado !== 'cancelada' && s.estado !== 'reembolsada');

  if (conf.mes_evaluacion !== 'historico') {
    if (conf.mes_evaluacion.includes('|')) {
      const [start, end] = conf.mes_evaluacion.split('|');
      ventasFiltradas = ventasFiltradas.filter((s: any) => {
        const d = s.fecha.slice(0, 10);
        return d >= start && d <= end;
      });
    } else {
      ventasFiltradas = ventasFiltradas.filter((s: any) => {
        const d = new Date(s.fecha);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const str = y + '-' + (m < 10 ? '0' : '') + m;
        return str === conf.mes_evaluacion;
      });
    }
  }

  if (conf.tipo_regla === 'monto') {
    const totalGastado = ventasFiltradas.reduce((sum: number, s: any) => sum + s.total, 0);
    const recompensas = Math.floor(totalGastado / (conf.meta || 1));
    limite += recompensas * (conf.recompensa_credito || 0);
  } else if (conf.tipo_regla === 'visitas') {
    const totalVisitas = ventasFiltradas.length;
    const recompensas = Math.floor(totalVisitas / (conf.meta || 1));
    limite += recompensas * (conf.recompensa_credito || 0);
  }

  return limite;
}

  app.post('/api/clientes', requireBizAccess, (req, res) => {
    try {
      const { nombre, telefono, limite_credito } = req.body;
      const s = req.session as any;
      const db = getDB();
      const biz = getBiz(db, s.business_id);
      
      if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });
      
      const newCliente = {
        id: 'cli-' + Date.now(),
        nombre,
        telefono: telefono || '',
        limite_credito: Number(limite_credito) || 0,
        deuda_actual: 0,
        estado: 'activo',
        fecha_creacion: new Date().toISOString()
      };
      
      if (!biz.clientes) biz.clientes = [];
      biz.clientes.push(newCliente);
      logActivity(biz, { usuario_id: s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Creación de Cliente', detalles: `Cliente de crédito creado: ${nombre} (Límite: RD$${limite_credito})`, modulo: 'Clientes' });
      saveDB(db);
      return res.json(newCliente);
    } catch (error) {
      console.error('Error creating client:', error);
      return res.status(500).json({ error: 'Error interno al crear el cliente.' });
    }
  });

  app.put('/api/clientes/:id', requireBizAccess, (req, res) => {
    const { id } = req.params;
    const { nombre, telefono, limite_credito, estado } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    
    const cIdx = (biz.clientes || []).findIndex((c: any) => c.id === id);
    if (cIdx === -1) return res.status(404).json({ error: 'Cliente no encontrado.' });
    
    const cliente = biz.clientes[cIdx];
    if (nombre !== undefined) cliente.nombre = nombre;
    if (telefono !== undefined) cliente.telefono = telefono;
    if (limite_credito !== undefined) cliente.limite_credito = Number(limite_credito) || 0;
    if (estado !== undefined) cliente.estado = estado;
    
    logActivity(biz, { usuario_id: s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Edición de Cliente', detalles: `Cliente ${cliente.nombre} actualizado.`, modulo: 'Clientes' });
    saveDB(db);
    res.json(cliente);
  });

  app.post('/api/clientes/:id/pay', requireBizAccess, (req, res) => {
    const { id } = req.params;
    const { monto, motivo, usuario_id, usuario_nombre } = req.body;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    
    const cIdx = (biz.clientes || []).findIndex((c: any) => c.id === id);
    if (cIdx === -1) return res.status(404).json({ error: 'Cliente no encontrado.' });
    if (!monto || Number(monto) <= 0) return res.status(400).json({ error: 'El monto del abono debe ser mayor a cero.' });
    
    const cliente = biz.clientes[cIdx];
    const abono = Number(monto);
    cliente.deuda_actual -= abono;
    if (cliente.deuda_actual < 0) cliente.deuda_actual = 0; // Prevent negative balance
    
    const newPago = {
      id: 'pay-' + Date.now(),
      cliente_id: id,
      monto: abono,
      motivo: motivo || 'Abono a cuenta',
      usuario_id: usuario_id || s.owner_id || s.employee_id,
      usuario_nombre: usuario_nombre || 'Sistema',
      fecha: new Date().toISOString()
    };
    
    if (!biz.pagos_clientes) biz.pagos_clientes = [];
    biz.pagos_clientes.push(newPago);
    
    // Also log cash movement if paid in cash
    const activeShift = (biz.shifts || []).find((sh: any) => sh.id === req.body.turno_id);
    if (activeShift) {
      if (!biz.cash_movements) biz.cash_movements = [];
      biz.cash_movements.push({
        id: 'mov-' + Date.now() + Math.random(),
        turno_id: activeShift.id,
        usuario_id: usuario_id || s.owner_id || s.employee_id,
        tipo: 'entrada',
        monto: abono,
        motivo: `Abono de Cliente: ${cliente.nombre}`,
        fecha: new Date()
      });
      activeShift.total_entradas += abono;
      activeShift.total_efectivo += abono;
      activeShift.monto_esperado += abono;
      activeShift.fecha_actualizacion = new Date();
    }
    
    logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: usuario_nombre || 'Sistema', accion: 'Abono de Deuda', detalles: `Cliente ${cliente.nombre} abonó RD$${abono}. Motivo: ${newPago.motivo}`, modulo: 'Clientes' });
    saveDB(db);
    res.json({ cliente, pago: newPago });
  });

  app.get('/api/clientes/:id/history', requireBizAccess, (req, res) => {
    const { id } = req.params;
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    
    const cliente = (biz.clientes || []).find((c: any) => c.id === id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
    
    // Get all sales for this client
    const sales = (biz.sales || []).filter((sale: any) => sale.cliente_id === id).map((sale: any) => ({
      ...sale,
      tipo: 'venta'
    }));
    
    // Get all payments for this client
    const payments = (biz.pagos_clientes || []).filter((pay: any) => pay.cliente_id === id).map((pay: any) => ({
      ...pay,
      tipo: 'pago',
      fecha: pay.fecha // standardise date
    }));
    
    // Merge and sort by date descending
    const history = [...sales, ...payments].sort((a, b) => new Date(b.fecha || b.fecha_creacion).getTime() - new Date(a.fecha || a.fecha_creacion).getTime());
    res.json({ cliente, history });
  });

  // === DATABASE BACKUP ENDPOINT ===
  // SEC-001 FIX: Backup restricted to owner only — employees cannot download db.json
  app.get('/api/backup/download', requireBizAccess, (req, res) => {
    const s = req.session as any;
    // Employees (employee_id set, owner_id not set) are denied
    if (s.employee_id && !s.owner_id) {
      return res.status(403).json({ error: 'No autorizado. Solo el administrador del negocio puede descargar respaldos.' });
    }
    res.download(DB_FILE, 'vuttik_backup.json');
  });

  // === VITE MIDDLEWARE OR STATIC FILES ===
  
  app.get('/api/debug-auth', requireBizAccess, (req: any, res: any) => {
    const s = req.session as any;
    res.json({
        owner_id: s.owner_id,
        employee_id: s.employee_id,
        role: s.role,
        user_id: s.user_id,
        business_id: s.business_id,
        uid: s.uid
    });
});
app.get('/api/commissions', requireBizAccess, (req: any, res: any) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const userId = s.employee_id || s.owner_id;

    if (!biz.commissions) biz.commissions = [];
    let userCommissions = biz.commissions;
    
    if (s.role !== 'admin' && s.owner_id !== userId) {
        userCommissions = biz.commissions.filter((c: any) => c.employee_id === userId);
    } else {
        // Admin or owner can see their own commissions for testing, or all commissions if needed
        // The frontend currently assumes it's viewing "Mis Comisiones", so we filter by their own ID.
        userCommissions = biz.commissions.filter((c: any) => c.employee_id === userId); 
    }
    res.json(userCommissions);
  });

  app.post('/api/commissions/withdraw', requireBizAccess, (req: any, res: any) => {
    const s = req.session as any;
    const db = getDB();
    const biz = getBiz(db, s.business_id);
    const userId = s.employee_id || s.owner_id;

    if (!biz.commissions) biz.commissions = [];
    const pendingCommissions = biz.commissions.filter((c: any) => c.employee_id === userId && c.estado === 'pendiente');
    
    if (pendingCommissions.length === 0) {
        return res.status(400).json({ error: 'No hay comisiones pendientes para retirar.' });
    }

    const totalToWithdraw = pendingCommissions.reduce((sum: number, c: any) => sum + c.monto, 0);

    const activeShift = (biz.shifts || []).find((sh: any) => sh.estado === 'abierto' && sh.usuario_id === userId);
    
    if (!activeShift) {
        return res.status(400).json({ error: 'Debes tener un turno abierto para poder retirar tus ganancias de comisiones.' });
    }

    const newExpense = {
        id: uuidv4(),
        turno_id: activeShift.id,
        concepto: 'Retiro de comisiones generadas por ventas',
        monto: totalToWithdraw,
        categoria: 'Comisiones',
        fecha: new Date(),
        usuario_id: userId,
        usuario_nombre: pendingCommissions[0].employee_nombre || 'Empleado'
    };

    if (!biz.expenses) biz.expenses = [];
    biz.expenses.push(newExpense);

    activeShift.total_gastos += totalToWithdraw;
    activeShift.monto_esperado -= totalToWithdraw;
    activeShift.fecha_actualizacion = new Date();

    pendingCommissions.forEach((c: any) => c.estado = 'retirada');

    logActivity(biz, { usuario_id: userId, usuario_nombre: newExpense.usuario_nombre, accion: 'Retiro de Comisiones', detalles: `Retiro por ${totalToWithdraw} desde caja.`, modulo: 'Caja' });
    enviarAlerta(db, biz, 'funds_withdrawn', {
      usuario: newExpense.usuario_nombre,
      monto: totalToWithdraw,
      detalle: 'Se retiró efectivo de la caja.',
    });
    saveDB(db);

    res.json({ success: true, withdrawnAmount: totalToWithdraw });
  });

// === GLOBAL ERROR HANDLER — must be BEFORE static/vite middleware ===
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) return next(err);
    if (err?.message === 'Negocio no encontrado') {
      return res.status(401).json({ error: 'Negocio no encontrado o sesión inválida.' });
    }
    res.status(500).json({ error: err?.message || 'Error interno del servidor.' });
  });

  if (process.env.NODE_ENV === 'production') {
    // En producción (Electron), servir la carpeta dist compilada
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // En desarrollo, usar Vite
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  // === SYNC ENGINE (BACKGROUND) ===
  const SYNC_SERVER_URL = process.env.SYNC_SERVER_URL || null;
  setInterval(async () => {
    if (!SYNC_SERVER_URL) return; // No cloud server configured
    try {
      const db = getDB();
      // Example Sync Logic: Find pending sales
      // let pendingSales = [];
      // db.businesses.forEach(biz => {
      //   if (biz.sales) pendingSales.push(...biz.sales.filter(s => s.sync_status === 'pending'));
      // });
      // if (pendingSales.length > 0) {
      //   // fetch(SYNC_SERVER_URL + '/api/sync/push', { method: 'POST', body: JSON.stringify(pendingSales) })
      //   // If successful, mark as 'synced' and saveDB(db);
      // }
    } catch (e) {
      console.error("Error in background sync process:", e);
    }
  }, 10000);
  // === CLEANUP OLD SALES ===
  // Delete sales older than 3 months for non-registered customers
  const cleanupOldSales = () => {
    try {
      const db = getDB();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      let changesMade = false;

      if (db.businesses) {
        db.businesses.forEach((biz: any) => {
          if (biz.sales && Array.isArray(biz.sales)) {
            const originalLength = biz.sales.length;
            biz.sales = biz.sales.filter((sale: any) => {
              // Keep sale if client is registered
              if (sale.cliente_id) return true;
              
              // If unregistered, check date
              if (sale.fecha) {
                const saleDate = new Date(sale.fecha);
                if (saleDate < threeMonthsAgo) return false;
              }
              return true;
            });
            if (biz.sales.length !== originalLength) {
              changesMade = true;
            }
          }
        });
      }
      
      if (changesMade) {
        console.log('[Cleanup] Deleted sales older than 3 months for unregistered clients.');
        saveDB(db);
      }
    } catch (e) {
      console.error('Error in cleanupOldSales process:', e);
    }
  };

  setTimeout(cleanupOldSales, 5000);
  setInterval(cleanupOldSales, 24 * 60 * 60 * 1000);

  
  

  return app;
}
export const initPosApp = startServer;
