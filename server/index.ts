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
app.use(express.json());
app.use('/api/auth', authRouter);

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

// --- User Routes ---
app.get('/api/users/:uid', async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE uid = ?', [req.params.uid]);
    if (user) {
      user.is_banned = !!user.is_banned;
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { uid, email, displayName, photoURL, role, planId } = req.body;
  try {
    const existing = await get('SELECT uid FROM users WHERE uid = ?', [uid]);
    if (existing) {
      await run(
        'UPDATE users SET email = ?, display_name = ?, photo_url = ?, role = ?, plan_id = ? WHERE uid = ?',
        [email, displayName, photoURL, role, planId, uid]
      );
    } else {
      await run(
        'INSERT INTO users (uid, email, display_name, photo_url, role, plan_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
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
    const rows = await all('SELECT * FROM categories ORDER BY order_index ASC');
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

app.get('/api/transaction-types', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM transaction_types ORDER BY label ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
  const { categoryId } = req.query;
  try {
    let query = 'SELECT * FROM products';
    const params = [];
    if (categoryId && categoryId !== 'GLOBAL') {
      query += ' WHERE category_id = ?';
      params.push(categoryId);
    }
    query += ' ORDER BY created_at DESC';
    const rows = await all(query, params);
    const products = rows.map(r => ({
      ...r,
      images: JSON.parse(r.images || '[]'),
      customFields: JSON.parse(r.custom_fields || '{}'),
      is_on_sale: !!r.is_on_sale
    }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  const id = uuidv4();
  const data = req.body;
  try {
    await run(
      `INSERT INTO products (
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Social Posts Routes ---
app.get('/api/posts', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM posts ORDER BY created_at DESC');
    const posts = await Promise.all(rows.map(async (r) => {
      const likes = await all('SELECT user_id FROM post_likes WHERE post_id = ?', [r.id]);
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
      'INSERT INTO posts (id, author_id, author_name, author_avatar, content, image_url, location, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.authorId, data.authorName, data.authorAvatar, data.content, data.image, data.location, data.isVerified ? 1 : 0, new Date().toISOString()]
    );
    res.json({ id, success: true });
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
    await run(
      'INSERT INTO metrics (user_id, action, target_id, target_type, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, action, targetId, targetType, JSON.stringify(metadata || {}), timestamp]
    );

    // Update Daily Aggregated Stats
    if (['view', 'search', 'contact'].includes(action)) {
      const field = action === 'view' ? 'views' : (action === 'search' ? 'searches' : 'contacts');
      
      // Calculate volume if it's a contact action
      let volumeIncrement = 0;
      if (action === 'contact' && targetId) {
        const product = await get('SELECT price FROM products WHERE id = ?', [targetId]);
        volumeIncrement = product?.price || 0;
      }

      await run(`
        INSERT INTO daily_stats (date, ${field}, total_p2p_volume) 
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
    const totalUsers = await get('SELECT COUNT(*) as count FROM users');
    const totalProducts = await get('SELECT COUNT(*) as count FROM products');
    const pendingReports = await get("SELECT COUNT(*) as count FROM metrics WHERE action = 'flag'");
    
    // P2P Volume - Sum from daily stats for speed, but fallback to real metrics if needed
    const volumeData = await get('SELECT SUM(total_p2p_volume) as total FROM daily_stats');
    
    // Distribution by category
    const distribution = await all(`
      SELECT c.name, COUNT(p.id) as value 
      FROM categories c 
      LEFT JOIN products p ON c.id = p.category_id 
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
      FROM daily_stats 
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
      FROM metrics m 
      JOIN products p ON m.target_id = p.id 
      WHERE p.author_id = ? AND m.action = 'view'
    `, [userId]);

    const totalContacts = await get(`
      SELECT COUNT(*) as count 
      FROM metrics m 
      JOIN products p ON m.target_id = p.id 
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
