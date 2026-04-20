import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { get, run } from './db.js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const authRouter = express.Router();
const JWT_SECRET = () => process.env.JWT_SECRET || 'vuttik-super-secret-key-change-in-prod';

const GOOGLE_CLIENT_ID = () => process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = () => process.env.GOOGLE_CLIENT_SECRET || '';
const FACEBOOK_APP_ID = () => process.env.VITE_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = () => process.env.FACEBOOK_APP_SECRET || '';

// Middleware to protect routes mapping JWT to req.user
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET(), (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// --- Local Email/Password ---

authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const existing = await get('SELECT uid FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const uid = uuidv4();

    await run(
      'INSERT INTO users (uid, email, display_name, role, plan_id, created_at, password_hash, oauth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uid, email, name, 'user', 'free', new Date().toISOString(), hash, 'local']
    );

    const token = jwt.sign({ uid, email, role: 'user' }, JWT_SECRET(), { expiresIn: '30d' });
    res.json({ token, user: { uid, email, displayName: name, role: 'user', planId: 'free', isBanned: false } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  try {
    const user: any = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.oauth_provider && user.oauth_provider !== 'local') {
      return res.status(401).json({ error: `This account was created with ${user.oauth_provider}. Please sign in with that specific provider.` });
    }

    if (!user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET(), { expiresIn: '30d' });
    delete user.password_hash;
    
    res.json({ 
        token, 
        user: { 
            ...user, 
            displayName: user.display_name, 
            photoURL: user.photo_url, 
            planId: user.plan_id, 
            isBanned: !!user.is_banned 
        } 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const user: any = await get('SELECT * FROM users WHERE uid = ?', [req.user.uid]);
    if (!user) return res.status(404).json({ error: 'No user found' });
    delete user.password_hash;
    res.json({
        ...user,
        displayName: user.display_name,
        photoURL: user.photo_url,
        planId: user.plan_id,
        isBanned: !!user.is_banned
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Manual OAuth Callbacks ---

export const generateOAuthJWT = (uid: string, email: string, role: string) => {
    return jwt.sign({ uid, email, role }, JWT_SECRET(), { expiresIn: '30d' });
};

authRouter.post('/google/callback', async (req, res) => {
  const { code, redirect_uri } = req.body;
  if (!code) return res.status(400).json({ error: 'Authorization code is required' });

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID(),
        client_secret: GOOGLE_CLIENT_SECRET(),
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) return res.status(400).json({ error: 'Google Token Error', details: tokenData });

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userResponse.json();
    if (!profile.id || !profile.email) return res.status(400).json({ error: 'Failed to retrieve Google profile' });

    let user: any = await get('SELECT * FROM users WHERE email = ?', [profile.email]);
    
    if (user) {
        if (user.oauth_provider !== 'google') {
           await run('UPDATE users SET oauth_provider = ?, oauth_id = ?, display_name = ? WHERE email = ?', ['google', profile.id, profile.name, profile.email]);
        }
    } else {
        const uid = uuidv4();
        await run(
          'INSERT INTO users (uid, email, display_name, photo_url, role, plan_id, created_at, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [uid, profile.email, profile.name, profile.picture, 'user', 'free', new Date().toISOString(), 'google', profile.id]
        );
        user = await get('SELECT * FROM users WHERE email = ?', [profile.email]);
    }

    const token = generateOAuthJWT(user.uid, user.email, user.role);
    res.json({ 
        token, 
        user: { 
            ...user, 
            displayName: user.display_name, 
            photoURL: user.photo_url, 
            planId: user.plan_id, 
            isBanned: !!user.is_banned 
        } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.post('/facebook/callback', async (req, res) => {
  const { code, redirect_uri } = req.body;
  if (!code) return res.status(400).json({ error: 'Authorization code is required' });

  try {
    const tokenResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID()}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${FACEBOOK_APP_SECRET()}&code=${code}`);
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) return res.status(400).json({ error: tokenData.error?.message || 'Facebook Token Error', details: tokenData });

    const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`);
    const profile = await userResponse.json();
    if (!profile.id) return res.status(400).json({ error: 'Failed to retrieve Facebook profile' });
    
    const email = profile.email || `${profile.id}@facebook.local`;

    let user: any = await get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (user) {
        if (user.oauth_provider !== 'facebook') {
           await run('UPDATE users SET oauth_provider = ?, oauth_id = ?, display_name = ? WHERE email = ?', ['facebook', profile.id, profile.name, email]);
        }
    } else {
        const uid = uuidv4();
        await run(
          'INSERT INTO users (uid, email, display_name, photo_url, role, plan_id, created_at, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [uid, email, profile.name, profile.picture?.data?.url || null, 'user', 'free', new Date().toISOString(), 'facebook', profile.id]
        );
        user = await get('SELECT * FROM users WHERE email = ?', [email]);
    }

    const token = generateOAuthJWT(user.uid, user.email, user.role);
    res.json({ 
        token, 
        user: { 
            ...user, 
            displayName: user.display_name, 
            photoURL: user.photo_url, 
            planId: user.plan_id, 
            isBanned: !!user.is_banned 
        } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
