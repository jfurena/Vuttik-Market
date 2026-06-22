import express from 'express';
import cors from 'cors';
import { initDB, db, all, run, addToSyncQueue, getPendingSyncItems, markSyncItemDone } from './db.js';
import { isCloudOnline, cloudLogin, cloudSyncPush } from './cloud-proxy.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

// Background Sync Engine
async function processSyncQueue() {
  try {
    const online = await isCloudOnline();
    if (!online) return;

    const pending = await getPendingSyncItems();
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} items to cloud...`);
    // Assuming the user is logged in and has a token in offline_sessions?
    // We should group by user_id to get the cloud_token
    // For simplicity, let's just pick the latest session's token
    const sessions = await all('SELECT cloud_token FROM offline_sessions WHERE cloud_token IS NOT NULL ORDER BY created_at DESC LIMIT 1');
    if (sessions.length === 0) return; // No token to sync with

    const token = sessions[0].cloud_token;

    // Send payload
    // You could batch this, but for now send one request with all operations
    const operations = pending.map((p: any) => ({
      operation: p.operation,
      payload: JSON.parse(p.payload),
      timestamp: p.created_at
    }));

    await cloudSyncPush(token, operations);

    // Mark done
    for (const p of pending) {
      await markSyncItemDone(p.id);
    }
    console.log('Sync complete.');

  } catch (err: any) {
    console.error('Background sync failed:', err.message);
  }
}

// Check every 30 seconds
setInterval(processSyncQueue, 30000);

// ==========================================
// API ROUTES FOR POS DESKTOP FRONTEND
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { correo, password, codigoNegocio } = req.body;
  const online = await isCloudOnline();

  if (online) {
    try {
      // 1. Try cloud login
      const cloudRes = await cloudLogin(correo, password, codigoNegocio);
      
      // 2. Cache session locally
      const hash = await bcrypt.hash(password, 10);
      const businessData = JSON.stringify(cloudRes.profile?.business || {});
      
      await run(`INSERT OR REPLACE INTO offline_sessions (id, user_id, correo, nombre, role, password_hash, cloud_token, business_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), cloudRes.user.id, correo, cloudRes.profile?.nombre, cloudRes.profile?.rol, hash, cloudRes.token, businessData, new Date().toISOString()]
      );

      // Save business and products locally for offline cache
      if (cloudRes.profile?.business_id) {
        await run(`INSERT OR REPLACE INTO businesses (id, nombre, owner_id) VALUES (?, ?, ?)`,
          [cloudRes.profile.business_id, cloudRes.profile.business?.nombre || 'Mi Negocio', cloudRes.user.id]);
      }

      return res.json({ token: cloudRes.token, user: cloudRes.user, profile: cloudRes.profile, isOnline: true });
    } catch (err: any) {
      return res.status(401).json({ error: 'Credenciales inválidas o error de red: ' + err.message });
    }
  } else {
    // OFFLINE LOGIN
    const sessions = await all('SELECT * FROM offline_sessions WHERE correo = ? ORDER BY created_at DESC', [correo]);
    if (sessions.length === 0) return res.status(401).json({ error: 'No hay sesiones previas para este usuario. Necesitas internet para el primer inicio de sesión.' });

    const session = sessions[0];
    const match = await bcrypt.compare(password, session.password_hash);
    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta (Offline)' });

    // Mock cloud response format
    return res.json({
      token: 'offline-token',
      user: { id: session.user_id, email: session.correo },
      profile: {
        id: session.id,
        nombre: session.nombre,
        rol: session.role,
        business: JSON.parse(session.business_data || '{}')
      },
      isOnline: false
    });
  }
});

app.post('/api/auth/social-sync', async (req, res) => {
  const { authData } = req.body;
  if (!authData) return res.status(400).json({ error: 'No auth data provided' });

  try {
    // Try to extract from rawLocalStorage if available
    let token = 'social-token';
    let email = 'usuario@social.vuttik';
    let userId = uuidv4();
    let businessId = 'NEG-DEFAULT';
    
    if (authData.rawLocalStorage) {
      const storage = authData.rawLocalStorage;
      // Try to find a user profile or business in storage
      for (const key of Object.keys(storage)) {
        try {
          const parsed = JSON.parse(storage[key]);
          if (parsed.token) token = parsed.token;
          if (parsed.idToken) token = parsed.idToken;
          if (parsed.email) email = parsed.email;
          if (parsed.uid || parsed.localId) userId = parsed.uid || parsed.localId;
          if (parsed.business_id || parsed.businessId) businessId = parsed.business_id || parsed.businessId;
        } catch(e) {}
      }
    } else {
      token = authData.idToken || authData.token || token;
      email = authData.email || email;
      userId = authData.localId || authData.userId || userId;
    }
    
    // Hash a placeholder password since they login via social
    const hash = await bcrypt.hash('social-login', 10);
    
    await run(`INSERT OR REPLACE INTO offline_sessions (id, user_id, correo, nombre, role, password_hash, cloud_token, business_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, email, 'Usuario Social', 'admin', hash, token, '{}', new Date().toISOString()]
    );

    return res.json({ 
      token, 
      user: { id: userId, email }, 
      profile: { nombre: 'Usuario Social', rol: 'admin', business: { id: businessId, nombre: 'Mi Negocio' }, business_id: businessId },
      isOnline: true 
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// Create Sale (Works Offline)
app.post('/api/pos/sale', async (req, res) => {
  const { business_id, user_id, total, items } = req.body;
  const id = uuidv4();
  
  await run('INSERT INTO sales (id, business_id, user_id, total, items, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, business_id, user_id, total, JSON.stringify(items), new Date().toISOString()]);

  // Queue to sync
  await addToSyncQueue('CREATE_SALE', { id, business_id, user_id, total, items }, business_id, user_id);

  // Trigger sync in background immediately if online
  processSyncQueue().catch(() => {});

  res.json({ success: true, saleId: id });
});

// Ping online status
app.get('/api/status', async (req, res) => {
  const online = await isCloudOnline();
  res.json({ online });
});

// Products
app.get('/api/products/:businessId', async (req, res) => {
  const products = await all('SELECT * FROM products_cache WHERE business_id = ?', [req.params.businessId]);
  res.json(products);
});

// Clients
app.get('/api/clients/:businessId', async (req, res) => {
  const clients = await all('SELECT * FROM clients_cache WHERE business_id = ?', [req.params.businessId]);
  res.json(clients);
});

app.post('/api/clients', async (req, res) => {
  const { business_id, user_id, name, phone } = req.body;
  const id = uuidv4();
  await run('INSERT INTO clients_cache (id, business_id, name, phone) VALUES (?, ?, ?, ?)', [id, business_id, name, phone]);
  await addToSyncQueue('CREATE_CLIENT', { id, business_id, name, phone }, business_id, user_id);
  processSyncQueue().catch(() => {});
  res.json({ success: true, client: { id, business_id, name, phone } });
});

// Shifts (Cajas)
app.get('/api/shifts/:businessId/active', async (req, res) => {
  const shifts = await all('SELECT * FROM shifts WHERE business_id = ? AND status = ? ORDER BY opened_at DESC LIMIT 1', [req.params.businessId, 'open']);
  res.json(shifts.length > 0 ? shifts[0] : null);
});

app.post('/api/shifts/open', async (req, res) => {
  const { business_id, user_id, opening_amount } = req.body;
  const id = uuidv4();
  await run('INSERT INTO shifts (id, business_id, user_id, opening_amount, opened_at, status) VALUES (?, ?, ?, ?, ?, ?)', 
    [id, business_id, user_id, opening_amount, new Date().toISOString(), 'open']);
  await addToSyncQueue('OPEN_SHIFT', { id, business_id, opening_amount }, business_id, user_id);
  processSyncQueue().catch(() => {});
  res.json({ success: true, shiftId: id });
});

app.post('/api/shifts/close', async (req, res) => {
  const { id, closing_amount, user_id } = req.body;
  const shift = await all('SELECT * FROM shifts WHERE id = ?', [id]);
  if (!shift.length) return res.status(404).json({ error: 'Shift not found' });
  
  await run('UPDATE shifts SET closing_amount = ?, closed_at = ?, status = ? WHERE id = ?', 
    [closing_amount, new Date().toISOString(), 'closed', id]);
  await addToSyncQueue('CLOSE_SHIFT', { id, closing_amount }, shift[0].business_id, user_id);
  processSyncQueue().catch(() => {});
  res.json({ success: true });
});

// Quotes (Cotizaciones)
app.post('/api/quotes', async (req, res) => {
  const { business_id, client_id, total, items, user_id } = req.body;
  const id = uuidv4();
  await run('INSERT INTO quotes (id, business_id, client_id, total, items, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, business_id, client_id, total, JSON.stringify(items), new Date().toISOString()]);
  await addToSyncQueue('CREATE_QUOTE', { id, business_id, client_id, total, items }, business_id, user_id);
  processSyncQueue().catch(() => {});
  res.json({ success: true, quoteId: id });
});

// Serve React frontend in production
import path from 'path';

// Depending on if we run from dist-server/ or server/
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

// START
async function start() {
  await initDB();
  const PORT = process.env.PORT || 3005;
  app.listen(PORT, () => {
    console.log(`Local POS Backend running at http://localhost:${PORT}`);
  });
}

// In production, Electron will start this via require()
if (require.main === module) {
  start();
}
export { start };
