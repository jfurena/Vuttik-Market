"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_js_1 = require("./db.js");
const cloud_proxy_js_1 = require("./cloud-proxy.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Background Sync Engine
async function processSyncQueue() {
    try {
        const online = await (0, cloud_proxy_js_1.isCloudOnline)();
        if (!online)
            return;
        const pending = await (0, db_js_1.getPendingSyncItems)();
        if (pending.length === 0)
            return;
        console.log(`Syncing ${pending.length} items to cloud...`);
        // Assuming the user is logged in and has a token in offline_sessions?
        // We should group by user_id to get the cloud_token
        // For simplicity, let's just pick the latest session's token
        const sessions = await (0, db_js_1.all)('SELECT cloud_token FROM offline_sessions WHERE cloud_token IS NOT NULL ORDER BY created_at DESC LIMIT 1');
        if (sessions.length === 0)
            return; // No token to sync with
        const token = sessions[0].cloud_token;
        // Send payload
        // You could batch this, but for now send one request with all operations
        const operations = pending.map((p) => ({
            operation: p.operation,
            payload: JSON.parse(p.payload),
            timestamp: p.created_at
        }));
        await (0, cloud_proxy_js_1.cloudSyncPush)(token, operations);
        // Mark done
        for (const p of pending) {
            await (0, db_js_1.markSyncItemDone)(p.id);
        }
        console.log('Sync complete.');
    }
    catch (err) {
        console.error('Background sync failed:', err.message);
    }
}
// Check every 30 seconds
setInterval(processSyncQueue, 30000);
// ==========================================
// API ROUTES FOR POS DESKTOP FRONTEND
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { correo, password } = req.body;
    const online = await (0, cloud_proxy_js_1.isCloudOnline)();
    if (online) {
        try {
            // 1. Try cloud login
            const cloudRes = await (0, cloud_proxy_js_1.cloudLogin)(correo, password);
            // 2. Cache session locally
            const hash = await bcryptjs_1.default.hash(password, 10);
            const businessData = JSON.stringify(cloudRes.profile?.business || {});
            await (0, db_js_1.run)(`INSERT OR REPLACE INTO offline_sessions (id, user_id, correo, nombre, role, password_hash, cloud_token, business_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), cloudRes.user.id, correo, cloudRes.profile?.nombre, cloudRes.profile?.rol, hash, cloudRes.token, businessData, new Date().toISOString()]);
            // Save business and products locally for offline cache
            if (cloudRes.profile?.business_id) {
                await (0, db_js_1.run)(`INSERT OR REPLACE INTO businesses (id, nombre, owner_id) VALUES (?, ?, ?)`, [cloudRes.profile.business_id, cloudRes.profile.business?.nombre || 'Mi Negocio', cloudRes.user.id]);
            }
            return res.json({ token: cloudRes.token, user: cloudRes.user, profile: cloudRes.profile, isOnline: true });
        }
        catch (err) {
            return res.status(401).json({ error: 'Credenciales inválidas o error de red: ' + err.message });
        }
    }
    else {
        // OFFLINE LOGIN
        const sessions = await (0, db_js_1.all)('SELECT * FROM offline_sessions WHERE correo = ? ORDER BY created_at DESC', [correo]);
        if (sessions.length === 0)
            return res.status(401).json({ error: 'No hay sesiones previas para este usuario. Necesitas internet para el primer inicio de sesión.' });
        const session = sessions[0];
        const match = await bcryptjs_1.default.compare(password, session.password_hash);
        if (!match)
            return res.status(401).json({ error: 'Contraseña incorrecta (Offline)' });
        // Mock cloud response format
        return res.json({
            token: 'offline-token',
            user: { id: session.user_id, email: session.correo },
            profile: {
                id: session.id,
                user_id: session.user_id,
                nombre: session.nombre,
                rol: session.role,
                business: JSON.parse(session.business_data || '{}')
            },
            isOnline: false
        });
    }
});
// Create Sale (Works Offline)
app.post('/api/pos/sale', async (req, res) => {
    const { business_id, user_id, total, items } = req.body;
    const id = (0, uuid_1.v4)();
    await (0, db_js_1.run)('INSERT INTO sales (id, business_id, user_id, total, items, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, business_id, user_id, total, JSON.stringify(items), new Date().toISOString()]);
    // Queue to sync
    await (0, db_js_1.addToSyncQueue)('CREATE_SALE', { id, business_id, user_id, total, items }, business_id, user_id);
    // Trigger sync in background immediately if online
    processSyncQueue().catch(() => { });
    res.json({ success: true, saleId: id });
});
// Ping online status
app.get('/api/status', async (req, res) => {
    const online = await (0, cloud_proxy_js_1.isCloudOnline)();
    res.json({ online });
});
// Products
app.get('/api/products/:businessId', async (req, res) => {
    const products = await (0, db_js_1.all)('SELECT * FROM products WHERE business_id = ?', [req.params.businessId]);
    res.json(products);
});
// START
async function start() {
    await (0, db_js_1.initDB)();
    const PORT = process.env.PORT || 3005;
    app.listen(PORT, () => {
        console.log(`Local POS Backend running at http://localhost:${PORT}`);
    });
}
// In production, Electron will start this via require()
if (require.main === module) {
    start();
}
