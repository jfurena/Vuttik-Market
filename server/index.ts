import express from 'express';
import cors from 'cors';
import { initDB, run, all, get } from './db.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Database
initDB().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
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
      allowed_types: JSON.parse(r.allowed_types),
      fields: JSON.parse(r.fields),
      system_fields: JSON.parse(r.system_fields)
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
  try {
    await run(
      'INSERT INTO metrics (user_id, action, target_id, target_type, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, action, targetId, targetType, JSON.stringify(metadata || {}), new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Vuttik SQL API server running on port ${port}`);
});
