"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOAuthJWT = exports.authenticateToken = exports.authRouter = void 0;
var express_1 = require("express");
var bcryptjs_1 = require("bcryptjs");
var jsonwebtoken_1 = require("jsonwebtoken");
var uuid_1 = require("uuid");
var db_js_1 = require("./db.js");
var ethers_1 = require("ethers");
var dotenv_1 = require("dotenv");
dotenv_1.default.config({ path: '.env.local' });
var mailer_js_1 = require("./mailer.js");
exports.authRouter = express_1.default.Router();
// Security: throw at startup if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Please configure it in .env.local');
    // In production this should throw; in dev we use a fallback but log a warning
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production');
    }
}
var JWT_SECRET = function () { return process.env.JWT_SECRET || 'vuttik-dev-only-secret-CHANGE-IN-PRODUCTION'; };
var GOOGLE_CLIENT_ID = function () { return process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''; };
var GOOGLE_CLIENT_SECRET = function () { return process.env.GOOGLE_CLIENT_SECRET || ''; };
var FACEBOOK_APP_ID = function () { return process.env.VITE_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID || ''; };
var FACEBOOK_APP_SECRET = function () { return process.env.FACEBOOK_APP_SECRET || ''; };
// Middleware to protect routes mapping JWT to req.user
var authenticateToken = function (req, res, next) {
    var authHeader = req.headers['authorization'];
    var token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET(), function (err, user) {
        if (err)
            return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
// --- Local Email/Password ---
exports.authRouter.post('/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, email, password, existing, salt, hash, uid, verificationToken, isProd, emailVerifiedStatus, emailVerifiedFrontend, token, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, email = _a.email, password = _a.password;
                if (!name || !email || !password)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing required fields' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 9, , 10]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE email = ?', [email])];
            case 2:
                existing = _b.sent();
                if (existing)
                    return [2 /*return*/, res.status(409).json({ error: 'Email already registered' })];
                return [4 /*yield*/, bcryptjs_1.default.genSalt(10)];
            case 3:
                salt = _b.sent();
                return [4 /*yield*/, bcryptjs_1.default.hash(password, salt)];
            case 4:
                hash = _b.sent();
                uid = (0, uuid_1.v4)();
                verificationToken = (0, uuid_1.v4)();
                isProd = process.env.NODE_ENV === 'production';
                emailVerifiedStatus = isProd ? 0 : 1;
                emailVerifiedFrontend = !isProd;
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_users (uid, email, display_name, role, plan_id, created_at, password_hash, oauth_provider, email_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [uid, email, name, 'user', 'free', new Date().toISOString(), hash, 'local', emailVerifiedStatus, verificationToken])];
            case 5:
                _b.sent();
                if (!isProd) return [3 /*break*/, 7];
                // Send real verification email
                return [4 /*yield*/, (0, mailer_js_1.sendVerificationEmail)(email, name, verificationToken)];
            case 6:
                // Send real verification email
                _b.sent();
                return [3 /*break*/, 8];
            case 7:
                console.log("\n\n=== MODO LOCAL: CORREO AUTO-VERIFICADO ===\nPara: ".concat(email, "\nEl sistema salt\u00F3 la verificaci\u00F3n porque est\u00E1s en entorno local.\n==========================================\n\n"));
                _b.label = 8;
            case 8:
                token = jsonwebtoken_1.default.sign({ uid: uid, email: email, role: 'user' }, JWT_SECRET(), { expiresIn: '30d' });
                res.json({ token: token, user: { uid: uid, email: email, displayName: name, role: 'user', planId: 'free', isBanned: false, onboardingCompleted: false, emailVerified: emailVerifiedFrontend } });
                return [3 /*break*/, 10];
            case 9:
                err_1 = _b.sent();
                res.status(500).json({ error: err_1.message });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, validPassword, token, err_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password;
                if (!email || !password)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing email or password' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [email])];
            case 2:
                user = _b.sent();
                if (!user)
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                if (user.oauth_provider && user.oauth_provider !== 'local') {
                    return [2 /*return*/, res.status(401).json({ error: "This account was created with ".concat(user.oauth_provider, ". Please sign in with that specific provider.") })];
                }
                if (!user.password_hash)
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                return [4 /*yield*/, bcryptjs_1.default.compare(password, user.password_hash)];
            case 3:
                validPassword = _b.sent();
                if (!validPassword)
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                token = jsonwebtoken_1.default.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET(), { expiresIn: '30d' });
                delete user.password_hash;
                res.json({
                    token: token,
                    user: __assign(__assign({}, user), { displayName: user.display_name, photoURL: user.photo_url, planId: user.plan_id, isBanned: !!user.is_banned, onboardingCompleted: !!user.onboarding_completed, emailVerified: !!user.email_verified })
                });
                return [3 /*break*/, 5];
            case 4:
                err_2 = _b.sent();
                res.status(500).json({ error: err_2.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.authRouter.get('/me', exports.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, displayName, photoURL, effectiveUid, bUid, ownBusiness, memberOf, business, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE uid = ?', [req.user.uid])];
            case 1:
                user = _a.sent();
                if (!user)
                    return [2 /*return*/, res.status(404).json({ error: 'No user found' })];
                delete user.password_hash;
                displayName = user.display_name;
                photoURL = user.photo_url;
                effectiveUid = user.uid;
                if (!(user.active_profile_mode && user.active_profile_mode !== 'personal')) return [3 /*break*/, 6];
                bUid = user.active_profile_mode;
                if (!(bUid === 'business')) return [3 /*break*/, 4];
                bUid = user.uid; // default
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid FROM vuttik_business_profiles WHERE uid = ?', [user.uid])];
            case 2:
                ownBusiness = _a.sent();
                if (!!ownBusiness) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT business_uid FROM vuttik_business_members WHERE member_uid = ? AND status = "accepted" LIMIT 1', [user.uid])];
            case 3:
                memberOf = _a.sent();
                if (memberOf)
                    bUid = memberOf.business_uid;
                _a.label = 4;
            case 4: return [4 /*yield*/, (0, db_js_1.get)('SELECT name, logo FROM vuttik_business_profiles WHERE uid = ?', [bUid])];
            case 5:
                business = _a.sent();
                if (business) {
                    effectiveUid = bUid;
                    displayName = business.name || displayName;
                    photoURL = business.logo || photoURL;
                }
                _a.label = 6;
            case 6:
                res.json(__assign(__assign({}, user), { uid: effectiveUid, originalUid: user.uid, displayName: displayName, photoURL: photoURL, planId: user.plan_id, isBanned: !!user.is_banned, onboardingCompleted: !!user.onboarding_completed, emailVerified: !!user.email_verified, activeProfileMode: user.active_profile_mode || 'personal' }));
                return [3 /*break*/, 8];
            case 7:
                err_3 = _a.sent();
                res.status(500).json({ error: err_3.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// --- Email Verification Routes ---
exports.authRouter.get('/verify-email', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                token = req.query.token;
                if (!token)
                    return [2 /*return*/, res.status(400).json({ error: 'Falta el token de verificación' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE verification_token = ?', [token])];
            case 2:
                user = _a.sent();
                if (!user)
                    return [2 /*return*/, res.status(400).json({ error: 'Token inválido o expirado' })];
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET email_verified = 1, verification_token = NULL WHERE uid = ?', [user.uid])];
            case 3:
                _a.sent();
                res.json({ success: true, message: 'Correo verificado con éxito' });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/resend-verification', exports.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, newToken, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT email, email_verified, display_name FROM vuttik_users WHERE uid = ?', [req.user.uid])];
            case 1:
                user = _a.sent();
                if (!user)
                    return [2 /*return*/, res.status(404).json({ error: 'Usuario no encontrado' })];
                if (user.email_verified)
                    return [2 /*return*/, res.status(400).json({ error: 'El correo ya está verificado' })];
                newToken = (0, uuid_1.v4)();
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET verification_token = ? WHERE uid = ?', [newToken, req.user.uid])];
            case 2:
                _a.sent();
                if (!(process.env.NODE_ENV === 'production')) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, mailer_js_1.sendVerificationEmail)(user.email, user.display_name || 'Usuario', newToken)];
            case 3:
                _a.sent();
                return [3 /*break*/, 5];
            case 4:
                console.log("\n\n=== REENV\u00CDO DE SIMULACI\u00D3N DE CORREO ===\nPara: ".concat(user.email, "\nEnlace de Verificaci\u00F3n: http://localhost:3000/verificar?token=").concat(newToken, "\n=====================================\n\n"));
                _a.label = 5;
            case 5:
                res.json({ success: true });
                return [3 /*break*/, 7];
            case 6:
                error_2 = _a.sent();
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// --- Password Reset Routes ---
exports.authRouter.post('/request-password-reset', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var email, user, resetToken, expirationDate, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                email = req.body.email;
                if (!email)
                    return [2 /*return*/, res.status(400).json({ error: 'Falta el correo electrónico' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid, display_name FROM vuttik_users WHERE email = ? AND oauth_provider = "local"', [email])];
            case 2:
                user = _a.sent();
                if (!user) {
                    // Return success even if user not found to prevent email enumeration
                    return [2 /*return*/, res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' })];
                }
                resetToken = (0, uuid_1.v4)();
                expirationDate = new Date();
                expirationDate.setHours(expirationDate.getHours() + 24); // Token valid for 24 hours
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET reset_password_token = ?, reset_password_expires = ? WHERE uid = ?', [resetToken, expirationDate.toISOString(), user.uid])];
            case 3:
                _a.sent();
                if (!(process.env.NODE_ENV === 'production')) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, mailer_js_1.sendPasswordResetEmail)(email, user.display_name || 'Usuario', resetToken)];
            case 4:
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                console.log("\n\n=== MODO LOCAL: RECUPERACI\u00D3N DE CONTRASE\u00D1A ===\nPara: ".concat(email, "\nEnlace: http://localhost:3000/reset-password?token=").concat(resetToken, "\n==========================================\n\n"));
                _a.label = 6;
            case 6:
                res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
                return [3 /*break*/, 8];
            case 7:
                error_3 = _a.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/reset-password', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, token, newPassword, user, now, expiresAt, salt, hash, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, token = _a.token, newPassword = _a.newPassword;
                if (!token || !newPassword)
                    return [2 /*return*/, res.status(400).json({ error: 'Faltan datos requeridos' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid, reset_password_expires FROM vuttik_users WHERE reset_password_token = ?', [token])];
            case 2:
                user = _b.sent();
                if (!user)
                    return [2 /*return*/, res.status(400).json({ error: 'El enlace es inválido o ya fue utilizado.' })];
                now = new Date();
                expiresAt = new Date(user.reset_password_expires);
                if (now > expiresAt)
                    return [2 /*return*/, res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' })];
                return [4 /*yield*/, bcryptjs_1.default.genSalt(10)];
            case 3:
                salt = _b.sent();
                return [4 /*yield*/, bcryptjs_1.default.hash(newPassword, salt)];
            case 4:
                hash = _b.sent();
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE uid = ?', [hash, user.uid])];
            case 5:
                _b.sent();
                res.json({ success: true, message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
                return [3 /*break*/, 7];
            case 6:
                error_4 = _b.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// --- Manual OAuth Callbacks ---
var generateOAuthJWT = function (uid, email, role) {
    return jsonwebtoken_1.default.sign({ uid: uid, email: email, role: role }, JWT_SECRET(), { expiresIn: '30d' });
};
exports.generateOAuthJWT = generateOAuthJWT;
exports.authRouter.post('/google/callback', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, redirect_uri, tokenResponse, tokenData, userResponse, profile, user, uid, token, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, code = _a.code, redirect_uri = _a.redirect_uri;
                if (!code)
                    return [2 /*return*/, res.status(400).json({ error: 'Authorization code is required' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 13, , 14]);
                return [4 /*yield*/, fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            code: code,
                            client_id: GOOGLE_CLIENT_ID(),
                            client_secret: GOOGLE_CLIENT_SECRET(),
                            redirect_uri: redirect_uri,
                            grant_type: 'authorization_code',
                        }),
                    })];
            case 2:
                tokenResponse = _b.sent();
                return [4 /*yield*/, tokenResponse.json()];
            case 3:
                tokenData = _b.sent();
                if (!tokenResponse.ok)
                    return [2 /*return*/, res.status(400).json({ error: 'Google Token Error', details: tokenData })];
                return [4 /*yield*/, fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: { Authorization: "Bearer ".concat(tokenData.access_token) },
                    })];
            case 4:
                userResponse = _b.sent();
                return [4 /*yield*/, userResponse.json()];
            case 5:
                profile = _b.sent();
                if (!profile.id || !profile.email)
                    return [2 /*return*/, res.status(400).json({ error: 'Failed to retrieve Google profile' })];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [profile.email])];
            case 6:
                user = _b.sent();
                if (!user) return [3 /*break*/, 9];
                if (!(user.oauth_provider !== 'google')) return [3 /*break*/, 8];
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET oauth_provider = ?, oauth_id = ?, display_name = ? WHERE email = ?', ['google', profile.id, profile.name, profile.email])];
            case 7:
                _b.sent();
                _b.label = 8;
            case 8: return [3 /*break*/, 12];
            case 9:
                uid = (0, uuid_1.v4)();
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_users (uid, email, display_name, photo_url, role, plan_id, created_at, oauth_provider, oauth_id, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [uid, profile.email, profile.name, profile.picture, 'user', 'free', new Date().toISOString(), 'google', profile.id])];
            case 10:
                _b.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [profile.email])];
            case 11:
                user = _b.sent();
                // Enviar correo de bienvenida al registrarse por primera vez con Google
                (0, mailer_js_1.sendWelcomeEmail)(profile.email, profile.name).catch(console.error);
                _b.label = 12;
            case 12:
                token = (0, exports.generateOAuthJWT)(user.uid, user.email, user.role);
                res.json({
                    token: token,
                    user: __assign(__assign({}, user), { displayName: user.display_name, photoURL: user.photo_url, planId: user.plan_id, isBanned: !!user.is_banned, onboardingCompleted: !!user.onboarding_completed, emailVerified: !!user.email_verified })
                });
                return [3 /*break*/, 14];
            case 13:
                error_5 = _b.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/facebook/callback', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, redirect_uri, tokenResponse, tokenData, userResponse, profile, email, user, uid, token, error_6;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _a = req.body, code = _a.code, redirect_uri = _a.redirect_uri;
                if (!code)
                    return [2 /*return*/, res.status(400).json({ error: 'Authorization code is required' })];
                _e.label = 1;
            case 1:
                _e.trys.push([1, 13, , 14]);
                return [4 /*yield*/, fetch("https://graph.facebook.com/v19.0/oauth/access_token?client_id=".concat(FACEBOOK_APP_ID(), "&redirect_uri=").concat(encodeURIComponent(redirect_uri), "&client_secret=").concat(FACEBOOK_APP_SECRET(), "&code=").concat(code))];
            case 2:
                tokenResponse = _e.sent();
                return [4 /*yield*/, tokenResponse.json()];
            case 3:
                tokenData = _e.sent();
                if (!tokenResponse.ok)
                    return [2 /*return*/, res.status(400).json({ error: ((_b = tokenData.error) === null || _b === void 0 ? void 0 : _b.message) || 'Facebook Token Error', details: tokenData })];
                return [4 /*yield*/, fetch("https://graph.facebook.com/me?fields=id,name,email,picture&access_token=".concat(tokenData.access_token))];
            case 4:
                userResponse = _e.sent();
                return [4 /*yield*/, userResponse.json()];
            case 5:
                profile = _e.sent();
                if (!profile.id)
                    return [2 /*return*/, res.status(400).json({ error: 'Failed to retrieve Facebook profile' })];
                email = profile.email || "".concat(profile.id, "@facebook.local");
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [email])];
            case 6:
                user = _e.sent();
                if (!user) return [3 /*break*/, 9];
                if (!(user.oauth_provider !== 'facebook')) return [3 /*break*/, 8];
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET oauth_provider = ?, oauth_id = ?, display_name = ? WHERE email = ?', ['facebook', profile.id, profile.name, email])];
            case 7:
                _e.sent();
                _e.label = 8;
            case 8: return [3 /*break*/, 12];
            case 9:
                uid = (0, uuid_1.v4)();
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_users (uid, email, display_name, photo_url, role, plan_id, created_at, oauth_provider, oauth_id, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [uid, email, profile.name, (_d = (_c = profile.picture) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.url, 'user', 'free', new Date().toISOString(), 'facebook', profile.id])];
            case 10:
                _e.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE email = ?', [profile.email])];
            case 11:
                user = _e.sent();
                // Enviar correo de bienvenida al registrarse por primera vez con Facebook
                (0, mailer_js_1.sendWelcomeEmail)(email, profile.name).catch(console.error);
                _e.label = 12;
            case 12:
                token = (0, exports.generateOAuthJWT)(user.uid, user.email, user.role);
                res.json({
                    token: token,
                    user: __assign(__assign({}, user), { displayName: user.display_name, photoURL: user.photo_url, planId: user.plan_id, isBanned: !!user.is_banned, onboardingCompleted: !!user.onboarding_completed })
                });
                return [3 /*break*/, 14];
            case 13:
                error_6 = _e.sent();
                res.status(500).json({ error: error_6.message });
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/];
        }
    });
}); });
// --- Web3 Wallet Auth ---
// Store nonces temporarily in memory
var nonceStore = {};
exports.authRouter.get('/wallet/nonce/:address', function (req, res) {
    var address = req.params.address;
    if (!address)
        return res.status(400).json({ error: 'Missing address' });
    // Generate a random 6-digit nonce to sign
    var nonce = Math.floor(100000 + Math.random() * 900000).toString();
    nonceStore[address.toLowerCase()] = nonce;
    res.json({ nonce: nonce });
});
exports.authRouter.post('/wallet/verify', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, address, signature, normalizedAddress, nonce, expectedMessage, recoveredAddress, TARGET_MEGA_GUARDIAN_ADDRESS, isMegaGuardian, email, user, uid, role, planId, displayName, token, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, address = _a.address, signature = _a.signature;
                if (!address || !signature)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing address or signature' })];
                normalizedAddress = address.toLowerCase();
                nonce = nonceStore[normalizedAddress];
                if (!nonce)
                    return [2 /*return*/, res.status(400).json({ error: 'Nonce not found or expired' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 8, , 9]);
                expectedMessage = "Iniciando sesi\u00F3n en Vuttik Market. Nonce: ".concat(nonce);
                recoveredAddress = ethers_1.ethers.verifyMessage(expectedMessage, signature);
                if (recoveredAddress.toLowerCase() !== normalizedAddress) {
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid signature' })];
                }
                // Signature valid. Clear nonce.
                delete nonceStore[normalizedAddress];
                TARGET_MEGA_GUARDIAN_ADDRESS = '0x46801571a40b11a1387D0a92C636F7a1D6FE8711'.toLowerCase();
                isMegaGuardian = normalizedAddress === TARGET_MEGA_GUARDIAN_ADDRESS;
                email = "".concat(normalizedAddress, "@wallet.local");
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE oauth_provider = ? AND oauth_id = ?', ['wallet', normalizedAddress])];
            case 2:
                user = _b.sent();
                if (!!user) return [3 /*break*/, 5];
                uid = (0, uuid_1.v4)();
                role = isMegaGuardian ? 'mega_guardian' : 'user';
                planId = isMegaGuardian ? 'mega_guardian' : 'free';
                displayName = isMegaGuardian ? 'Mega Guardian' : "Wallet ".concat(normalizedAddress.substring(0, 6));
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_users (uid, email, display_name, role, plan_id, created_at, oauth_provider, oauth_id, onboarding_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [uid, email, displayName, role, planId, new Date().toISOString(), 'wallet', normalizedAddress, isMegaGuardian ? 1 : 0])];
            case 3:
                _b.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE uid = ?', [uid])];
            case 4:
                user = _b.sent();
                return [3 /*break*/, 7];
            case 5:
                if (!(isMegaGuardian && (user.role !== 'mega_guardian' || user.plan_id !== 'mega_guardian'))) return [3 /*break*/, 7];
                // Force update to mega guardian if address matches
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET role = ?, plan_id = ?, onboarding_completed = 1 WHERE uid = ?', ['mega_guardian', 'mega_guardian', user.uid])];
            case 6:
                // Force update to mega guardian if address matches
                _b.sent();
                user.role = 'mega_guardian';
                user.plan_id = 'mega_guardian';
                user.onboarding_completed = 1;
                _b.label = 7;
            case 7:
                token = (0, exports.generateOAuthJWT)(user.uid, user.email, user.role);
                res.json({
                    token: token,
                    user: __assign(__assign({}, user), { displayName: user.display_name, photoURL: user.photo_url, planId: user.plan_id, isBanned: !!user.is_banned, onboardingCompleted: !!user.onboarding_completed })
                });
                return [3 /*break*/, 9];
            case 8:
                error_7 = _b.sent();
                res.status(500).json({ error: error_7.message });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
