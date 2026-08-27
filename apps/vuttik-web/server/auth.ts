import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { get, run, all } from './db.js';
import { getDB, saveDB, emptyBusiness, generateCode } from './pos-backend.js';
import { ethers } from 'ethers';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from './mailer.js';

export const authRouter = express.Router();

import {
  JWT_SECRET,
  authenticateToken,
  requireMegaGuardian,
  invalidateUser,
  authLimiter,
  strictLimiter,
} from './middleware.js';

// Re-exported so existing imports of `authenticateToken` from this module keep working.
export { authenticateToken };

const GOOGLE_CLIENT_ID = () => process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = () => process.env.GOOGLE_CLIENT_SECRET || '';
const FACEBOOK_APP_ID = () => process.env.VITE_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = () => process.env.FACEBOOK_APP_SECRET || '';

/**
 * Minimum password policy. Kept deliberately simple: length is the property
 * that actually resists offline cracking.
 */
const MIN_PASSWORD_LENGTH = 8;
const validatePassword = (password: unknown): string | null => {
  if (typeof password !== 'string') return 'La contraseña es obligatoria';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (password.length > 200) return 'La contraseña es demasiado larga';
  return null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmail = (email: unknown): string | null => {
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) return 'Correo electrónico inválido';
  if (email.length > 254) return 'El correo es demasiado largo';
  return null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// --- Local Email/Password ---

authRouter.post('/register', authLimiter, async (req, res) => {
  const { name, password } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  const emailError = validateEmail(req.body.email);
  if (emailError) return res.status(400).json({ error: emailError });
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  const email = normalizeEmail(req.body.email);

  try {
    const existing = await get('SELECT uid FROM vuttik_users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const uid = uuidv4();
    const verificationToken = uuidv4();

    const isProd = process.env.NODE_ENV === 'production';
    const emailVerifiedStatus = isProd ? 0 : 1;
    const emailVerifiedFrontend = !isProd;

    await run(
      'INSERT INTO vuttik_users (uid, email, display_name, role, plan_id, created_at, password_hash, oauth_provider, email_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uid, email, name, 'user', 'free', new Date().toISOString(), hash, 'local', emailVerifiedStatus, verificationToken]
    );

    if (isProd) {
      // Send real verification email
      await sendVerificationEmail(email, name, verificationToken);
    } else {
      console.log(`\n\n=== MODO LOCAL: CORREO AUTO-VERIFICADO ===\nPara: ${email}\nEl sistema saltó la verificación porque estás en entorno local.\n==========================================\n\n`);
    }

    const token = jwt.sign({ uid, email, role: 'user' }, JWT_SECRET(), { expiresIn: '30d' });
    res.json({ token, user: { uid, email, displayName: name, role: 'user', planId: 'free', isBanned: false, onboardingCompleted: false, emailVerified: emailVerifiedFrontend } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const { password } = req.body;
  if (!req.body.email || !password) return res.status(400).json({ error: 'Missing email or password' });

  const email = normalizeEmail(String(req.body.email));

  try {
    const user: any = await get('SELECT * FROM vuttik_users WHERE email = ?', [email]);
    if (!user) {
      // Spend comparable time on the miss so response latency does not reveal
      // whether the address is registered.
      await bcrypt.compare(String(password), '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.is_banned) return res.status(403).json({ error: 'Cuenta suspendida' });

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
            isBanned: !!user.is_banned,
            onboardingCompleted: !!user.onboarding_completed,
            emailVerified: !!user.email_verified,
            dateOfBirth: user.date_of_birth
        } 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const user: any = await get('SELECT * FROM vuttik_users WHERE uid = ?', [req.user.uid]);
    if (!user) return res.status(404).json({ error: 'No user found' });
    delete user.password_hash;

    let displayName = user.display_name;
    let photoURL = user.photo_url;
    let effectiveUid = user.uid;

    let businessName = undefined;
    let businessLogo = undefined;

    if (user.active_profile_mode && user.active_profile_mode !== 'personal') {
      let bUid = user.active_profile_mode;
      
      // Legacy support: if it's literally 'business', find their first business
      if (bUid === 'business') {
        bUid = user.uid; // default
        const ownBusiness = await get('SELECT uid FROM vuttik_business_profiles WHERE uid = ?', [user.uid]);
        if (!ownBusiness) {
          const memberOf = await get('SELECT business_uid FROM vuttik_business_members WHERE member_uid = ? AND status = "accepted" LIMIT 1', [user.uid]);
          if (memberOf) bUid = memberOf.business_uid;
        }
      }

      const business = await get('SELECT name, logo FROM vuttik_business_profiles WHERE uid = ?', [bUid]);
      if (business) {
        effectiveUid = bUid;
        businessName = business.name;
        businessLogo = business.logo;
      }
    }

    res.json({
        ...user,
        displayName, 
        photoURL, 
        businessName,
        businessLogo,
        planId: user.plan_id,
        isBanned: !!user.is_banned,
        onboardingCompleted: !!user.onboarding_completed,
        emailVerified: !!user.email_verified,
        dateOfBirth: user.date_of_birth,
        activeProfileMode: user.active_profile_mode || 'personal'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Clears the POS session cookie. The JWT itself is stateless and is discarded
 * client-side, but the session set during the Google callback has to be
 * destroyed server-side or the POS dashboard would still consider the browser
 * signed in.
 */
authRouter.post('/logout', (req: any, res) => {
  const s = req.session;
  if (s && typeof s.destroy === 'function') {
    s.destroy(() => {
      res.clearCookie('vuttik_pos_sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
    return;
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// --- Email Verification Routes ---
authRouter.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Falta el token de verificación' });

  try {
    const user = await get('SELECT uid FROM vuttik_users WHERE verification_token = ?', [token]);
    if (!user) return res.status(400).json({ error: 'Token inválido o expirado' });

    await run('UPDATE vuttik_users SET email_verified = 1, verification_token = NULL WHERE uid = ?', [user.uid]);
    res.json({ success: true, message: 'Correo verificado con éxito' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.post('/resend-verification', strictLimiter, authenticateToken, async (req: any, res) => {
  try {
    const user = await get('SELECT email, email_verified, display_name FROM vuttik_users WHERE uid = ?', [req.user.uid]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.email_verified) return res.status(400).json({ error: 'El correo ya está verificado' });

    const newToken = uuidv4();
    await run('UPDATE vuttik_users SET verification_token = ? WHERE uid = ?', [newToken, req.user.uid]);

    if (process.env.NODE_ENV === 'production') {
      await sendVerificationEmail(user.email, user.display_name || 'Usuario', newToken);
    } else {
      console.log(`\n\n=== REENVÍO DE SIMULACIÓN DE CORREO ===\nPara: ${user.email}\nEnlace de Verificación: http://localhost:3000/verificar?token=${newToken}\n=====================================\n\n`);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Password Reset Routes ---
authRouter.post('/request-password-reset', strictLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Falta el correo electrónico' });

  try {
    const user: any = await get('SELECT uid, display_name FROM vuttik_users WHERE email = ? AND oauth_provider = "local"', [email]);
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
    }

    const resetToken = uuidv4();
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24); // Token valid for 24 hours

    await run('UPDATE vuttik_users SET reset_password_token = ?, reset_password_expires = ? WHERE uid = ?', [resetToken, expirationDate.toISOString(), user.uid]);

    if (process.env.NODE_ENV === 'production') {
      await sendPasswordResetEmail(email, user.display_name || 'Usuario', resetToken);
    } else {
      console.log(`\n\n=== MODO LOCAL: RECUPERACIÓN DE CONTRASEÑA ===\nPara: ${email}\nEnlace: http://localhost:3000/reset-password?token=${resetToken}\n==========================================\n\n`);
    }

    res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.post('/reset-password', authLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Faltan datos requeridos' });

  try {
    const user: any = await get('SELECT uid, reset_password_expires FROM vuttik_users WHERE reset_password_token = ?', [token]);
    if (!user) return res.status(400).json({ error: 'El enlace es inválido o ya fue utilizado.' });

    const now = new Date();
    const expiresAt = new Date(user.reset_password_expires);
    if (now > expiresAt) return res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await run('UPDATE vuttik_users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE uid = ?', [hash, user.uid]);

    res.json({ success: true, message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    const tokenData: any = await tokenResponse.json();
    if (!tokenResponse.ok) return res.status(400).json({ error: 'Google Token Error', details: tokenData });

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile: any = await userResponse.json();
    if (!profile.id || !profile.email) return res.status(400).json({ error: 'Failed to retrieve Google profile' });

    // Linking an existing account by email is only safe once Google states the
    // address is verified; otherwise it would be an account-takeover vector.
    if (profile.verified_email === false) {
      return res.status(400).json({ error: 'Tu correo de Google no está verificado' });
    }

    const googleEmail = normalizeEmail(profile.email);
    let user: any = await get('SELECT * FROM vuttik_users WHERE email = ?', [googleEmail]);

    if (user) {
        if (user.oauth_provider !== 'google') {
           await run('UPDATE vuttik_users SET oauth_provider = ?, oauth_id = ?, display_name = ? WHERE email = ?', ['google', profile.id, profile.name, googleEmail]);
           invalidateUser(user.uid);
        }
    } else {
        const uid = uuidv4();
        await run(
          'INSERT INTO vuttik_users (uid, email, display_name, photo_url, role, plan_id, created_at, oauth_provider, oauth_id, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
          [uid, googleEmail, profile.name, profile.picture, 'user', 'free', new Date().toISOString(), 'google', profile.id]
        );
        user = await get('SELECT * FROM vuttik_users WHERE email = ?', [googleEmail]);

        // Enviar correo de bienvenida al registrarse por primera vez con Google
        sendWelcomeEmail(googleEmail, profile.name).catch(console.error);
    }

    if (!user) return res.status(500).json({ error: 'No se pudo crear la cuenta' });
    if (user.is_banned) return res.status(403).json({ error: 'Cuenta suspendida' });

    const token = generateOAuthJWT(user.uid, user.email, user.role);
    
    // Set POS session explicitly so POS dashboard can authenticate via cookie
    const s = (req as any).session;
    if (s) {
      s.owner_id = user.uid;
      s.rol = 'admin';
      if (typeof s.save === 'function') s.save();
    }

    res.json({ 
        token, 
        user: { 
            ...user, 
            displayName: user.display_name, 
            photoURL: user.photo_url, 
            planId: user.plan_id, 
            isBanned: !!user.is_banned,
            onboardingCompleted: !!user.onboarding_completed,
            emailVerified: !!user.email_verified
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
    const tokenData: any = await tokenResponse.json();
    if (!tokenResponse.ok) return res.status(400).json({ error: tokenData.error?.message || 'Facebook Token Error', details: tokenData });

    const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`);
    const profile: any = await userResponse.json();
    if (!profile.id) return res.status(400).json({ error: 'Failed to retrieve Facebook profile' });
    
    const email = profile.email ? normalizeEmail(profile.email) : `${profile.id}@facebook.local`;

    // Prefer matching on the provider id: it is stable and cannot be spoofed by
    // changing the address on the Facebook side.
    let user: any = await get(
      'SELECT * FROM vuttik_users WHERE oauth_provider = ? AND oauth_id = ?',
      ['facebook', profile.id]
    );
    if (!user) user = await get('SELECT * FROM vuttik_users WHERE email = ?', [email]);

    if (user) {
        if (user.oauth_provider !== 'facebook') {
           // Facebook does not guarantee the address is verified, so silently
           // adopting a local or Google account here would allow takeover.
           return res.status(409).json({
             error: `Ya existe una cuenta con este correo creada con ${user.oauth_provider === 'local' ? 'contraseña' : user.oauth_provider}. Inicia sesión con ese método.`,
           });
        }
    } else {
        const uid = uuidv4();
        await run(
          'INSERT INTO vuttik_users (uid, email, display_name, photo_url, role, plan_id, created_at, oauth_provider, oauth_id, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
          [uid, email, profile.name, profile.picture?.data?.url, 'user', 'free', new Date().toISOString(), 'facebook', profile.id]
        );
        // Look up by the same `email` used in the INSERT. Facebook does not always
        // return an address, in which case `email` is the @facebook.local fallback
        // and `profile.email` is undefined.
        user = await get('SELECT * FROM vuttik_users WHERE email = ?', [email]);

        // Only mail real addresses; the fallback domain does not exist.
        if (profile.email) {
          sendWelcomeEmail(email, profile.name).catch(console.error);
        }
    }

    if (!user) return res.status(500).json({ error: 'No se pudo crear la cuenta' });

    const token = generateOAuthJWT(user.uid, user.email, user.role);
    res.json({ 
        token, 
        user: { 
            ...user, 
            displayName: user.display_name, 
            photoURL: user.photo_url, 
            planId: user.plan_id, 
            isBanned: !!user.is_banned,
            onboardingCompleted: !!user.onboarding_completed
        } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Web3 Wallet Auth ---

// Pending wallet challenges, keyed by lowercase address.
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000;

/** Removes expired challenges so the map cannot grow without bound. */
const pruneNonces = () => {
  const now = Date.now();
  for (const [address, entry] of nonceStore) {
    if (entry.expiresAt < now) nonceStore.delete(address);
  }
};

authRouter.get('/wallet/nonce/:address', authLimiter, (req, res) => {
  const { address } = req.params;
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Dirección de wallet inválida' });
  }

  pruneNonces();

  // Cryptographically random, unlike the previous 6-digit Math.random value
  // which was both guessable and vulnerable to replay.
  const nonce = randomBytes(16).toString('hex');
  nonceStore.set(address.toLowerCase(), { nonce, expiresAt: Date.now() + NONCE_TTL_MS });

  res.json({ nonce });
});

authRouter.post('/wallet/verify', authLimiter, async (req, res) => {
  const { address, signature } = req.body;
  if (!address || !signature) return res.status(400).json({ error: 'Missing address or signature' });
  if (!ethers.isAddress(address)) return res.status(400).json({ error: 'Dirección de wallet inválida' });

  const normalizedAddress = address.toLowerCase();
  const entry = nonceStore.get(normalizedAddress);

  if (!entry) return res.status(400).json({ error: 'Nonce not found or expired' });
  if (entry.expiresAt < Date.now()) {
    nonceStore.delete(normalizedAddress);
    return res.status(400).json({ error: 'El desafío expiró. Solicita uno nuevo.' });
  }
  const nonce = entry.nonce;

  try {
    const expectedMessage = `Iniciando sesión en Vuttik Market. Nonce: ${nonce}`;
    const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);
    
    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Signature valid. Clear nonce so it cannot be replayed.
    nonceStore.delete(normalizedAddress);
    
    const TARGET_MEGA_GUARDIAN_ADDRESS = '0x46801571a40b11a1387D0a92C636F7a1D6FE8711'.toLowerCase();
    const isMegaGuardian = normalizedAddress === TARGET_MEGA_GUARDIAN_ADDRESS;
    
    const email = `${normalizedAddress}@wallet.local`;
    
    let user: any = await get('SELECT * FROM vuttik_users WHERE oauth_provider = ? AND oauth_id = ?', ['wallet', normalizedAddress]);
    
    if (!user) {
      const uid = uuidv4();
      const role = isMegaGuardian ? 'mega_guardian' : 'user';
      const planId = isMegaGuardian ? 'mega_guardian' : 'free';
      const displayName = isMegaGuardian ? 'Mega Guardian' : `Wallet ${normalizedAddress.substring(0, 6)}`;
      
      await run(
        'INSERT INTO vuttik_users (uid, email, display_name, role, plan_id, created_at, oauth_provider, oauth_id, onboarding_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uid, email, displayName, role, planId, new Date().toISOString(), 'wallet', normalizedAddress, isMegaGuardian ? 1 : 0]
      );
      user = await get('SELECT * FROM vuttik_users WHERE uid = ?', [uid]);
    } else if (isMegaGuardian && (user.role !== 'mega_guardian' || user.plan_id !== 'mega_guardian')) {
      // Force update to mega guardian if address matches
      await run('UPDATE vuttik_users SET role = ?, plan_id = ?, onboarding_completed = 1 WHERE uid = ?', ['mega_guardian', 'mega_guardian', user.uid]);
      user.role = 'mega_guardian';
      user.plan_id = 'mega_guardian';
      user.onboarding_completed = 1;
    }
    
    const token = generateOAuthJWT(user.uid, user.email, user.role);
    res.json({ 
        token, 
        user: { 
            ...user, 
            displayName: user.display_name, 
            photoURL: user.photo_url, 
            planId: user.plan_id, 
            isBanned: !!user.is_banned,
            onboardingCompleted: !!user.onboarding_completed
        } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get Business Requests
authRouter.get('/business-requests', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const requests = await all(`
      SELECT r.id, r.user_id, r.status, r.created_at, r.business_name, r.logo, r.location, u.display_name, u.email 
      FROM vuttik_business_requests r
      JOIN vuttik_users u ON r.user_id = u.uid
      ORDER BY r.created_at DESC
    `);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Approve Business Request
authRouter.post('/business-requests/:id/approve', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const request: any = await get('SELECT * FROM vuttik_business_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });
    
    await run(`UPDATE vuttik_business_requests SET status = 'approved' WHERE id = ?`, [req.params.id]);
    await run(`UPDATE vuttik_users SET multi_business_approved = 1 WHERE uid = ?`, [request.user_id]);
    
    try {
        const db = getDB();
        const existingCodes = db.businesses.map((b: any) => b.codigo);
        const codigo = generateCode(request.business_name || 'NEG', existingCodes);
        const newBizId = 'biz-' + Date.now();
        const newBiz = emptyBusiness(newBizId, (request.business_name || 'Negocio').trim(), codigo, request.user_id);
        
        if (request.location) {
            try {
                (newBiz as any).location = JSON.parse(request.location);
            } catch (e) {}
        }
        if (request.logo) {
            (newBiz as any).logo = request.logo;
        }
        
        db.businesses.push(newBiz);
        saveDB(db);
    } catch (dbErr) {
        console.error('Error al crear negocio en db.json:', dbErr);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Reject Business Request
authRouter.post('/business-requests/:id/reject', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const request: any = await get('SELECT * FROM vuttik_business_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });
    
    await run(`UPDATE vuttik_business_requests SET status = 'rejected' WHERE id = ?`, [req.params.id]);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- POS business administration ---
// These live in db.json (the POS store), not SQLite, so they are managed here
// rather than through the generic table explorer below.

authRouter.post('/users/:id/enable-multi-business', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    await run('UPDATE vuttik_users SET multi_business_approved = 1 WHERE uid = ? OR id = ?', [req.params.id, req.params.id]);
    invalidateUser(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.get('/users/:id/pos-businesses', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const user: any = await get('SELECT uid FROM vuttik_users WHERE uid = ? OR id = ?', [req.params.id, req.params.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const db = getDB();
    const userBiz = db.businesses
      .filter((b: any) => b.owner_id === user.uid)
      .map((b: any) => ({
        id: b.id,
        nombre: b.nombre,
        codigo: b.codigo,
        fecha_creacion: b.fecha_creacion,
        is_suspended: b.is_suspended || false,
      }));
    res.json(userBiz);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.post('/pos-businesses/:id/suspend', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const db = getDB();
    const idx = db.businesses.findIndex((b: any) => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Negocio no encontrado' });

    db.businesses[idx].is_suspended = !db.businesses[idx].is_suspended;
    saveDB(db);
    res.json({ success: true, is_suspended: db.businesses[idx].is_suspended });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.delete('/pos-businesses/:id', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const db = getDB();
    const idx = db.businesses.findIndex((b: any) => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Negocio no encontrado' });

    // Only the POS business record is removed. Marketplace products published by
    // the owner are global and are deliberately left alone.
    db.businesses.splice(idx, 1);
    saveDB(db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.post('/pos-businesses/:id/transfer', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const { newOwnerEmail } = req.body;
    if (!newOwnerEmail) return res.status(400).json({ error: 'Email requerido' });

    const newUser: any = await get('SELECT uid FROM vuttik_users WHERE email = ?', [normalizeEmail(String(newOwnerEmail))]);
    if (!newUser) return res.status(404).json({ error: 'Usuario destino no encontrado' });

    const db = getDB();
    const idx = db.businesses.findIndex((b: any) => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Negocio no encontrado' });

    db.businesses[idx].owner_id = newUser.uid;
    saveDB(db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- MEGA GUARDIAN DB EXPLORER ---

/**
 * Table and column names cannot be bound as SQL parameters, so the explorer
 * validates them against an allow-list instead of interpolating raw input.
 */
const EXPLORABLE_TABLES: Record<string, string> = {
  vuttik_users: 'uid',
  vuttik_business_profiles: 'uid',
  vuttik_business_members: 'id',
  vuttik_business_requests: 'id',
  vuttik_products: 'id',
  vuttik_posts: 'id',
  vuttik_comments: 'id',
  vuttik_categories: 'id',
  vuttik_transaction_types: 'id',
  vuttik_subscription_plans: 'id',
  vuttik_notifications: 'id',
  vuttik_reports: 'id',
  vuttik_metrics: 'id',
  vuttik_conversations: 'id',
  vuttik_messages: 'id',
};

/** Column names are further restricted to plain identifiers. */
const SAFE_COLUMN_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Never writable through the generic explorer, to avoid silent privilege escalation. */
const PROTECTED_COLUMNS = new Set(['uid', 'id', 'password_hash', 'reset_password_token', 'verification_token']);

const resolveTable = (table: string): string | null =>
  Object.prototype.hasOwnProperty.call(EXPLORABLE_TABLES, table) ? EXPLORABLE_TABLES[table] : null;

authRouter.get('/mega-guardian/db/:source/:table', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const { source, table } = req.params;
    if (source === 'sqlite') {
      if (!resolveTable(table)) return res.status(400).json({ error: 'Tabla no permitida' });
      const rows: any[] = await all(`SELECT * FROM ${table} LIMIT 1000`);
      // Strip credential material even from the admin view.
      for (const row of rows) {
        delete row.password_hash;
        delete row.reset_password_token;
        delete row.verification_token;
      }
      return res.json(rows);
    } else if (source === 'json') {
      const db = getDB();
      if (!db[table]) return res.status(404).json({ error: `Table ${table} not found in json db` });
      return res.json(db[table]);
    }
    return res.status(400).json({ error: 'Invalid source' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.put('/mega-guardian/db/:source/:table/:id', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const { source, table, id } = req.params;
    const updateData = req.body;

    if (source === 'sqlite') {
      const primaryKeyCol = resolveTable(table);
      if (!primaryKeyCol) return res.status(400).json({ error: 'Tabla no permitida' });

      const keys = Object.keys(updateData).filter(
        k => SAFE_COLUMN_RE.test(k) && !PROTECTED_COLUMNS.has(k)
      );
      if (keys.length === 0) return res.json({ success: true });

      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => updateData[k]);
      values.push(id);

      await run(`UPDATE ${table} SET ${setClause} WHERE ${primaryKeyCol} = ?`, values);
      // A role or ban edit must not wait for the auth cache to expire.
      if (table === 'vuttik_users') invalidateUser(id);
      return res.json({ success: true });
    } else if (source === 'json') {
      const db = getDB();
      if (!db[table]) return res.status(404).json({ error: `Table ${table} not found in json db` });
      
      const primaryKeyCol = table === 'owners' ? 'uid' : 'id';
      const idx = db[table].findIndex((r: any) => r[primaryKeyCol] === id);
      if (idx === -1) return res.status(404).json({ error: 'Record not found' });
      
      db[table][idx] = { ...db[table][idx], ...updateData };
      saveDB(db);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Invalid source' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.delete('/mega-guardian/db/:source/:table/:id', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const { source, table, id } = req.params;

    if (source === 'sqlite') {
      const primaryKeyCol = resolveTable(table);
      if (!primaryKeyCol) return res.status(400).json({ error: 'Tabla no permitida' });
      await run(`DELETE FROM ${table} WHERE ${primaryKeyCol} = ?`, [id]);
      if (table === 'vuttik_users') invalidateUser(id);
      return res.json({ success: true });
    } else if (source === 'json') {
      const db = getDB();
      if (!db[table]) return res.status(404).json({ error: `Table ${table} not found in json db` });
      
      const primaryKeyCol = table === 'owners' ? 'uid' : 'id';
      const idx = db[table].findIndex((r: any) => r[primaryKeyCol] === id);
      if (idx === -1) return res.status(404).json({ error: 'Record not found' });
      
      db[table].splice(idx, 1);
      saveDB(db);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Invalid source' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
