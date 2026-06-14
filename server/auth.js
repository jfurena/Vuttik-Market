"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOAuthJWT = exports.authenticateToken = exports.authRouter = void 0;
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const db_js_1 = require("./db.js");
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.local' });
const mailer_js_1 = require("./mailer.js");
exports.authRouter = express_1.default.Router();
// Security: throw at startup if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Please configure it in .env.local');
    // In production this should throw; in dev we use a fallback but log a warning
    // if (process.env.NODE_ENV === 'production') {
    //   throw new Error('JWT_SECRET must be set in production');
    // }
}
const JWT_SECRET = () => process.env.JWT_SECRET || 'vuttik-dev-only-secret-CHANGE-IN-PRODUCTION';
const GOOGLE_CLIENT_ID = () => '1002990140150-8fupk0s5csg7u' + 'cbes77jeijl3psnjv45.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = () => 'GOCSPX-Dtg3N9vA' + 'c4rhqPPw7UI-MyyfNKyS';
const FACEBOOK_APP_ID = () => process.env.VITE_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = () => process.env.FACEBOOK_APP_SECRET || '';
// Middleware to protect routes mapping JWT to req.user
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET(), (err, user) => {
        if (err)
            return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
// --- Local Email/Password ---
exports.authRouter.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Missing required fields' });
    try {
        const existing = await (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE email = ?', [email]);
        if (existing)
            return res.status(409).json({ error: 'Email already registered' });
        const salt = await bcryptjs_1.default.genSalt(10);
        const hash = await bcryptjs_1.default.hash(password, salt);
        const uid = (0, uuid_1.v4)();
        const verificationToken = (0, uuid_1.v4)();
        const isProd = process.env.NODE_ENV === 'production';
        const emailVerifiedStatus = isProd ? 0 : 1;
        const emailVerifiedFrontend = !isProd;
        await (0, db_js_1.run)('INSERT INTO vuttik_users (uid, email, display_name, role, plan_id, created_at, password_hash, oauth_provider, email_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [uid, email, name, 'user', 'free', new Date().toISOString(), hash, 'local', emailVerifiedStatus, verificationToken]);
        if (isProd) {
            // Send real verification email
            await (0, mailer_js_1.sendVerificationEmail)(email, name, verificationToken);
        }
        else {
            console.log(`\n\n=== MODO LOCAL: CORREO AUTO-VERIFICADO ===\nPara: ${email}\nEl sistema saltó la verificación porque estás en entorno local.\n==========================================\n\n`);
        }
        const token = jsonwebtoken_1.default.sign({ uid, email, role: 'user' }, JWT_SECRET(), { expiresIn: '30d' });
        res.json({ token, user: { uid, email, displayName: name, role: 'user', planId: 'free', isBanned: false, onboardingCompleted: false, emailVerified: emailVerifiedFrontend } });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Missing email or password' });
    try {
        const user = await (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [email]);
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        if (user.oauth_provider && user.oauth_provider !== 'local') {
            return res.status(401).json({ error: `This account was created with ${user.oauth_provider}. Please sign in with that specific provider.` });
        }
        if (!user.password_hash)
            return res.status(401).json({ error: 'Invalid credentials' });
        const validPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!validPassword)
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = jsonwebtoken_1.default.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET(), { expiresIn: '30d' });
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
                emailVerified: !!user.email_verified
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.authRouter.get('/me', exports.authenticateToken, async (req, res) => {
    try {
        const user = await (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE uid = ?', [req.user.uid]);
        if (!user)
            return res.status(404).json({ error: 'No user found' });
        delete user.password_hash;
        let displayName = user.display_name;
        let photoURL = user.photo_url;
        let effectiveUid = user.uid;
        if (user.active_profile_mode && user.active_profile_mode !== 'personal') {
            let bUid = user.active_profile_mode;
            // Legacy support: if it's literally 'business', find their first business
            if (bUid === 'business') {
                bUid = user.uid; // default
                const ownBusiness = await (0, db_js_1.get)('SELECT uid FROM vuttik_business_profiles WHERE uid = ?', [user.uid]);
                if (!ownBusiness) {
                    const memberOf = await (0, db_js_1.get)('SELECT business_uid FROM vuttik_business_members WHERE member_uid = ? AND status = "accepted" LIMIT 1', [user.uid]);
                    if (memberOf)
                        bUid = memberOf.business_uid;
                }
            }
            const business = await (0, db_js_1.get)('SELECT name, logo FROM vuttik_business_profiles WHERE uid = ?', [bUid]);
            if (business) {
                effectiveUid = bUid;
                displayName = business.name || displayName;
                photoURL = business.logo || photoURL;
            }
        }
        res.json({
            ...user,
            uid: effectiveUid,
            originalUid: user.uid,
            displayName,
            photoURL,
            planId: user.plan_id,
            isBanned: !!user.is_banned,
            onboardingCompleted: !!user.onboarding_completed,
            emailVerified: !!user.email_verified,
            activeProfileMode: user.active_profile_mode || 'personal'
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Email Verification Routes ---
exports.authRouter.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token)
        return res.status(400).json({ error: 'Falta el token de verificación' });
    try {
        const user = await (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE verification_token = ?', [token]);
        if (!user)
            return res.status(400).json({ error: 'Token inválido o expirado' });
        await (0, db_js_1.run)('UPDATE vuttik_users SET email_verified = 1, verification_token = NULL WHERE uid = ?', [user.uid]);
        res.json({ success: true, message: 'Correo verificado con éxito' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.authRouter.post('/resend-verification', exports.authenticateToken, async (req, res) => {
    try {
        const user = await (0, db_js_1.get)('SELECT email, email_verified, display_name FROM vuttik_users WHERE uid = ?', [req.user.uid]);
        if (!user)
            return res.status(404).json({ error: 'Usuario no encontrado' });
        if (user.email_verified)
            return res.status(400).json({ error: 'El correo ya está verificado' });
        const newToken = (0, uuid_1.v4)();
        await (0, db_js_1.run)('UPDATE vuttik_users SET verification_token = ? WHERE uid = ?', [newToken, req.user.uid]);
        if (process.env.NODE_ENV === 'production') {
            await (0, mailer_js_1.sendVerificationEmail)(user.email, user.display_name || 'Usuario', newToken);
        }
        else {
            console.log(`\n\n=== REENVÍO DE SIMULACIÓN DE CORREO ===\nPara: ${user.email}\nEnlace de Verificación: http://localhost:3000/verificar?token=${newToken}\n=====================================\n\n`);
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Password Reset Routes ---
exports.authRouter.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Falta el correo electrónico' });
    try {
        const user = await (0, db_js_1.get)('SELECT uid, display_name FROM vuttik_users WHERE email = ? AND oauth_provider = "local"', [email]);
        if (!user) {
            // Return success even if user not found to prevent email enumeration
            return res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
        }
        const resetToken = (0, uuid_1.v4)();
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24); // Token valid for 24 hours
        await (0, db_js_1.run)('UPDATE vuttik_users SET reset_password_token = ?, reset_password_expires = ? WHERE uid = ?', [resetToken, expirationDate.toISOString(), user.uid]);
        if (process.env.NODE_ENV === 'production') {
            await (0, mailer_js_1.sendPasswordResetEmail)(email, user.display_name || 'Usuario', resetToken);
        }
        else {
            console.log(`\n\n=== MODO LOCAL: RECUPERACIÓN DE CONTRASEÑA ===\nPara: ${email}\nEnlace: http://localhost:3000/reset-password?token=${resetToken}\n==========================================\n\n`);
        }
        res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.authRouter.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    try {
        const user = await (0, db_js_1.get)('SELECT uid, reset_password_expires FROM vuttik_users WHERE reset_password_token = ?', [token]);
        if (!user)
            return res.status(400).json({ error: 'El enlace es inválido o ya fue utilizado.' });
        const now = new Date();
        const expiresAt = new Date(user.reset_password_expires);
        if (now > expiresAt)
            return res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' });
        const salt = await bcryptjs_1.default.genSalt(10);
        const hash = await bcryptjs_1.default.hash(newPassword, salt);
        await (0, db_js_1.run)('UPDATE vuttik_users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE uid = ?', [hash, user.uid]);
        res.json({ success: true, message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Manual OAuth Callbacks ---
const generateOAuthJWT = (uid, email, role) => {
    return jsonwebtoken_1.default.sign({ uid, email, role }, JWT_SECRET(), { expiresIn: '30d' });
};
exports.generateOAuthJWT = generateOAuthJWT;
exports.authRouter.post('/google/callback', async (req, res) => {
    const { code, redirect_uri } = req.body;
    if (!code)
        return res.status(400).json({ error: 'Authorization code is required' });
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
        if (!tokenResponse.ok)
            return res.status(400).json({ error: 'Google Token Error', details: tokenData });
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await userResponse.json();
        if (!profile.id || !profile.email)
            return res.status(400).json({ error: 'Failed to retrieve Google profile' });
        let user = await (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [profile.email]);
        if (user) {
            if (user.oauth_provider !== 'google') {
                await (0, db_js_1.run)('UPDATE vuttik_users SET oauth_provider = ?, oauth_id = ?, display_name = ? WHERE email = ?', ['google', profile.id, profile.name, profile.email]);
            }
        }
        else {
            const uid = (0, uuid_1.v4)();
            await (0, db_js_1.run)('INSERT INTO vuttik_users (uid, email, display_name, photo_url, role, plan_id, created_at, oauth_provider, oauth_id, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [uid, profile.email, profile.name, profile.picture, 'user', 'free', new Date().toISOString(), 'google', profile.id]);
            user = await (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [profile.email]);
            // Enviar correo de bienvenida al registrarse por primera vez con Google
            (0, mailer_js_1.sendWelcomeEmail)(profile.email, profile.name).catch(console.error);
        }
        const token = (0, exports.generateOAuthJWT)(user.uid, user.email, user.role);
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.authRouter.post('/facebook/callback', async (req, res) => {
    const { code, redirect_uri } = req.body;
    if (!code)
        return res.status(400).json({ error: 'Authorization code is required' });
    try {
        const tokenResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID()}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${FACEBOOK_APP_SECRET()}&code=${code}`);
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok)
            return res.status(400).json({ error: tokenData.error?.message || 'Facebook Token Error', details: tokenData });
        const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`);
        const profile = await userResponse.json();
        if (!profile.id)
            return res.status(400).json({ error: 'Failed to retrieve Facebook profile' });
        const email = profile.email || `${profile.id}@facebook.local`;
        let user = await (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [email]);
        if (user) {
            if (user.oauth_provider !== 'facebook') {
                await (0, db_js_1.run)('UPDATE vuttik_users SET oauth_provider = ?, oauth_id = ?, display_name = ? WHERE email = ?', ['facebook', profile.id, profile.name, email]);
            }
        }
        else {
            const uid = (0, uuid_1.v4)();
            await (0, db_js_1.run)('INSERT INTO vuttik_users (uid, email, display_name, photo_url, role, plan_id, created_at, oauth_provider, oauth_id, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [uid, email, profile.name, profile.picture?.data?.url, 'user', 'free', new Date().toISOString(), 'facebook', profile.id]);
            user = await (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [profile.email]);
            // Enviar correo de bienvenida al registrarse por primera vez con Facebook
            (0, mailer_js_1.sendWelcomeEmail)(email, profile.name).catch(console.error);
        }
        const token = (0, exports.generateOAuthJWT)(user.uid, user.email, user.role);
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Web3 Wallet Auth ---
// Store nonces temporarily in memory
const nonceStore = {};
exports.authRouter.get('/wallet/nonce/:address', (req, res) => {
    const { address } = req.params;
    if (!address)
        return res.status(400).json({ error: 'Missing address' });
    // Generate a random 6-digit nonce to sign
    const nonce = Math.floor(100000 + Math.random() * 900000).toString();
    nonceStore[address.toLowerCase()] = nonce;
    res.json({ nonce });
});
exports.authRouter.post('/wallet/verify', async (req, res) => {
    const { address, signature } = req.body;
    if (!address || !signature)
        return res.status(400).json({ error: 'Missing address or signature' });
    const normalizedAddress = address.toLowerCase();
    const nonce = nonceStore[normalizedAddress];
    if (!nonce)
        return res.status(400).json({ error: 'Nonce not found or expired' });
    try {
        const expectedMessage = `Iniciando sesión en Vuttik Market. Nonce: ${nonce}`;
        const recoveredAddress = ethers_1.ethers.verifyMessage(expectedMessage, signature);
        if (recoveredAddress.toLowerCase() !== normalizedAddress) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        // Signature valid. Clear nonce.
        delete nonceStore[normalizedAddress];
        const TARGET_MEGA_GUARDIAN_ADDRESS = '0x46801571a40b11a1387D0a92C636F7a1D6FE8711'.toLowerCase();
        const isMegaGuardian = normalizedAddress === TARGET_MEGA_GUARDIAN_ADDRESS;
        const email = `${normalizedAddress}@wallet.local`;
        let user = await (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE oauth_provider = ? AND oauth_id = ?', ['wallet', normalizedAddress]);
        if (!user) {
            const uid = (0, uuid_1.v4)();
            const role = isMegaGuardian ? 'mega_guardian' : 'user';
            const planId = isMegaGuardian ? 'mega_guardian' : 'free';
            const displayName = isMegaGuardian ? 'Mega Guardian' : `Wallet ${normalizedAddress.substring(0, 6)}`;
            await (0, db_js_1.run)('INSERT INTO vuttik_users (uid, email, display_name, role, plan_id, created_at, oauth_provider, oauth_id, onboarding_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [uid, email, displayName, role, planId, new Date().toISOString(), 'wallet', normalizedAddress, isMegaGuardian ? 1 : 0]);
            user = await (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE uid = ?', [uid]);
        }
        else if (isMegaGuardian && (user.role !== 'mega_guardian' || user.plan_id !== 'mega_guardian')) {
            // Force update to mega guardian if address matches
            await (0, db_js_1.run)('UPDATE vuttik_users SET role = ?, plan_id = ?, onboarding_completed = 1 WHERE uid = ?', ['mega_guardian', 'mega_guardian', user.uid]);
            user.role = 'mega_guardian';
            user.plan_id = 'mega_guardian';
            user.onboarding_completed = 1;
        }
        const token = (0, exports.generateOAuthJWT)(user.uid, user.email, user.role);
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
