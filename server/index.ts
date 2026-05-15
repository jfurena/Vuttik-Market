import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
import { initDB, run, all, get } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import { authRouter, authenticateToken } from './auth.js';

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRouter);

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
app.get('/api/admin/audit-log', async (req, res) => {
  try {
    const logs = await all(`
      SELECT m.*, u.display_name as user_name, u.photo_url as user_avatar
      FROM vuttik_metrics m
      LEFT JOIN vuttik_users u ON m.user_id = u.uid
      ORDER BY m.timestamp DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- User Routes ---
app.get('/api/users/:uid', async (req, res) => {
  try {
    const user = await get('SELECT * FROM vuttik_users WHERE uid = ?', [req.params.uid]);
    if (user) {
      const mappedUser = {
        ...user,
        displayName: user.display_name,
        photoURL: user.photo_url,
        planId: user.plan_id,
        createdAt: user.created_at,
        isBanned: !!user.is_banned
      };
      res.json(mappedUser);
      // Optional: log view profile if a DIFFERENT user is viewing it
      // But we need the viewer's ID. For now, we'll let the frontend call /api/metrics for VIEW_PROFILE
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

app.post('/api/users', async (req, res) => {
  const { uid, email, displayName, photoURL, role, planId } = req.body;
  try {
    const existing = await get('SELECT uid FROM vuttik_users WHERE uid = ?', [uid]);
    if (existing) {
      await run(
        'UPDATE vuttik_users SET email = ?, display_name = ?, photo_url = ?, role = ?, plan_id = ? WHERE uid = ?',
        [email, displayName, photoURL, role, planId, uid]
      );
    } else {
      await run(
        'INSERT INTO vuttik_users (uid, email, display_name, photo_url, role, plan_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uid, email, displayName, photoURL, role || 'user', planId || 'free', new Date().toISOString()]
      );
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
      systemFields: JSON.parse(r.system_fields)
    }));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { id, name, order, allowedTypes, fields, systemFields } = req.body;
  const catId = id || uuidv4();
  try {
    await run(
      'INSERT OR REPLACE INTO vuttik_categories (id, name, order_index, allowed_types, fields, system_fields) VALUES (?, ?, ?, ?, ?, ?)',
      [catId, name, order || 0, JSON.stringify(allowedTypes || []), JSON.stringify(fields || []), JSON.stringify(systemFields || {})]
    );
    res.json({ success: true, id: catId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await run('DELETE FROM vuttik_categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

app.post('/api/transaction-types', async (req, res) => {
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

app.delete('/api/transaction-types/:id', async (req, res) => {
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
    const rows = await all('SELECT * FROM vuttik_subscription_plans');
    const plans = rows.map(r => ({
      ...r,
      features: JSON.parse(r.features || '[]')
    }));
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscription-plans', async (req, res) => {
  const { id, name, price, features } = req.body;
  const planId = id || uuidv4();
  try {
    await run(
      'INSERT OR REPLACE INTO vuttik_subscription_plans (id, name, price, features) VALUES (?, ?, ?, ?)',
      [planId, name, price || 0, JSON.stringify(features || [])]
    );
    res.json({ success: true, id: planId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/subscription-plans/:id', async (req, res) => {
  try {
    await run('DELETE FROM vuttik_subscription_plans WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
    const { categoryId, authorId } = req.query;
    try {
      let query = 'SELECT * FROM vuttik_products';
      const params = [];
      const conditions = [];

      if (categoryId && categoryId !== 'GLOBAL') {
        conditions.push('category_id = ?');
        params.push(categoryId);
      }

      if (authorId) {
        conditions.push('author_id = ?');
        params.push(authorId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';
    const rows = await all(query, params);
    const products = rows.map(r => ({
      ...r,
      typeId: r.type_id,
      categoryId: r.category_id,
      authorId: r.author_id,
      authorName: r.author_name,
      createdAt: r.created_at,
      salePrice: r.sale_price,
      isOnSale: !!r.is_on_sale,
      images: JSON.parse(r.images || '[]'),
      customFields: JSON.parse(r.custom_fields || '{}')
    }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  const id = uuidv4();
  const data = req.body;
  console.log('Publishing product:', { ...data, images: data.images?.length || 0 });
  try {
    await run(
      `INSERT INTO vuttik_products (
        id, title, description, price, currency, category_id, type_id, author_id, 
        author_name, location, phone, lat, lng, barcode, is_on_sale, sale_price, 
        images, custom_fields, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.title, data.description, data.price, data.currency, data.categoryId,
        data.typeId, data.authorId, data.authorName, data.location, data.phone,
        data.lat, data.lng, data.barcode, data.isOnSale ? 1 : 0, data.salePrice,
        JSON.stringify(data.images || []), JSON.stringify(data.customFields || {}),
        new Date().toISOString()
      ]
    );
    res.json({ id, success: true });
    await logAction(data.authorId, 'CREATE_PRODUCT', id, 'product', { title: data.title });
  } catch (error) {
    console.error('Error in /api/products:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query; // For security/logging
  try {
    const product = await get('SELECT title, author_id FROM vuttik_products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    await run('DELETE FROM vuttik_products WHERE id = ?', [id]);
    res.json({ success: true });

    // Log action
    if (userId) await logAction(userId as string, 'DELETE_PRODUCT', id, 'product', { title: product.title });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Social Posts Routes ---
app.get('/api/posts', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM vuttik_posts ORDER BY created_at DESC');
    const posts = await Promise.all(rows.map(async (r) => {
      const likes = await all('SELECT user_id FROM vuttik_post_likes WHERE post_id = ?', [r.id]);
      return {
        ...r,
        likes: likes.map(l => l.user_id),
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
  const id = uuidv4();
  const data = req.body;
  try {
    await run(
      'INSERT INTO vuttik_posts (id, author_id, author_name, author_avatar, content, image_url, location, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.authorId, data.authorName, data.authorAvatar, data.content, data.image, data.location, data.isVerified ? 1 : 0, new Date().toISOString()]
    );
    res.json({ id, success: true });
    await logAction(data.authorId, 'CREATE_POST', id, 'post', { snippet: data.content.substring(0, 50) });
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
    await run(
      'INSERT INTO vuttik_comments (id, post_id, author_id, author_name, author_avatar, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, postId, authorId, authorName, authorAvatar, content, new Date().toISOString()]
    );
    res.json({ id, success: true });

    // Log action
    await logAction(authorId, 'COMMENT', id, 'comment', { postId, snippet: content.substring(0, 30) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Veracity Voting ---
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

// --- Audit Log (Global) ---
app.get('/api/admin/audit-log', async (req, res) => {
  try {
    const rows = await all(`
      SELECT m.*, u.display_name as user_name, u.photo_url as user_avatar
      FROM vuttik_metrics m
      LEFT JOIN vuttik_users u ON m.user_id = u.uid
      ORDER BY m.timestamp DESC LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// --- Admin Actions ---
app.post('/api/users/:uid/ban', async (req, res) => {
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
      WHERE p.author_id = ? AND m.action = 'view'
    `, [userId]);

    const totalContacts = await get(`
      SELECT COUNT(*) as count 
      FROM vuttik_metrics m 
      JOIN vuttik_products p ON m.target_id = p.id 
      WHERE p.author_id = ? AND m.action = 'contact'
    `, [userId]);

    res.json({
      views: totalViews?.count || 0,
      sales: totalContacts?.count || 0, // Using contacts as proxy for sales
      followers: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handled by startServer()

// --- User Search Route ---
app.get('/api/users/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.json([]);
  }
  try {
    const rows = await all(
      `SELECT uid, email, display_name, photo_url, role FROM vuttik_users 
       WHERE display_name LIKE ? OR email LIKE ? LIMIT 20`,
      [`%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// Override /api/posts to support ?filter=following&userId=X
app.get('/api/posts/feed', async (req, res) => {
  const { filter, userId } = req.query;
  try {
    let rows;
    if (filter === 'following' && userId) {
      const following = await all(
        'SELECT following_id FROM vuttik_follows WHERE follower_id = ?',
        [userId]
      );
      if (following.length === 0) return res.json([]);
      const ids = following.map((f: any) => `'${f.following_id}'`).join(',');
      rows = await all(`SELECT * FROM vuttik_posts WHERE author_id IN (${ids}) ORDER BY created_at DESC`);
    } else {
      rows = await all('SELECT * FROM vuttik_posts ORDER BY created_at DESC');
    }
    const posts = await Promise.all(rows.map(async (r: any) => {
      const likes = await all('SELECT user_id FROM vuttik_post_likes WHERE post_id = ?', [r.id]);
      return {
        ...r,
        likes: likes.map((l: any) => l.user_id),
        is_verified: !!r.is_verified,
        comments: 0
      };
    }));
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Conversations Routes ---
// Get all conversations for a user
app.get('/api/conversations/:userId', async (req, res) => {
  try {
    const rows = await all(
      `SELECT c.*, 
        u1.display_name as p1_name, u1.photo_url as p1_photo,
        u2.display_name as p2_name, u2.photo_url as p2_photo
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
  const { userId1, userId2 } = req.body;
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
      'INSERT INTO vuttik_conversations (id, participant_1, participant_2, created_at, last_message_at) VALUES (?, ?, ?, ?, ?)',
      [id, userId1, userId2, now, now]
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
