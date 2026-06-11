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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
dotenv_1.default.config({ path: '.env.local' });
var express_1 = require("express");
var cors_1 = require("cors");
var helmet_1 = require("helmet");
var db_js_1 = require("./db.js");
var uuid_1 = require("uuid");
var auth_js_1 = require("./auth.js");
var app = (0, express_1.default)();
var port = process.env.PORT || 3005;
var allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://vuttik.com',
    'https://www.vuttik.com'
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin))
            return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ limit: '5mb', extended: true }));
// Security headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' } // allow images to be served cross-origin
}));
// Global request logger
app.use(function (req, res, next) {
    console.log("[".concat(new Date().toISOString(), "] ").concat(req.method, " ").concat(req.url));
    next();
});
var pos_backend_js_1 = require("./pos-backend.js");
app.use('/api/auth', auth_js_1.authRouter);
app.use('/pos', pos_backend_js_1.posApp);
// --- Helpers ---
function logAction(userId_1, action_1, targetId_1, targetType_1) {
    return __awaiter(this, arguments, void 0, function (userId, action, targetId, targetType, metadata) {
        var timestamp, err_1;
        if (metadata === void 0) { metadata = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    timestamp = new Date().toISOString();
                    return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_metrics (user_id, action, target_id, target_type, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)', [userId, action, targetId, targetType, JSON.stringify(metadata), timestamp])];
                case 1:
                    _a.sent();
                    console.log("[AuditLog] User ".concat(userId, " performed ").concat(action, " on ").concat(targetType, ":").concat(targetId));
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.error('Failed to log action:', err_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Start function
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('--- Starting Vuttik Backend ---');
                    // 1. Initialize Database
                    return [4 /*yield*/, (0, db_js_1.initDB)()];
                case 1:
                    // 1. Initialize Database
                    _a.sent();
                    console.log('Database initialized successfully.');
                    // 2. Start Express
                    app.listen(port, function () {
                        console.log("SQL Backend running at http://localhost:".concat(port));
                        console.log('--- Server Ready ---');
                        // Run the expiration check every hour (3600000 ms)
                        setInterval(checkExpiredProposals, 3600000);
                        // Run it once on startup
                        checkExpiredProposals();
                    });
                    return [3 /*break*/, 3];
                case 2:
                    err_2 = _a.sent();
                    console.error('FATAL ERROR DURING STARTUP:', err_2);
                    process.exit(1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
startServer();
// Health check
app.get('/api/health', function (req, res) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// --- Metrics & Analytics Routes ---
// Log a metric/action from the frontend
app.post('/api/metrics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, action, targetId, targetType, metadata, err_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, userId = _a.userId, action = _a.action, targetId = _a.targetId, targetType = _a.targetType, metadata = _a.metadata;
                if (!userId || !action)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing userId or action' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, logAction(userId, action, targetId || 'none', targetType || 'none', metadata || {})];
            case 2:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                err_3 = _b.sent();
                res.status(500).json({ error: err_3.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Get user specific analytics (Real data)
app.get('/api/users/:uid/analytics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, viewsRow, engagement, trend, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                uid = req.params.uid;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)("\n      SELECT COUNT(*) as count FROM vuttik_metrics \n      WHERE target_id = ? AND action = 'VIEW_PROFILE'\n    ", [uid])];
            case 2:
                viewsRow = _a.sent();
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT action, COUNT(*) as count \n      FROM vuttik_metrics \n      WHERE user_id = ? \n      GROUP BY action\n    ", [uid])];
            case 3:
                engagement = _a.sent();
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT date(timestamp) as date, COUNT(*) as count \n      FROM vuttik_metrics \n      WHERE target_id = ? AND action = 'VIEW_PROFILE' AND timestamp > date('now', '-7 days')\n      GROUP BY date(timestamp)\n    ", [uid])];
            case 4:
                trend = _a.sent();
                res.json({
                    totalViews: (viewsRow === null || viewsRow === void 0 ? void 0 : viewsRow.count) || 0,
                    engagement: engagement,
                    trend: trend
                });
                return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Admin Global Audit Log
app.get('/api/admin/audit-log', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var NOISE_EVENTS, placeholders, logs, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                NOISE_EVENTS = [
                    'click', 'view', 'search', 'VIEW_PROFILE', 'contact',
                    'page_view', 'navigation', 'scroll', 'hover', 'SEND_MESSAGE'
                ];
                placeholders = NOISE_EVENTS.map(function () { return '?'; }).join(', ');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT m.*, u.display_name as user_name, u.photo_url as user_avatar\n      FROM vuttik_metrics m\n      LEFT JOIN vuttik_users u ON m.user_id = u.uid\n      WHERE m.action NOT IN (".concat(placeholders, ")\n        AND m.action NOT LIKE 'click%'\n        AND m.action NOT LIKE 'view%'\n        AND m.action NOT LIKE 'scroll%'\n      ORDER BY m.timestamp DESC\n      LIMIT 300\n    "), __spreadArray([], NOISE_EVENTS, true))];
            case 2:
                logs = _a.sent();
                res.json(logs);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// --- User Routes ---
app.get('/api/users/search', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var q, rows, username, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                q = req.query.q;
                if (!q || typeof q !== 'string' || q.length < 2) {
                    return [2 /*return*/, res.json([])];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                rows = void 0;
                if (!q.startsWith('@')) return [3 /*break*/, 3];
                username = q.substring(1);
                return [4 /*yield*/, (0, db_js_1.all)("SELECT uid, email, display_name, username, photo_url, role FROM vuttik_users \n         WHERE username = ? COLLATE NOCASE OR username LIKE ? LIMIT 20", [username, "%".concat(username, "%")])];
            case 2:
                rows = _a.sent();
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, (0, db_js_1.all)("SELECT uid, email, display_name, username, photo_url, role FROM vuttik_users \n         WHERE display_name LIKE ? OR email LIKE ? OR username LIKE ? LIMIT 20", ["%".concat(q, "%"), "%".concat(q, "%"), "%".concat(q, "%")])];
            case 4:
                rows = _a.sent();
                _a.label = 5;
            case 5:
                res.json(rows);
                return [3 /*break*/, 7];
            case 6:
                error_3 = _a.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
app.get('/api/users/check-username', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var username, user, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                username = req.query.username;
                if (!username)
                    return [2 /*return*/, res.status(400).json({ error: 'Username missing' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE', [username])];
            case 2:
                user = _a.sent();
                res.json({ available: !user });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get('/api/users/suggest-username', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var name, baseName, suggestion, counter, isAvailable, attempts, user, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                name = req.query.name;
                if (!name || typeof name !== 'string')
                    return [2 /*return*/, res.status(400).json({ error: 'Name missing' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                baseName = name.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                    .replace(/[^a-z0-9]/g, '');
                if (!baseName)
                    return [2 /*return*/, res.json({ suggestion: 'usuario' + Math.floor(Math.random() * 10000) })];
                suggestion = baseName;
                counter = 1;
                isAvailable = false;
                attempts = 0;
                _a.label = 2;
            case 2:
                if (!(!isAvailable && attempts < 20)) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE', [suggestion])];
            case 3:
                user = _a.sent();
                if (!user) {
                    isAvailable = true;
                }
                else {
                    suggestion = "".concat(baseName).concat(counter);
                    counter++;
                }
                attempts++;
                return [3 /*break*/, 2];
            case 4:
                if (attempts >= 20)
                    suggestion = baseName + Date.now();
                res.json({ suggestion: suggestion });
                return [3 /*break*/, 6];
            case 5:
                error_5 = _a.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.put('/api/users/:uid/username', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var username, user, existing, now, fifteenDaysAgo_1, changes, oldestChange, availableDate, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                username = req.body.username;
                if (!username || typeof username !== 'string' || username.length < 3) {
                    return [2 /*return*/, res.status(400).json({ error: 'Nombre de usuario inválido.' })];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT username_changes FROM vuttik_users WHERE uid = ?', [req.params.uid])];
            case 2:
                user = _a.sent();
                if (!user)
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE AND uid != ?', [username, req.params.uid])];
            case 3:
                existing = _a.sent();
                if (existing) {
                    return [2 /*return*/, res.status(400).json({ error: 'El nombre de usuario ya está en uso.' })];
                }
                now = Date.now();
                fifteenDaysAgo_1 = now - (15 * 24 * 60 * 60 * 1000);
                changes = [];
                try {
                    changes = JSON.parse(user.username_changes || '[]');
                }
                catch (e) {
                    changes = [];
                }
                // Filter changes within the last 15 days
                changes = changes.filter(function (timestamp) { return timestamp > fifteenDaysAgo_1; });
                if (changes.length >= 2) {
                    oldestChange = Math.min.apply(Math, changes);
                    availableDate = new Date(oldestChange + (15 * 24 * 60 * 60 * 1000));
                    return [2 /*return*/, res.status(400).json({
                            error: "Has alcanzado el l\u00EDmite de 2 cambios cada 15 d\u00EDas. Podr\u00E1s volver a cambiarlo el ".concat(availableDate.toLocaleDateString(), ".")
                        })];
                }
                changes.push(now);
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET username = ?, username_changes = ? WHERE uid = ?', [username, JSON.stringify(changes), req.params.uid])];
            case 4:
                _a.sent();
                res.json({ success: true, username: username });
                return [3 /*break*/, 6];
            case 5:
                error_6 = _a.sent();
                res.status(500).json({ error: error_6.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.get('/api/users/:uid', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, displayName, photoURL, bio, location_1, business, followerCountRow, followingCountRow, followerCount, followingCount, mappedUser, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 8, , 9]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE uid = ?', [req.params.uid])];
            case 1:
                user = _a.sent();
                if (!user) return [3 /*break*/, 6];
                if (user.is_banned) {
                    return [2 /*return*/, res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' })];
                }
                displayName = user.display_name;
                photoURL = user.photo_url;
                bio = user.bio;
                location_1 = user.location;
                if (!(user.active_profile_mode === 'business')) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT name, description, location as biz_location, logo FROM vuttik_business_profiles WHERE uid = ?', [user.uid])];
            case 2:
                business = _a.sent();
                if (business) {
                    displayName = business.name || displayName;
                    photoURL = business.logo || photoURL;
                    bio = business.description || bio;
                    location_1 = business.biz_location || location_1;
                }
                _a.label = 3;
            case 3: return [4 /*yield*/, (0, db_js_1.get)('SELECT COUNT(*) as count FROM vuttik_follows WHERE following_id = ?', [user.uid])];
            case 4:
                followerCountRow = _a.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT COUNT(*) as count FROM vuttik_follows WHERE follower_id = ?', [user.uid])];
            case 5:
                followingCountRow = _a.sent();
                followerCount = (followerCountRow === null || followerCountRow === void 0 ? void 0 : followerCountRow.count) || 0;
                followingCount = (followingCountRow === null || followingCountRow === void 0 ? void 0 : followingCountRow.count) || 0;
                mappedUser = __assign(__assign({}, user), { displayName: displayName, photoURL: photoURL, bio: bio, location: location_1, planId: user.plan_id, createdAt: user.created_at, isBanned: !!user.is_banned, onboardingCompleted: !!user.onboarding_completed, activeProfileMode: user.active_profile_mode || 'personal', age: user.age, gender: user.gender, country: user.country, username: user.username, followerCount: followerCount, followingCount: followingCount });
                res.json(mappedUser);
                return [3 /*break*/, 7];
            case 6:
                res.status(404).json({ error: 'User not found' });
                _a.label = 7;
            case 7: return [3 /*break*/, 9];
            case 8:
                error_7 = _a.sent();
                res.status(500).json({ error: error_7.message });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
app.get('/api/users/by-username/:username', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, displayName, photoURL, bio, location_2, business, mappedUser, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_users WHERE username = ? COLLATE NOCASE', [req.params.username])];
            case 1:
                user = _a.sent();
                if (!user) return [3 /*break*/, 4];
                if (user.is_banned) {
                    return [2 /*return*/, res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' })];
                }
                displayName = user.display_name;
                photoURL = user.photo_url;
                bio = user.bio;
                location_2 = user.location;
                if (!(user.active_profile_mode === 'business')) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT name, description, location as biz_location, logo FROM vuttik_business_profiles WHERE uid = ?', [user.uid])];
            case 2:
                business = _a.sent();
                if (business) {
                    displayName = business.name || displayName;
                    photoURL = business.logo || photoURL;
                    bio = business.description || bio;
                    location_2 = business.biz_location || location_2;
                }
                _a.label = 3;
            case 3:
                mappedUser = __assign(__assign({}, user), { displayName: displayName, photoURL: photoURL, bio: bio, location: location_2, planId: user.plan_id, createdAt: user.created_at, isBanned: !!user.is_banned, onboardingCompleted: !!user.onboarding_completed, activeProfileMode: user.active_profile_mode || 'personal', age: user.age, gender: user.gender, country: user.country, username: user.username });
                res.json(mappedUser);
                return [3 /*break*/, 5];
            case 4:
                res.status(404).json({ error: 'User not found' });
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                error_8 = _a.sent();
                res.status(500).json({ error: error_8.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
app.get('/api/users', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)('SELECT uid as id, email, display_name as displayName, photo_url as photoURL, role, plan_id as plan_id, is_banned as isBanned, created_at as createdAt FROM vuttik_users ORDER BY created_at DESC')];
            case 1:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                res.status(500).json({ error: error_9.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/api/users/me/mode', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, mode, uid, error_10;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, mode = _a.mode, uid = _a.uid;
                if (!uid || !mode)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing uid or mode' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET active_profile_mode = ? WHERE uid = ?', [mode, uid])];
            case 2:
                _b.sent();
                return [4 /*yield*/, logAction(uid, 'SWITCH_MODE', uid, 'user', { mode: mode })];
            case 3:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 5];
            case 4:
                error_10 = _b.sent();
                res.status(500).json({ error: error_10.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.get('/api/business-profiles/:uid', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var business, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_business_profiles WHERE uid = ?', [req.params.uid])];
            case 1:
                business = _a.sent();
                if (business) {
                    res.json(__assign(__assign({}, business), { socialLinks: JSON.parse(business.social_links || '{}'), workingHours: business.working_hours }));
                }
                else {
                    res.status(404).json({ error: 'Business profile not found' });
                }
                return [3 /*break*/, 3];
            case 2:
                error_11 = _a.sent();
                res.status(500).json({ error: error_11.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/api/business-profiles/:uid', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, description, location, phone, workingHours, socialLinks, logo, requesterUid, uid, member, now, error_12;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, description = _a.description, location = _a.location, phone = _a.phone, workingHours = _a.workingHours, socialLinks = _a.socialLinks, logo = _a.logo, requesterUid = _a.requesterUid;
                uid = req.params.uid;
                if (!(requesterUid !== uid)) return [3 /*break*/, 2];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT role FROM vuttik_business_members WHERE business_uid = ? AND member_uid = ?', [uid, requesterUid])];
            case 1:
                member = _b.sent();
                if (!member || member.role !== 'owner') {
                    return [2 /*return*/, res.status(403).json({ error: 'Solo el dueño puede editar este negocio' })];
                }
                _b.label = 2;
            case 2:
                _b.trys.push([2, 5, , 6]);
                now = new Date().toISOString();
                return [4 /*yield*/, (0, db_js_1.run)("INSERT OR REPLACE INTO vuttik_business_profiles \n       (uid, name, description, location, phone, working_hours, social_links, logo, updated_at, created_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, (SELECT logo FROM vuttik_business_profiles WHERE uid = ?)), ?, COALESCE((SELECT created_at FROM vuttik_business_profiles WHERE uid = ?), ?))", [
                        uid,
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
                    ])];
            case 3:
                _b.sent();
                return [4 /*yield*/, logAction(requesterUid || uid, 'UPDATE_BUSINESS_PROFILE', uid, 'business_profile', { name: name })];
            case 4:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_12 = _b.sent();
                console.error(error_12);
                res.status(500).json({ error: error_12.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// --- Business Members Routes ---
app.get('/api/business-members/:businessId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_13;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)("SELECT m.*, u.email, u.display_name, u.photo_url \n       FROM vuttik_business_members m\n       JOIN vuttik_users u ON m.member_uid = u.uid\n       WHERE m.business_uid = ?", [req.params.businessId])];
            case 1:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                error_13 = _a.sent();
                res.status(500).json({ error: error_13.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/business-members/invite', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, businessUid, email, targetUser, existing, id, businessInfo, bName, notifId, error_14;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, businessUid = _a.businessUid, email = _a.email;
                if (!businessUid || !email)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing params' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 8, , 9]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE email = ?', [email])];
            case 2:
                targetUser = _b.sent();
                if (!targetUser)
                    return [2 /*return*/, res.status(404).json({ error: 'User not found with that email' })];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT id FROM vuttik_business_members WHERE business_uid = ? AND member_uid = ?', [businessUid, targetUser.uid])];
            case 3:
                existing = _b.sent();
                if (existing)
                    return [2 /*return*/, res.status(400).json({ error: 'User already invited or member' })];
                id = (0, uuid_1.v4)();
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_business_members (id, business_uid, member_uid, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, businessUid, targetUser.uid, 'user', 'pending', new Date().toISOString()])];
            case 4:
                _b.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT name FROM vuttik_business_profiles WHERE uid = ?', [businessUid])];
            case 5:
                businessInfo = _b.sent();
                bName = (businessInfo === null || businessInfo === void 0 ? void 0 : businessInfo.name) || 'Un negocio';
                notifId = (0, uuid_1.v4)();
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)', [notifId, targetUser.uid, 'Invitación a Negocio', "Has sido invitado a formar parte del equipo de ".concat(bName, "."), 0, new Date().toISOString()])];
            case 6:
                _b.sent();
                res.json({ success: true });
                return [4 /*yield*/, logAction(businessUid, 'INVITE_MEMBER', targetUser.uid, 'business_member', { email: email })];
            case 7:
                _b.sent();
                return [3 /*break*/, 9];
            case 8:
                error_14 = _b.sent();
                res.status(500).json({ error: error_14.message });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
app.put('/api/business-members/:id/accept', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var member, error_15;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_business_members WHERE id = ?', [req.params.id])];
            case 1:
                member = _a.sent();
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_business_members SET status = "accepted" WHERE id = ?', [req.params.id])];
            case 2:
                _a.sent();
                if (!member) return [3 /*break*/, 4];
                return [4 /*yield*/, logAction(member.member_uid, 'ACCEPT_INVITE', member.business_uid, 'business_member', {})];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_15 = _a.sent();
                res.status(500).json({ error: error_15.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.put('/api/business-members/:id/role', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, role, changedBy, member, error_16;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 5, , 6]);
                _a = req.body, role = _a.role, changedBy = _a.changedBy;
                if (!['owner', 'admin', 'user'].includes(role)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid role' })];
                }
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_business_members WHERE id = ?', [req.params.id])];
            case 1:
                member = _b.sent();
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_business_members SET role = ? WHERE id = ?', [role, req.params.id])];
            case 2:
                _b.sent();
                if (!member) return [3 /*break*/, 4];
                return [4 /*yield*/, logAction(changedBy || 'admin', 'CHANGE_MEMBER_ROLE', member.member_uid, 'business_member', { newRole: role, businessUid: member.business_uid })];
            case 3:
                _b.sent();
                _b.label = 4;
            case 4:
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_16 = _b.sent();
                res.status(500).json({ error: error_16.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/business-members/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var member, error_17;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_business_members WHERE id = ?', [req.params.id])];
            case 1:
                member = _a.sent();
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_business_members WHERE id = ?', [req.params.id])];
            case 2:
                _a.sent();
                if (!member) return [3 /*break*/, 4];
                return [4 /*yield*/, logAction(member.member_uid, 'LEAVE_OR_REMOVED_BUSINESS', member.business_uid, 'business_member', {})];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_17 = _a.sent();
                res.status(500).json({ error: error_17.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.get('/api/users/:uid/business-invites', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_18;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)("SELECT m.*, b.name as business_name, b.logo as business_logo \n       FROM vuttik_business_members m\n       JOIN vuttik_business_profiles b ON m.business_uid = b.uid\n       WHERE m.member_uid = ? AND m.status = \"pending\"", [req.params.uid])];
            case 1:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                error_18 = _a.sent();
                res.status(500).json({ error: error_18.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/api/users/:uid/businesses', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_19;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)("SELECT DISTINCT b.uid, b.name, b.logo, b.phone, u.email\n       FROM vuttik_business_profiles b\n       LEFT JOIN vuttik_users u ON b.uid = u.uid\n       LEFT JOIN vuttik_business_members m ON b.uid = m.business_uid\n       WHERE b.uid = ? OR (m.member_uid = ? AND m.status = \"accepted\")", [req.params.uid, req.params.uid])];
            case 1:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                error_19 = _a.sent();
                res.status(500).json({ error: error_19.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/users', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, uid, email, displayName, photoURL, role, planId, onboardingCompleted, age, gender, country, language, username, existingUsername, existing, onboardingVal, onboardingVal, error_20;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, uid = _a.uid, email = _a.email, displayName = _a.displayName, photoURL = _a.photoURL, role = _a.role, planId = _a.planId, onboardingCompleted = _a.onboardingCompleted, age = _a.age, gender = _a.gender, country = _a.country, language = _a.language, username = _a.username;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 11, , 12]);
                if (!username) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE AND uid != ?', [username, uid])];
            case 2:
                existingUsername = _b.sent();
                if (existingUsername)
                    return [2 /*return*/, res.status(400).json({ error: 'El nombre de usuario ya está en uso' })];
                _b.label = 3;
            case 3: return [4 /*yield*/, (0, db_js_1.get)('SELECT uid, is_banned FROM vuttik_users WHERE uid = ?', [uid])];
            case 4:
                existing = _b.sent();
                if (existing && existing.is_banned) {
                    return [2 /*return*/, res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' })];
                }
                if (!existing) return [3 /*break*/, 7];
                onboardingVal = onboardingCompleted !== undefined ? (onboardingCompleted ? 1 : 0) : 1;
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET email = ?, display_name = ?, photo_url = ?, role = ?, plan_id = ?, onboarding_completed = ?, age = COALESCE(?, age), gender = COALESCE(?, gender), country = COALESCE(?, country), language = COALESCE(?, language), username = COALESCE(?, username) WHERE uid = ?', [email, displayName, photoURL, role, planId, onboardingVal, age || null, gender || null, country || null, language || null, username || null, uid])];
            case 5:
                _b.sent();
                return [4 /*yield*/, logAction(uid, 'USER_LOGIN', uid, 'user', { role: role })];
            case 6:
                _b.sent();
                return [3 /*break*/, 10];
            case 7:
                onboardingVal = onboardingCompleted !== undefined ? (onboardingCompleted ? 1 : 0) : 1;
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_users (uid, email, display_name, photo_url, role, plan_id, created_at, onboarding_completed, age, gender, country, language, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [uid, email, displayName, photoURL, role || 'user', planId || 'free', new Date().toISOString(), onboardingVal, age || null, gender || null, country || null, language || null, username || null])];
            case 8:
                _b.sent();
                return [4 /*yield*/, logAction(uid, 'USER_REGISTERED', uid, 'user', { email: email, role: role })];
            case 9:
                _b.sent();
                _b.label = 10;
            case 10:
                res.json({ success: true });
                return [3 /*break*/, 12];
            case 11:
                error_20 = _b.sent();
                res.status(500).json({ error: error_20.message });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// --- Category Routes ---
app.get('/api/categories', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, categories, error_21;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)('SELECT * FROM vuttik_categories ORDER BY order_index ASC')];
            case 1:
                rows = _a.sent();
                categories = rows.map(function (r) { return (__assign(__assign({}, r), { allowedTypes: JSON.parse(r.allowed_types), fields: JSON.parse(r.fields), systemFields: JSON.parse(r.system_fields), isService: Boolean(r.is_service), requiresEan: Boolean(r.requires_ean) })); });
                res.json(categories);
                return [3 /*break*/, 3];
            case 2:
                error_21 = _a.sent();
                res.status(500).json({ error: error_21.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/categories', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, name, order, allowedTypes, fields, systemFields, createdBy, isService, requiresEan, catId, error_22;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id = _a.id, name = _a.name, order = _a.order, allowedTypes = _a.allowedTypes, fields = _a.fields, systemFields = _a.systemFields, createdBy = _a.createdBy, isService = _a.isService, requiresEan = _a.requiresEan;
                catId = id || (0, uuid_1.v4)();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.run)('INSERT OR REPLACE INTO vuttik_categories (id, name, order_index, allowed_types, fields, system_fields, is_service, requires_ean) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [catId, name, order || 0, JSON.stringify(allowedTypes || []), JSON.stringify(fields || []), JSON.stringify(systemFields || {}), isService ? 1 : 0, requiresEan ? 1 : 0])];
            case 2:
                _b.sent();
                return [4 /*yield*/, logAction(createdBy || 'admin', 'CREATE_CATEGORY', catId, 'category', { name: name })];
            case 3:
                _b.sent();
                res.json({ success: true, id: catId });
                return [3 /*break*/, 5];
            case 4:
                error_22 = _b.sent();
                res.status(500).json({ error: error_22.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/categories/:id', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, deletedBy, cat, error_23;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                deletedBy = req.query.deletedBy;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT name FROM vuttik_categories WHERE id = ?', [id])];
            case 2:
                cat = _a.sent();
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_categories WHERE id = ?', [id])];
            case 3:
                _a.sent();
                return [4 /*yield*/, logAction(deletedBy || 'admin', 'DELETE_CATEGORY', id, 'category', { name: cat === null || cat === void 0 ? void 0 : cat.name })];
            case 4:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_23 = _a.sent();
                res.status(500).json({ error: 'Failed to delete category' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Evaluate and resolve pending proposals that have expired or reached consensus
function checkExpiredProposals() {
    return __awaiter(this, void 0, void 0, function () {
        var pendingProposals, guardianCountRow, totalGuardians, _i, pendingProposals_1, p, votes, upVotes, downVotes, totalVotes, createdDate, now, hoursDiff, error_24;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 13, , 14]);
                    return [4 /*yield*/, (0, db_js_1.all)('SELECT * FROM vuttik_category_proposals WHERE status = ?', ['pending'])];
                case 1:
                    pendingProposals = _a.sent();
                    if (!pendingProposals || pendingProposals.length === 0)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, db_js_1.get)("SELECT COUNT(*) as count FROM vuttik_users WHERE role IN ('guardian', 'mega_guardian', 'admin')")];
                case 2:
                    guardianCountRow = _a.sent();
                    totalGuardians = (guardianCountRow === null || guardianCountRow === void 0 ? void 0 : guardianCountRow.count) || 1;
                    _i = 0, pendingProposals_1 = pendingProposals;
                    _a.label = 3;
                case 3:
                    if (!(_i < pendingProposals_1.length)) return [3 /*break*/, 12];
                    p = pendingProposals_1[_i];
                    return [4 /*yield*/, (0, db_js_1.all)('SELECT vote_type FROM vuttik_category_votes WHERE proposal_id = ?', [p.id])];
                case 4:
                    votes = _a.sent();
                    upVotes = votes.filter(function (v) { return v.vote_type === 'up'; }).length;
                    downVotes = votes.filter(function (v) { return v.vote_type === 'down'; }).length;
                    totalVotes = upVotes + downVotes;
                    createdDate = new Date(p.created_at);
                    now = new Date();
                    hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
                    if (!(hoursDiff >= 48 || totalVotes >= totalGuardians)) return [3 /*break*/, 11];
                    if (!(upVotes > downVotes)) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['approved', p.id])];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, (0, db_js_1.run)('INSERT OR IGNORE INTO vuttik_categories (id, name, order_index, allowed_types, fields) VALUES (?, ?, 0, ?, ?)', [p.id, p.name, JSON.stringify(['sell', 'buy', 'exchange']), JSON.stringify([])])];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, logAction('system', 'category_auto_approved', p.id, 'category_proposal', { name: p.name, votes: upVotes, reason: hoursDiff >= 48 ? 'expired' : 'consensus' })];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 11];
                case 8: 
                // Reject if tie or more down votes
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['rejected', p.id])];
                case 9:
                    // Reject if tie or more down votes
                    _a.sent();
                    return [4 /*yield*/, logAction('system', 'category_auto_rejected', p.id, 'category_proposal', { name: p.name, votes: downVotes, reason: hoursDiff >= 48 ? 'expired' : 'consensus' })];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 3];
                case 12: return [3 /*break*/, 14];
                case 13:
                    error_24 = _a.sent();
                    console.error('Error checking expired proposals:', error_24);
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
// Category Proposals
app.get('/api/categories/proposals', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, proposals, guardianCountRow, totalGuardians_1, enrichedProposals, error_25;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = req.query.userId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                return [4 /*yield*/, checkExpiredProposals()];
            case 2:
                _a.sent(); // Resolve any expired ones before fetching
                return [4 /*yield*/, (0, db_js_1.all)('SELECT * FROM vuttik_category_proposals ORDER BY created_at DESC')];
            case 3:
                proposals = _a.sent();
                return [4 /*yield*/, (0, db_js_1.get)("SELECT COUNT(*) as count FROM vuttik_users WHERE role IN ('guardian', 'mega_guardian', 'admin')")];
            case 4:
                guardianCountRow = _a.sent();
                totalGuardians_1 = (guardianCountRow === null || guardianCountRow === void 0 ? void 0 : guardianCountRow.count) || 1;
                return [4 /*yield*/, Promise.all(proposals.map(function (p) { return __awaiter(void 0, void 0, void 0, function () {
                        var votes, upVotes, downVotes, myVote;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, (0, db_js_1.all)('SELECT guardian_id, vote_type FROM vuttik_category_votes WHERE proposal_id = ?', [p.id])];
                                case 1:
                                    votes = _b.sent();
                                    upVotes = votes.filter(function (v) { return v.vote_type === 'up'; }).length;
                                    downVotes = votes.filter(function (v) { return v.vote_type === 'down'; }).length;
                                    myVote = userId ? (_a = votes.find(function (v) { return v.guardian_id === userId; })) === null || _a === void 0 ? void 0 : _a.vote_type : null;
                                    return [2 /*return*/, __assign(__assign({}, p), { upVotes: upVotes, downVotes: downVotes, totalGuardians: totalGuardians_1, myVote: myVote })];
                            }
                        });
                    }); }))];
            case 5:
                enrichedProposals = _a.sent();
                res.json(enrichedProposals);
                return [3 /*break*/, 7];
            case 6:
                error_25 = _a.sent();
                res.status(500).json({ error: 'Failed to fetch proposals' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
app.post('/api/categories/proposals', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, name, suggested_by_id, suggested_by_name, error_26;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id = _a.id, name = _a.name, suggested_by_id = _a.suggested_by_id, suggested_by_name = _a.suggested_by_name;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_category_proposals (id, name, suggested_by_id, suggested_by_name, created_at) VALUES (?, ?, ?, ?, ?)', [id, name, suggested_by_id, suggested_by_name, new Date().toISOString()])];
            case 2:
                _b.sent();
                res.json({ success: true, id: id });
                return [3 /*break*/, 4];
            case 3:
                error_26 = _b.sent();
                res.status(500).json({ error: 'Failed to create proposal' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post('/api/categories/proposals/:id/vote', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, guardian_id, vote_type, voter, isMegaGuardian, proposal, votes, upVotes, downVotes, guardianCountRow, totalGuardians, error_27;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, guardian_id = _a.guardian_id, vote_type = _a.vote_type;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 23, , 24]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT role FROM vuttik_users WHERE uid = ?', [guardian_id])];
            case 2:
                voter = _b.sent();
                isMegaGuardian = voter && (voter.role === 'mega_guardian' || voter.role === 'admin');
                // Upsert vote
                return [4 /*yield*/, (0, db_js_1.run)("\n      INSERT INTO vuttik_category_votes (proposal_id, guardian_id, vote_type, created_at)\n      VALUES (?, ?, ?, ?)\n      ON CONFLICT(proposal_id, guardian_id) DO UPDATE SET vote_type = excluded.vote_type\n    ", [id, guardian_id, vote_type, new Date().toISOString()])];
            case 3:
                // Upsert vote
                _b.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_category_proposals WHERE id = ?', [id])];
            case 4:
                proposal = _b.sent();
                if (!(isMegaGuardian && proposal && proposal.status === 'pending')) return [3 /*break*/, 12];
                if (!(vote_type === 'up')) return [3 /*break*/, 8];
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['approved', id])];
            case 5:
                _b.sent();
                return [4 /*yield*/, (0, db_js_1.run)('INSERT OR IGNORE INTO vuttik_categories (id, name, order_index, allowed_types, fields) VALUES (?, ?, 0, ?, ?)', [proposal.id, proposal.name, JSON.stringify(['sell', 'buy', 'exchange']), JSON.stringify([])])];
            case 6:
                _b.sent();
                return [4 /*yield*/, logAction(guardian_id, 'category_approved_mega', id, 'category_proposal', { name: proposal.name })];
            case 7:
                _b.sent();
                return [3 /*break*/, 11];
            case 8: return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['rejected', id])];
            case 9:
                _b.sent();
                return [4 /*yield*/, logAction(guardian_id, 'category_rejected_mega', id, 'category_proposal', { name: proposal.name })];
            case 10:
                _b.sent();
                _b.label = 11;
            case 11: return [2 /*return*/, res.json({ success: true, resolved: true, by: 'mega_guardian' })];
            case 12: return [4 /*yield*/, (0, db_js_1.all)('SELECT vote_type FROM vuttik_category_votes WHERE proposal_id = ?', [id])];
            case 13:
                votes = _b.sent();
                upVotes = votes.filter(function (v) { return v.vote_type === 'up'; }).length;
                downVotes = votes.filter(function (v) { return v.vote_type === 'down'; }).length;
                return [4 /*yield*/, logAction(guardian_id, 'category_vote', id, 'category_proposal', { vote_type: vote_type, name: proposal === null || proposal === void 0 ? void 0 : proposal.name })];
            case 14:
                _b.sent();
                return [4 /*yield*/, (0, db_js_1.get)("SELECT COUNT(*) as count FROM vuttik_users WHERE role IN ('guardian', 'mega_guardian', 'admin')")];
            case 15:
                guardianCountRow = _b.sent();
                totalGuardians = (guardianCountRow === null || guardianCountRow === void 0 ? void 0 : guardianCountRow.count) || 1;
                if (!((upVotes + downVotes) >= totalGuardians && proposal && proposal.status === 'pending')) return [3 /*break*/, 22];
                if (!(upVotes > downVotes)) return [3 /*break*/, 19];
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['approved', id])];
            case 16:
                _b.sent();
                return [4 /*yield*/, (0, db_js_1.run)('INSERT OR IGNORE INTO vuttik_categories (id, name, order_index, allowed_types, fields) VALUES (?, ?, 0, ?, ?)', [proposal.id, proposal.name, JSON.stringify(['sell', 'buy', 'exchange']), JSON.stringify([])])];
            case 17:
                _b.sent();
                return [4 /*yield*/, logAction('system', 'category_auto_approved', id, 'category_proposal', { name: proposal.name, votes: upVotes, reason: 'consensus' })];
            case 18:
                _b.sent();
                return [3 /*break*/, 22];
            case 19: return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_category_proposals SET status = ? WHERE id = ?', ['rejected', id])];
            case 20:
                _b.sent();
                return [4 /*yield*/, logAction('system', 'category_auto_rejected', id, 'category_proposal', { name: proposal.name, votes: downVotes, reason: 'consensus' })];
            case 21:
                _b.sent();
                _b.label = 22;
            case 22:
                res.json({ success: true });
                return [3 /*break*/, 24];
            case 23:
                error_27 = _b.sent();
                console.error('Vote Error:', error_27);
                res.status(500).json({ error: 'Failed to vote', details: error_27.message });
                return [3 /*break*/, 24];
            case 24: return [2 /*return*/];
        }
    });
}); });
app.get('/api/transaction-types', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_28;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)('SELECT * FROM vuttik_transaction_types ORDER BY label ASC')];
            case 1:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                error_28 = _a.sent();
                res.status(500).json({ error: error_28.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/transaction-types', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, label, icon, active, typeId, error_29;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id = _a.id, label = _a.label, icon = _a.icon, active = _a.active;
                typeId = id || (0, uuid_1.v4)();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.run)('INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)', [typeId, label, icon || 'Tag', active !== undefined ? active : 1])];
            case 2:
                _b.sent();
                res.json({ success: true, id: typeId });
                return [3 /*break*/, 4];
            case 3:
                error_29 = _b.sent();
                res.status(500).json({ error: error_29.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/transaction-types/:id', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_30;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_transaction_types WHERE id = ?', [req.params.id])];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_30 = _a.sent();
                res.status(500).json({ error: error_30.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// --- Subscription Plans Routes ---
app.get('/api/subscription-plans', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, plans, error_31;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)('SELECT * FROM vuttik_subscription_plans ORDER BY order_index ASC')];
            case 1:
                rows = _a.sent();
                plans = rows.map(function (r) { return (__assign(__assign({}, r), { features: JSON.parse(r.features || '[]'), is_hidden: !!r.is_hidden, is_coming_soon: !!r.is_coming_soon, is_recommended: !!r.is_recommended, order_index: r.order_index || 0 })); });
                res.json(plans);
                return [3 /*break*/, 3];
            case 2:
                error_31 = _a.sent();
                res.status(500).json({ error: error_31.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/subscription-plans', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, name, price, features, is_hidden, is_coming_soon, is_recommended, order_index, planId, oldPrice, oldPlan, usersOnPlan, now, _i, usersOnPlan_1, user, error_32;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id = _a.id, name = _a.name, price = _a.price, features = _a.features, is_hidden = _a.is_hidden, is_coming_soon = _a.is_coming_soon, is_recommended = _a.is_recommended, order_index = _a.order_index;
                planId = id || (0, uuid_1.v4)();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 10, , 11]);
                oldPrice = null;
                if (!id) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT price FROM vuttik_subscription_plans WHERE id = ?', [id])];
            case 2:
                oldPlan = _b.sent();
                if (oldPlan)
                    oldPrice = oldPlan.price;
                _b.label = 3;
            case 3: return [4 /*yield*/, (0, db_js_1.run)('INSERT OR REPLACE INTO vuttik_subscription_plans (id, name, price, features, is_hidden, is_coming_soon, is_recommended, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [planId, name, price || 0, JSON.stringify(features || []), is_hidden ? 1 : 0, is_coming_soon ? 1 : 0, is_recommended ? 1 : 0, order_index || 0])];
            case 4:
                _b.sent();
                if (!(id && oldPrice !== null && oldPrice !== price)) return [3 /*break*/, 9];
                return [4 /*yield*/, (0, db_js_1.all)('SELECT uid FROM vuttik_users WHERE plan_id = ?', [id])];
            case 5:
                usersOnPlan = _b.sent();
                now = new Date().toISOString();
                _i = 0, usersOnPlan_1 = usersOnPlan;
                _b.label = 6;
            case 6:
                if (!(_i < usersOnPlan_1.length)) return [3 /*break*/, 9];
                user = usersOnPlan_1[_i];
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
                        (0, uuid_1.v4)(),
                        user.uid,
                        'Actualización en tu Plan de Suscripción',
                        "Hola. El precio de tu plan \"".concat(name, "\" ha sido actualizado a $").concat(price, "/mes. Como ya tienes una suscripci\u00F3n activa, este cambio no se aplicar\u00E1 inmediatamente. Tendr\u00E1s un periodo de gracia de 2 meses antes de que se refleje el nuevo precio. \u00A1Gracias por estar con nosotros!"),
                        0,
                        now
                    ])];
            case 7:
                _b.sent();
                _b.label = 8;
            case 8:
                _i++;
                return [3 /*break*/, 6];
            case 9:
                res.json({ success: true, id: planId });
                return [3 /*break*/, 11];
            case 10:
                error_32 = _b.sent();
                res.status(500).json({ error: error_32.message });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/subscription-plans/:id', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, fallbackPlanId, users, nextBillingDate, nextBillingStr, _i, users_1, u, error_33;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                fallbackPlanId = req.query.fallbackPlanId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 9, , 10]);
                if (!fallbackPlanId) return [3 /*break*/, 7];
                return [4 /*yield*/, (0, db_js_1.all)('SELECT uid FROM vuttik_users WHERE plan_id = ?', [id])];
            case 2:
                users = _a.sent();
                nextBillingDate = new Date();
                nextBillingDate.setDate(nextBillingDate.getDate() + 60);
                nextBillingStr = nextBillingDate.toISOString();
                // Update users
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET plan_id = ?, next_billing_date = ? WHERE plan_id = ?', [fallbackPlanId, nextBillingStr, id])];
            case 3:
                // Update users
                _a.sent();
                _i = 0, users_1 = users;
                _a.label = 4;
            case 4:
                if (!(_i < users_1.length)) return [3 /*break*/, 7];
                u = users_1[_i];
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), u.uid, 'Cambio de Plan', "Tu plan anterior ha sido descontinuado. Te hemos asignado al nuevo plan seleccionado por el administrador. Tienes 2 meses de gracia y beneficios gratis antes del pr\u00F3ximo cobro.", 0, new Date().toISOString()])];
            case 5:
                _a.sent();
                _a.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 4];
            case 7: return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_subscription_plans WHERE id = ?', [id])];
            case 8:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 10];
            case 9:
                error_33 = _a.sent();
                res.status(500).json({ error: error_33.message });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// --- Notifications Routes ---
app.get('/api/notifications', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, notifications, error_34;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = req.query.userId;
                if (!userId)
                    return [2 /*return*/, res.status(400).json({ error: 'userId is required' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.all)('SELECT * FROM vuttik_notifications WHERE user_id = ? ORDER BY created_at DESC', [userId])];
            case 2:
                notifications = _a.sent();
                res.json(notifications);
                return [3 /*break*/, 4];
            case 3:
                error_34 = _a.sent();
                res.status(500).json({ error: error_34.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post('/api/notifications/:id/read', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_35;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_notifications SET is_read = 1 WHERE id = ?', [req.params.id])];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_35 = _a.sent();
                res.status(500).json({ error: error_35.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/notifications/mark-all-read', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, error_36;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = req.body.userId;
                if (!userId)
                    return [2 /*return*/, res.status(400).json({ error: 'User ID required' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId])];
            case 2:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_36 = _a.sent();
                res.status(500).json({ error: error_36.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// --- EAN Database Routes ---
app.get('/api/ean-database', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var q, query, params, rows, error_37;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                q = req.query.q;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                query = 'SELECT * FROM vuttik_ean_database ORDER BY created_at DESC LIMIT 100';
                params = [];
                if (q) {
                    query = 'SELECT * FROM vuttik_ean_database WHERE ean LIKE ? OR name LIKE ? OR brand LIKE ? ORDER BY created_at DESC LIMIT 100';
                    params = ["%".concat(q, "%"), "%".concat(q, "%"), "%".concat(q, "%")];
                }
                return [4 /*yield*/, (0, db_js_1.all)(query, params)];
            case 2:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 4];
            case 3:
                error_37 = _a.sent();
                res.status(500).json({ error: error_37.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post('/api/ean-database', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data, existing, error_38;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                data = req.body;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT ean FROM vuttik_ean_database WHERE ean = ?', [data.ean])];
            case 2:
                existing = _a.sent();
                if (existing) {
                    return [2 /*return*/, res.status(400).json({ error: 'Este código EAN ya existe en la base de datos.' })];
                }
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_ean_database (ean, name, description, brand, category, image_url, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [data.ean, data.name, data.description, data.brand, data.category, data.image_url, data.created_by || 'system', new Date().toISOString()])];
            case 3:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 5];
            case 4:
                error_38 = _a.sent();
                res.status(500).json({ error: error_38.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.put('/api/ean-database/:ean', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ean, data, user, error_39;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ean = req.params.ean;
                data = req.body;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT role FROM vuttik_users WHERE uid = ?', [data.userId])];
            case 2:
                user = _a.sent();
                if (!user || !['admin', 'guardian', 'mega_guardian'].includes(user.role)) {
                    return [2 /*return*/, res.status(403).json({ error: 'Solo los guardianes y mega guardianes pueden editar la base de datos.' })];
                }
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_ean_database SET name = ?, description = ?, brand = ?, category = ?, image_url = ? WHERE ean = ?', [data.name, data.description, data.brand, data.category, data.image_url, ean])];
            case 3:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 5];
            case 4:
                error_39 = _a.sent();
                res.status(500).json({ error: error_39.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// --- Product Routes ---
app.get('/api/products', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, categoryId, authorId, postedAs, query, params, conditions, rows, products, error_40;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, categoryId = _a.categoryId, authorId = _a.authorId, postedAs = _a.postedAs;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                query = "\n        SELECT p.*,\n               u.country as author_country,\n               u.photo_url as author_avatar,\n               (SELECT json_group_array(user_id) FROM vuttik_product_votes WHERE product_id = p.id AND vote_type = 'up') as up_votes,\n               (SELECT json_group_array(user_id) FROM vuttik_product_votes WHERE product_id = p.id AND vote_type = 'down') as down_votes\n        FROM vuttik_products p\n        LEFT JOIN vuttik_users u ON p.author_id = u.uid\n        LEFT JOIN vuttik_business_profiles b ON u.uid = b.uid\n      ";
                params = [];
                conditions = [];
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
                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }
                query += ' ORDER BY p.created_at DESC';
                return [4 /*yield*/, (0, db_js_1.all)(query, params)];
            case 2:
                rows = _b.sent();
                products = rows.map(function (r) {
                    var parsedUpVotes = [];
                    var parsedDownVotes = [];
                    try {
                        parsedUpVotes = r.up_votes ? JSON.parse(r.up_votes).filter(function (v) { return v !== null; }) : [];
                    }
                    catch (e) { }
                    try {
                        parsedDownVotes = r.down_votes ? JSON.parse(r.down_votes).filter(function (v) { return v !== null; }) : [];
                    }
                    catch (e) { }
                    return __assign(__assign({}, r), { typeId: r.type_id, categoryId: r.category_id, authorId: r.author_id, authorName: r.author_name, authorAvatar: r.author_avatar, createdAt: r.created_at, salePrice: r.sale_price, isOnSale: !!r.is_on_sale, authorCountry: r.country || r.author_country, province: r.province, storeName: r.store_name, business: r.store_name || r.chain, chain: r.chain, isIndependent: !!r.is_independent, upVotes: parsedUpVotes, downVotes: parsedDownVotes, images: JSON.parse(r.images || '[]'), customFields: JSON.parse(r.custom_fields || '{}') });
                });
                res.json(products);
                return [3 /*break*/, 4];
            case 3:
                error_40 = _b.sent();
                res.status(500).json({ error: error_40.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get('/api/products/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, product, parsedUpVotes, parsedDownVotes, error_41;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.get)("\n      SELECT p.*,\n             u.country as author_country,\n             u.photo_url as author_avatar,\n             (SELECT json_group_array(user_id) FROM vuttik_product_votes WHERE product_id = p.id AND vote_type = 'up') as up_votes,\n             (SELECT json_group_array(user_id) FROM vuttik_product_votes WHERE product_id = p.id AND vote_type = 'down') as down_votes\n      FROM vuttik_products p\n      LEFT JOIN vuttik_users u ON p.author_id = u.uid\n      LEFT JOIN vuttik_business_profiles b ON u.uid = b.uid\n      WHERE p.id = ?\n    ", [id])];
            case 2:
                product = _a.sent();
                if (!product)
                    return [2 /*return*/, res.status(404).json({ error: 'Product not found' })];
                parsedUpVotes = [];
                parsedDownVotes = [];
                try {
                    parsedUpVotes = product.up_votes ? JSON.parse(product.up_votes).filter(function (v) { return v !== null; }) : [];
                }
                catch (e) { }
                try {
                    parsedDownVotes = product.down_votes ? JSON.parse(product.down_votes).filter(function (v) { return v !== null; }) : [];
                }
                catch (e) { }
                res.json(__assign(__assign({}, product), { typeId: product.type_id, categoryId: product.category_id, authorId: product.author_id, authorName: product.author_name, authorAvatar: product.author_avatar, createdAt: product.created_at, salePrice: product.sale_price, isOnSale: !!product.is_on_sale, authorCountry: product.country || product.author_country, province: product.province, storeName: product.store_name, business: product.store_name || product.chain, chain: product.chain, isIndependent: !!product.is_independent, upVotes: parsedUpVotes, downVotes: parsedDownVotes, images: JSON.parse(product.images || '[]'), customFields: JSON.parse(product.custom_fields || '{}') }));
                return [3 /*break*/, 4];
            case 3:
                error_41 = _a.sent();
                res.status(500).json({ error: error_41.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post('/api/products', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, data, user, existingEan, firstImage, err_4, entityType, entityValue, followers, _i, followers_1, follower, error_42;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = (0, uuid_1.v4)();
                data = req.body;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 16, , 17]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT is_banned, strikes FROM vuttik_users WHERE uid = ?', [data.authorId])];
            case 2:
                user = _a.sent();
                if (user === null || user === void 0 ? void 0 : user.is_banned)
                    return [2 /*return*/, res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' })];
                if ((user === null || user === void 0 ? void 0 : user.strikes) >= 3)
                    return [2 /*return*/, res.status(403).json({ error: 'Tu cuenta está en modo sólo lectura debido a múltiples infracciones (strikes).' })];
                return [4 /*yield*/, (0, db_js_1.run)("INSERT INTO vuttik_products (\n        id, title, description, price, currency, category_id, type_id, author_id, \n        author_name, location, phone, lat, lng, barcode, is_on_sale, sale_price, \n        images, custom_fields, created_at, posted_as, chain, store_name, is_independent, country, province\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                        id, data.title, data.description, data.price, data.currency, data.categoryId,
                        data.typeId, data.authorId, data.authorName, data.location, data.phone,
                        data.lat, data.lng, data.barcode, data.isOnSale ? 1 : 0, data.salePrice,
                        JSON.stringify(data.images || []), JSON.stringify(data.customFields || {}),
                        new Date().toISOString(), data.postedAs || 'personal',
                        data.chain || null, data.storeName || null, data.isIndependent ? 1 : 0, data.country || null, data.province || null
                    ])];
            case 3:
                _a.sent();
                res.json({ id: id, success: true });
                return [4 /*yield*/, logAction(data.authorId, 'CREATE_PRODUCT', id, 'product', { title: data.title })];
            case 4:
                _a.sent();
                if (!data.barcode) return [3 /*break*/, 10];
                _a.label = 5;
            case 5:
                _a.trys.push([5, 9, , 10]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT ean FROM vuttik_ean_database WHERE ean = ?', [data.barcode])];
            case 6:
                existingEan = _a.sent();
                if (!!existingEan) return [3 /*break*/, 8];
                firstImage = data.images && data.images.length > 0 ? data.images[0] : '';
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_ean_database (ean, name, description, brand, category, image_url, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [data.barcode, data.title, data.description || '', '', data.categoryId || '', firstImage, data.authorId || 'system', new Date().toISOString()])];
            case 7:
                _a.sent();
                _a.label = 8;
            case 8: return [3 /*break*/, 10];
            case 9:
                err_4 = _a.sent();
                console.error('Error auto-feeding EAN database:', err_4);
                return [3 /*break*/, 10];
            case 10:
                entityType = data.barcode ? 'ean' : 'title';
                entityValue = data.barcode || data.title.toLowerCase();
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT DISTINCT user_id \n      FROM vuttik_product_follows \n      WHERE entity_type = ? AND entity_value = ? AND user_id != ?\n    ", [entityType, entityValue, data.authorId])];
            case 11:
                followers = _a.sent();
                _i = 0, followers_1 = followers;
                _a.label = 12;
            case 12:
                if (!(_i < followers_1.length)) return [3 /*break*/, 15];
                follower = followers_1[_i];
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), follower.user_id, 'Nuevo producto de tu interés', "Se ha publicado \"".concat(data.title, "\" y coincide con tus seguimientos."), 0, new Date().toISOString(), 'price_drop'])];
            case 13:
                _a.sent();
                _a.label = 14;
            case 14:
                _i++;
                return [3 /*break*/, 12];
            case 15: return [3 /*break*/, 17];
            case 16:
                error_42 = _a.sent();
                console.error('Error in /api/products:', error_42);
                res.status(500).json({ error: error_42.message });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/products/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, userId, product, error_43;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                userId = req.query.userId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT title, author_id FROM vuttik_products WHERE id = ?', [id])];
            case 2:
                product = _a.sent();
                if (!product)
                    return [2 /*return*/, res.status(404).json({ error: 'Product not found' })];
                // Check if the user is the author
                if (product.author_id !== userId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Not authorized to delete this product' })];
                }
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_products WHERE id = ?', [id])];
            case 3:
                _a.sent();
                res.json({ success: true });
                if (!userId) return [3 /*break*/, 5];
                return [4 /*yield*/, logAction(userId, 'DELETE_PRODUCT', id, 'product', { title: product.title })];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                error_43 = _a.sent();
                res.status(500).json({ error: error_43.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Update product (edit)
app.put('/api/products/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, userId, data, existing, oldProduct, entityType, entityValue, followers, _i, followers_2, follower, error_44;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                userId = req.query.userId;
                data = req.body;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 11, , 12]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT author_id, title FROM vuttik_products WHERE id = ?', [id])];
            case 2:
                existing = _a.sent();
                if (!existing)
                    return [2 /*return*/, res.status(404).json({ error: 'Product not found' })];
                if (existing.author_id !== userId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Not authorized to update this product' })];
                }
                return [4 /*yield*/, (0, db_js_1.get)('SELECT price FROM vuttik_products WHERE id = ?', [id])];
            case 3:
                oldProduct = _a.sent();
                return [4 /*yield*/, (0, db_js_1.run)("UPDATE vuttik_products SET\n        title = ?, description = ?, price = ?, currency = ?, category_id = ?, type_id = ?,\n        location = ?, phone = ?, lat = ?, lng = ?, barcode = ?, is_on_sale = ?, sale_price = ?,\n        images = ?, custom_fields = ?\n       WHERE id = ?", [
                        data.title, data.description, data.price, data.currency, data.categoryId, data.typeId,
                        data.location, data.phone, data.lat, data.lng, data.barcode,
                        data.isOnSale ? 1 : 0, data.salePrice,
                        JSON.stringify(data.images || []), JSON.stringify(data.customFields || {}),
                        id
                    ])];
            case 4:
                _a.sent();
                if (!(oldProduct && ((data.isOnSale && data.salePrice < oldProduct.price) || (data.price < oldProduct.price)))) return [3 /*break*/, 9];
                entityType = data.barcode ? 'ean' : 'title';
                entityValue = data.barcode || data.title.toLowerCase();
                return [4 /*yield*/, (0, db_js_1.all)("\n        SELECT DISTINCT user_id \n        FROM vuttik_product_follows \n        WHERE (product_id = ?) OR (entity_type = ? AND entity_value = ?)\n      ", [id, entityType, entityValue])];
            case 5:
                followers = _a.sent();
                _i = 0, followers_2 = followers;
                _a.label = 6;
            case 6:
                if (!(_i < followers_2.length)) return [3 /*break*/, 9];
                follower = followers_2[_i];
                if (follower.user_id === existing.author_id)
                    return [3 /*break*/, 8];
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), follower.user_id, '¡Bajó de precio!', "El producto \"".concat(data.title, "\" que sigues ahora est\u00E1 m\u00E1s barato."), 0, new Date().toISOString(), 'price_drop'])];
            case 7:
                _a.sent();
                _a.label = 8;
            case 8:
                _i++;
                return [3 /*break*/, 6];
            case 9: return [4 /*yield*/, logAction(userId, 'UPDATE_PRODUCT', id, 'product', { title: data.title, oldTitle: existing.title })];
            case 10:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 12];
            case 11:
                error_44 = _a.sent();
                res.status(500).json({ error: error_44.message });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// Vote on product
app.post('/api/products/:id/vote', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, userId, voteType, existing, error_45;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, userId = _a.userId, voteType = _a.voteType;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 9, , 10]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT vote_type FROM vuttik_product_votes WHERE product_id = ? AND user_id = ?', [id, userId])];
            case 2:
                existing = _b.sent();
                if (!(voteType === null || (existing && existing.vote_type === voteType))) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_product_votes WHERE product_id = ? AND user_id = ?', [id, userId])];
            case 3:
                _b.sent();
                return [4 /*yield*/, logAction(userId, 'VOTE_PRODUCT_REMOVE', id, 'product', { removedVote: existing === null || existing === void 0 ? void 0 : existing.vote_type })];
            case 4:
                _b.sent();
                return [3 /*break*/, 8];
            case 5: return [4 /*yield*/, (0, db_js_1.run)("INSERT INTO vuttik_product_votes (product_id, user_id, vote_type, created_at)\n         VALUES (?, ?, ?, ?)\n         ON CONFLICT(product_id, user_id) DO UPDATE SET vote_type = excluded.vote_type", [id, userId, voteType, new Date().toISOString()])];
            case 6:
                _b.sent();
                return [4 /*yield*/, logAction(userId, 'VOTE_PRODUCT', id, 'product', { voteType: voteType })];
            case 7:
                _b.sent();
                _b.label = 8;
            case 8:
                res.json({ success: true });
                return [3 /*break*/, 10];
            case 9:
                error_45 = _b.sent();
                res.status(500).json({ error: error_45.message });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// --- Social Posts Routes ---
app.get('/api/posts', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, authorId, postedAs, query, params, conditions, rows, posts, error_46;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, authorId = _a.authorId, postedAs = _a.postedAs;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                query = "\n      SELECT p.*, u.photo_url as author_avatar\n      FROM vuttik_posts p\n      LEFT JOIN vuttik_users u ON p.author_id = u.uid\n    ";
                params = [];
                conditions = [];
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
                return [4 /*yield*/, (0, db_js_1.all)(query, params)];
            case 2:
                rows = _b.sent();
                return [4 /*yield*/, Promise.all(rows.map(function (r) { return __awaiter(void 0, void 0, void 0, function () {
                        var likes, verifications;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, db_js_1.all)('SELECT user_id FROM vuttik_post_likes WHERE post_id = ?', [r.id])];
                                case 1:
                                    likes = _a.sent();
                                    return [4 /*yield*/, (0, db_js_1.all)('SELECT user_id, is_veracious FROM vuttik_post_verifications WHERE post_id = ?', [r.id])];
                                case 2:
                                    verifications = _a.sent();
                                    return [2 /*return*/, __assign(__assign({}, r), { author_name: r.author_name, author_avatar: r.author_avatar, likes: likes.map(function (l) { return l.user_id; }), verifications: verifications.map(function (v) { return ({ user_id: v.user_id, is_veracious: !!v.is_veracious }); }), is_verified: !!r.is_verified, comments: 0 // Placeholder as comments table isn't implemented yet
                                         })];
                            }
                        });
                    }); }))];
            case 3:
                posts = _b.sent();
                res.json(posts);
                return [3 /*break*/, 5];
            case 4:
                error_46 = _b.sent();
                res.status(500).json({ error: error_46.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.post('/api/posts', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, authorId, authorName, authorAvatar, content, image, postedAs, isVerified, user, postId, error_47;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id = _a.id, authorId = _a.authorId, authorName = _a.authorName, authorAvatar = _a.authorAvatar, content = _a.content, image = _a.image, postedAs = _a.postedAs, isVerified = _a.isVerified;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT is_banned, strikes FROM vuttik_users WHERE uid = ?', [authorId])];
            case 2:
                user = _b.sent();
                if (user === null || user === void 0 ? void 0 : user.is_banned)
                    return [2 /*return*/, res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' })];
                if ((user === null || user === void 0 ? void 0 : user.strikes) >= 3)
                    return [2 /*return*/, res.status(403).json({ error: 'Tu cuenta está en modo sólo lectura debido a múltiples infracciones (strikes).' })];
                postId = id || (0, uuid_1.v4)();
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_posts (id, author_id, author_name, author_avatar, content, image_url, is_verified, created_at, posted_as) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [postId, authorId, authorName, authorAvatar, content, image, isVerified ? 1 : 0, new Date().toISOString(), postedAs || 'personal'])];
            case 3:
                _b.sent();
                res.json({ id: postId, success: true });
                return [4 /*yield*/, logAction(authorId, 'CREATE_POST', postId, 'post', { snippet: content.substring(0, 50) })];
            case 4:
                _b.sent();
                return [3 /*break*/, 6];
            case 5:
                error_47 = _b.sent();
                res.status(500).json({ error: error_47.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/posts/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, userId, post, error_48;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                userId = req.query.userId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT author_id, content FROM vuttik_posts WHERE id = ?', [id])];
            case 2:
                post = _a.sent();
                if (!post)
                    return [2 /*return*/, res.status(404).json({ error: 'Post not found' })];
                if (post.author_id !== userId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Not authorized to delete this post' })];
                }
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_posts WHERE id = ?', [id])];
            case 3:
                _a.sent();
                res.json({ success: true });
                if (!userId) return [3 /*break*/, 5];
                return [4 /*yield*/, logAction(userId, 'DELETE_POST', id, 'post', { snippet: post.content.substring(0, 50) })];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                error_48 = _a.sent();
                res.status(500).json({ error: error_48.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// --- Comments Routes ---
app.get('/api/posts/:postId/comments', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_49;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)('SELECT * FROM vuttik_comments WHERE post_id = ? ORDER BY created_at ASC', [req.params.postId])];
            case 1:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                error_49 = _a.sent();
                res.status(500).json({ error: error_49.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/posts/:postId/comments', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var postId, _a, authorId, authorName, authorAvatar, content, id, user, post, error_50;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                postId = req.params.postId;
                _a = req.body, authorId = _a.authorId, authorName = _a.authorName, authorAvatar = _a.authorAvatar, content = _a.content;
                id = (0, uuid_1.v4)();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 8, , 9]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT is_banned, strikes FROM vuttik_users WHERE uid = ?', [authorId])];
            case 2:
                user = _b.sent();
                if (user === null || user === void 0 ? void 0 : user.is_banned)
                    return [2 /*return*/, res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' })];
                if ((user === null || user === void 0 ? void 0 : user.strikes) >= 3)
                    return [2 /*return*/, res.status(403).json({ error: 'Tu cuenta está en modo sólo lectura debido a múltiples infracciones (strikes).' })];
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_comments (id, post_id, author_id, author_name, author_avatar, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, postId, authorId, authorName, authorAvatar, content, new Date().toISOString()])];
            case 3:
                _b.sent();
                res.json({ id: id, success: true });
                return [4 /*yield*/, (0, db_js_1.get)('SELECT author_id FROM vuttik_posts WHERE id = ?', [postId])];
            case 4:
                post = _b.sent();
                if (!(post && post.author_id && post.author_id !== authorId)) return [3 /*break*/, 6];
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), post.author_id, 'Nuevo Comentario', "".concat(authorName || 'Alguien', " ha comentado en tu publicaci\u00F3n."), 0, new Date().toISOString()])];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6: 
            // Log action
            return [4 /*yield*/, logAction(authorId, 'COMMENT', id, 'comment', { postId: postId, snippet: content.substring(0, 30) })];
            case 7:
                // Log action
                _b.sent();
                return [3 /*break*/, 9];
            case 8:
                error_50 = _b.sent();
                res.status(500).json({ error: error_50.message });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// --- Like / Unlike Post ---
app.post('/api/posts/:postId/like', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var postId, userId, existing, post, error_51;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                postId = req.params.postId;
                userId = req.body.userId;
                if (!userId)
                    return [2 /*return*/, res.status(400).json({ error: 'userId required' })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 12, , 13]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT id FROM vuttik_post_likes WHERE post_id = ? AND user_id = ?', [postId, userId])];
            case 2:
                existing = _a.sent();
                if (!existing) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_post_likes WHERE post_id = ? AND user_id = ?', [postId, userId])];
            case 3:
                _a.sent();
                return [4 /*yield*/, logAction(userId, 'UNLIKE_POST', postId, 'post', {})];
            case 4:
                _a.sent();
                res.json({ liked: false });
                return [3 /*break*/, 11];
            case 5: return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)', [postId, userId, new Date().toISOString()])];
            case 6:
                _a.sent();
                return [4 /*yield*/, logAction(userId, 'LIKE_POST', postId, 'post', {})];
            case 7:
                _a.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT author_id, author_name FROM vuttik_posts WHERE id = ?', [postId])];
            case 8:
                post = _a.sent();
                if (!(post && post.author_id && post.author_id !== userId)) return [3 /*break*/, 10];
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), post.author_id, 'Nueva Reacción', "A alguien le gust\u00F3 tu publicaci\u00F3n.", 0, new Date().toISOString()])];
            case 9:
                _a.sent();
                _a.label = 10;
            case 10:
                res.json({ liked: true });
                _a.label = 11;
            case 11: return [3 /*break*/, 13];
            case 12:
                error_51 = _a.sent();
                res.status(500).json({ error: error_51.message });
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
// --- Delete Comment ---
app.delete('/api/comments/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, userId, comment, error_52;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                userId = req.query.userId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT author_id, content FROM vuttik_comments WHERE id = ?', [id])];
            case 2:
                comment = _b.sent();
                if (!comment)
                    return [2 /*return*/, res.status(404).json({ error: 'Comment not found' })];
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_comments WHERE id = ?', [id])];
            case 3:
                _b.sent();
                if (!userId) return [3 /*break*/, 5];
                return [4 /*yield*/, logAction(userId, 'DELETE_COMMENT', id, 'comment', { snippet: (_a = comment.content) === null || _a === void 0 ? void 0 : _a.substring(0, 30) })];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5:
                res.json({ success: true });
                return [3 /*break*/, 7];
            case 6:
                error_52 = _b.sent();
                res.status(500).json({ error: error_52.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// --- Edit Post ---
app.put('/api/posts/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, userId, content, post, error_53;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, userId = _a.userId, content = _a.content;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT author_id FROM vuttik_posts WHERE id = ?', [id])];
            case 2:
                post = _b.sent();
                if (!post)
                    return [2 /*return*/, res.status(404).json({ error: 'Post not found' })];
                if (post.author_id !== userId)
                    return [2 /*return*/, res.status(403).json({ error: 'Not authorized' })];
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_posts SET content = ? WHERE id = ?', [content, id])];
            case 3:
                _b.sent();
                return [4 /*yield*/, logAction(userId, 'EDIT_POST', id, 'post', { snippet: content === null || content === void 0 ? void 0 : content.substring(0, 50) })];
            case 4:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_53 = _b.sent();
                res.status(500).json({ error: error_53.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// --- User Profile Update ---
app.put('/api/users/:uid/profile', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, _a, displayName, bio, location, photoURL, age, gender, country, language, username, existingUsername, error_54;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                uid = req.params.uid;
                _a = req.body, displayName = _a.displayName, bio = _a.bio, location = _a.location, photoURL = _a.photoURL, age = _a.age, gender = _a.gender, country = _a.country, language = _a.language, username = _a.username;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                if (!username) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT uid FROM vuttik_users WHERE username = ? COLLATE NOCASE AND uid != ?', [username, uid])];
            case 2:
                existingUsername = _b.sent();
                if (existingUsername)
                    return [2 /*return*/, res.status(400).json({ error: 'El nombre de usuario ya está en uso' })];
                _b.label = 3;
            case 3: return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET display_name = ?, bio = ?, location = ?, photo_url = COALESCE(?, photo_url), age = COALESCE(?, age), gender = COALESCE(?, gender), country = COALESCE(?, country), language = COALESCE(?, language), username = COALESCE(?, username) WHERE uid = ?', [displayName, bio, location, photoURL || null, age || null, gender || null, country || null, language || null, username || null, uid])];
            case 4:
                _b.sent();
                return [4 /*yield*/, logAction(uid, 'UPDATE_PROFILE', uid, 'user', { displayName: displayName })];
            case 5:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 7];
            case 6:
                error_54 = _b.sent();
                res.status(500).json({ error: error_54.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// --- Change User Role (Admin) ---
app.put('/api/users/:uid/role', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, _a, role, adminId, old, error_55;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                uid = req.params.uid;
                _a = req.body, role = _a.role, adminId = _a.adminId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT role FROM vuttik_users WHERE uid = ?', [uid])];
            case 2:
                old = _b.sent();
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET role = ? WHERE uid = ?', [role, uid])];
            case 3:
                _b.sent();
                return [4 /*yield*/, logAction(adminId || 'admin', 'CHANGE_USER_ROLE', uid, 'user', { newRole: role, oldRole: old === null || old === void 0 ? void 0 : old.role })];
            case 4:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_55 = _b.sent();
                res.status(500).json({ error: error_55.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// --- Unban User ---
app.post('/api/users/:uid/unban', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, adminId, error_56;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                uid = req.params.uid;
                adminId = req.body.adminId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET is_banned = 0 WHERE uid = ?', [uid])];
            case 2:
                _a.sent();
                return [4 /*yield*/, logAction(adminId || 'admin', 'UNBAN_USER', uid, 'user')];
            case 3:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 5];
            case 4:
                error_56 = _a.sent();
                res.status(500).json({ error: error_56.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.post('/api/users/:uid/strike', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, guardianId, user, newStrikes, error_57;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                uid = req.params.uid;
                guardianId = req.body.guardianId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT strikes FROM vuttik_users WHERE uid = ?', [uid])];
            case 2:
                user = _a.sent();
                newStrikes = ((user === null || user === void 0 ? void 0 : user.strikes) || 0) + 1;
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET strikes = ? WHERE uid = ?', [newStrikes, uid])];
            case 3:
                _a.sent();
                return [4 /*yield*/, logAction(guardianId, 'issue_strike', uid, 'user', { strikes: newStrikes })];
            case 4:
                _a.sent();
                res.json({ success: true, strikes: newStrikes });
                return [3 /*break*/, 6];
            case 5:
                error_57 = _a.sent();
                res.status(500).json({ error: error_57.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.post('/api/posts/:postId/verify', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var postId, _a, userId, isVeracious, error_58;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                postId = req.params.postId;
                _a = req.body, userId = _a.userId, isVeracious = _a.isVeracious;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.run)('INSERT OR REPLACE INTO vuttik_post_verifications (post_id, user_id, is_veracious, created_at) VALUES (?, ?, ?, ?)', [postId, userId, isVeracious ? 1 : 0, new Date().toISOString()])];
            case 2:
                _b.sent();
                res.json({ success: true });
                // Log action
                return [4 /*yield*/, logAction(userId, 'VOTE_VERACITY', postId, 'post', { isVeracious: isVeracious })];
            case 3:
                // Log action
                _b.sent();
                return [3 /*break*/, 5];
            case 4:
                error_58 = _b.sent();
                res.status(500).json({ error: error_58.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Duplicate endpoint removed.
// --- Real Analytics Endpoint ---
app.get('/api/users/:uid/analytics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, viewsResult, actionsResult, trend, error_59;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                uid = req.params.uid;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)("\n      SELECT (\n        SELECT COUNT(*) FROM vuttik_metrics m \n        JOIN vuttik_products p ON m.target_id = p.id \n        WHERE p.author_id = ? AND m.action = 'view'\n      ) + (\n        SELECT COUNT(*) FROM vuttik_metrics \n        WHERE target_id = ? AND action = 'VIEW_PROFILE'\n      ) as count\n    ", [uid, uid])];
            case 2:
                viewsResult = _a.sent();
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT action, COUNT(*) as count \n      FROM vuttik_metrics \n      WHERE user_id = ? \n      GROUP BY action\n    ", [uid])];
            case 3:
                actionsResult = _a.sent();
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT date, SUM(count) as value FROM (\n        SELECT date(timestamp) as date, COUNT(*) as count \n        FROM vuttik_metrics m\n        JOIN vuttik_products p ON m.target_id = p.id\n        WHERE p.author_id = ? AND m.action = 'view' AND timestamp > date('now', '-7 days')\n        GROUP BY date(timestamp)\n        UNION ALL\n        SELECT date(timestamp) as date, COUNT(*) as count \n        FROM vuttik_metrics\n        WHERE target_id = ? AND action = 'VIEW_PROFILE' AND timestamp > date('now', '-7 days')\n        GROUP BY date(timestamp)\n      ) GROUP BY date ORDER BY date DESC LIMIT 7\n    ", [uid, uid])];
            case 4:
                trend = _a.sent();
                res.json({
                    totalViews: (viewsResult === null || viewsResult === void 0 ? void 0 : viewsResult.count) || 0,
                    engagement: actionsResult,
                    trend: trend.reverse()
                });
                return [3 /*break*/, 6];
            case 5:
                error_59 = _a.sent();
                res.status(500).json({ error: error_59.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// --- Moderation & Reports Actions ---
app.post('/api/reports', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, reporterId, targetId, targetType, targetTitle, authorId, authorName, reason, id, now, error_60;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, reporterId = _a.reporterId, targetId = _a.targetId, targetType = _a.targetType, targetTitle = _a.targetTitle, authorId = _a.authorId, authorName = _a.authorName, reason = _a.reason;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                id = Math.random().toString(36).substr(2, 9);
                now = new Date().toISOString();
                return [4 /*yield*/, (0, db_js_1.run)("INSERT INTO vuttik_reports \n       (id, reporter_id, target_id, target_type, target_title, author_id, author_name, reason, status, created_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)", [id, reporterId, targetId, targetType, targetTitle, authorId, authorName, reason, now])];
            case 2:
                _b.sent();
                return [4 /*yield*/, logAction(reporterId, 'report_created', targetId, targetType, { reason: reason, targetTitle: targetTitle, authorName: authorName })];
            case 3:
                _b.sent();
                res.json({ success: true, id: id });
                return [3 /*break*/, 5];
            case 4:
                error_60 = _b.sent();
                res.status(500).json({ error: error_60.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.get('/api/reports', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var reports, error_61;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT r.*, u.username as reporter_username, u.display_name as reporter_name, u.strikes as reporter_strikes, u.photo_url as reporter_photo\n      FROM vuttik_reports r\n      LEFT JOIN vuttik_users u ON r.reporter_id = u.uid\n      ORDER BY r.created_at DESC\n    ")];
            case 1:
                reports = _a.sent();
                res.json(reports);
                return [3 /*break*/, 3];
            case 2:
                error_61 = _a.sent();
                res.status(500).json({ error: error_61.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/api/reports/:id/status', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, status, guardianId, report, error_62;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, status = _a.status, guardianId = _a.guardianId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_reports WHERE id = ?', [id])];
            case 2:
                report = _b.sent();
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_reports SET status = ? WHERE id = ?', [status, id])];
            case 3:
                _b.sent();
                if (!(guardianId && report)) return [3 /*break*/, 5];
                return [4 /*yield*/, logAction(guardianId, "report_".concat(status), report.target_id, report.target_type, { reportId: id, targetTitle: report.target_title })];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5:
                res.json({ success: true });
                return [3 /*break*/, 7];
            case 6:
                error_62 = _b.sent();
                res.status(500).json({ error: error_62.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// --- Admin Actions ---
app.post('/api/users/:uid/ban', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, adminId, error_63;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                uid = req.params.uid;
                adminId = req.body.adminId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_users SET is_banned = 1 WHERE uid = ?', [uid])];
            case 2:
                _a.sent();
                res.json({ success: true });
                return [4 /*yield*/, logAction(adminId, 'BAN_USER', uid, 'user')];
            case 3:
                _a.sent();
                return [3 /*break*/, 5];
            case 4:
                error_63 = _a.sent();
                res.status(500).json({ error: error_63.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// --- Metrics Route ---
app.post('/api/metrics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, action, targetId, targetType, metadata, now, dateStr, timestamp, field, volumeIncrement, product, error_64;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, userId = _a.userId, action = _a.action, targetId = _a.targetId, targetType = _a.targetType, metadata = _a.metadata;
                now = new Date();
                dateStr = now.toISOString().split('T')[0];
                timestamp = now.toISOString();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 7, , 8]);
                return [4 /*yield*/, logAction(userId || 'anonymous', action, targetId || 'none', targetType || 'none', metadata || {})];
            case 2:
                _b.sent();
                if (!['view', 'search', 'contact'].includes(action)) return [3 /*break*/, 6];
                field = action === 'view' ? 'views' : (action === 'search' ? 'searches' : 'contacts');
                volumeIncrement = 0;
                if (!(action === 'contact' && targetId)) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, db_js_1.get)('SELECT price FROM vuttik_products WHERE id = ?', [targetId])];
            case 3:
                product = _b.sent();
                volumeIncrement = (product === null || product === void 0 ? void 0 : product.price) || 0;
                _b.label = 4;
            case 4: return [4 /*yield*/, (0, db_js_1.run)("\n        INSERT INTO vuttik_daily_stats (date, ".concat(field, ", total_p2p_volume) \n        VALUES (?, 1, ?) \n        ON CONFLICT(date) DO UPDATE SET \n          ").concat(field, " = ").concat(field, " + 1,\n          total_p2p_volume = total_p2p_volume + ?\n      "), [dateStr, volumeIncrement, volumeIncrement])];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                res.json({ success: true });
                return [3 /*break*/, 8];
            case 7:
                error_64 = _b.sent();
                console.error('Metrics Error:', error_64);
                res.status(500).json({ error: error_64.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// --- Aggregated Stats Routes ---
// Mega Guardian Overview
app.get('/api/stats/mega-guardian', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var totalUsers, totalProducts, pendingReports, volumeData, distribution, error_65;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT COUNT(*) as count FROM vuttik_users')];
            case 1:
                totalUsers = _a.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT COUNT(*) as count FROM vuttik_products')];
            case 2:
                totalProducts = _a.sent();
                return [4 /*yield*/, (0, db_js_1.get)("SELECT COUNT(*) as count FROM vuttik_metrics WHERE action = 'flag'")];
            case 3:
                pendingReports = _a.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT SUM(total_p2p_volume) as total FROM vuttik_daily_stats')];
            case 4:
                volumeData = _a.sent();
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT c.name, COUNT(p.id) as value \n      FROM vuttik_categories c \n      LEFT JOIN vuttik_products p ON c.id = p.category_id \n      GROUP BY c.id\n      HAVING value > 0\n    ")];
            case 5:
                distribution = _a.sent();
                res.json({
                    overview: {
                        activeUsers: (totalUsers === null || totalUsers === void 0 ? void 0 : totalUsers.count) || 0,
                        p2pVolume: (volumeData === null || volumeData === void 0 ? void 0 : volumeData.total) || 0,
                        newBusinesses: 0,
                        pendingReports: (pendingReports === null || pendingReports === void 0 ? void 0 : pendingReports.count) || 0
                    },
                    distribution: distribution
                });
                return [3 /*break*/, 7];
            case 6:
                error_65 = _a.sent();
                res.status(500).json({ error: error_65.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Trends (7 days)
app.get('/api/stats/trends', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_66;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT date as name, searches as busquedas, views as ventas \n      FROM vuttik_daily_stats \n      ORDER BY date DESC LIMIT 7\n    ")];
            case 1:
                rows = _a.sent();
                res.json(rows.reverse());
                return [3 /*break*/, 3];
            case 2:
                error_66 = _a.sent();
                res.status(500).json({ error: error_66.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Business Specific Stats
app.get('/api/stats/business/:userId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, totalViews, totalContacts, rawDailyStats_1, last7Days, dayNames_1, chartData, error_67;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = req.params.userId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)("\n      SELECT COUNT(*) as count \n      FROM vuttik_metrics m \n      JOIN vuttik_products p ON m.target_id = p.id \n      WHERE p.author_id = ? AND p.posted_as = 'business' AND m.action = 'view'\n    ", [userId])];
            case 2:
                totalViews = _a.sent();
                return [4 /*yield*/, (0, db_js_1.get)("\n      SELECT COUNT(*) as count \n      FROM vuttik_metrics m \n      JOIN vuttik_products p ON m.target_id = p.id \n      WHERE p.author_id = ? AND p.posted_as = 'business' AND m.action = 'contact'\n    ", [userId])];
            case 3:
                totalContacts = _a.sent();
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT \n        date(m.timestamp) as day, \n        SUM(CASE WHEN m.action = 'view' THEN 1 ELSE 0 END) as views,\n        SUM(CASE WHEN m.action = 'contact' THEN 1 ELSE 0 END) as sales\n      FROM vuttik_metrics m\n      JOIN vuttik_products p ON m.target_id = p.id\n      WHERE p.author_id = ? AND p.posted_as = 'business' AND m.timestamp >= date('now', '-6 days')\n      GROUP BY date(m.timestamp)\n      ORDER BY date(m.timestamp) ASC\n    ", [userId])];
            case 4:
                rawDailyStats_1 = _a.sent();
                last7Days = Array.from({ length: 7 }, function (_, i) {
                    var d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0];
                });
                dayNames_1 = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
                chartData = last7Days.map(function (dateStr) {
                    var row = rawDailyStats_1.find(function (r) { return r.day === dateStr; });
                    // Ensure we get the correct local day by splitting the date string
                    var _a = dateStr.split('-'), year = _a[0], month = _a[1], day = _a[2];
                    var dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    return {
                        name: dayNames_1[dateObj.getDay()],
                        views: (row === null || row === void 0 ? void 0 : row.views) || 0,
                        sales: (row === null || row === void 0 ? void 0 : row.sales) || 0
                    };
                });
                res.json({
                    views: (totalViews === null || totalViews === void 0 ? void 0 : totalViews.count) || 0,
                    sales: (totalContacts === null || totalContacts === void 0 ? void 0 : totalContacts.count) || 0, // Using contacts as proxy for sales
                    followers: 0,
                    chartData: chartData
                });
                return [3 /*break*/, 6];
            case 5:
                error_67 = _a.sent();
                res.status(500).json({ error: error_67.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Handled by startServer()
// --- Follows Routes ---
// Follow a user
app.post('/api/follows', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, followerId, followingId, followerUser, followerName, error_68;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, followerId = _a.followerId, followingId = _a.followingId;
                if (!followerId || !followingId)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing params' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, db_js_1.run)('INSERT OR IGNORE INTO vuttik_follows (follower_id, following_id, created_at) VALUES (?, ?, ?)', [followerId, followingId, new Date().toISOString()])];
            case 2:
                _b.sent();
                res.json({ success: true });
                return [4 /*yield*/, (0, db_js_1.get)('SELECT name FROM vuttik_users WHERE uid = ?', [followerId])];
            case 3:
                followerUser = _b.sent();
                followerName = (followerUser === null || followerUser === void 0 ? void 0 : followerUser.name) || 'Un usuario';
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_notifications (id, user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), followingId, 'Nuevo Seguidor', "".concat(followerName, " ha comenzado a seguirte."), 0, new Date().toISOString()])];
            case 4:
                _b.sent();
                return [4 /*yield*/, logAction(followerId, 'FOLLOW', followingId, 'user')];
            case 5:
                _b.sent();
                return [3 /*break*/, 7];
            case 6:
                error_68 = _b.sent();
                res.status(500).json({ error: error_68.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Unfollow a user
app.delete('/api/follows', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, followerId, followingId, error_69;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, followerId = _a.followerId, followingId = _a.followingId;
                if (!followerId || !followingId)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing params' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_follows WHERE follower_id = ? AND following_id = ?', [followerId, followingId])];
            case 2:
                _b.sent();
                res.json({ success: true });
                return [4 /*yield*/, logAction(followerId, 'UNFOLLOW', followingId, 'user')];
            case 3:
                _b.sent();
                return [3 /*break*/, 5];
            case 4:
                error_69 = _b.sent();
                res.status(500).json({ error: error_69.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Get list of users that userId follows
app.get('/api/follows/:userId/following', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_70;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)('SELECT following_id FROM vuttik_follows WHERE follower_id = ?', [req.params.userId])];
            case 1:
                rows = _a.sent();
                res.json(rows.map(function (r) { return r.following_id; }));
                return [3 /*break*/, 3];
            case 2:
                error_70 = _a.sent();
                res.status(500).json({ error: error_70.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Get list of users that follow userId
app.get('/api/follows/:userId/followers', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_71;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT f.follower_id, u.display_name, u.photo_url, u.username, u.role\n      FROM vuttik_follows f\n      JOIN vuttik_users u ON f.follower_id = u.uid\n      WHERE f.following_id = ?\n      ORDER BY f.created_at DESC\n    ", [req.params.userId])];
            case 1:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                error_71 = _a.sent();
                res.status(500).json({ error: error_71.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Product Follows Endpoints
app.post('/api/products/:id/follow', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, userId, product, entityType, entityValue, error_72;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                userId = req.body.userId;
                if (!userId)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing userId' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT barcode, title FROM vuttik_products WHERE id = ?', [id])];
            case 2:
                product = _b.sent();
                if (!product)
                    return [2 /*return*/, res.status(404).json({ error: 'Product not found' })];
                entityType = 'title';
                entityValue = ((_a = product.title) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
                if (product.barcode) {
                    entityType = 'ean';
                    entityValue = product.barcode;
                }
                return [4 /*yield*/, (0, db_js_1.run)('INSERT OR IGNORE INTO vuttik_product_follows (user_id, product_id, entity_type, entity_value, created_at) VALUES (?, ?, ?, ?, ?)', [userId, id, entityType, entityValue, new Date().toISOString()])];
            case 3:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 5];
            case 4:
                error_72 = _b.sent();
                res.status(500).json({ error: error_72.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/products/:id/follow', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, userId, product, entityType, entityValue, error_73;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                userId = req.query.userId;
                if (!userId)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing userId' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, db_js_1.get)('SELECT barcode, title FROM vuttik_products WHERE id = ?', [id])];
            case 2:
                product = _b.sent();
                if (!product)
                    return [2 /*return*/, res.status(404).json({ error: 'Product not found' })];
                entityType = 'title';
                entityValue = ((_a = product.title) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
                if (product.barcode) {
                    entityType = 'ean';
                    entityValue = product.barcode;
                }
                return [4 /*yield*/, (0, db_js_1.run)('DELETE FROM vuttik_product_follows WHERE user_id = ? AND entity_type = ? AND entity_value = ?', [userId, entityType, entityValue])];
            case 3:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 5];
            case 4:
                error_73 = _b.sent();
                res.status(500).json({ error: error_73.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.get('/api/users/:uid/following-products', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, directFollows, ids, error_74;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT p.id as product_id\n      FROM vuttik_product_follows f\n      JOIN vuttik_products p ON \n        (f.entity_type = 'ean' AND p.barcode = f.entity_value) OR\n        (f.entity_type = 'title' AND LOWER(p.title) = f.entity_value)\n      WHERE f.user_id = ?\n    ", [req.params.uid])];
            case 1:
                rows = _a.sent();
                return [4 /*yield*/, (0, db_js_1.all)('SELECT product_id FROM vuttik_product_follows WHERE user_id = ?', [req.params.uid])];
            case 2:
                directFollows = _a.sent();
                ids = new Set(__spreadArray(__spreadArray([], rows.map(function (r) { return r.product_id; }), true), directFollows.map(function (r) { return r.product_id; }), true));
                res.json(Array.from(ids));
                return [3 /*break*/, 4];
            case 3:
                error_74 = _a.sent();
                res.status(500).json({ error: error_74.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Override /api/posts to support ?filter=following&userId=X&type=X
app.get('/api/posts/feed', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, filter, userId, type, posts, products, query, queryParams, following, placeholders, rows, pRows, combined, error_75;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, filter = _a.filter, userId = _a.userId, type = _a.type;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 9, , 10]);
                posts = [];
                products = [];
                if (!(!type || type === 'all' || type === 'posts')) return [3 /*break*/, 6];
                query = "\n        SELECT p.*, u.photo_url as author_avatar\n        FROM vuttik_posts p\n        LEFT JOIN vuttik_users u ON p.author_id = u.uid\n      ";
                queryParams = [];
                if (!(filter === 'following' && userId)) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, db_js_1.all)('SELECT following_id FROM vuttik_follows WHERE follower_id = ?', [userId])];
            case 2:
                following = _b.sent();
                if (following.length > 0) {
                    placeholders = following.map(function () { return '?'; }).join(',');
                    query += " WHERE p.author_id IN (".concat(placeholders, ")");
                    queryParams = following.map(function (f) { return f.following_id; });
                }
                else {
                    query += " WHERE 1=0";
                }
                _b.label = 3;
            case 3:
                query += ' ORDER BY p.created_at DESC LIMIT 50';
                return [4 /*yield*/, (0, db_js_1.all)(query, queryParams)];
            case 4:
                rows = _b.sent();
                return [4 /*yield*/, Promise.all(rows.map(function (r) { return __awaiter(void 0, void 0, void 0, function () {
                        var likes;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, db_js_1.all)('SELECT user_id FROM vuttik_post_likes WHERE post_id = ?', [r.id])];
                                case 1:
                                    likes = _a.sent();
                                    return [2 /*return*/, __assign(__assign({}, r), { author_name: r.author_name, author_avatar: r.author_avatar, likes: likes.map(function (l) { return l.user_id; }), is_verified: !!r.is_verified, comments: 0, feedType: 'post' })];
                            }
                        });
                    }); }))];
            case 5:
                posts = _b.sent();
                _b.label = 6;
            case 6:
                if (!(filter === 'following' && userId && (!type || type === 'all' || type === 'products'))) return [3 /*break*/, 8];
                return [4 /*yield*/, (0, db_js_1.all)("\n        SELECT DISTINCT p.*\n        FROM vuttik_products p\n        JOIN vuttik_product_follows f ON \n          (f.entity_type = 'ean' AND p.barcode = f.entity_value) OR\n          (f.entity_type = 'title' AND LOWER(p.title) = f.entity_value) OR\n          (f.product_id = p.id)\n        WHERE f.user_id = ?\n        ORDER BY p.created_at DESC LIMIT 50\n      ", [userId])];
            case 7:
                pRows = _b.sent();
                products = pRows.map(function (p) { return (__assign(__assign({}, p), { feedType: 'product' })); });
                _b.label = 8;
            case 8:
                combined = __spreadArray(__spreadArray([], posts, true), products, true).sort(function (a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });
                res.json(combined);
                return [3 /*break*/, 10];
            case 9:
                error_75 = _b.sent();
                res.status(500).json({ error: error_75.message });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// --- Conversations Routes ---
// Get unread messages count
app.get('/api/users/:uid/unread-messages', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, row, error_76;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                uid = req.params.uid;
                return [4 /*yield*/, (0, db_js_1.get)("SELECT COUNT(*) as unreadCount FROM vuttik_messages m\n       JOIN vuttik_conversations c ON m.conversation_id = c.id\n       WHERE (c.participant_1 = ? OR c.participant_2 = ?) \n         AND m.sender_id != ? \n         AND m.is_read = 0", [uid, uid, uid])];
            case 1:
                row = _a.sent();
                res.json({ count: row.unreadCount || 0 });
                return [3 /*break*/, 3];
            case 2:
                error_76 = _a.sent();
                res.status(500).json({ error: error_76.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Get all conversations for a user
app.get('/api/conversations/:userId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_77;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)("SELECT c.*, \n        COALESCE(c.p1_name, u1.display_name) as p1_name, \n        COALESCE(c.p1_photo, u1.photo_url) as p1_photo,\n        COALESCE(c.p2_name, u2.display_name) as p2_name, \n        COALESCE(c.p2_photo, u2.photo_url) as p2_photo\n       FROM vuttik_conversations c\n       LEFT JOIN vuttik_users u1 ON c.participant_1 = u1.uid\n       LEFT JOIN vuttik_users u2 ON c.participant_2 = u2.uid\n       WHERE c.participant_1 = ? OR c.participant_2 = ?\n       ORDER BY c.last_message_at DESC", [req.params.userId, req.params.userId])];
            case 1:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                error_77 = _a.sent();
                res.status(500).json({ error: error_77.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Create or get existing conversation between two users
app.post('/api/conversations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId1, userId2, p1Name, p1Photo, p2Name, p2Photo, existing, id, now, created, error_78;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, userId1 = _a.userId1, userId2 = _a.userId2, p1Name = _a.p1Name, p1Photo = _a.p1Photo, p2Name = _a.p2Name, p2Photo = _a.p2Photo;
                if (!userId1 || !userId2)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing params' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, db_js_1.get)("SELECT * FROM vuttik_conversations \n       WHERE (participant_1 = ? AND participant_2 = ?) \n          OR (participant_1 = ? AND participant_2 = ?)", [userId1, userId2, userId2, userId1])];
            case 2:
                existing = _b.sent();
                if (existing)
                    return [2 /*return*/, res.json(existing)];
                id = (0, uuid_1.v4)();
                now = new Date().toISOString();
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_conversations (id, participant_1, participant_2, created_at, last_message_at, p1_name, p1_photo, p2_name, p2_photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, userId1, userId2, now, now, p1Name || null, p1Photo || null, p2Name || null, p2Photo || null])];
            case 3:
                _b.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_conversations WHERE id = ?', [id])];
            case 4:
                created = _b.sent();
                res.json(created);
                return [3 /*break*/, 6];
            case 5:
                error_78 = _b.sent();
                res.status(500).json({ error: error_78.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// --- Messages Routes ---
// Get messages for a conversation
app.get('/api/messages/:conversationId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, error_79;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, db_js_1.all)('SELECT * FROM vuttik_messages WHERE conversation_id = ? ORDER BY sent_at ASC', [req.params.conversationId])];
            case 1:
                rows = _a.sent();
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                error_79 = _a.sent();
                res.status(500).json({ error: error_79.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Send a message
app.post('/api/messages', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, conversationId, senderId, content, id, now, msg, error_80;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, conversationId = _a.conversationId, senderId = _a.senderId, content = _a.content;
                if (!conversationId || !senderId || !content)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing params' })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                id = (0, uuid_1.v4)();
                now = new Date().toISOString();
                return [4 /*yield*/, (0, db_js_1.run)('INSERT INTO vuttik_messages (id, conversation_id, sender_id, content, sent_at) VALUES (?, ?, ?, ?, ?)', [id, conversationId, senderId, content, now])];
            case 2:
                _b.sent();
                // Update last message on conversation
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_conversations SET last_message = ?, last_message_at = ? WHERE id = ?', [content, now, conversationId])];
            case 3:
                // Update last message on conversation
                _b.sent();
                return [4 /*yield*/, (0, db_js_1.get)('SELECT * FROM vuttik_messages WHERE id = ?', [id])];
            case 4:
                msg = _b.sent();
                res.json(msg);
                return [4 /*yield*/, logAction(senderId, 'SEND_MESSAGE', id, 'message', { conversationId: conversationId })];
            case 5:
                _b.sent();
                return [3 /*break*/, 7];
            case 6:
                error_80 = _b.sent();
                res.status(500).json({ error: error_80.message });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Mark messages as read
app.patch('/api/messages/read', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, conversationId, userId, error_81;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, conversationId = _a.conversationId, userId = _a.userId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.run)('UPDATE vuttik_messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?', [conversationId, userId])];
            case 2:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_81 = _b.sent();
                res.status(500).json({ error: error_81.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Audit Logs — Returns ALL events from vuttik_metrics ordered by timestamp DESC
app.get('/api/audit-logs', auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var limit, NOISE_EVENTS, placeholders, logs, error_82;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                limit = parseInt(req.query.limit) || 300;
                NOISE_EVENTS = [
                    'click', 'view', 'search', 'VIEW_PROFILE', 'contact',
                    'page_view', 'navigation', 'scroll', 'hover', 'SEND_MESSAGE'
                ];
                placeholders = NOISE_EVENTS.map(function () { return '?'; }).join(', ');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, db_js_1.all)("\n      SELECT \n        m.id,\n        m.user_id,\n        COALESCE(u.display_name, 'Sistema') AS display_name,\n        u.photo_url,\n        m.action,\n        m.target_id,\n        m.target_type,\n        m.metadata,\n        m.timestamp\n      FROM vuttik_metrics m\n      LEFT JOIN vuttik_users u ON m.user_id = u.uid\n      WHERE m.action NOT IN (".concat(placeholders, ")\n        AND m.action NOT LIKE 'click%'\n        AND m.action NOT LIKE 'view%'\n        AND m.action NOT LIKE 'scroll%'\n      ORDER BY m.timestamp DESC\n      LIMIT ?\n    "), __spreadArray(__spreadArray([], NOISE_EVENTS, true), [limit], false))];
            case 2:
                logs = _a.sent();
                res.json(logs);
                return [3 /*break*/, 4];
            case 3:
                error_82 = _a.sent();
                res.status(500).json({ error: 'Failed to fetch audit logs' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
