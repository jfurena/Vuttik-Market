import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import { initDB, run, all, get } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import { authRouter, authenticateToken } from './auth.js';

const app = express();
const port = process.env.PORT || 3005;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://vuttik.com',
  'https://www.vuttik.com',
  'https://pos.vuttik.com'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // allow images to be served cross-origin
}));

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
}));

// Global request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

import { posApp, getDB, saveDB, emptyBusiness, generateCode } from './pos-backend.js';

app.use('/api/auth', authRouter);
app.use('/pos', posApp);
// --- Helpers ---
async function logAction(userId: string, action: string, targetId: string, targetType: string, metadata: any = {}) {
  try {
    const timestamp = new Date().toISOString();
    await run(
      'INSERT INTO vuttik_metrics (user_id, action, target_id, target_type, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, action, targetId, targetType, JSON.stringify(metadata), timestamp]
    );
    console.log(`[AuditLog] User ${userId} performed ${action} on ${targetType}:${targetId}`);
  } catch (err) {
    console.error('Failed to log action:', err);
  }
}

// Start function
async function startServer() {
  try {
    console.log('--- Starting Vuttik Backend ---');
    
    // 1. Initialize Database
    await initDB();
    console.log('Database initialized successfully.');

    // 2. Start Express
    app.listen(port, () => {
      console.log(`SQL Backend running at http://localhost:${port}`);
      console.log('--- Server Ready ---');
      // Run the expiration check every hour (3600000 ms)
      setInterval(checkExpiredProposals, 3600000);
      // Run it once on startup
      checkExpiredProposals();
    });
  } catch (err) {
    console.error('FATAL ERROR DURING STARTUP:', err);
    process.exit(1);
  }
}

startServer();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Metrics & Analytics Routes ---

// Log a metric/action from the frontend
app.post('/api/metrics', async (req, res) => {
  const { userId, action, targetId, targetType, metadata } = req.body;
  if (!userId || !action) return res.status(400).json({ error: 'Missing userId or action' });
  try {
    await logAction(userId, action, targetId || 'none', targetType || 'none', metadata || {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user specific analytics (Real data)
app.get('/api/users/:uid/analytics', async (req, res) => {
  const { uid } = req.params;
  try {
    // Total profile views (actions where this user was the target)
    const viewsRow = await get(`
      SELECT COUNT(*) as count FROM vuttik_metrics 
      WHERE target_id = ? AND action = 'VIEW_PROFILE'
    `, [uid]);
    
    // Engagement: actions performed BY this user
    const engagement = await all(`
      SELECT action, COUNT(*) as count 
      FROM vuttik_metrics 
      WHERE user_id = ? 
      GROUP BY action
    `, [uid]);

    // Trend: views on this profile in the last 7 days
    const trend = await all(`
      SELECT date(timestamp) as date, COUNT(*) as count 
      FROM vuttik_metrics 
      WHERE target_id = ? AND action = 'VIEW_PROFILE' AND timestamp > date('now', '-7 days')
      GROUP BY date(timestamp)
    `, [uid]);

    res.json({
      totalViews: (viewsRow as any)?.count || 0,
      engagement,
      trend
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Global Audit Log
app.get('/api/admin/audit-log', authenticateToken, async (req, res) => {
  const NOISE_EVENTS = [
    'click', 'view', 'search', 'VIEW_PROFILE', 'contact',
    'page_view', 'navigation', 'scroll', 'hover', 'SEND_MESSAGE'
  ];
  const placeholders = NOISE_EVENTS.map(() => '?').join(', ');
  try {
    const logs = await all(`
      SELECT m.*, u.display_name as user_name, u.photo_url as user_avatar
      FROM vuttik_metrics m
      LEFT JOIN vuttik_users u ON m.user_id = u.uid
      WHERE m.action NOT IN (${placeholders})
        AND m.action NOT LIKE 'click%'
        AND m.action NOT LIKE 'view%'
        AND m.action NOT LIKE 'scroll%'
      ORDER BY m.timestamp DESC
      LIMIT 300
    `, [...NOISE_EVENTS]);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- User Routes ---
app.get('/api/users/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.json([]);
  }
  try {
    let rows;
    if (q.startsWith('@')) {
      const username = q.substring(1);
      rows = await all(
        `SELECT uid, email, display_name, username, photo_url, role FROM vuttik_users 
         WHERE username = ? COLLATE NOCASE OR username LIKE ? LIMIT 20`,
        [username, `%${username}%`]
      );
    } else {
      rows = await all(
        `SELECT uid, email, display_name, username, photo_url, role FROM vuttik_users 
         WHERE display_name LIKE ? OR email LIKE ? OR username LIKE ? LIMIT 20`,
        [`%${q}%`, `%${q}%`, `%${q}%`]
      );
    }
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/check-username', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username missing' });
  try {
    const user = await get('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE', [username]);
    res.json({ available: !user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/suggest-username', async (req, res) => {
  const { name } = req.query;
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Name missing' });
  
  try {
    const baseName = name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, ''); // Remove spaces and special chars

    if (!baseName) return res.json({ suggestion: 'usuario' + Math.floor(Math.random() * 10000) });

    let suggestion = baseName;
    let counter = 1;
    let isAvailable = false;

    let attempts = 0;
    while (!isAvailable && attempts < 20) {
      const user = await get('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE', [suggestion]);
      if (!user) {
        isAvailable = true;
      } else {
        suggestion = `${baseName}${counter}`;
        counter++;
      }
      attempts++;
    }
    if (attempts >= 20) suggestion = baseName + Date.now();

    res.json({ suggestion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:uid/username', async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || username.length < 3) {
    return res.status(400).json({ error: 'Nombre de usuario inválido.' });
  }

  try {
    const user = await get('SELECT username_changes FROM vuttik_users WHERE uid = ?', [req.params.uid]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check availability
    const existing = await get('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE AND uid != ?', [username, req.params.uid]);
    if (existing) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
    }

    const now = Date.now();
    const fifteenDaysAgo = now - (15 * 24 * 60 * 60 * 1000);
    
    let changes: number[] = [];
    try {
      changes = JSON.parse(user.username_changes || '[]');
    } catch (e) {
      changes = [];
    }

    // Filter changes within the last 15 days
    changes = changes.filter(timestamp => timestamp > fifteenDaysAgo);

    if (changes.length >= 2) {
      const oldestChange = Math.min(...changes);
      const availableDate = new Date(oldestChange + (15 * 24 * 60 * 60 * 1000));
      return res.status(400).json({ 
        error: `Has alcanzado el límite de 2 cambios cada 15 días. Podrás volver a cambiarlo el ${availableDate.toLocaleDateString()}.` 
      });
    }

    changes.push(now);

    await run('UPDATE vuttik_users SET username = ?, username_changes = ? WHERE uid = ?', [username, JSON.stringify(changes), req.params.uid]);
    res.json({ success: true, username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/users/:uid', async (req, res) => {
  try {
    const user = await get('SELECT * FROM vuttik_users WHERE uid = ?', [req.params.uid]);
    if (user) {
      if (user.is_banned) {
        return res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' });
      }
      let displayName = user.display_name;
      let photoURL = user.photo_url;
      let bio = user.bio;
      let location = user.location;
      
      if (user.active_profile_mode === 'business' && req.query.raw !== 'true') {
        const business = await get('SELECT name, description, location as biz_location, logo FROM vuttik_business_profiles WHERE uid = ?', [user.uid]);
        if (business) {
          displayName = business.name || displayName;
          photoURL = business.logo || photoURL;
          bio = business.description || bio;
          location = business.biz_location || location;
        }
      }

      const followerCountRow = await get('SELECT COUNT(*) as count FROM vuttik_follows WHERE following_id = ?', [user.uid]);
      const followingCountRow = await get('SELECT COUNT(*) as count FROM vuttik_follows WHERE follower_id = ?', [user.uid]);
      const followerCount = followerCountRow?.count || 0;
      const followingCount = followingCountRow?.count || 0;

      const mappedUser = {
        ...user,
        displayName,
        photoURL,
        bio,
        location,
        planId: user.plan_id,
        createdAt: user.created_at,
        isBanned: !!user.is_banned,
        onboardingCompleted: !!user.onboarding_completed,
        activeProfileMode: user.active_profile_mode || 'personal',
        age: user.age,
        gender: user.gender,
        country: user.country,
        username: user.username,
        followerCount,
        followingCount
      };
      res.json(mappedUser);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/by-username/:username', async (req, res) => {
  try {
    const user = await get('SELECT * FROM vuttik_users WHERE username = ? COLLATE NOCASE', [req.params.username]);
    if (user) {
      if (user.is_banned) {
        return res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' });
      }
      let displayName = user.display_name;
      let photoURL = user.photo_url;
      let bio = user.bio;
      let location = user.location;
      
      if (user.active_profile_mode === 'business' && req.query.raw !== 'true') {
        const business = await get('SELECT name, description, location as biz_location, logo FROM vuttik_business_profiles WHERE uid = ?', [user.uid]);
        if (business) {
          displayName = business.name || displayName;
          photoURL = business.logo || photoURL;
          bio = business.description || bio;
          location = business.biz_location || location;
        }
      }

      const mappedUser = {
        ...user,
        displayName,
        photoURL,
        bio,
        location,
        planId: user.plan_id,
        createdAt: user.created_at,
        isBanned: !!user.is_banned,
        onboardingCompleted: !!user.onboarding_completed,
        activeProfileMode: user.active_profile_mode || 'personal',
        age: user.age,
        gender: user.gender,
        country: user.country,
        username: user.username
      };
      res.json(mappedUser);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const rows = await all('SELECT uid as id, email, display_name as displayName, photo_url as photoURL, role, plan_id as plan_id, is_banned as isBanned, created_at as createdAt FROM vuttik_users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/me/mode', async (req, res) => {
  const { mode, uid } = req.body;
  if (!uid || !mode) return res.status(400).json({ error: 'Missing uid or mode' });
  try {
    await run('UPDATE vuttik_users SET active_profile_mode = ? WHERE uid = ?', [mode, uid]);
    await logAction(uid, 'SWITCH_MODE', uid, 'user', { mode });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/business-profiles/:uid', async (req, res) => {
  try {
    const business = await get('SELECT * FROM vuttik_business_profiles WHERE uid = ?', [req.params.uid]);
    if (business) {
      res.json({
        ...business,
        socialLinks: JSON.parse(business.social_links || '{}'),
        workingHours: business.working_hours
      });
    } else {
      res.status(404).json({ error: 'Business profile not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/business-profiles/:uid', async (req, res) => {
  const { name, description, location, phone, workingHours, socialLinks, logo, requesterUid } = req.body;
  const uid = req.params.uid;

  // Check if editing an existing business
  const existingBiz = await get('SELECT owner_uid FROM vuttik_business_profiles WHERE uid = ?', [uid]);

  if (existingBiz) {
    if (existingBiz.owner_uid !== requesterUid) {
      const member = await get('SELECT role FROM vuttik_business_members WHERE business_uid = ? AND member_uid = ?', [uid, requesterUid]);
      if (!member || member.role !== 'owner') {
        return res.status(403).json({ error: 'Solo el dueño puede editar este negocio' });
      }
    }
  }

  try {
    const now = new Date().toISOString();
    const ownerUid = existingBiz ? existingBiz.owner_uid : requesterUid;
    await run(
      `INSERT INTO vuttik_business_profiles 
       (uid, owner_uid, name, description, location, phone, working_hours, social_links, logo, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, (SELECT logo FROM vuttik_business_profiles WHERE uid = ?)), ?, COALESCE((SELECT created_at FROM vuttik_business_profiles WHERE uid = ?), ?))
       ON CONFLICT(uid) DO UPDATE SET 
       name=excluded.name, description=excluded.description, location=excluded.location, phone=excluded.phone, 
       working_hours=excluded.working_hours, social_links=excluded.social_links, logo=excluded.logo, updated_at=excluded.updated_at`,
      [
        uid, 
        ownerUid,
        name || '', 
        description || '', 
        location || '', 
        phone || '', 
        workingHours || '', 
        JSON.stringify(socialLinks || {}),
        logo || null,
        uid,
        now,
        uid,
        now
      ]
    );

    // Sync to POS database (db.json)
    try {
      const db = getDB();
      const existingPosBizIndex = db.businesses.findIndex((b: any) => b.id === uid);
      if (existingPosBizIndex >= 0) {
        db.businesses[existingPosBizIndex].nombre = name || '';
      } else {
        const existingCodes = db.businesses.map((b: any) => b.codigo);
        const codigo = generateCode(name || 'NEG', existingCodes);
        const newBiz = emptyBusiness(uid, name || 'Nuevo Negocio', codigo, ownerUid);
        db.businesses.push(newBiz);
      }
      saveDB(db);
    } catch (err) {
      console.error('Error syncing business to POS cache:', err);
    }

    await logAction(requesterUid || uid, 'UPDATE_BUSINESS_PROFILE', uid, 'business_profile', { name });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- Business Members Routes ---
app.get('/api/business-members/:businessId', async (req, res) => {
  try {
    const rows = await all(
      `SELECT m.*, u.email, u.display_name, u.photo_url 
       FROM vuttik_business_members m
       JOIN vuttik_users u ON m.member_uid = u.uid
       WHERE m.business_uid = ?`,
      [req.params.businessId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/business-members/invite', async (req, res) => {
  const { businessUid, email } = req.body;
  if (!businessUid || !email) return res.status(400).json({ error: 'Missing params' });
  try {
    const targetUser = await get('SELECT uid FROM vuttik_users WHERE email = ?', [email]);
    if (!targetUser) return res.status(404).json({ error: 'User not found with that email' });
    
    // Check if already invited
    const existing = await get('SELECT id FROM vuttik_business_members WHERE business_uid = ? AND member_uid = ?', [businessUid, targetUser.uid]);
    if (existing) return res.status(400).json({ error: 'User already invited or member' });

    const id = uuidv4();
    await run(
      'INSERT INTO vuttik_business_members (id, business_uid, member_uid, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, businessUid, targetUser.uid, 'user', 'pending', new Date().toISOString()]
    );

    // Get business info for notification
    const businessInfo = await get('SELECT name FROM vuttik_business_profiles WHERE uid = ?', [businessUid]);
    const bName = businessInfo?.name || 'Un negocio';

    const notifId = uuidv4();
    await run(
      'INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [notifId, targetUser.uid, 'Invitación a Negocio', `Has sido invitado a formar parte del equipo de ${bName}.`, 0, new Date().toISOString()]
    );

    res.json({ success: true });
    await logAction(businessUid, 'INVITE_MEMBER', targetUser.uid, 'business_member', { email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/business-members/:id/accept', async (req, res) => {
  try {
    const member = await get('SELECT * FROM vuttik_business_members WHERE id = ?', [req.params.id]);
    await run('UPDATE vuttik_business_members SET status = "accepted" WHERE id = ?', [req.params.id]);
    if (member) await logAction(member.member_uid, 'ACCEPT_INVITE', member.business_uid, 'business_member', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/business-members/:id/role', async (req, res) => {
  try {
    const { role, changedBy } = req.body;
    if (!['owner', 'admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const member = await get('SELECT * FROM vuttik_business_members WHERE id = ?', [req.params.id]);
    await run('UPDATE vuttik_business_members SET role = ? WHERE id = ?', [role, req.params.id]);
    if (member) await logAction(changedBy || 'admin', 'CHANGE_MEMBER_ROLE', member.member_uid, 'business_member', { newRole: role, businessUid: member.business_uid });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/business-members/:id', async (req, res) => {
  try {
    const member = await get('SELECT * FROM vuttik_business_members WHERE id = ?', [req.params.id]);
    await run('DELETE FROM vuttik_business_members WHERE id = ?', [req.params.id]);
    if (member) await logAction(member.member_uid, 'LEAVE_OR_REMOVED_BUSINESS', member.business_uid, 'business_member', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:uid/business-invites', async (req, res) => {
  try {
    const rows = await all(
      `SELECT m.*, b.name as business_name, b.logo as business_logo 
       FROM vuttik_business_members m
       JOIN vuttik_business_profiles b ON m.business_uid = b.uid
       WHERE m.member_uid = ? AND m.status = "pending"`,
      [req.params.uid]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:uid/businesses', async (req, res) => {
  try {
    // A user can have businesses they own OR businesses they are members of.
    const rows = await all(
      `SELECT DISTINCT b.uid, b.name, b.logo, b.phone, u.email
       FROM vuttik_business_profiles b
       LEFT JOIN vuttik_users u ON b.owner_uid = u.uid
       LEFT JOIN vuttik_business_members m ON b.uid = m.business_uid
       WHERE b.owner_uid = ? OR (m.member_uid = ? AND m.status = "accepted")`,
      [req.params.uid, req.params.uid]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { uid, email, displayName, photoURL, role, planId, onboardingCompleted, age, gender, country, language, username } = req.body;
  try {
    if (username) {
      const existingUsername = await get('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE AND uid != ?', [username, uid]);
      if (existingUsername) return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }

    const existing = await get('SELECT uid, is_banned FROM vuttik_users WHERE uid = ?', [uid]);
    if (existing && existing.is_banned) {
      return res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' });
    }
    if (existing) {
      const onboardingVal = onboardingCompleted !== undefined ? (onboardingCompleted ? 1 : 0) : 1;
      await run(
        'UPDATE vuttik_users SET email = ?, display_name = ?, photo_url = ?, role = ?, plan_id = ?, onboarding_completed = ?, age = COALESCE(?, age), gender = COALESCE(?, gender), country = COALESCE(?, country), language = COALESCE(?, language), username = COALESCE(?, username) WHERE uid = ?',
        [email, displayName, photoURL, role, planId, onboardingVal, age || null, gender || null, country || null, language || null, username || null, uid]
      );
      await logAction(uid, 'USER_LOGIN', uid, 'user', { role });
    } else {
      const onboardingVal = onboardingCompleted !== undefined ? (onboardingCompleted ? 1 : 0) : 1;
      await run(
        'INSERT INTO vuttik_users (uid, email, display_name, photo_url, role, plan_id, created_at, onboarding_completed, age, gender, country, language, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uid, email, displayName, photoURL, role || 'user', planId || 'free', new Date().toISOString(), onboardingVal, age || null, gender || null, country || null, language || null, username || null]
      );
      await logAction(uid, 'USER_REGISTERED', uid, 'user', { email, role });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Category Routes ---
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM vuttik_categories ORDER BY order_index ASC');
    const categories = rows.map(r => ({
      ...r,
      allowedTypes: JSON.parse(r.allowed_types),
      fields: JSON.parse(r.fields),
      systemFields: JSON.parse(r.system_fields),
      isService: Boolean(r.is_service),
      requiresEan: Boolean(r.requires_ean)
    }));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
  const { id, name, order, allowedTypes, fields, systemFields, createdBy, isService, requiresEan } = req.body;
  const catId = id || uuidv4();
  try {
    await run(
      'INSERT OR REPLACE INTO vuttik_categories (id, name, order_index, allowed_types, fields, system_fields, is_service, requires_ean) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [catId, name, order || 0, JSON.stringify(allowedTypes || []), JSON.stringify(fields || []), JSON.stringify(systemFields || {}), isService ? 1 : 0, requiresEan ? 1 : 0]
    );
    await logAction(createdBy || 'admin', 'CREATE_CATEGORY', catId, 'category', { name });
    res.json({ success: true, id: catId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { deletedBy } = req.query;
  try {
    const cat = await get('SELECT name FROM vuttik_categories WHERE id = ?', [id]);
    await run('DELETE FROM vuttik_categories WHERE id = ?', [id]);
    await logAction((deletedBy as string) || 'admin', 'DELETE_CATEGORY', id, 'category', { name: cat?.name });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Evaluate and resolve pending proposals that have expired or reached consensus
async function checkExpiredProposals() {
  try {
    const pendingProposals = await all('SELECT * FROM vuttik_category_proposals WHERE status = ?', ['pending']);
    if (!pendingProposals || pendingProposals.length === 0) return;

    const guardianCountRow = await get("SELECT COUNT(*) as count FROM vuttik_users WHERE role IN ('guardian', 'mega_guardian', 'admin')");
    const totalGuardians = guardianCountRow?.count || 1;

    for (const p of pendingProposals) {
      const votes = await all('SELECT vote_type FROM vuttik_category_votes WHERE proposal_id = ?', [p.id]);
      const upVotes = votes.filter((v: any) => v.vote_type === 'up').length;
      const downVotes = votes.filter((v: any) => v.vote_type === 'down').length;
      const totalVotes = upVotes + downVotes;

      const createdDate = new Date(p.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

      // Resolve if 48 hours have passed OR if everyone has voted
      if (hoursDiff >= 48 || totalVotes >= totalGuardians) {
        if (upVotes > downVotes) {
          await run('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['approved', p.id]);
          await run(
            'INSERT OR IGNORE INTO vuttik_categories (id, name, order_index, allowed_types, fields) VALUES (?, ?, 0, ?, ?)',
            [p.id, p.name, JSON.stringify(['sell', 'buy', 'exchange']), JSON.stringify([])]
          );
          await logAction('system', 'category_auto_approved', p.id, 'category_proposal', { name: p.name, votes: upVotes, reason: hoursDiff >= 48 ? 'expired' : 'consensus' });
        } else {
          // Reject if tie or more down votes
          await run('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['rejected', p.id]);
          await logAction('system', 'category_auto_rejected', p.id, 'category_proposal', { name: p.name, votes: downVotes, reason: hoursDiff >= 48 ? 'expired' : 'consensus' });
        }
      }
    }
  } catch (error) {
    console.error('Error checking expired proposals:', error);
  }
}

// Category Proposals
app.get('/api/categories/proposals', async (req, res) => {
  const userId = req.query.userId as string;
  try {
    await checkExpiredProposals(); // Resolve any expired ones before fetching
    const proposals = await all('SELECT * FROM vuttik_category_proposals ORDER BY created_at DESC');
    
    // Count total guardians
    const guardianCountRow = await get("SELECT COUNT(*) as count FROM vuttik_users WHERE role IN ('guardian', 'mega_guardian', 'admin')");
    const totalGuardians = guardianCountRow?.count || 1; // avoid division by zero

    // Attach vote stats to each proposal
    const enrichedProposals = await Promise.all(proposals.map(async (p: any) => {
      const votes = await all('SELECT guardian_id, vote_type FROM vuttik_category_votes WHERE proposal_id = ?', [p.id]);
      const upVotes = votes.filter((v: any) => v.vote_type === 'up').length;
      const downVotes = votes.filter((v: any) => v.vote_type === 'down').length;
      const myVote = userId ? votes.find((v: any) => v.guardian_id === userId)?.vote_type : null;
      
      return {
        ...p,
        upVotes,
        downVotes,
        totalGuardians,
        myVote
      };
    }));

    res.json(enrichedProposals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

app.post('/api/categories/proposals', async (req, res) => {
  const { id, name, suggested_by_id, suggested_by_name } = req.body;
  try {
    await run(
      'INSERT INTO vuttik_category_proposals (id, name, suggested_by_id, suggested_by_name, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, suggested_by_id, suggested_by_name, new Date().toISOString()]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

app.post('/api/categories/proposals/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { guardian_id, vote_type } = req.body;
  try {
    // Check if the voter is a mega_guardian
    const voter = await get('SELECT role FROM vuttik_users WHERE uid = ?', [guardian_id]);
    const isMegaGuardian = voter && (voter.role === 'mega_guardian' || voter.role === 'admin');

    // Upsert vote
    await run(`
      INSERT INTO vuttik_category_votes (proposal_id, guardian_id, vote_type, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(proposal_id, guardian_id) DO UPDATE SET vote_type = excluded.vote_type
    `, [id, guardian_id, vote_type, new Date().toISOString()]);

    const proposal = await get('SELECT * FROM vuttik_category_proposals WHERE id = ?', [id]);

    // Mega Guardian vote ends the vote immediately
    if (isMegaGuardian && proposal && proposal.status === 'pending') {
      if (vote_type === 'up') {
        await run('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['approved', id]);
        await run(
          'INSERT OR IGNORE INTO vuttik_categories (id, name, order_index, allowed_types, fields) VALUES (?, ?, 0, ?, ?)',
          [proposal.id, proposal.name, JSON.stringify(['sell', 'buy', 'exchange']), JSON.stringify([])]
        );
        await logAction(guardian_id, 'category_approved_mega', id, 'category_proposal', { name: proposal.name });
      } else {
        await run('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['rejected', id]);
        await logAction(guardian_id, 'category_rejected_mega', id, 'category_proposal', { name: proposal.name });
      }
      return res.json({ success: true, resolved: true, by: 'mega_guardian' });
    }

    // Regular guardian: check consensus
    const votes = await all('SELECT vote_type FROM vuttik_category_votes WHERE proposal_id = ?', [id]);
    const upVotes = votes.filter((v: any) => v.vote_type === 'up').length;
    const downVotes = votes.filter((v: any) => v.vote_type === 'down').length;

    await logAction(guardian_id, 'category_vote', id, 'category_proposal', { vote_type, name: proposal?.name });

    const guardianCountRow = await get("SELECT COUNT(*) as count FROM vuttik_users WHERE role IN ('guardian', 'mega_guardian', 'admin')");
    const totalGuardians = guardianCountRow?.count || 1;

    // Resolve immediately if everyone has voted
    if ((upVotes + downVotes) >= totalGuardians && proposal && proposal.status === 'pending') {
      if (upVotes > downVotes) {
        await run('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['approved', id]);
        await run(
          'INSERT OR IGNORE INTO vuttik_categories (id, name, order_index, allowed_types, fields) VALUES (?, ?, 0, ?, ?)',
          [proposal.id, proposal.name, JSON.stringify(['sell', 'buy', 'exchange']), JSON.stringify([])]
        );
        await logAction('system', 'category_auto_approved', id, 'category_proposal', { name: proposal.name, votes: upVotes, reason: 'consensus' });
      } else {
        await run('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['rejected', id]);
        await logAction('system', 'category_auto_rejected', id, 'category_proposal', { name: proposal.name, votes: downVotes, reason: 'consensus' });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Vote Error:', error);
    res.status(500).json({ error: 'Failed to vote', details: error.message });
  }
});

app.get('/api/transaction-types', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM vuttik_transaction_types ORDER BY label ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transaction-types', authenticateToken, async (req, res) => {
  const { id, label, icon, active } = req.body;
  const typeId = id || uuidv4();
  try {
    await run(
      'INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)',
      [typeId, label, icon || 'Tag', active !== undefined ? active : 1]
    );
    res.json({ success: true, id: typeId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transaction-types/:id', authenticateToken, async (req, res) => {
  try {
    await run('DELETE FROM vuttik_transaction_types WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Subscription Plans Routes ---
app.get('/api/subscription-plans', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM vuttik_subscription_plans ORDER BY order_index ASC');
    const plans = rows.map(r => ({
      ...r,
      features: JSON.parse(r.features || '[]'),
      is_hidden: !!r.is_hidden,
      is_coming_soon: !!r.is_coming_soon,
      is_recommended: !!r.is_recommended,
      order_index: r.order_index || 0
    }));
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscription-plans', authenticateToken, async (req, res) => {
  const { id, name, price, features, is_hidden, is_coming_soon, is_recommended, order_index } = req.body;
  const planId = id || uuidv4();
  try {
    let oldPrice = null;
    if (id) {
      const oldPlan = await get('SELECT price FROM vuttik_subscription_plans WHERE id = ?', [id]);
      if (oldPlan) oldPrice = oldPlan.price;
    }

    await run(
      'INSERT OR REPLACE INTO vuttik_subscription_plans (id, name, price, features, is_hidden, is_coming_soon, is_recommended, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [planId, name, price || 0, JSON.stringify(features || []), is_hidden ? 1 : 0, is_coming_soon ? 1 : 0, is_recommended ? 1 : 0, order_index || 0]
    );

    // If price changed and it's an existing plan, notify affected users
    if (id && oldPrice !== null && oldPrice !== price) {
      const usersOnPlan = await all('SELECT uid FROM vuttik_users WHERE plan_id = ?', [id]);
      const now = new Date().toISOString();
      for (const user of usersOnPlan) {
        await run(
          'INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [
            uuidv4(), 
            user.uid, 
            'Actualización en tu Plan de Suscripción', 
            `Hola. El precio de tu plan "${name}" ha sido actualizado a $${price}/mes. Como ya tienes una suscripción activa, este cambio no se aplicará inmediatamente. Tendrás un periodo de gracia de 2 meses antes de que se refleje el nuevo precio. ¡Gracias por estar con nosotros!`,
            0, 
            now
          ]
        );
      }
    }

    res.json({ success: true, id: planId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/subscription-plans/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { fallbackPlanId } = req.query;
  try {
    if (fallbackPlanId) {
      // Find all affected users
      const users = await all('SELECT uid FROM vuttik_users WHERE plan_id = ?', [id]);
      
      // 60 days grace period
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 60);
      const nextBillingStr = nextBillingDate.toISOString();

      // Update users
      await run('UPDATE vuttik_users SET plan_id = ?, next_billing_date = ? WHERE plan_id = ?', [fallbackPlanId, nextBillingStr, id]);

      // Notify users
      for (const u of users) {
        await run(
          'INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), u.uid, 'Cambio de Plan', `Tu plan anterior ha sido descontinuado. Te hemos asignado al nuevo plan seleccionado por el administrador. Tienes 2 meses de gracia y beneficios gratis antes del próximo cobro.`, 0, new Date().toISOString()]
        );
      }
    }

    await run('DELETE FROM vuttik_subscription_plans WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Notifications Routes ---
app.get('/api/notifications', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const notifications = await all('SELECT * FROM vuttik_notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    await run('UPDATE vuttik_notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/mark-all-read', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID required' });
  try {
    await run('UPDATE vuttik_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- EAN Database Routes ---
app.get('/api/ean-database', async (req, res) => {
  const { q } = req.query;
  try {
    let query = 'SELECT * FROM vuttik_ean_database ORDER BY created_at DESC LIMIT 100';
    let params: any[] = [];
    if (q) {
      query = 'SELECT * FROM vuttik_ean_database WHERE ean LIKE ? OR name LIKE ? OR brand LIKE ? ORDER BY created_at DESC LIMIT 100';
      params = [`%${q}%`, `%${q}%`, `%${q}%`];
    }
    const rows = await all(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ean-database', async (req, res) => {
  const data = req.body;
  try {
    const existing = await get('SELECT ean FROM vuttik_ean_database WHERE ean = ?', [data.ean]);
    if (existing) {
      return res.status(400).json({ error: 'Este código EAN ya existe en la base de datos.' });
    }
    
    await run(
      'INSERT INTO vuttik_ean_database (ean, name, description, brand, category, image_url, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.ean, data.name, data.description, data.brand, data.category, data.image_url, data.created_by || 'system', new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/ean-database/:ean', async (req, res) => {
  const { ean } = req.params;
  const data = req.body;
  try {
    const user = await get('SELECT role FROM vuttik_users WHERE uid = ?', [data.userId]);
    if (!user || !['admin', 'guardian', 'mega_guardian'].includes(user.role)) {
      return res.status(403).json({ error: 'Solo los guardianes y mega guardianes pueden editar la base de datos.' });
    }

    await run(
      'UPDATE vuttik_ean_database SET name = ?, description = ?, brand = ?, category = ?, image_url = ? WHERE ean = ?',
      [data.name, data.description, data.brand, data.category, data.image_url, ean]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
    const { categoryId, authorId, postedAs } = req.query;
    try {
      let query = `
        SELECT p.*,
               u.country as author_country,
               u.photo_url as author_avatar,
               (SELECT json_group_array(user_id) FROM vuttik_product_votes WHERE product_id = p.id AND vote_type = 'up') as up_votes,
               (SELECT json_group_array(user_id) FROM vuttik_product_votes WHERE product_id = p.id AND vote_type = 'down') as down_votes
        FROM vuttik_products p
        LEFT JOIN vuttik_users u ON p.author_id = u.uid
        LEFT JOIN vuttik_business_profiles b ON u.uid = b.uid
      `;
      const params = [];
      const conditions = [];

      if (categoryId && categoryId !== 'GLOBAL') {
        conditions.push('p.category_id = ?');
        params.push(categoryId);
      }

      if (authorId) {
        conditions.push('p.author_id = ?');
        params.push(authorId);
      }
      
      if (postedAs) {
        conditions.push('p.posted_as = ?');
        params.push(postedAs);
      }

      // If viewing the global market (no author specified), hide POS products with 0 stock
      if (!authorId) {
        conditions.push("(p.id NOT LIKE 'pos-%' OR p.stock > 0)");
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY p.created_at DESC';
    const rows = await all(query, params);
    const products = rows.map(r => {
      let parsedUpVotes = [];
      let parsedDownVotes = [];
      try { parsedUpVotes = r.up_votes ? JSON.parse(r.up_votes).filter((v: any) => v !== null) : []; } catch (e) {}
      try { parsedDownVotes = r.down_votes ? JSON.parse(r.down_votes).filter((v: any) => v !== null) : []; } catch (e) {}
      
      return {
        ...r,
        typeId: r.type_id,
        categoryId: r.category_id,
        authorId: r.author_id,
        authorName: r.author_name,
        authorAvatar: r.author_avatar,
        createdAt: r.created_at,
        salePrice: r.sale_price,
        isOnSale: !!r.is_on_sale,
        authorCountry: r.country || r.author_country,
        province: r.province,
        storeName: r.store_name,
        business: r.store_name || r.chain, // Map store_name or chain to business for frontend
        chain: r.chain,
        isIndependent: !!r.is_independent,
        upVotes: parsedUpVotes,
        downVotes: parsedDownVotes,
        images: JSON.parse(r.images || '[]'),
        customFields: JSON.parse(r.custom_fields || '{}')
      };
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await get(`
      SELECT p.*,
             u.country as author_country,
             u.photo_url as author_avatar,
             (SELECT json_group_array(user_id) FROM vuttik_product_votes WHERE product_id = p.id AND vote_type = 'up') as up_votes,
             (SELECT json_group_array(user_id) FROM vuttik_product_votes WHERE product_id = p.id AND vote_type = 'down') as down_votes
      FROM vuttik_products p
      LEFT JOIN vuttik_users u ON p.author_id = u.uid
      LEFT JOIN vuttik_business_profiles b ON u.uid = b.uid
      WHERE p.id = ?
    `, [id]);

    if (!product) return res.status(404).json({ error: 'Product not found' });

    let parsedUpVotes = [];
    let parsedDownVotes = [];
    try { parsedUpVotes = product.up_votes ? JSON.parse(product.up_votes).filter((v: any) => v !== null) : []; } catch (e) {}
    try { parsedDownVotes = product.down_votes ? JSON.parse(product.down_votes).filter((v: any) => v !== null) : []; } catch (e) {}

    res.json({
      ...product,
      typeId: product.type_id,
      categoryId: product.category_id,
      authorId: product.author_id,
      authorName: product.author_name,
      authorAvatar: product.author_avatar,
      createdAt: product.created_at,
      salePrice: product.sale_price,
      isOnSale: !!product.is_on_sale,
      authorCountry: product.country || product.author_country,
      province: product.province,
      storeName: product.store_name,
      business: product.store_name || product.chain,
      chain: product.chain,
      isIndependent: !!product.is_independent,
      upVotes: parsedUpVotes,
      downVotes: parsedDownVotes,
      images: JSON.parse(product.images || '[]'),
      customFields: JSON.parse(product.custom_fields || '{}')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  const id = uuidv4();
  const data = req.body;
  try {
    const user = await get('SELECT is_banned, strikes FROM vuttik_users WHERE uid = ?', [data.authorId]);
    if (user?.is_banned) return res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' });
    if (user?.strikes >= 3) return res.status(403).json({ error: 'Tu cuenta está en modo sólo lectura debido a múltiples infracciones (strikes).' });

    await run(
      `INSERT INTO vuttik_products (
        id, title, description, price, currency, category_id, type_id, author_id, 
        author_name, location, phone, lat, lng, barcode, is_on_sale, sale_price, 
        images, custom_fields, created_at, posted_as, chain, store_name, is_independent, country, province
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.title, data.description, data.price, data.currency, data.categoryId,
        data.typeId, data.authorId, data.authorName, data.location, data.phone,
        data.lat, data.lng, data.barcode, data.isOnSale ? 1 : 0, data.salePrice,
        JSON.stringify(data.images || []), JSON.stringify(data.customFields || {}),
        new Date().toISOString(), data.postedAs || 'personal',
        data.chain || null, data.storeName || null, data.isIndependent ? 1 : 0, data.country || null, data.province || null
      ]
    );
    res.json({ id, success: true });
    await logAction(data.authorId, 'CREATE_PRODUCT', id, 'product', { title: data.title });

    // Auto-feed EAN Database
    if (data.barcode) {
      try {
        const existingEan = await get('SELECT ean FROM vuttik_ean_database WHERE ean = ?', [data.barcode]);
        if (!existingEan) {
          const firstImage = data.images && data.images.length > 0 ? data.images[0] : '';
          await run(
            'INSERT INTO vuttik_ean_database (ean, name, description, brand, category, image_url, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [data.barcode, data.title, data.description || '', '', data.categoryId || '', firstImage, data.authorId || 'system', new Date().toISOString()]
          );
        }
      } catch (err) {
        console.error('Error auto-feeding EAN database:', err);
      }
    }

    // Notify followers of EAN or Title
    const entityType = data.barcode ? 'ean' : 'title';
    const entityValue = data.barcode || data.title.toLowerCase();

    const followers = await all(`
      SELECT DISTINCT user_id 
      FROM vuttik_product_follows 
      WHERE entity_type = ? AND entity_value = ? AND user_id != ?
    `, [entityType, entityValue, data.authorId]);
    
    for (const follower of followers) {
      await run(
        'INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), follower.user_id, 'Nuevo producto de tu interés', `Se ha publicado "${data.title}" y coincide con tus seguimientos.`, 0, new Date().toISOString(), 'price_drop']
      );
    }

  } catch (error) {
    console.error('Error in /api/products:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  try {
    const product = await get('SELECT title, author_id FROM vuttik_products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Check if the user is the author
    if (product.author_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }
    
    await run('DELETE FROM vuttik_products WHERE id = ?', [id]);
    res.json({ success: true });

    // Log action
    if (userId) await logAction(userId as string, 'DELETE_PRODUCT', id, 'product', { title: product.title });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product (edit)
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  const data = req.body;
  try {
    const existing = await get('SELECT author_id, title FROM vuttik_products WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    if (existing.author_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }
    const oldProduct = await get('SELECT price FROM vuttik_products WHERE id = ?', [id]);
    
    await run(
      `UPDATE vuttik_products SET
        title = ?, description = ?, price = ?, currency = ?, category_id = ?, type_id = ?,
        location = ?, phone = ?, lat = ?, lng = ?, barcode = ?, is_on_sale = ?, sale_price = ?,
        images = ?, custom_fields = ?
       WHERE id = ?`,
      [
        data.title, data.description, data.price, data.currency, data.categoryId, data.typeId,
        data.location, data.phone, data.lat, data.lng, data.barcode,
        data.isOnSale ? 1 : 0, data.salePrice,
        JSON.stringify(data.images || []), JSON.stringify(data.customFields || {}),
        id
      ]
    );

    // If price dropped or it went on sale, notify followers
    if (oldProduct && ((data.isOnSale && data.salePrice < oldProduct.price) || (data.price < oldProduct.price))) {
      const entityType = data.barcode ? 'ean' : 'title';
      const entityValue = data.barcode || data.title.toLowerCase();

      const followers = await all(`
        SELECT DISTINCT user_id 
        FROM vuttik_product_follows 
        WHERE (product_id = ?) OR (entity_type = ? AND entity_value = ?)
      `, [id, entityType, entityValue]);

      for (const follower of followers) {
        if (follower.user_id === existing.author_id) continue;
        await run(
          'INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), follower.user_id, '¡Bajó de precio!', `El producto "${data.title}" que sigues ahora está más barato.`, 0, new Date().toISOString(), 'price_drop']
        );
      }
    }
    await logAction(userId as string, 'UPDATE_PRODUCT', id, 'product', { title: data.title, oldTitle: existing.title });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vote on product
app.post('/api/products/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { userId, voteType } = req.body;
  try {
    const existing = await get('SELECT vote_type FROM vuttik_product_votes WHERE product_id = ? AND user_id = ?', [id, userId]);
    
    // Auto-toggle: If clicking the same vote type, remove it. 
    // Or if the frontend explicitly sends null, remove it.
    if (voteType === null || (existing && existing.vote_type === voteType)) {
      await run('DELETE FROM vuttik_product_votes WHERE product_id = ? AND user_id = ?', [id, userId]);
      await logAction(userId, 'VOTE_PRODUCT_REMOVE', id, 'product', { removedVote: existing?.vote_type });
    } else {
      await run(
        `INSERT INTO vuttik_product_votes (product_id, user_id, vote_type, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(product_id, user_id) DO UPDATE SET vote_type = excluded.vote_type`,
        [id, userId, voteType, new Date().toISOString()]
      );
      await logAction(userId, 'VOTE_PRODUCT', id, 'product', { voteType });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Social Posts Routes ---
app.get('/api/posts', async (req, res) => {
  const { authorId, postedAs } = req.query;
  try {
    let query = `
      SELECT p.*, u.photo_url as author_avatar
      FROM vuttik_posts p
      LEFT JOIN vuttik_users u ON p.author_id = u.uid
    `;
    const params = [];
    const conditions = [];

    if (authorId) {
      conditions.push('p.author_id = ?');
      params.push(authorId);
    }
    
    if (postedAs) {
      conditions.push('p.posted_as = ?');
      params.push(postedAs);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const rows = await all(query, params);
    const posts = await Promise.all(rows.map(async (r: any) => {
      const likes = await all('SELECT user_id FROM vuttik_post_likes WHERE post_id = ?', [r.id]);
      const verifications = await all('SELECT user_id, is_veracious FROM vuttik_post_verifications WHERE post_id = ?', [r.id]);
      return {
        ...r,
        author_name: r.author_name,
        author_avatar: r.author_avatar,
        likes: likes.map(l => l.user_id),
        verifications: verifications.map(v => ({ user_id: v.user_id, is_veracious: !!v.is_veracious })),
        is_verified: !!r.is_verified,
        comments: 0 // Placeholder as comments table isn't implemented yet
      };
    }));
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts', async (req, res) => {
  const { id, authorId, authorName, authorAvatar, content, image, postedAs, isVerified } = req.body;
  try {
    const user = await get('SELECT is_banned, strikes FROM vuttik_users WHERE uid = ?', [authorId]);
    if (user?.is_banned) return res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' });
    if (user?.strikes >= 3) return res.status(403).json({ error: 'Tu cuenta está en modo sólo lectura debido a múltiples infracciones (strikes).' });

    const postId = id || uuidv4();
    await run(
      'INSERT INTO vuttik_posts (id, author_id, author_name, author_avatar, content, image_url, is_verified, created_at, posted_as) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [postId, authorId, authorName, authorAvatar, content, image, isVerified ? 1 : 0, new Date().toISOString(), postedAs || 'personal']
    );
    res.json({ id: postId, success: true });
    await logAction(authorId, 'CREATE_POST', postId, 'post', { snippet: content.substring(0, 50) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  try {
    const post = await get('SELECT author_id, content FROM vuttik_posts WHERE id = ?', [id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.author_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await run('DELETE FROM vuttik_posts WHERE id = ?', [id]);
    res.json({ success: true });

    // Log action
    if (userId) await logAction(userId as string, 'DELETE_POST', id, 'post', { snippet: post.content.substring(0, 50) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Comments Routes ---
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM vuttik_comments WHERE post_id = ? ORDER BY created_at ASC', [req.params.postId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  const { authorId, authorName, authorAvatar, content } = req.body;
  const id = uuidv4();
  try {
    const user = await get('SELECT is_banned, strikes FROM vuttik_users WHERE uid = ?', [authorId]);
    if (user?.is_banned) return res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' });
    if (user?.strikes >= 3) return res.status(403).json({ error: 'Tu cuenta está en modo sólo lectura debido a múltiples infracciones (strikes).' });

    await run(
      'INSERT INTO vuttik_comments (id, post_id, author_id, author_name, author_avatar, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, postId, authorId, authorName, authorAvatar, content, new Date().toISOString()]
    );
    res.json({ id, success: true });

    // Notification
    const post = await get('SELECT author_id FROM vuttik_posts WHERE id = ?', [postId]);
    if (post && post.author_id && post.author_id !== authorId) {
      await run(
        'INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), post.author_id, 'Nuevo Comentario', `${authorName || 'Alguien'} ha comentado en tu publicación.`, 0, new Date().toISOString()]
      );
    }

    // Log action
    await logAction(authorId, 'COMMENT', id, 'comment', { postId, snippet: content.substring(0, 30) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Like / Unlike Post ---
app.post('/api/posts/:postId/like', async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const existing = await get('SELECT id FROM vuttik_post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    if (existing) {
      await run('DELETE FROM vuttik_post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
      await logAction(userId, 'UNLIKE_POST', postId, 'post', {});
      res.json({ liked: false });
    } else {
      await run(
        'INSERT INTO vuttik_post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)',
        [postId, userId, new Date().toISOString()]
      );
      await logAction(userId, 'LIKE_POST', postId, 'post', {});
      // Notify post author
      const post = await get('SELECT author_id, author_name FROM vuttik_posts WHERE id = ?', [postId]);
      if (post && post.author_id && post.author_id !== userId) {
        await run(
          'INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), post.author_id, 'Nueva Reacción', `A alguien le gustó tu publicación.`, 0, new Date().toISOString()]
        );
      }
      res.json({ liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Delete Comment ---
app.delete('/api/comments/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  try {
    const comment = await get('SELECT author_id, content FROM vuttik_comments WHERE id = ?', [id]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    await run('DELETE FROM vuttik_comments WHERE id = ?', [id]);
    if (userId) await logAction(userId as string, 'DELETE_COMMENT', id, 'comment', { snippet: comment.content?.substring(0, 30) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Edit Post ---
app.put('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { userId, content } = req.body;
  try {
    const post = await get('SELECT author_id FROM vuttik_posts WHERE id = ?', [id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author_id !== userId) return res.status(403).json({ error: 'Not authorized' });
    await run('UPDATE vuttik_posts SET content = ? WHERE id = ?', [content, id]);
    await logAction(userId, 'EDIT_POST', id, 'post', { snippet: content?.substring(0, 50) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- User Profile Update ---
app.put('/api/users/:uid/profile', async (req, res) => {
  const { uid } = req.params;
  const { displayName, bio, location, photoURL, age, gender, country, language, username } = req.body;
  try {
    if (username) {
      const existingUsername = await get('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE AND uid != ?', [username, uid]);
      if (existingUsername) return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }

    await run(
      'UPDATE vuttik_users SET display_name = ?, bio = ?, location = ?, photo_url = COALESCE(?, photo_url), age = COALESCE(?, age), gender = COALESCE(?, gender), country = COALESCE(?, country), language = COALESCE(?, language), username = COALESCE(?, username) WHERE uid = ?',
      [displayName, bio, location, photoURL || null, age || null, gender || null, country || null, language || null, username || null, uid]
    );
    await logAction(uid, 'UPDATE_PROFILE', uid, 'user', { displayName });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Change User Role (Admin) ---
app.put('/api/users/:uid/role', authenticateToken, async (req: any, res) => {
  const { uid } = req.params;
  const { role, adminId } = req.body;
  try {
    const old = await get('SELECT role FROM vuttik_users WHERE uid = ?', [uid]);
    await run('UPDATE vuttik_users SET role = ? WHERE uid = ?', [role, uid]);
    await logAction(adminId || 'admin', 'CHANGE_USER_ROLE', uid, 'user', { newRole: role, oldRole: old?.role });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Unban User ---
app.post('/api/users/:uid/unban', authenticateToken, async (req, res) => {
  const { uid } = req.params;
  const { adminId } = req.body;
  try {
    await run('UPDATE vuttik_users SET is_banned = 0 WHERE uid = ?', [uid]);
    await logAction(adminId || 'admin', 'UNBAN_USER', uid, 'user');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:uid/strike', authenticateToken, async (req, res) => {
  const { uid } = req.params;
  const { guardianId } = req.body;
  try {
    const user = await get('SELECT strikes FROM vuttik_users WHERE uid = ?', [uid]);
    const newStrikes = (user?.strikes || 0) + 1;
    await run('UPDATE vuttik_users SET strikes = ? WHERE uid = ?', [newStrikes, uid]);
    await logAction(guardianId, 'issue_strike', uid, 'user', { strikes: newStrikes });
    res.json({ success: true, strikes: newStrikes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/posts/:postId/verify', async (req, res) => {
  const { postId } = req.params;
  const { userId, isVeracious } = req.body;
  try {
    await run(
      'INSERT OR REPLACE INTO vuttik_post_verifications (post_id, user_id, is_veracious, created_at) VALUES (?, ?, ?, ?)',
      [postId, userId, isVeracious ? 1 : 0, new Date().toISOString()]
    );
    res.json({ success: true });

    // Log action
    await logAction(userId, 'VOTE_VERACITY', postId, 'post', { isVeracious });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Duplicate endpoint removed.

// --- Real Analytics Endpoint ---
app.get('/api/users/:uid/analytics', async (req, res) => {
  const { uid } = req.params;
  try {
    // Total Views (products + profile)
    const viewsResult = await get(`
      SELECT (
        SELECT COUNT(*) FROM vuttik_metrics m 
        JOIN vuttik_products p ON m.target_id = p.id 
        WHERE p.author_id = ? AND m.action = 'view'
      ) + (
        SELECT COUNT(*) FROM vuttik_metrics 
        WHERE target_id = ? AND action = 'VIEW_PROFILE'
      ) as count
    `, [uid, uid]);

    // Actions count (Real engagement)
    const actionsResult = await all(`
      SELECT action, COUNT(*) as count 
      FROM vuttik_metrics 
      WHERE user_id = ? 
      GROUP BY action
    `, [uid]);

    // Trend (Daily views for the last 7 days)
    const trend = await all(`
      SELECT date, SUM(count) as value FROM (
        SELECT date(timestamp) as date, COUNT(*) as count 
        FROM vuttik_metrics m
        JOIN vuttik_products p ON m.target_id = p.id
        WHERE p.author_id = ? AND m.action = 'view' AND timestamp > date('now', '-7 days')
        GROUP BY date(timestamp)
        UNION ALL
        SELECT date(timestamp) as date, COUNT(*) as count 
        FROM vuttik_metrics
        WHERE target_id = ? AND action = 'VIEW_PROFILE' AND timestamp > date('now', '-7 days')
        GROUP BY date(timestamp)
      ) GROUP BY date ORDER BY date DESC LIMIT 7
    `, [uid, uid]);

    res.json({
      totalViews: viewsResult?.count || 0,
      engagement: actionsResult,
      trend: trend.reverse()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Moderation & Reports Actions ---

app.post('/api/reports', async (req, res) => {
  const { reporterId, targetId, targetType, targetTitle, authorId, authorName, reason } = req.body;
  try {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    await run(
      `INSERT INTO vuttik_reports 
       (id, reporter_id, target_id, target_type, target_title, author_id, author_name, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, reporterId, targetId, targetType, targetTitle, authorId, authorName, reason, now]
    );
    await logAction(reporterId, 'report_created', targetId, targetType, { reason, targetTitle, authorName });
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await all(`
      SELECT r.*, u.username as reporter_username, u.display_name as reporter_name, u.strikes as reporter_strikes, u.photo_url as reporter_photo
      FROM vuttik_reports r
      LEFT JOIN vuttik_users u ON r.reporter_id = u.uid
      ORDER BY r.created_at DESC
    `);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reports/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, guardianId } = req.body;
  try {
    const report = await get('SELECT * FROM vuttik_reports WHERE id = ?', [id]);
    await run('UPDATE vuttik_reports SET status = ? WHERE id = ?', [status, id]);
    if (guardianId && report) {
      await logAction(guardianId, `report_${status}`, report.target_id, report.target_type, { reportId: id, targetTitle: report.target_title });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin Actions ---
app.post('/api/users/:uid/ban', authenticateToken, async (req, res) => {
  const { uid } = req.params;
  const { adminId } = req.body;
  try {
    await run('UPDATE vuttik_users SET is_banned = 1 WHERE uid = ?', [uid]);
    res.json({ success: true });
    await logAction(adminId, 'BAN_USER', uid, 'user');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Metrics Route ---
app.post('/api/metrics', async (req, res) => {
  const { userId, action, targetId, targetType, metadata } = req.body;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timestamp = now.toISOString();

  try {
    await logAction(userId || 'anonymous', action, targetId || 'none', targetType || 'none', metadata || {});

    // Update Daily Aggregated Stats
    if (['view', 'search', 'contact'].includes(action)) {
      const field = action === 'view' ? 'views' : (action === 'search' ? 'searches' : 'contacts');
      
      // Calculate volume if it's a contact action
      let volumeIncrement = 0;
      if (action === 'contact' && targetId) {
        const product = await get('SELECT price FROM vuttik_products WHERE id = ?', [targetId]);
        volumeIncrement = (product as any)?.price || 0;
      }

      await run(`
        INSERT INTO vuttik_daily_stats (date, ${field}, total_p2p_volume) 
        VALUES (?, 1, ?) 
        ON CONFLICT(date) DO UPDATE SET 
          ${field} = ${field} + 1,
          total_p2p_volume = total_p2p_volume + ?
      `, [dateStr, volumeIncrement, volumeIncrement]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Metrics Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Aggregated Stats Routes ---

// Mega Guardian Overview
app.get('/api/stats/mega-guardian', async (req, res) => {
  try {
    const totalUsers = await get('SELECT COUNT(*) as count FROM vuttik_users');
    const totalProducts = await get('SELECT COUNT(*) as count FROM vuttik_products');
    const pendingReports = await get("SELECT COUNT(*) as count FROM vuttik_metrics WHERE action = 'flag'");
    
    // P2P Volume - Sum from daily stats for speed, but fallback to real metrics if needed
    const volumeData = await get('SELECT SUM(total_p2p_volume) as total FROM vuttik_daily_stats');
    
    // Distribution by category
    const distribution = await all(`
      SELECT c.name, COUNT(p.id) as value 
      FROM vuttik_categories c 
      LEFT JOIN vuttik_products p ON c.id = p.category_id 
      GROUP BY c.id
      HAVING value > 0
    `);

    res.json({
      overview: {
        activeUsers: totalUsers?.count || 0,
        p2pVolume: volumeData?.total || 0,
        newBusinesses: 0, 
        pendingReports: pendingReports?.count || 0
      },
      distribution
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trends (7 days)
app.get('/api/stats/trends', async (req, res) => {
  try {
    const rows = await all(`
      SELECT date as name, searches as busquedas, views as ventas 
      FROM vuttik_daily_stats 
      ORDER BY date DESC LIMIT 7
    `);
    res.json(rows.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Business Specific Stats
app.get('/api/stats/business/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const totalViews = await get(`
      SELECT COUNT(*) as count 
      FROM vuttik_metrics m 
      JOIN vuttik_products p ON m.target_id = p.id 
      WHERE p.author_id = ? AND p.posted_as = 'business' AND m.action = 'view'
    `, [userId]);

    const totalContacts = await get(`
      SELECT COUNT(*) as count 
      FROM vuttik_metrics m 
      JOIN vuttik_products p ON m.target_id = p.id 
      WHERE p.author_id = ? AND p.posted_as = 'business' AND m.action = 'contact'
    `, [userId]);

    const rawDailyStats = await all(`
      SELECT 
        date(m.timestamp) as day, 
        SUM(CASE WHEN m.action = 'view' THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN m.action = 'contact' THEN 1 ELSE 0 END) as sales
      FROM vuttik_metrics m
      JOIN vuttik_products p ON m.target_id = p.id
      WHERE p.author_id = ? AND p.posted_as = 'business' AND m.timestamp >= date('now', '-6 days')
      GROUP BY date(m.timestamp)
      ORDER BY date(m.timestamp) ASC
    `, [userId]);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const chartData = last7Days.map(dateStr => {
      const row = rawDailyStats.find(r => r.day === dateStr);
      // Ensure we get the correct local day by splitting the date string
      const [year, month, day] = dateStr.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return {
        name: dayNames[dateObj.getDay()],
        views: row?.views || 0,
        sales: row?.sales || 0
      };
    });

    res.json({
      views: totalViews?.count || 0,
      sales: totalContacts?.count || 0, // Using contacts as proxy for sales
      followers: 0,
      chartData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handled by startServer()

// --- Follows Routes ---
// Follow a user
app.post('/api/follows', async (req, res) => {
  const { followerId, followingId } = req.body;
  if (!followerId || !followingId) return res.status(400).json({ error: 'Missing params' });
  try {
    await run(
      'INSERT OR IGNORE INTO vuttik_follows (follower_id, following_id, created_at) VALUES (?, ?, ?)',
      [followerId, followingId, new Date().toISOString()]
    );
    res.json({ success: true });
    
    // Notification
    const followerUser = await get('SELECT name FROM vuttik_users WHERE uid = ?', [followerId]);
    const followerName = followerUser?.name || 'Un usuario';
    await run(
      'INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), followingId, 'Nuevo Seguidor', `${followerName} ha comenzado a seguirte.`, 0, new Date().toISOString()]
    );

    await logAction(followerId, 'FOLLOW', followingId, 'user');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unfollow a user
app.delete('/api/follows', async (req, res) => {
  const { followerId, followingId } = req.body;
  if (!followerId || !followingId) return res.status(400).json({ error: 'Missing params' });
  try {
    await run(
      'DELETE FROM vuttik_follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );
    res.json({ success: true });
    await logAction(followerId, 'UNFOLLOW', followingId, 'user');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of users that userId follows
app.get('/api/follows/:userId/following', async (req, res) => {
  try {
    const rows = await all(
      'SELECT following_id FROM vuttik_follows WHERE follower_id = ?',
      [req.params.userId]
    );
    res.json(rows.map((r: any) => r.following_id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of users that follow userId
app.get('/api/follows/:userId/followers', async (req, res) => {
  try {
    const rows = await all(`
      SELECT f.follower_id, u.display_name, u.photo_url, u.username, u.role
      FROM vuttik_follows f
      JOIN vuttik_users u ON f.follower_id = u.uid
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `, [req.params.userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Product Follows Endpoints
app.post('/api/products/:id/follow', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  try {
    const product = await get('SELECT barcode, title FROM vuttik_products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    let entityType = 'title';
    let entityValue = product.title?.toLowerCase() || '';

    if (product.barcode) {
      entityType = 'ean';
      entityValue = product.barcode;
    }

    await run(
      'INSERT OR IGNORE INTO vuttik_product_follows (user_id, product_id, entity_type, entity_value, created_at) VALUES (?, ?, ?, ?, ?)',
      [userId, id, entityType, entityValue, new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id/follow', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  try {
    const product = await get('SELECT barcode, title FROM vuttik_products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    let entityType = 'title';
    let entityValue = product.title?.toLowerCase() || '';
    if (product.barcode) {
      entityType = 'ean';
      entityValue = product.barcode;
    }

    await run(
      'DELETE FROM vuttik_product_follows WHERE user_id = ? AND entity_type = ? AND entity_value = ?',
      [userId, entityType, entityValue]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:uid/following-products', async (req, res) => {
  try {
    const rows = await all(`
      SELECT p.id as product_id
      FROM vuttik_product_follows f
      JOIN vuttik_products p ON 
        (f.entity_type = 'ean' AND p.barcode = f.entity_value) OR
        (f.entity_type = 'title' AND LOWER(p.title) = f.entity_value)
      WHERE f.user_id = ?
    `, [req.params.uid]);
    const directFollows = await all('SELECT product_id FROM vuttik_product_follows WHERE user_id = ?', [req.params.uid]);
    
    const ids = new Set([...rows.map((r: any) => r.product_id), ...directFollows.map((r: any) => r.product_id)]);
    res.json(Array.from(ids));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Override /api/posts to support ?filter=following&userId=X&type=X
app.get('/api/posts/feed', async (req, res) => {
  const { filter, userId, type } = req.query;
  try {
    let posts = [];
    let products = [];
    
    // Fetch posts
    if (!type || type === 'all' || type === 'posts') {
      let query = `
        SELECT p.*, u.photo_url as author_avatar
        FROM vuttik_posts p
        LEFT JOIN vuttik_users u ON p.author_id = u.uid
      `;
      let queryParams: any[] = [];
      if (filter === 'following' && userId) {
        const following = await all('SELECT following_id FROM vuttik_follows WHERE follower_id = ?', [userId]);
        if (following.length > 0) {
          const placeholders = following.map(() => '?').join(',');
          query += ` WHERE p.author_id IN (${placeholders})`;
          queryParams = following.map((f: any) => f.following_id);
        } else {
          query += ` WHERE 1=0`;
        }
      }
      query += ' ORDER BY p.created_at DESC LIMIT 50';
      const rows = await all(query, queryParams);
      posts = await Promise.all(rows.map(async (r: any) => {
        const likes = await all('SELECT user_id FROM vuttik_post_likes WHERE post_id = ?', [r.id]);
        return {
          ...r,
          author_name: r.author_name,
          author_avatar: r.author_avatar,
          likes: likes.map((l: any) => l.user_id),
          is_verified: !!r.is_verified,
          comments: 0,
          feedType: 'post'
        };
      }));
    }

    // Fetch products
    if (filter === 'following' && userId && (!type || type === 'all' || type === 'products')) {
      const pRows = await all(`
        SELECT DISTINCT p.*
        FROM vuttik_products p
        JOIN vuttik_product_follows f ON 
          (f.entity_type = 'ean' AND p.barcode = f.entity_value) OR
          (f.entity_type = 'title' AND LOWER(p.title) = f.entity_value) OR
          (f.product_id = p.id)
        WHERE f.user_id = ?
        ORDER BY p.created_at DESC LIMIT 50
      `, [userId]);
      products = pRows.map((p: any) => ({
        ...p,
        feedType: 'product'
      }));
    }

    const combined = [...posts, ...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(combined);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Conversations Routes ---
// Get unread messages count
app.get('/api/users/:uid/unread-messages', async (req, res) => {
  try {
    const uid = req.params.uid;
    const row = await get(
      `SELECT COUNT(*) as unreadCount FROM vuttik_messages m
       JOIN vuttik_conversations c ON m.conversation_id = c.id
       WHERE (c.participant_1 = ? OR c.participant_2 = ?) 
         AND m.sender_id != ? 
         AND m.is_read = 0`,
      [uid, uid, uid]
    );
    res.json({ count: row.unreadCount || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for a user
app.get('/api/conversations/:userId', async (req, res) => {
  try {
    const rows = await all(
      `SELECT c.*, 
        COALESCE(c.p1_name, u1.display_name) as p1_name, 
        COALESCE(c.p1_photo, u1.photo_url) as p1_photo,
        COALESCE(c.p2_name, u2.display_name) as p2_name, 
        COALESCE(c.p2_photo, u2.photo_url) as p2_photo
       FROM vuttik_conversations c
       LEFT JOIN vuttik_users u1 ON c.participant_1 = u1.uid
       LEFT JOIN vuttik_users u2 ON c.participant_2 = u2.uid
       WHERE c.participant_1 = ? OR c.participant_2 = ?
       ORDER BY c.last_message_at DESC`,
      [req.params.userId, req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or get existing conversation between two users
app.post('/api/conversations', async (req, res) => {
  const { userId1, userId2, p1Name, p1Photo, p2Name, p2Photo } = req.body;
  if (!userId1 || !userId2) return res.status(400).json({ error: 'Missing params' });
  try {
    // Check if conversation already exists (in either order)
    const existing = await get(
      `SELECT * FROM vuttik_conversations 
       WHERE (participant_1 = ? AND participant_2 = ?) 
          OR (participant_1 = ? AND participant_2 = ?)`,
      [userId1, userId2, userId2, userId1]
    );
    if (existing) return res.json(existing);

    // Create new conversation
    const id = uuidv4();
    const now = new Date().toISOString();
    await run(
      'INSERT INTO vuttik_conversations (id, participant_1, participant_2, created_at, last_message_at, p1_name, p1_photo, p2_name, p2_photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId1, userId2, now, now, p1Name || null, p1Photo || null, p2Name || null, p2Photo || null]
    );
    const created = await get('SELECT * FROM vuttik_conversations WHERE id = ?', [id]);
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Messages Routes ---
// Get messages for a conversation
app.get('/api/messages/:conversationId', async (req, res) => {
  try {
    const rows = await all(
      'SELECT * FROM vuttik_messages WHERE conversation_id = ? ORDER BY sent_at ASC',
      [req.params.conversationId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
app.post('/api/messages', async (req, res) => {
  const { conversationId, senderId, content } = req.body;
  if (!conversationId || !senderId || !content) return res.status(400).json({ error: 'Missing params' });
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    await run(
      'INSERT INTO vuttik_messages (id, conversation_id, sender_id, content, sent_at) VALUES (?, ?, ?, ?, ?)',
      [id, conversationId, senderId, content, now]
    );
    // Update last message on conversation
    await run(
      'UPDATE vuttik_conversations SET last_message = ?, last_message_at = ? WHERE id = ?',
      [content, now, conversationId]
    );
    const msg = await get('SELECT * FROM vuttik_messages WHERE id = ?', [id]);
    res.json(msg);
    await logAction(senderId, 'SEND_MESSAGE', id, 'message', { conversationId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
app.patch('/api/messages/read', async (req, res) => {
  const { conversationId, userId } = req.body;
  try {
    await run(
      'UPDATE vuttik_messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?',
      [conversationId, userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Audit Logs — Returns ALL events from vuttik_metrics ordered by timestamp DESC
app.get('/api/audit-logs', authenticateToken, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 300;

  // Events that are NOT meaningful DB writes — exclude them from trazabilidad
  const NOISE_EVENTS = [
    'click', 'view', 'search', 'VIEW_PROFILE', 'contact',
    'page_view', 'navigation', 'scroll', 'hover', 'SEND_MESSAGE'
  ];

  const placeholders = NOISE_EVENTS.map(() => '?').join(', ');

  try {
    const logs = await all(`
      SELECT 
        m.id,
        m.user_id,
        COALESCE(u.display_name, 'Sistema') AS display_name,
        u.photo_url,
        m.action,
        m.target_id,
        m.target_type,
        m.metadata,
        m.timestamp
      FROM vuttik_metrics m
      LEFT JOIN vuttik_users u ON m.user_id = u.uid
      WHERE m.action NOT IN (${placeholders})
        AND m.action NOT LIKE 'click%'
        AND m.action NOT LIKE 'view%'
        AND m.action NOT LIKE 'scroll%'
      ORDER BY m.timestamp DESC
      LIMIT ?
    `, [...NOISE_EVENTS, limit]);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

