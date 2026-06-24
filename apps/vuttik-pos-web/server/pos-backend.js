import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { get, run } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import rateLimit from 'express-rate-limit';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.VUTTIK_DB_PATH
    || (process.env.USER_DATA_PATH ? path.join(process.env.USER_DATA_PATH, 'db.json') : path.join(__dirname, 'db.json'));
// === DB STRUCTURE ===
export const emptyBusiness = (id, nombre, codigo, owner_id) => ({
    id,
    codigo,
    nombre,
    owner_id,
    fecha_creacion: new Date(),
    employees: [],
    products: [],
    sales: [],
    shifts: [],
    expenses: [],
    cash_movements: [],
    inventory_movements: [],
    activity_log: [],
    approval_requests: [],
    clientes: [],
    pagos_clientes: [],
    transfers: [],
    ncf_counter: 1,
    settings: { allowed_location: null, whitelisted_locations: [] }
});
const initialDB = {
    owners: [],
    businesses: []
};
// === DB HELPERS ===
export const getDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
        return JSON.parse(JSON.stringify(initialDB));
    }
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!db.owners)
        db.owners = [];
    if (!db.businesses)
        db.businesses = [];
    return db;
};
let isSaving = false;
let pendingSaveData = null;
export const saveDB = (data) => {
    if (isSaving) {
        pendingSaveData = data;
        return;
    }
    isSaving = true;
    fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), (err) => {
        isSaving = false;
        if (err)
            console.error("Error saving DB_FILE:", err);
        if (pendingSaveData) {
            const nextData = pendingSaveData;
            pendingSaveData = null;
            saveDB(nextData);
        }
    });
};
// Get the business data object (throws if not found)
const getBiz = (db, bizId) => {
    const biz = db.businesses.find((b) => b.id === bizId);
    if (!biz)
        throw new Error('Negocio no encontrado');
    if (!biz.clientes)
        biz.clientes = [];
    if (!biz.pagos_clientes)
        biz.pagos_clientes = [];
    return biz;
};
// Generate a short code like SOL-001
export const generateCode = (nombre, existingCodes) => {
    const prefix = nombre.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3) || 'NEG';
    let num = 1;
    let code = `${prefix}-${String(num).padStart(3, '0')}`;
    while (existingCodes.includes(code)) {
        num++;
        code = `${prefix}-${String(num).padStart(3, '0')}`;
    }
    return code;
};
// Log helper
const logActivity = (biz, activity) => {
    if (!biz.activity_log)
        biz.activity_log = [];
    biz.activity_log.push({
        id: 'log-' + Date.now() + Math.random(),
        fecha: new Date(),
        ...activity
    });
};
// === MIDDLEWARES ===
const requireOwnerAuth = (req, res, next) => {
    const s = req.session;
    if (!s.owner_id)
        return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
    next();
};
const requireBizAccess = (req, res, next) => {
    const s = req.session;
    if (!s.business_id)
        return res.status(401).json({ error: 'Selecciona un negocio primero.' });
    const db = getDB();
    const biz = db.businesses.find((b) => b.id === s.business_id);
    if (biz?.is_suspended)
        return res.status(403).json({ error: 'Este negocio ha sido suspendido por administración.' });
    // If owner, give access. If employee, verify business matches.
    if (s.owner_id || s.employee_id)
        return next();
    return res.status(401).json({ error: 'No autorizado.' });
};
const requireOwnerBizAccess = (req, res, next) => {
    const s = req.session;
    if (!s.owner_id || !s.business_id)
        return res.status(403).json({ error: 'Solo el dueño puede realizar esta acción.' });
    const db = getDB();
    const biz = db.businesses.find((b) => b.id === s.business_id);
    if (biz?.is_suspended)
        return res.status(403).json({ error: 'Este negocio ha sido suspendido por administración.' });
    next();
};
// SEC-007 FIX: Rate limiting to prevent brute-force attacks on authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // max 30 attempts per 15 minutes
    message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' },
    standardHeaders: true,
    legacyHeaders: false,
});
async function startServer() {
    const app = express();
    app.use(express.json());
    const sessionSecret = process.env.SESSION_SECRET || 'fallback-dev-secret-change-in-production';
    app.use(session({
        name: 'vuttik_pos_sid',
        secret: sessionSecret,
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: false,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        }
    }));
    // =============================================
    // === AUTH ROUTES ===
    // =============================================
    // Register new owner
    app.post('/api/auth/register', authLimiter, async (req, res) => {
        const { nombre, correo, password } = req.body;
        if (!nombre || !correo || !password)
            return res.status(400).json({ error: 'Completa todos los campos.' });
        if (password.length < 6)
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        try {
            const exists = await get('SELECT uid FROM vuttik_users WHERE email = ?', [correo.toLowerCase().trim()]);
            if (exists)
                return res.status(409).json({ error: 'Ya existe una cuenta con ese correo en Vuttik.' });
            const password_hash = await bcrypt.hash(password, 10);
            const uid = uuidv4();
            await run('INSERT INTO vuttik_users (uid, email, display_name, role, plan_id, created_at, password_hash, oauth_provider, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [uid, correo.toLowerCase().trim(), nombre.trim(), 'user', 'free', new Date().toISOString(), password_hash, 'local', 1]);
            req.session.owner_id = uid;
            req.session.owner_nombre = nombre.trim();
            res.json({ owner: { id: uid, nombre: nombre.trim(), correo: correo.toLowerCase().trim() } });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // Owner login
    app.post('/api/auth/login', authLimiter, async (req, res) => {
        const { correo, password } = req.body;
        if (!correo || !password)
            return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });
        try {
            const user = await get('SELECT * FROM vuttik_users WHERE email = ?', [correo.toLowerCase().trim()]);
            if (!user)
                return res.status(404).json({ error: 'No existe una cuenta con ese correo.' });
            if (!user.password_hash)
                return res.status(401).json({ error: 'Contraseña incorrecta o cuenta de Google.' });
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid)
                return res.status(401).json({ error: 'Contraseña incorrecta.' });
            req.session.owner_id = user.uid;
            req.session.owner_nombre = user.display_name;
            req.session.business_id = null;
            req.session.employee_id = null;
            res.json({ owner: { id: user.uid, nombre: user.display_name, correo: user.email } });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // Employee login
    app.post('/api/auth/employee-login', async (req, res) => {
        const { business_codigo, username, password } = req.body;
        if (!business_codigo || !username || !password)
            return res.status(400).json({ error: 'Completa todos los campos.' });
        const db = getDB();
        const biz = db.businesses.find((b) => b.codigo === business_codigo.toUpperCase().trim());
        if (!biz)
            return res.status(404).json({ error: 'Código de negocio incorrecto.' });
        const employee = biz.employees?.find((e) => e.username === username.trim() && e.estado === 'activo');
        if (!employee)
            return res.status(404).json({ error: 'Usuario no encontrado en este negocio.' });
        const valid = await bcrypt.compare(password, employee.password_hash);
        if (!valid)
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        req.session.employee_id = employee.id;
        req.session.business_id = biz.id;
        req.session.owner_id = null;
        logActivity(biz, {
            usuario_id: employee.id,
            usuario_nombre: employee.nombre,
            accion: 'Inicio de Sesión (Empleado)',
            detalles: `El empleado ${employee.nombre} ingresó al sistema.`,
            modulo: 'Seguridad'
        });
        saveDB(db);
        res.json({
            user: {
                id: employee.id,
                nombre: employee.nombre,
                username: employee.username,
                rol: employee.rol,
                estado: employee.estado,
                business_id: biz.id,
                business_nombre: biz.nombre,
            }
        });
    });
    // Get current session user
    app.get('/api/auth/me', async (req, res) => {
        const s = req.session;
        if (!s.owner_id && !s.employee_id)
            return res.json(null);
        const db = getDB();
        if (s.owner_id && !s.business_id) {
            // Owner without business selected -> return owner info
            let owner = db.owners.find((o) => o.id === s.owner_id);
            if (!owner) {
                // Fallback to SQLite (Vuttik Market DB)
                const user = await get('SELECT * FROM vuttik_users WHERE uid = ?', [s.owner_id]);
                if (user) {
                    owner = { id: user.uid, nombre: user.display_name, correo: user.email };
                }
            }
            if (!owner)
                return res.json(null);
            return res.json({ id: owner.id, nombre: owner.nombre, correo: owner.correo, rol: 'admin', estado: 'activo' });
        }
        if (s.owner_id && s.business_id) {
            // Owner inside a business
            let owner = db.owners.find((o) => o.id === s.owner_id);
            if (!owner) {
                const user = await get('SELECT * FROM vuttik_users WHERE uid = ?', [s.owner_id]);
                if (user) {
                    owner = { id: user.uid, nombre: user.display_name, correo: user.email };
                }
            }
            const biz = db.businesses.find((b) => b.id === s.business_id);
            if (!owner || !biz)
                return res.json(null);
            return res.json({
                id: owner.id,
                nombre: owner.nombre,
                correo: owner.correo,
                rol: 'admin',
                estado: 'activo',
                business_id: biz.id,
                business_nombre: biz.nombre,
                business_codigo: biz.codigo,
                owner_id: owner.id
            });
        }
        if (s.employee_id && s.business_id) {
            const biz = db.businesses.find((b) => b.id === s.business_id);
            if (!biz)
                return res.json(null);
            const emp = biz.employees?.find((e) => e.id === s.employee_id);
            if (!emp)
                return res.json(null);
            return res.json({
                id: emp.id,
                nombre: emp.nombre,
                username: emp.username,
                rol: emp.rol,
                estado: emp.estado,
                business_id: biz.id,
                business_nombre: biz.nombre,
                business_codigo: biz.codigo,
                owner_id: biz.owner_id
            });
        }
        res.json(null);
    });
    // Logout
    app.post('/api/auth/logout', (req, res) => {
        const s = req.session;
        const db = getDB();
        if (s.employee_id && s.business_id) {
            const biz = db.businesses.find((b) => b.id === s.business_id);
            if (biz) {
                const emp = biz.employees?.find((e) => e.id === s.employee_id);
                if (emp) {
                    logActivity(biz, { usuario_id: emp.id, usuario_nombre: emp.nombre, accion: 'Cierre de Sesión', detalles: `El empleado ${emp.nombre} salió del sistema.`, modulo: 'Seguridad' });
                    saveDB(db);
                }
            }
        }
        req.session.destroy(() => res.json({ success: true }));
    });
    // Select business (owner switches into a business)
    app.post('/api/auth/select-business', requireOwnerAuth, (req, res) => {
        const { business_id } = req.body;
        const db = getDB();
        const s = req.session;
        const biz = db.businesses.find((b) => b.id === business_id && b.owner_id === s.owner_id);
        if (!biz)
            return res.status(404).json({ error: 'Negocio no encontrado.' });
        s.business_id = biz.id;
        res.json({ business: { id: biz.id, nombre: biz.nombre, codigo: biz.codigo } });
    });
    // Exit business (owner goes back to business selector)
    app.post('/api/auth/exit-business', requireOwnerAuth, (req, res) => {
        req.session.business_id = null;
        res.json({ success: true });
    });
    // =============================================
    // === BUSINESS ROUTES ===
    // =============================================
    // List my businesses
    app.get('/api/businesses', requireOwnerAuth, (req, res) => {
        const s = req.session;
        const db = getDB();
        const myBizList = db.businesses
            .filter((b) => b.owner_id === s.owner_id)
            .map((b) => {
            const sales = b.sales || [];
            const expenses = b.expenses || [];
            const cobradoSales = sales.filter((s) => s.estado === 'completada' || s.estado === 'pagada');
            const totalVendido = cobradoSales.reduce((acc, s) => acc + (s.total || 0), 0);
            const comprasMercancia = expenses.filter((e) => e.categoria === 'Compras de Mercancía' || e.es_compra_mercancia);
            const gastosOperativos = expenses.filter((e) => e.categoria !== 'TRANSFERENCIA' && e.categoria !== 'Compras de Mercancía' && !e.es_compra_mercancia);
            const totalComprasMercancia = comprasMercancia.reduce((acc, e) => acc + (e.monto || 0), 0);
            const totalGastosOperativos = gastosOperativos.reduce((acc, e) => acc + (e.monto || 0), 0);
            const gananciaNeta = totalVendido - totalComprasMercancia - totalGastosOperativos;
            return {
                id: b.id,
                nombre: b.nombre,
                codigo: b.codigo,
                fecha_creacion: b.fecha_creacion,
                employee_count: (b.employees || []).length,
                product_count: (b.products || []).length,
                sales_count: (b.sales || []).length,
                ganancia_neta: gananciaNeta,
                is_suspended: b.is_suspended || false
            };
        });
        res.json(myBizList);
    });
    // Create business
    app.post('/api/businesses', requireOwnerAuth, async (req, res) => {
        const { nombre } = req.body;
        if (!nombre || !nombre.trim())
            return res.status(400).json({ error: 'El nombre del negocio es obligatorio.' });
        const s = req.session;
        const db = getDB();
        // Check business limit
        const userBusinessesCount = db.businesses.filter((b) => b.owner_id === s.owner_id).length;
        if (userBusinessesCount >= 1) {
            try {
                const user = await get(`SELECT multi_business_approved FROM vuttik_users WHERE uid = ?`, [s.owner_id]);
                if (!user || !user.multi_business_approved) {
                    // Check if there is already a pending request
                    const existingReq = await get(`SELECT status FROM vuttik_business_requests WHERE user_id = ? AND status = 'pending'`, [s.owner_id]);
                    if (existingReq) {
                        return res.status(403).json({ error: 'pending_evaluation', message: 'Tu petición está siendo evaluada por el Mega Guardian.' });
                    }
                    return res.status(403).json({ error: 'needs_request', message: 'Para crear más de un negocio, necesitas aprobación del Mega Guardian.' });
                }
            }
            catch (err) {
                console.error('Error checking multi_business_approved:', err);
                return res.status(500).json({ error: 'Error del servidor al verificar permisos.' });
            }
        }
        const existingCodes = db.businesses.map((b) => b.codigo);
        const codigo = generateCode(nombre, existingCodes);
        const newBiz = emptyBusiness('biz-' + Date.now(), nombre.trim(), codigo, s.owner_id);
        db.businesses.push(newBiz);
        saveDB(db);
        res.json({ id: newBiz.id, nombre: newBiz.nombre, codigo: newBiz.codigo, fecha_creacion: newBiz.fecha_creacion });
    });
    // Request multiple businesses
    app.post('/api/pos/request-multi-business', requireOwnerAuth, async (req, res) => {
        const s = req.session;
        try {
            const existingReq = await get(`SELECT status FROM vuttik_business_requests WHERE user_id = ? AND status = 'pending'`, [s.owner_id]);
            if (existingReq) {
                return res.status(400).json({ error: 'Ya tienes una solicitud pendiente.' });
            }
            const reqId = 'req-' + Date.now();
            await run(`INSERT INTO vuttik_business_requests (id, user_id, status, created_at) VALUES (?, ?, 'pending', ?)`, [reqId, s.owner_id, new Date().toISOString()]);
            res.json({ success: true });
        }
        catch (err) {
            console.error('Error submitting business request:', err);
            res.status(500).json({ error: 'Error al enviar la solicitud.' });
        }
    });
    // Update business name
    app.patch('/api/businesses/:bizId', requireOwnerAuth, (req, res) => {
        const { bizId } = req.params;
        const { nombre } = req.body;
        const s = req.session;
        const db = getDB();
        const idx = db.businesses.findIndex((b) => b.id === bizId && b.owner_id === s.owner_id);
        if (idx === -1)
            return res.status(404).json({ error: 'Negocio no encontrado.' });
        if (nombre)
            db.businesses[idx].nombre = nombre.trim();
        saveDB(db);
        res.json({ id: db.businesses[idx].id, nombre: db.businesses[idx].nombre, codigo: db.businesses[idx].codigo });
    });
    // Update a business
    app.put('/api/businesses/:bizId', requireOwnerAuth, (req, res) => {
        const { bizId } = req.params;
        const { nombre } = req.body;
        if (!nombre || !nombre.trim())
            return res.status(400).json({ error: 'Nombre inválido.' });
        const s = req.session;
        const db = getDB();
        const idx = db.businesses.findIndex((b) => b.id === bizId && b.owner_id === s.owner_id);
        if (idx === -1)
            return res.status(404).json({ error: 'Negocio no encontrado.' });
        db.businesses[idx].nombre = nombre.trim();
        saveDB(db);
        res.json(db.businesses[idx]);
    });
    // Delete business
    app.delete('/api/businesses/:bizId', requireOwnerAuth, (req, res) => {
        const { bizId } = req.params;
        const s = req.session;
        const db = getDB();
        const idx = db.businesses.findIndex((b) => b.id === bizId && b.owner_id === s.owner_id);
        if (idx === -1)
            return res.status(404).json({ error: 'Negocio no encontrado.' });
        db.businesses.splice(idx, 1);
        saveDB(db);
        res.json({ success: true });
    });
    // =============================================
    // === EMPLOYEE MANAGEMENT ROUTES ===
    // =============================================
    // List employees of current business
    app.get('/api/employees', requireOwnerBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const safe = (biz.employees || []).map(({ password_hash, ...e }) => e);
        res.json(safe);
    });
    // Add employee
    app.post('/api/employees', requireOwnerBizAccess, async (req, res) => {
        const { nombre, username, password, rol } = req.body;
        if (!nombre || !username || !password)
            return res.status(400).json({ error: 'Nombre, usuario y contraseña son obligatorios.' });
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        if (!biz.employees)
            biz.employees = [];
        const dup = biz.employees.find((e) => e.username === username.trim());
        if (dup)
            return res.status(409).json({ error: 'Ya existe un empleado con ese nombre de usuario.' });
        const password_hash = await bcrypt.hash(password, 10);
        const newEmp = {
            id: 'emp-' + Date.now(),
            nombre: nombre.trim(),
            username: username.trim(),
            password_hash,
            rol: rol || 'cajero',
            estado: 'activo',
            fecha_creacion: new Date()
        };
        biz.employees.push(newEmp);
        saveDB(db);
        const { password_hash: _, ...safe } = newEmp;
        res.json(safe);
    });
    // Update employee
    app.put('/api/employees/:empId', requireOwnerBizAccess, async (req, res) => {
        const { empId } = req.params;
        const { nombre, username, password, rol, estado } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const idx = (biz.employees || []).findIndex((e) => e.id === empId);
        if (idx === -1)
            return res.status(404).json({ error: 'Empleado no encontrado.' });
        if (nombre)
            biz.employees[idx].nombre = nombre.trim();
        if (username)
            biz.employees[idx].username = username.trim();
        if (rol)
            biz.employees[idx].rol = rol;
        if (estado)
            biz.employees[idx].estado = estado;
        if (password && password.length >= 6) {
            biz.employees[idx].password_hash = await bcrypt.hash(password, 10);
        }
        saveDB(db);
        const { password_hash: _, ...safe } = biz.employees[idx];
        res.json(safe);
    });
    // Delete employee
    app.delete('/api/employees/:empId', requireOwnerBizAccess, (req, res) => {
        const { empId } = req.params;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        biz.employees = (biz.employees || []).filter((e) => e.id !== empId);
        saveDB(db);
        res.json({ success: true });
    });
    // =============================================
    // === BUSINESS DATA ROUTES (require biz access) ===
    // =============================================
    // Settings
    app.get('/api/settings', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        res.json(biz.settings || { allowed_location: null });
    });
    app.post('/api/settings', requireOwnerBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        biz.settings = { ...(biz.settings || {}), ...req.body };
        saveDB(db);
        res.json(biz.settings);
    });
    app.post('/api/settings/log-location', requireBizAccess, (req, res) => {
        const { lat, lng } = req.body;
        if (!lat || !lng)
            return res.status(400).json({ error: 'Latitud y longitud requeridas' });
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        if (!biz.settings)
            biz.settings = {};
        if (!biz.settings.login_locations)
            biz.settings.login_locations = [];
        biz.settings.login_locations.push({
            lat: Number(lat),
            lng: Number(lng),
            timestamp: new Date().toISOString(),
            usuario_id: s.owner_id || s.employee_id
        });
        const locations = biz.settings.login_locations;
        if (locations.length >= 1) {
            const getDistance = (lat1, lng1, lat2, lng2) => {
                const R = 6371000;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            };
            let bestPoint = { lat: Number(lat), lng: Number(lng) };
            let maxNeighbors = 0;
            for (const p of locations) {
                let neighbors = 0;
                for (const other of locations) {
                    if (getDistance(p.lat, p.lng, other.lat, other.lng) <= 50) {
                        neighbors++;
                    }
                }
                if (neighbors > maxNeighbors) {
                    maxNeighbors = neighbors;
                    bestPoint = { lat: p.lat, lng: p.lng };
                }
            }
            biz.settings.most_frequent_location = {
                lat: bestPoint.lat,
                lng: bestPoint.lng,
                count: maxNeighbors
            };
            if (!biz.settings.allowed_location) {
                biz.settings.allowed_location = {
                    lat: bestPoint.lat,
                    lng: bestPoint.lng,
                    radius_meters: 200,
                    address: "Ubicación sugerida automáticamente (la más concurrida)"
                };
            }
        }
        saveDB(db);
        res.json({ success: true, most_frequent: biz.settings.most_frequent_location });
    });
    // Users (employees list for compatibility)
    app.get('/api/users', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const safe = (biz.employees || []).map(({ password_hash, ...e }) => ({
            ...e,
            correo: `${e.username}@${biz.codigo.toLowerCase()}.local`
        }));
        res.json(safe);
    });
    // Products
    app.get('/api/products', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        res.json(getBiz(db, s.business_id).products || []);
    });
    app.post('/api/products', requireBizAccess, async (req, res) => {
        const s = req.session;
        const { usuario_id, ...productData } = req.body;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const newProduct = { ...productData, id: Date.now().toString(), fecha_creacion: new Date(), fecha_actualizacion: new Date() };
        biz.products.push(newProduct);
        // Sync to Vuttik Market
        try {
            const sqliteProductId = 'pos-' + newProduct.id;
            const ownerName = biz.nombre || 'Negocio POS';
            const location = biz.settings?.allowed_location || 'Ubicación no especificada';
            await run(`
        INSERT INTO vuttik_products 
        (id, title, price, author_id, author_name, location, store_name, is_independent, created_at, barcode) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                sqliteProductId,
                newProduct.nombre,
                Number(newProduct.precio_venta) || 0,
                biz.owner_id,
                ownerName,
                location,
                ownerName,
                1, // is_independent
                new Date().toISOString(),
                newProduct.codigo_barras || ''
            ]);
        }
        catch (err) {
            console.error('Error syncing POS product to Vuttik SQLite:', err);
        }
        if (Number(newProduct.cantidad_disponible) > 0 && Number(newProduct.costo_compra) > 0) {
            const montoTotal = Number(newProduct.cantidad_disponible) * Number(newProduct.costo_compra);
            const fuente_pago = productData.fuente_pago || 'Caja';
            const uid = usuario_id || s.owner_id || s.employee_id;
            const newExpense = {
                id: 'exp-compra-' + Date.now(),
                descripcion: `Compra Inicial: ${newProduct.nombre} (${newProduct.cantidad_disponible} ${newProduct.unidad_venta || 'und'} a RD$${newProduct.costo_compra})`,
                monto: montoTotal,
                categoria: 'Compras de Mercancía',
                fecha: new Date(),
                usuario_id: uid,
                fuente_pago: fuente_pago,
                es_compra_mercancia: true,
                producto_id: newProduct.id,
                pagado_desde_caja: fuente_pago === 'Caja'
            };
            if (!biz.expenses)
                biz.expenses = [];
            biz.expenses.push(newExpense);
            if (!biz.inventory_movements)
                biz.inventory_movements = [];
            biz.inventory_movements.push({
                id: 'mov-' + Date.now() + Math.random(),
                producto_id: newProduct.id,
                tipo_movimiento: 'Compra',
                cantidad: Number(newProduct.cantidad_disponible),
                costo_unitario: Number(newProduct.costo_compra),
                monto_total: montoTotal,
                fuente_pago: fuente_pago,
                usuario_id: uid,
                fecha: new Date(),
                motivo: 'Inventario inicial de nuevo producto',
                metadata: null
            });
            if (fuente_pago === 'Caja') {
                const activeShift = (biz.shifts || []).find((sh) => sh.usuario_id === uid && sh.estado === 'abierto')
                    || (biz.shifts || []).find((sh) => sh.estado === 'abierto');
                if (activeShift) {
                    const movement = { id: 'mov-caja-' + Date.now(), turno_id: activeShift.id, usuario_id: uid, tipo: 'salida', monto: montoTotal, motivo: `Compra Inicial: ${newProduct.nombre}`, fecha: new Date() };
                    if (!biz.cash_movements)
                        biz.cash_movements = [];
                    biz.cash_movements.push(movement);
                    activeShift.total_salidas += montoTotal;
                    activeShift.monto_esperado = activeShift.monto_inicial + activeShift.total_ventas + activeShift.total_entradas - activeShift.total_salidas;
                    activeShift.fecha_actualizacion = new Date();
                }
            }
            else if (fuente_pago === 'Banco') {
                biz.bank_balance = (biz.bank_balance || 0) - montoTotal;
            }
        }
        logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Creación de Producto', detalles: `Producto creado: ${newProduct.nombre}`, modulo: 'Inventario' });
        saveDB(db);
        res.json(newProduct);
    });
    app.put('/api/products/:id', requireBizAccess, async (req, res) => {
        const { id } = req.params;
        const { usuario_id, ...updateData } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const index = biz.products.findIndex((p) => p.id === id);
        if (index === -1)
            return res.status(404).json({ error: 'Producto no encontrado' });
        const oldProduct = { ...biz.products[index] };
        biz.products[index] = { ...biz.products[index], ...updateData, fecha_actualizacion: new Date() };
        const deltaCantidad = Number(updateData.cantidad_disponible || oldProduct.cantidad_disponible) - Number(oldProduct.cantidad_disponible);
        const oldMonto = Number(oldProduct.cantidad_disponible) * Number(oldProduct.costo_compra);
        const newMonto = Number(updateData.cantidad_disponible || oldProduct.cantidad_disponible) * Number(updateData.costo_compra || oldProduct.costo_compra);
        const deltaMonto = newMonto - oldMonto;
        let details = `Producto editado: ${biz.products[index].nombre}. Motivo: ${updateData.motivo_edicion || 'Ninguno'}. `;
        if (deltaCantidad !== 0)
            details += `Stock: ${oldProduct.cantidad_disponible} -> ${updateData.cantidad_disponible}. `;
        if (oldProduct.costo_compra !== updateData.costo_compra)
            details += `Costo: ${oldProduct.costo_compra} -> ${updateData.costo_compra}. `;
        if (oldProduct.precio_venta !== updateData.precio_venta)
            details += `Precio: ${oldProduct.precio_venta} -> ${updateData.precio_venta}. `;
        // If stock or cost changed, log a movement and financial adjustment
        if (deltaCantidad !== 0 || deltaMonto !== 0) {
            if (!biz.inventory_movements)
                biz.inventory_movements = [];
            biz.inventory_movements.push({
                id: 'mov-' + Date.now() + Math.random(),
                producto_id: id,
                tipo_movimiento: 'Ajuste',
                cantidad: deltaCantidad !== 0 ? deltaCantidad : 0,
                costo_unitario: Number(updateData.costo_compra || oldProduct.costo_compra),
                monto_total: deltaMonto,
                usuario_id: usuario_id || s.owner_id || s.employee_id,
                fecha: new Date(),
                motivo: `Ajuste por edición. Motivo: ${updateData.motivo_edicion || 'Corrección de error'}`
            });
            if (deltaMonto !== 0) {
                if (!biz.expenses)
                    biz.expenses = [];
                biz.expenses.push({
                    id: 'exp-adj-' + Date.now(),
                    descripcion: `Ajuste de inventario: ${oldProduct.nombre} (${updateData.motivo_edicion || 'Corrección'})`,
                    monto: deltaMonto,
                    categoria: 'Compras de Mercancía',
                    fecha: new Date(),
                    usuario_id: usuario_id || s.owner_id || s.employee_id,
                    fuente_pago: 'Ajuste',
                    es_compra_mercancia: true,
                    producto_id: id,
                    pagado_desde_caja: false
                });
            }
        }
        logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Edición de Producto', detalles: details, modulo: 'Inventario' });
        saveDB(db);
        // Sync update to Vuttik SQLite
        try {
            const sqliteProductId = 'pos-' + id;
            const product = biz.products[index];
            await run(`
        UPDATE vuttik_products 
        SET title = ?, price = ?, barcode = ?
        WHERE id = ? AND author_id = ?
      `, [
                product.nombre,
                Number(product.precio_venta) || 0,
                product.codigo_barras || '',
                sqliteProductId,
                biz.owner_id
            ]);
        }
        catch (err) {
            console.error('Error updating POS product in Vuttik SQLite:', err);
        }
        res.json(biz.products[index]);
    });
    app.delete('/api/products/:id', requireOwnerBizAccess, async (req, res) => {
        const { id } = req.params;
        const { usuario_id, usuario_nombre } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const index = biz.products.findIndex((p) => p.id === id);
        if (index === -1)
            return res.status(404).json({ error: 'Producto no encontrado' });
        const product = biz.products[index];
        logActivity(biz, { usuario_id: usuario_id || s.owner_id, usuario_nombre: usuario_nombre || 'Dueño', accion: 'Eliminación de Producto', detalles: `Eliminado: ${product.nombre}`, modulo: 'Inventario' });
        biz.products.splice(index, 1);
        saveDB(db);
        // Sync delete to Vuttik SQLite
        try {
            const sqliteProductId = 'pos-' + id;
            await run('DELETE FROM vuttik_products WHERE id = ? AND author_id = ?', [sqliteProductId, biz.owner_id]);
        }
        catch (err) {
            console.error('Error deleting POS product in Vuttik SQLite:', err);
        }
        res.json({ success: true });
    });
    app.patch('/api/products/:id/stock', requireBizAccess, (req, res) => {
        const { id } = req.params;
        const { cantidad, tipo_movimiento, motivo, usuario_id } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const pIndex = biz.products.findIndex((p) => p.id === id);
        if (pIndex === -1)
            return res.status(404).json({ error: 'Producto no encontrado' });
        const product = biz.products[pIndex];
        product.cantidad_disponible += Number(cantidad);
        product.fecha_actualizacion = new Date();
        if (!biz.inventory_movements)
            biz.inventory_movements = [];
        biz.inventory_movements.push({ id: 'mov-' + Date.now() + Math.random(), producto_id: id, tipo_movimiento, cantidad: Number(cantidad), usuario_id, fecha: new Date(), motivo: motivo || 'Ajuste manual', metadata: req.body.metadata || null });
        logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Ajuste de Stock', detalles: `${product.nombre}: ${tipo_movimiento} de ${cantidad}. Motivo: ${motivo || 'Ajuste manual'}.`, modulo: 'Inventario' });
        saveDB(db);
        res.json(product);
    });
    app.post('/api/products/:id/restock', requireBizAccess, (req, res) => {
        const { id } = req.params;
        const { cantidad, costo_unitario, motivo, usuario_id, usuario_nombre, fuente_pago } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const pIndex = biz.products.findIndex((p) => p.id === id);
        if (pIndex === -1)
            return res.status(404).json({ error: 'Producto no encontrado' });
        const product = biz.products[pIndex];
        const montoTotal = Number(cantidad) * Number(costo_unitario);
        product.cantidad_disponible += Number(cantidad);
        product.costo_compra = Number(costo_unitario); // Update current cost to new restock cost
        product.fecha_actualizacion = new Date();
        // Register inventory movement
        if (!biz.inventory_movements)
            biz.inventory_movements = [];
        biz.inventory_movements.push({
            id: 'mov-' + Date.now() + Math.random(),
            producto_id: id,
            tipo_movimiento: 'Compra',
            cantidad: Number(cantidad),
            costo_unitario: Number(costo_unitario),
            monto_total: montoTotal,
            fuente_pago: fuente_pago || 'Caja',
            usuario_id: usuario_id || s.owner_id || s.employee_id,
            fecha: new Date(),
            motivo: motivo || 'Compra de mercancía',
            metadata: req.body.metadata || null
        });
        // Auto-register expense for this purchase
        const newExpense = {
            id: 'exp-compra-' + Date.now(),
            descripcion: `Compra: ${product.nombre} (${cantidad} ${product.unidad_venta || 'und'} × RD$${costo_unitario})`,
            monto: montoTotal,
            categoria: 'Compras de Mercancía',
            fecha: new Date(),
            usuario_id: usuario_id || s.owner_id || s.employee_id,
            fuente_pago: fuente_pago || 'Caja',
            es_compra_mercancia: true,
            producto_id: id,
            pagado_desde_caja: fuente_pago === 'Caja'
        };
        if (!biz.expenses)
            biz.expenses = [];
        biz.expenses.push(newExpense);
        // If paid from cash register, deduct from active shift
        if (fuente_pago === 'Caja') {
            const uid = usuario_id || s.owner_id || s.employee_id;
            const activeShift = (biz.shifts || []).find((sh) => sh.usuario_id === uid && sh.estado === 'abierto')
                || (biz.shifts || []).find((sh) => sh.estado === 'abierto');
            if (activeShift) {
                const movement = { id: 'mov-caja-' + Date.now(), turno_id: activeShift.id, usuario_id: uid, tipo: 'salida', monto: montoTotal, motivo: `Compra: ${product.nombre}`, fecha: new Date() };
                if (!biz.cash_movements)
                    biz.cash_movements = [];
                biz.cash_movements.push(movement);
                activeShift.total_salidas += montoTotal;
                activeShift.monto_esperado = activeShift.monto_inicial + activeShift.total_ventas + activeShift.total_entradas - activeShift.total_salidas;
                activeShift.fecha_actualizacion = new Date();
            }
        }
        logActivity(biz, {
            usuario_id: usuario_id || s.owner_id || s.employee_id,
            usuario_nombre: usuario_nombre || 'Sistema',
            accion: 'Compra de Mercancía',
            detalles: `${product.nombre}: ${cantidad} uds a RD$${costo_unitario} c/u = RD$${montoTotal}. Fuente: ${fuente_pago || 'Caja'}.`,
            modulo: 'Inventario'
        });
        saveDB(db);
        res.json(product);
    });
    app.get('/api/products/:id/history', requireBizAccess, (req, res) => {
        const { id } = req.params;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const movements = (biz.inventory_movements || [])
            .filter((m) => m.producto_id === id)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        res.json(movements);
    });
    // Expenses
    app.get('/api/expenses', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const owner = (db.owners || db.users || []).find((u) => u.id === biz.propietario_id || u.id === biz.owner_id);
        const employees = biz.empleados || [];
        const expenses = (biz.expenses || []).map((exp) => {
            let usuario_nombre = exp.usuario_nombre;
            if (!usuario_nombre && exp.usuario_id) {
                if (exp.usuario_id === owner?.id)
                    usuario_nombre = owner?.nombre;
                else {
                    const emp = employees.find((e) => e.id === exp.usuario_id);
                    if (emp)
                        usuario_nombre = emp.nombre;
                }
            }
            return { ...exp, usuario_nombre: usuario_nombre || 'Desconocido' };
        });
        res.json(expenses);
    });
    app.post('/api/expenses', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const { monto, pagado_desde_caja, usuario_id, metadata, fecha: customFecha } = req.body;
        let expenseFecha = new Date();
        if (customFecha) {
            const parts = customFecha.split('-');
            if (parts.length === 3) {
                const d = new Date();
                d.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                expenseFecha = d;
            }
        }
        const newExpense = { ...req.body, id: 'exp-' + Date.now(), fecha: expenseFecha, metadata: metadata || null };
        if (!biz.expenses)
            biz.expenses = [];
        biz.expenses.push(newExpense);
        logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Registro de Gasto', detalles: `Gasto: ${newExpense.descripcion} - Monto: ${newExpense.monto}${pagado_desde_caja ? ' (Pagado desde caja)' : ''}`, modulo: 'Gastos' });
        if (pagado_desde_caja) {
            const activeShift = (biz.shifts || []).find((sh) => sh.usuario_id === usuario_id && sh.estado === 'abierto');
            if (activeShift) {
                const movement = { id: 'mov-' + Date.now(), turno_id: activeShift.id, usuario_id, tipo: 'salida', monto: Number(monto), motivo: `Gasto: ${newExpense.descripcion}`, fecha: new Date() };
                if (!biz.cash_movements)
                    biz.cash_movements = [];
                biz.cash_movements.push(movement);
                activeShift.total_salidas += Number(monto);
                activeShift.monto_esperado -= Number(monto);
                activeShift.fecha_actualizacion = new Date();
                newExpense.turno_id = activeShift.id;
            }
        }
        saveDB(db);
        res.json(newExpense);
    });
    // Sales
    app.get('/api/sales', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const salesWithDetails = (biz.sales || []).map((sale) => {
            const emp = (biz.employees || []).find((e) => e.id === sale.usuario_id);
            const enrichedItems = (sale.items || []).map((item) => {
                const product = (biz.products || []).find((p) => p.id === item.producto_id);
                return { ...item, nombre: item.nombre || (product ? product.nombre : 'Producto Eliminado'), unidad_venta: item.unidad_venta || (product ? product.unidad_venta : 'Unidad') };
            });
            return { ...sale, usuario_nombre: emp ? emp.nombre : (sale.usuario_nombre || 'Desconocido'), items: enrichedItems };
        });
        res.json(salesWithDetails);
    });
    app.post('/api/sales', requireBizAccess, (req, res) => {
        const { sale, items } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        // SECURITY FIX: Prevent sales if the shift is from a previous day
        if (sale.turno_id) {
            const shift = (biz.shifts || []).find((sh) => sh.id === sale.turno_id);
            if (shift && shift.fecha_apertura) {
                const shiftDate = new Date(shift.fecha_apertura).toDateString();
                const serverDate = new Date().toDateString();
                if (shiftDate !== serverDate) {
                    return res.status(400).json({ error: 'El turno activo pertenece a un día anterior. Por favor cierra la caja y abre una nueva.' });
                }
            }
        }
        // BIZ-001 FIX: Validate stock on the server before processing — prevents negative inventory
        // from direct API calls that bypass frontend validation
        for (const item of items) {
            const product = (biz.products || []).find((p) => p.id === item.producto_id);
            if (!product) {
                return res.status(400).json({ error: `Producto no encontrado: ${item.nombre || item.producto_id}` });
            }
            if (product.cantidad_disponible < item.cantidad) {
                return res.status(400).json({
                    error: `Stock insuficiente para "${product.nombre}". Disponible: ${product.cantidad_disponible}, solicitado: ${item.cantidad}.`
                });
            }
        }
        let costoTotal = 0;
        items.forEach((item) => {
            const pIndex = (biz.products || []).findIndex((p) => p.id === item.producto_id);
            if (pIndex !== -1) {
                biz.products[pIndex].cantidad_disponible -= item.cantidad;
                biz.products[pIndex].fecha_actualizacion = new Date();
                costoTotal += (biz.products[pIndex].costo_compra || 0) * item.cantidad;
            }
            if (!biz.inventory_movements)
                biz.inventory_movements = [];
            biz.inventory_movements.push({ id: 'mov-' + Date.now() + Math.random(), producto_id: item.producto_id, tipo_movimiento: 'Venta', cantidad: -item.cantidad, usuario_id: sale.usuario_id, fecha: new Date(), motivo: `Venta ${sale.codigo_recibo}` });
        });
        const newSale = { ...sale, id: 'sale-' + Date.now(), fecha: new Date(), costo_total: costoTotal, metadata: req.body.metadata || sale.metadata || null, items };
        // SEC-003 FIX: Generate NCF on the server with an atomic counter to ensure uniqueness and sequence
        if (!biz.ncf_counter)
            biz.ncf_counter = 1;
        if (sale.tipo_comprobante && sale.tipo_comprobante !== 'Sin Comprobante') {
            newSale.ncf = `B01${String(biz.ncf_counter).padStart(9, '0')}`;
            biz.ncf_counter++;
        }
        if (!biz.sales)
            biz.sales = [];
        biz.sales.push(newSale);
        // BIZ-004 FIX: Validate credit limit on the server — prevents employees from exceeding admin-set limits
        if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
            if (!biz.clientes)
                biz.clientes = [];
            const creditCliente = biz.clientes.find((c) => c.id === sale.cliente_id);
            if (creditCliente && creditCliente.limite_credito > 0) {
                const newDebt = (creditCliente.deuda_actual || 0) + sale.total;
                if (newDebt > creditCliente.limite_credito) {
                    return res.status(400).json({
                        error: `Límite de crédito excedido para "${creditCliente.nombre}". Deuda actual: RD$${creditCliente.deuda_actual}, Límite: RD$${creditCliente.limite_credito}, Venta: RD$${sale.total}.`
                    });
                }
            }
        }
        // Increment client debt if fiao
        if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
            if (!biz.clientes)
                biz.clientes = [];
            const clIdx = biz.clientes.findIndex((c) => c.id === sale.cliente_id);
            if (clIdx !== -1) {
                biz.clientes[clIdx].deuda_actual += sale.total;
            }
        }
        const shiftIndex = (biz.shifts || []).findIndex((sh) => sh.id === sale.turno_id);
        if (shiftIndex !== -1) {
            const shift = biz.shifts[shiftIndex];
            shift.total_ventas += sale.total;
            if (sale.metodo_pago === 'Efectivo') {
                shift.total_efectivo += sale.total;
                shift.monto_esperado += sale.total;
            }
            else if (sale.metodo_pago === 'Tarjeta')
                shift.total_tarjeta += sale.total;
            else if (sale.metodo_pago === 'Transferencia')
                shift.total_transferencia += sale.total;
            else if (sale.metodo_pago === 'Mixto') {
                shift.total_mixto += sale.total;
                if (sale.payment_breakdown) {
                    shift.total_efectivo += (sale.payment_breakdown.cash || 0);
                    shift.total_tarjeta += (sale.payment_breakdown.card || 0);
                    shift.total_transferencia += (sale.payment_breakdown.transfer || 0);
                    shift.monto_esperado += (sale.payment_breakdown.cash || 0);
                }
            }
            shift.fecha_actualizacion = new Date();
        }
        logActivity(biz, { usuario_id: sale.usuario_id, usuario_nombre: sale.usuario_nombre || 'Empleado', accion: 'Venta Realizada', detalles: `Venta #${sale.codigo_recibo} por ${sale.total}. Método: ${sale.metodo_pago}`, modulo: 'Ventas' });
        saveDB(db);
        res.json(newSale);
    });
    app.post('/api/sales/refund/:saleId', requireBizAccess, async (req, res) => {
        const { saleId } = req.params;
        const { password, motivo, usuario_nombre, usuario_id } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        // Validate using owner password
        const owner = db.owners.find((o) => o.id === biz.owner_id);
        const valid = owner ? await bcrypt.compare(password, owner.password_hash) : false;
        if (!valid)
            return res.status(401).json({ error: 'La clave de seguridad ingresada es incorrecta.' });
        if (!motivo || motivo.trim().length === 0)
            return res.status(400).json({ error: 'El motivo del reembolso es obligatorio' });
        const saleIndex = (biz.sales || []).findIndex((sale) => sale.id === saleId);
        if (saleIndex === -1)
            return res.status(404).json({ error: 'Venta no encontrada' });
        const sale = biz.sales[saleIndex];
        if (sale.estado !== 'completada')
            return res.status(400).json({ error: `No se puede reembolsar una venta con estado: ${sale.estado}` });
        sale.estado = 'reembolsada';
        sale.fecha_actualizacion = new Date();
        sale.motivo_reembolso = motivo;
        sale.reembolsado_por = usuario_nombre || 'Dueño';
        // Deduct client debt if fiao
        if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
            if (!biz.clientes)
                biz.clientes = [];
            const clIdx = biz.clientes.findIndex((c) => c.id === sale.cliente_id);
            if (clIdx !== -1) {
                biz.clientes[clIdx].deuda_actual -= sale.total;
                if (biz.clientes[clIdx].deuda_actual < 0)
                    biz.clientes[clIdx].deuda_actual = 0;
            }
        }
        logActivity(biz, { usuario_id: usuario_id || s.owner_id, usuario_nombre: usuario_nombre || 'Dueño', accion: 'Reembolso de Venta', detalles: `Venta #${sale.codigo_recibo} reembolsada. Monto: ${sale.total}. Motivo: ${motivo}`, modulo: 'Ventas' });
        if (sale.items) {
            sale.items.forEach((item) => { const pIndex = (biz.products || []).findIndex((p) => p.id === item.producto_id); if (pIndex !== -1) {
                biz.products[pIndex].cantidad_disponible += item.cantidad;
                biz.products[pIndex].fecha_actualizacion = new Date();
            } if (!biz.inventory_movements)
                biz.inventory_movements = []; biz.inventory_movements.push({ id: 'mov-' + Date.now() + Math.random(), producto_id: item.producto_id, tipo_movimiento: 'Reembolso', cantidad: item.cantidad, usuario_id: sale.usuario_id, fecha: new Date(), motivo: `Reembolso Venta ${sale.codigo_recibo}` }); });
        }
        const shiftIndex = (biz.shifts || []).findIndex((sh) => sh.id === sale.turno_id);
        if (shiftIndex !== -1) {
            const shift = biz.shifts[shiftIndex];
            shift.total_reembolsos += sale.total;
            shift.total_ventas -= sale.total;
            if (sale.metodo_pago === 'Efectivo') {
                shift.total_efectivo -= sale.total;
                shift.monto_esperado -= sale.total;
            }
            else if (sale.metodo_pago === 'Tarjeta')
                shift.total_tarjeta -= sale.total;
            else if (sale.metodo_pago === 'Transferencia')
                shift.total_transferencia -= sale.total;
            shift.fecha_actualizacion = new Date();
        }
        saveDB(db);
        res.json(sale);
    });
    app.post('/api/sales/cancel/:saleId', requireBizAccess, (req, res) => {
        const { saleId } = req.params;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const saleIndex = (biz.sales || []).findIndex((sale) => sale.id === saleId);
        if (saleIndex === -1)
            return res.status(404).json({ error: 'Venta no encontrada' });
        const sale = biz.sales[saleIndex];
        if (sale.estado !== 'completada')
            return res.status(400).json({ error: 'No se puede cancelar esta venta' });
        sale.estado = 'cancelada';
        sale.fecha_actualizacion = new Date();
        // Deduct client debt if fiao
        if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
            if (!biz.clientes)
                biz.clientes = [];
            const clIdx = biz.clientes.findIndex((c) => c.id === sale.cliente_id);
            if (clIdx !== -1) {
                biz.clientes[clIdx].deuda_actual -= sale.total;
                if (biz.clientes[clIdx].deuda_actual < 0)
                    biz.clientes[clIdx].deuda_actual = 0;
            }
        }
        logActivity(biz, { usuario_id: s.owner_id || s.employee_id, usuario_nombre: 'Administrador', accion: 'Cancelación de Venta', detalles: `Venta #${sale.codigo_recibo} cancelada. Monto: ${sale.total}`, modulo: 'Ventas' });
        if (sale.items) {
            sale.items.forEach((item) => { const pIndex = (biz.products || []).findIndex((p) => p.id === item.producto_id); if (pIndex !== -1) {
                biz.products[pIndex].cantidad_disponible += item.cantidad;
                biz.products[pIndex].fecha_actualizacion = new Date();
            } });
        }
        const shiftIndex = (biz.shifts || []).findIndex((sh) => sh.id === sale.turno_id);
        if (shiftIndex !== -1) {
            const shift = biz.shifts[shiftIndex];
            shift.total_cancelaciones += sale.total;
            shift.total_ventas -= sale.total;
            if (sale.metodo_pago === 'Efectivo') {
                shift.total_efectivo -= sale.total;
                shift.monto_esperado -= sale.total;
            }
            else if (sale.metodo_pago === 'Tarjeta')
                shift.total_tarjeta -= sale.total;
            else if (sale.metodo_pago === 'Transferencia')
                shift.total_transferencia -= sale.total;
            shift.fecha_actualizacion = new Date();
        }
        saveDB(db);
        res.json(sale);
    });
    // Shifts
    app.get('/api/shifts/active/:userId', requireBizAccess, (req, res) => {
        const { userId } = req.params;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const shift = (biz.shifts || []).find((sh) => sh.usuario_id === userId && sh.estado === 'abierto');
        res.json(shift || null);
    });
    app.get('/api/shifts', requireBizAccess, (req, res) => {
        const { userId, date, status } = req.query;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        let shifts = biz.shifts || [];
        if (userId)
            shifts = shifts.filter((sh) => sh.usuario_id === userId);
        if (status)
            shifts = shifts.filter((sh) => sh.estado === status);
        if (date) {
            const d = new Date(date).toDateString();
            shifts = shifts.filter((sh) => new Date(sh.fecha_apertura).toDateString() === d);
        }
        res.json(shifts.sort((a, b) => new Date(b.fecha_apertura).getTime() - new Date(a.fecha_apertura).getTime()));
    });
    app.post('/api/shifts/open', requireBizAccess, (req, res) => {
        const { userId, userName, montoInicial } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        if (!biz.shifts)
            biz.shifts = [];
        const existing = biz.shifts.find((sh) => sh.usuario_id === userId && sh.estado === 'abierto');
        if (existing)
            return res.status(400).json({ error: 'Ya tienes un turno abierto' });
        // Check for opening discrepancy
        const lastShift = biz.shifts.length > 0 ? biz.shifts[biz.shifts.length - 1] : null;
        let diferencia_apertura = 0;
        if (lastShift && lastShift.monto_contado !== undefined) {
            diferencia_apertura = Number(montoInicial) - lastShift.monto_contado;
        }
        const newShift = { id: 'shift-' + Date.now(), usuario_id: userId, usuario_nombre: userName, fecha_apertura: new Date(), monto_inicial: Number(montoInicial), total_ventas: 0, total_efectivo: 0, total_tarjeta: 0, total_transferencia: 0, total_mixto: 0, total_reembolsos: 0, total_cancelaciones: 0, total_entradas: 0, total_salidas: 0, monto_esperado: Number(montoInicial), diferencia_apertura, estado: 'abierto', fecha_creacion: new Date(), fecha_actualizacion: new Date() };
        biz.shifts.push(newShift);
        logActivity(biz, {
            usuario_id: userId,
            usuario_nombre: userName || 'Sistema',
            accion: 'Apertura de Caja',
            detalles: `El usuario ${userName || 'Sistema'} abrió la caja con un monto inicial de RD$${Number(montoInicial)}${diferencia_apertura !== 0 ? `. Diferencia con cierre anterior: RD$${diferencia_apertura}` : ''}.`,
            modulo: 'Caja'
        });
        // If it is the first time a shift is opened, register it as Inversión Externa
        if (!lastShift && Number(montoInicial) > 0) {
            if (!biz.transfers)
                biz.transfers = [];
            biz.transfers.push({
                id: 'trans-' + Date.now(),
                origen: 'Inversion Externa',
                destino: 'Caja',
                monto: Number(montoInicial),
                fecha: new Date().toISOString(),
                usuario_id: userId,
                usuario_nombre: userName,
                notas: 'Capital Inicial de Primera Caja',
                fecha_creacion: new Date()
            });
            if (!biz.activity_log)
                biz.activity_log = [];
            biz.activity_log.unshift({
                id: `act-${Date.now()}-inv`,
                usuario_nombre: userName,
                accion: 'Inversión Externa',
                detalle: `Se registró Inversión Externa por RD$${Number(montoInicial)} como apertura de la primera caja.`,
                fecha: new Date().toISOString(),
                modulo: 'Finanzas'
            });
        }
        saveDB(db);
        res.json(newShift);
    });
    app.post('/api/shifts/close/:shiftId', requireBizAccess, (req, res) => {
        const { shiftId } = req.params;
        const { montoContado, desglose, motivoDiferencia } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const index = (biz.shifts || []).findIndex((sh) => sh.id === shiftId);
        if (index === -1)
            return res.status(404).json({ error: 'Turno no encontrado' });
        const shift = biz.shifts[index];
        const diff = Number(montoContado) - shift.monto_esperado;
        shift.estado = diff === 0 ? 'cerrado' : 'con_diferencia';
        shift.fecha_cierre = new Date();
        shift.monto_contado = Number(montoContado);
        shift.desglose_denominaciones = desglose;
        shift.diferencia = diff;
        shift.motivo_diferencia = motivoDiferencia;
        shift.fecha_actualizacion = new Date();
        const usuarioNombre = shift.usuario_nombre || 'Sistema';
        logActivity(biz, {
            usuario_id: shift.usuario_id || s.owner_id || s.employee_id,
            usuario_nombre: usuarioNombre,
            accion: 'Cierre de Caja',
            detalles: `El usuario ${usuarioNombre} cerró la caja. Efectivo contado: RD$${Number(montoContado)}. Diferencia: RD$${diff}${motivoDiferencia ? ` (${motivoDiferencia})` : ''}.`,
            modulo: 'Caja'
        });
        saveDB(db);
        res.json(shift);
    });
    app.patch('/api/shifts/:shiftId/status', requireOwnerBizAccess, (req, res) => {
        const { shiftId } = req.params;
        const { status, notaAdmin, reviewedBy } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const index = (biz.shifts || []).findIndex((sh) => sh.id === shiftId);
        if (index === -1)
            return res.status(404).json({ error: 'Turno no encontrado' });
        biz.shifts[index] = { ...biz.shifts[index], estado: status, nota_admin: notaAdmin, revisado_por: reviewedBy, fecha_revision: new Date(), fecha_actualizacion: new Date() };
        saveDB(db);
        res.json(biz.shifts[index]);
    });
    // Cash Movements
    app.get('/api/cash-movements/:shiftId', requireBizAccess, (req, res) => {
        const { shiftId } = req.params;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        res.json((biz.cash_movements || []).filter((m) => m.turno_id === shiftId));
    });
    app.post('/api/cash-movements', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const movement = { ...req.body, id: 'mov-' + Date.now(), fecha: new Date() };
        if (!biz.cash_movements)
            biz.cash_movements = [];
        biz.cash_movements.push(movement);
        const shiftIndex = (biz.shifts || []).findIndex((sh) => sh.id === movement.turno_id);
        if (shiftIndex !== -1) {
            const shift = biz.shifts[shiftIndex];
            if (movement.tipo === 'entrada') {
                shift.total_entradas += Number(movement.monto);
                shift.monto_esperado += Number(movement.monto);
            }
            else {
                shift.total_salidas += Number(movement.monto);
                shift.monto_esperado -= Number(movement.monto);
            }
            shift.fecha_actualizacion = new Date();
        }
        saveDB(db);
        res.json(movement);
    });
    // Transfers
    app.post('/api/transfers', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const { origen, destino, monto, usuario_id } = req.body;
        if (!biz.transfers)
            biz.transfers = [];
        const newTransfer = {
            id: 'trans-' + Date.now(),
            origen,
            destino,
            monto: Number(monto),
            fecha: new Date().toISOString(),
            usuario_id
        };
        biz.transfers.push(newTransfer);
        // If Caja is involved, update the active shift's cash movements
        const activeShift = biz.shifts?.find((sh) => sh.estado === 'abierto');
        if (activeShift) {
            if (origen === 'Caja') {
                const movement = {
                    id: 'mov-' + Date.now(),
                    turno_id: activeShift.id,
                    usuario_id,
                    tipo: 'salida',
                    monto: Number(monto),
                    motivo: `Transferencia a ${destino}`,
                    fecha: new Date().toISOString()
                };
                if (!biz.cash_movements)
                    biz.cash_movements = [];
                biz.cash_movements.push(movement);
                activeShift.total_salidas += Number(monto);
                activeShift.monto_esperado -= Number(monto);
            }
            else if (destino === 'Caja') {
                const movement = {
                    id: 'mov-' + Date.now(),
                    turno_id: activeShift.id,
                    usuario_id,
                    tipo: 'entrada',
                    monto: Number(monto),
                    motivo: `Transferencia desde ${origen}`,
                    fecha: new Date().toISOString()
                };
                if (!biz.cash_movements)
                    biz.cash_movements = [];
                biz.cash_movements.push(movement);
                activeShift.total_entradas += Number(monto);
                activeShift.monto_esperado += Number(monto);
            }
        }
        // Record in Expenses for visibility
        const expenseRecord = {
            id: 'exp-trans-' + Date.now(),
            descripcion: `Transferencia: ${origen} a ${destino}`,
            monto: Number(monto),
            categoria: 'Transferencia',
            fecha: new Date().toISOString(),
            usuario_id,
            pagado_desde_caja: origen === 'Caja',
            es_transferencia: true
        };
        if (!biz.expenses)
            biz.expenses = [];
        biz.expenses.push(expenseRecord);
        // Record in Activity Log
        const user = biz.users?.find((u) => u.id === usuario_id) || biz.clientes?.find((c) => c.id === usuario_id);
        const userName = user ? user.nombre : 'Cajero / Dueño';
        if (!biz.activity_log)
            biz.activity_log = [];
        biz.activity_log.unshift({
            id: `act-${Date.now()}`,
            usuario_nombre: userName,
            accion: 'Transferencia de Fondos',
            detalle: `Se transfirió RD$${monto} de ${origen} a ${destino}`,
            fecha: new Date().toISOString()
        });
        saveDB(db);
        res.json(newTransfer);
    });
    // Stats
    app.get('/api/stats', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthParam = req.query.month !== undefined ? parseInt(req.query.month) : -1;
        const yearParam = req.query.year !== undefined ? parseInt(req.query.year) : -1;
        const startDateParam = req.query.startDate;
        const endDateParam = req.query.endDate;
        let filteredSales = biz.sales || [];
        let filteredExpenses = biz.expenses || [];
        let rawInvestments = (biz.inventory_movements || []).filter((m) => m.tipo_movimiento === 'entrada' || m.tipo_movimiento === 'Compra' || m.tipo_movimiento?.toLowerCase() === 'entrada');
        if (startDateParam || endDateParam) {
            const start = startDateParam ? new Date(startDateParam) : null;
            if (start)
                start.setHours(0, 0, 0, 0);
            const end = endDateParam ? new Date(endDateParam) : null;
            if (end)
                end.setHours(23, 59, 59, 999);
            if (start && end) {
                filteredSales = filteredSales.filter((s) => { const d = new Date(s.fecha); return d >= start && d <= end; });
                filteredExpenses = filteredExpenses.filter((e) => { const d = new Date(e.fecha); return d >= start && d <= end; });
                rawInvestments = rawInvestments.filter((m) => { const d = new Date(m.fecha); return d >= start && d <= end; });
            }
        }
        else if (monthParam !== -1 && yearParam !== -1) {
            filteredSales = filteredSales.filter((s) => { const d = new Date(s.fecha); return d.getMonth() === monthParam && d.getFullYear() === yearParam; });
            filteredExpenses = filteredExpenses.filter((e) => { const d = new Date(e.fecha); return d.getMonth() === monthParam && d.getFullYear() === yearParam; });
            rawInvestments = rawInvestments.filter((m) => { const d = new Date(m.fecha); return d.getMonth() === monthParam && d.getFullYear() === yearParam; });
        }
        const todaySales = (biz.sales || []).filter((s) => new Date(s.fecha) >= today);
        const lowStock = (biz.products || []).filter((p) => p.cantidad_disponible <= p.stock_minimo);
        // Separate fiao sales from real (collected) sales
        const fiadoSales = filteredSales.filter((s) => s.metodo_pago === 'A Crédito (Fiao)' && s.estado !== 'cancelada' && s.estado !== 'reembolsada');
        const cobradoSales = filteredSales.filter((s) => s.metodo_pago !== 'A Crédito (Fiao)' && s.estado !== 'cancelada' && s.estado !== 'reembolsada');
        const cancelledSales = filteredSales.filter((s) => s.estado === 'cancelada' || s.estado === 'reembolsada');
        const totalVendido = cobradoSales.reduce((acc, s) => acc + (s.total || 0), 0);
        const totalFiado = fiadoSales.reduce((acc, s) => acc + (s.total || 0), 0);
        const totalCostoVentas = cobradoSales.reduce((acc, s) => acc + (s.costo_total || 0), 0);
        const totalGastos = filteredExpenses.reduce((acc, e) => acc + (e.monto || 0), 0);
        // Separate operational expenses from mercancía purchases and transfers
        const gastosOperativos = filteredExpenses.filter((e) => !e.es_compra_mercancia && !e.es_transferencia);
        const comprasMercancia = filteredExpenses.filter((e) => e.es_compra_mercancia);
        const totalGastosOperativos = gastosOperativos.reduce((acc, e) => acc + (e.monto || 0), 0);
        const totalComprasMercancia = comprasMercancia.reduce((acc, e) => acc + (e.monto || 0), 0);
        // Financial source tracking (ALL TIME, not filtered by date)
        const allExpenses = biz.expenses || [];
        const allTransfers = biz.transfers || [];
        // Ido al banco: Dinero enviado de Caja a Banco + Ventas al Banco - Compras/Gastos desde Banco - Transferencias desde Banco
        const bancoEntradasItems = allTransfers.filter((t) => t.destino === 'Banco');
        const bancoEntradas = bancoEntradasItems.reduce((acc, t) => acc + t.monto, 0);
        const bancoSalidasTransItems = allTransfers.filter((t) => t.origen === 'Banco');
        const bancoSalidasTrans = bancoSalidasTransItems.reduce((acc, t) => acc + t.monto, 0);
        const bancoSalidasGastosItems = allExpenses.filter((e) => e.fuente_pago === 'Banco' && !e.es_transferencia);
        const bancoSalidasGastos = bancoSalidasGastosItems.reduce((acc, e) => acc + (e.monto || 0), 0);
        const allSales = biz.sales || [];
        const ventasBancoItems = allSales.filter((s) => (s.metodo_pago === 'Tarjeta' || s.metodo_pago === 'Transferencia') && s.estado !== 'cancelada' && s.estado !== 'reembolsada');
        const ventasBanco = ventasBancoItems.reduce((acc, s) => acc + (s.total || 0), 0);
        const totalIdoBanco = bancoEntradas + ventasBanco - bancoSalidasTrans - bancoSalidasGastos;
        // Inversión externa: Dinero del bolsillo del dueño 
        const transferenciasDesdeInversionItems = allTransfers.filter((t) => t.origen === 'Inversion Externa');
        const transferenciasDesdeInversion = transferenciasDesdeInversionItems.reduce((acc, t) => acc + t.monto, 0);
        const transferenciasHaciaInversionItems = allTransfers.filter((t) => t.destino === 'Inversion Externa');
        const transferenciasHaciaInversion = transferenciasHaciaInversionItems.reduce((acc, t) => acc + t.monto, 0);
        const comprasInversionItems = allExpenses.filter((e) => e.fuente_pago === 'Inversion Externa' && !e.es_transferencia);
        const comprasInversion = comprasInversionItems.reduce((acc, e) => acc + (e.monto || 0), 0);
        const totalInversionExterna = (transferenciasDesdeInversion - transferenciasHaciaInversion) + comprasInversion;
        // Estimado en Caja: Tiempo real (Monto esperado del turno activo, o del último turno si no hay activo)
        const activeShift = (biz.shifts || []).find((s) => s.estado === 'abierto');
        let dineroEstimadoCaja = 0;
        if (activeShift) {
            dineroEstimadoCaja = activeShift.monto_esperado || 0;
        }
        else {
            const lastShift = (biz.shifts || []).length > 0 ? biz.shifts[biz.shifts.length - 1] : null;
            dineroEstimadoCaja = lastShift ? (lastShift.monto_esperado || 0) : 0;
        }
        // Keep this for other uses if needed
        const allCompras = allExpenses.filter((e) => e.es_compra_mercancia);
        const totalCompradosDeCaja = allCompras.filter((e) => e.fuente_pago === 'Caja').reduce((acc, e) => acc + (e.monto || 0), 0);
        const totalVentasEfectivo = allSales.filter((s) => s.metodo_pago === 'Efectivo' && s.estado !== 'cancelada' && s.estado !== 'reembolsada').reduce((acc, s) => acc + (s.total || 0), 0);
        // Build fiao history with client info and dates
        const fiadoHistory = fiadoSales.map((s) => {
            const cliente = (biz.clientes || []).find((c) => c.id === s.cliente_id);
            return {
                id: s.id,
                fecha: s.fecha,
                cliente_nombre: s.cliente_nombre || cliente?.nombre || 'Cliente desconocido',
                cliente_id: s.cliente_id,
                total: s.total,
                codigo_recibo: s.codigo_recibo,
                items: s.items || []
            };
        }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        // Total outstanding fiao from all clients (regardless of date filter)
        const totalFiadoPendienteGlobal = (biz.clientes || []).reduce((acc, c) => acc + (c.deuda_actual || 0), 0);
        const filteredInvestments = rawInvestments.map((m) => { const product = (biz.products || []).find((p) => p.id === m.producto_id); return { ...m, producto_nombre: product?.nombre || 'Producto Desconocido', monto: m.cantidad * (product?.costo_compra || 0) }; });
        const weeklyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            const daySales = (biz.sales || []).filter((s) => { const d = new Date(s.fecha); return d >= date && d < nextDay; });
            const dayExpenses = (biz.expenses || []).filter((e) => { const d = new Date(e.fecha); return d >= date && d < nextDay; });
            const dayTotalVendido = daySales.reduce((acc, s) => acc + (s.total || 0), 0);
            const dayTotalCosto = daySales.reduce((acc, s) => acc + (s.costo_total || 0), 0);
            const dayTotalGastos = dayExpenses.reduce((acc, e) => acc + (e.monto || 0), 0);
            weeklyData.push({
                day: date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
                ventas: dayTotalVendido,
                ganancia: dayTotalVendido - dayTotalCosto - dayTotalGastos
            });
        }
        res.json({
            todaySales: todaySales.reduce((acc, s) => acc + (s.total || 0), 0),
            totalSalesCount: todaySales.length,
            lowStock: lowStock.length,
            weeklyData,
            details: {
                sales: filteredSales.map((s) => ({ id: s.id, fecha: s.fecha, cliente: s.cliente_nombre || 'General', total: s.total, ganancia: s.total - (s.costo_total || 0), metodo_pago: s.metodo_pago })),
                expenses: filteredExpenses,
                investments: filteredInvestments,
                todaySalesData: todaySales.map((s) => ({ id: s.id, fecha: s.fecha, cliente: s.cliente_nombre || 'General', total: s.total, metodo_pago: s.metodo_pago })),
                lowStockData: lowStock.map((p) => ({ id: p.id, nombre: p.nombre, cantidad: p.cantidad_disponible, minimo: p.stock_minimo }))
            },
            profitStats: {
                totalVendido,
                totalCostoVentas,
                totalGastos,
                totalGastosOperativos,
                totalComprasMercancia,
                gananciaBruta: totalVendido - totalComprasMercancia,
                gananciaNeta: totalVendido - totalComprasMercancia - totalGastosOperativos
            },
            financieroStats: {
                dineroEstimadoCaja,
                totalIdoBanco,
                totalInversionExterna,
                totalCompradosDeCaja,
                totalVentasEfectivo,
                bancoDetails: {
                    bancoEntradas,
                    bancoEntradasItems,
                    ventasBanco,
                    ventasBancoItems,
                    bancoSalidasTrans,
                    bancoSalidasTransItems,
                    bancoSalidasGastos,
                    bancoSalidasGastosItems
                },
                inversionDetails: {
                    transferenciasDesdeInversion,
                    transferenciasDesdeInversionItems,
                    transferenciasHaciaInversion,
                    transferenciasHaciaInversionItems,
                    comprasInversion,
                    comprasInversionItems
                }
            },
            fiadoStats: { totalFiado, count: fiadoSales.length, history: fiadoHistory, totalPendienteGlobal: totalFiadoPendienteGlobal }
        });
    });
    // Inventory Movements
    app.get('/api/inventory/movements', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        res.json((biz.inventory_movements || []).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    });
    // Activity Log
    app.get('/api/activity-log', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        res.json((biz.activity_log || []).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    });
    app.post('/api/activity-log', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const { usuario_id, usuario_nombre, accion, detalles, modulo } = req.body;
        logActivity(biz, {
            usuario_id: usuario_id || s.owner_id || s.employee_id,
            usuario_nombre: usuario_nombre || 'Sistema',
            accion: accion || 'Acción General',
            detalles: detalles || '',
            modulo: modulo || 'General'
        });
        saveDB(db);
        res.json({ success: true });
    });
    // Approval requests
    app.get('/api/approval-requests', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        res.json((biz.approval_requests || []).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    });
    app.get('/api/approval-requests/status/:userId', requireBizAccess, (req, res) => {
        const { userId } = req.params;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const userReqs = (biz.approval_requests || []).filter((r) => r.usuario_id === userId).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        res.json(userReqs[0] || null);
    });
    app.post('/api/approval-requests', requireBizAccess, (req, res) => {
        const { usuario_id, usuario_nombre, lat, lng, address } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        if (!biz.approval_requests)
            biz.approval_requests = [];
        const existingIndex = biz.approval_requests.findIndex((r) => r.usuario_id === usuario_id && r.estado === 'pendiente');
        const requestData = { id: existingIndex >= 0 ? biz.approval_requests[existingIndex].id : 'aprv-' + Date.now(), usuario_id, usuario_nombre, lat: Number(lat), lng: Number(lng), address: address || `Lat: ${lat}, Lng: ${lng}`, fecha: new Date(), estado: 'pendiente' };
        if (existingIndex >= 0)
            biz.approval_requests[existingIndex] = requestData;
        else
            biz.approval_requests.push(requestData);
        logActivity(biz, { usuario_id, usuario_nombre, accion: 'Solicitud de Ubicación', detalles: `El empleado ${usuario_nombre} solicitó aprobación remota desde: ${requestData.address}`, modulo: 'Seguridad' });
        saveDB(db);
        res.json(requestData);
    });
    app.post('/api/approval-requests/:id/action', requireOwnerBizAccess, (req, res) => {
        const { id } = req.params;
        const { action, guardarEnListaBlanca, adminId, adminNombre } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const rIndex = (biz.approval_requests || []).findIndex((r) => r.id === id);
        if (rIndex === -1)
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        const request = biz.approval_requests[rIndex];
        request.estado = action === 'aprobar' ? 'aprobado' : 'rechazado';
        request.fecha_actualizacion = new Date();
        if (action === 'aprobar' && guardarEnListaBlanca) {
            if (!biz.settings)
                biz.settings = {};
            if (!biz.settings.whitelisted_locations)
                biz.settings.whitelisted_locations = [];
            biz.settings.whitelisted_locations.push({ id: 'wl-' + Date.now(), lat: request.lat, lng: request.lng, address: request.address, radius_meters: 200, fecha_creacion: new Date() });
        }
        logActivity(biz, { usuario_id: adminId || s.owner_id, usuario_nombre: adminNombre || 'Dueño', accion: action === 'aprobar' ? 'Aprobar Ubicación' : 'Rechazar Ubicación', detalles: `El dueño ${action === 'aprobar' ? 'aprobó' : 'rechazó'} el login remoto para ${request.usuario_nombre}.`, modulo: 'Seguridad' });
        saveDB(db);
        res.json(request);
    });
    // === CLIENTS & CREDITS ENDPOINTS ===
    app.get('/api/clientes', requireBizAccess, (req, res) => {
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        res.json(biz.clientes || []);
    });
    app.post('/api/clientes', requireBizAccess, (req, res) => {
        try {
            const { nombre, telefono, limite_credito } = req.body;
            const s = req.session;
            const db = getDB();
            const biz = getBiz(db, s.business_id);
            if (!nombre)
                return res.status(400).json({ error: 'El nombre es obligatorio.' });
            const newCliente = {
                id: 'cli-' + Date.now(),
                nombre,
                telefono: telefono || '',
                limite_credito: Number(limite_credito) || 0,
                deuda_actual: 0,
                estado: 'activo',
                fecha_creacion: new Date().toISOString()
            };
            if (!biz.clientes)
                biz.clientes = [];
            biz.clientes.push(newCliente);
            logActivity(biz, { usuario_id: s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Creación de Cliente', detalles: `Cliente de crédito creado: ${nombre} (Límite: RD$${limite_credito})`, modulo: 'Clientes' });
            saveDB(db);
            return res.json(newCliente);
        }
        catch (error) {
            console.error('Error creating client:', error);
            return res.status(500).json({ error: 'Error interno al crear el cliente.' });
        }
    });
    app.put('/api/clientes/:id', requireBizAccess, (req, res) => {
        const { id } = req.params;
        const { nombre, telefono, limite_credito, estado } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const cIdx = (biz.clientes || []).findIndex((c) => c.id === id);
        if (cIdx === -1)
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        const cliente = biz.clientes[cIdx];
        if (nombre !== undefined)
            cliente.nombre = nombre;
        if (telefono !== undefined)
            cliente.telefono = telefono;
        if (limite_credito !== undefined)
            cliente.limite_credito = Number(limite_credito) || 0;
        if (estado !== undefined)
            cliente.estado = estado;
        logActivity(biz, { usuario_id: s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Edición de Cliente', detalles: `Cliente ${cliente.nombre} actualizado.`, modulo: 'Clientes' });
        saveDB(db);
        res.json(cliente);
    });
    app.post('/api/clientes/:id/pay', requireBizAccess, (req, res) => {
        const { id } = req.params;
        const { monto, motivo, usuario_id, usuario_nombre } = req.body;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const cIdx = (biz.clientes || []).findIndex((c) => c.id === id);
        if (cIdx === -1)
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        if (!monto || Number(monto) <= 0)
            return res.status(400).json({ error: 'El monto del abono debe ser mayor a cero.' });
        const cliente = biz.clientes[cIdx];
        const abono = Number(monto);
        cliente.deuda_actual -= abono;
        if (cliente.deuda_actual < 0)
            cliente.deuda_actual = 0; // Prevent negative balance
        const newPago = {
            id: 'pay-' + Date.now(),
            cliente_id: id,
            monto: abono,
            motivo: motivo || 'Abono a cuenta',
            usuario_id: usuario_id || s.owner_id || s.employee_id,
            usuario_nombre: usuario_nombre || 'Sistema',
            fecha: new Date().toISOString()
        };
        if (!biz.pagos_clientes)
            biz.pagos_clientes = [];
        biz.pagos_clientes.push(newPago);
        // Also log cash movement if paid in cash
        const activeShift = (biz.shifts || []).find((sh) => sh.id === req.body.turno_id);
        if (activeShift) {
            if (!biz.cash_movements)
                biz.cash_movements = [];
            biz.cash_movements.push({
                id: 'mov-' + Date.now() + Math.random(),
                turno_id: activeShift.id,
                usuario_id: usuario_id || s.owner_id || s.employee_id,
                tipo: 'entrada',
                monto: abono,
                motivo: `Abono de Cliente: ${cliente.nombre}`,
                fecha: new Date()
            });
            activeShift.total_entradas += abono;
            activeShift.total_efectivo += abono;
            activeShift.monto_esperado += abono;
            activeShift.fecha_actualizacion = new Date();
        }
        logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: usuario_nombre || 'Sistema', accion: 'Abono de Deuda', detalles: `Cliente ${cliente.nombre} abonó RD$${abono}. Motivo: ${newPago.motivo}`, modulo: 'Clientes' });
        saveDB(db);
        res.json({ cliente, pago: newPago });
    });
    app.get('/api/clientes/:id/history', requireBizAccess, (req, res) => {
        const { id } = req.params;
        const s = req.session;
        const db = getDB();
        const biz = getBiz(db, s.business_id);
        const cliente = (biz.clientes || []).find((c) => c.id === id);
        if (!cliente)
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        // Get all sales for this client
        const sales = (biz.sales || []).filter((sale) => sale.cliente_id === id).map((sale) => ({
            ...sale,
            tipo: 'venta'
        }));
        // Get all payments for this client
        const payments = (biz.pagos_clientes || []).filter((pay) => pay.cliente_id === id).map((pay) => ({
            ...pay,
            tipo: 'pago',
            fecha: pay.fecha // standardise date
        }));
        // Merge and sort by date descending
        const history = [...sales, ...payments].sort((a, b) => new Date(b.fecha || b.fecha_creacion).getTime() - new Date(a.fecha || a.fecha_creacion).getTime());
        res.json({ cliente, history });
    });
    // === DATABASE BACKUP ENDPOINT ===
    // SEC-001 FIX: Backup restricted to owner only — employees cannot download db.json
    app.get('/api/backup/download', requireBizAccess, (req, res) => {
        const s = req.session;
        // Employees (employee_id set, owner_id not set) are denied
        if (s.employee_id && !s.owner_id) {
            return res.status(403).json({ error: 'No autorizado. Solo el administrador del negocio puede descargar respaldos.' });
        }
        res.download(DB_FILE, 'vuttik_backup.json');
    });
    // === VITE MIDDLEWARE OR STATIC FILES ===
    // === GLOBAL ERROR HANDLER — must be BEFORE static/vite middleware ===
    app.use((err, req, res, next) => {
        console.error('Unhandled server error:', err);
        if (res.headersSent)
            return next(err);
        res.status(500).json({ error: err?.message || 'Error interno del servidor.' });
    });
    if (process.env.NODE_ENV === 'production') {
        // En producción (Electron), servir la carpeta dist compilada
        const distPath = path.join(__dirname, '../dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }
    else {
        // En desarrollo, usar Vite
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
        app.use(vite.middlewares);
    }
    // === SYNC ENGINE (BACKGROUND) ===
    const SYNC_SERVER_URL = process.env.SYNC_SERVER_URL || null;
    setInterval(async () => {
        if (!SYNC_SERVER_URL)
            return; // No cloud server configured
        try {
            const db = getDB();
            // Example Sync Logic: Find pending sales
            // let pendingSales = [];
            // db.businesses.forEach(biz => {
            //   if (biz.sales) pendingSales.push(...biz.sales.filter(s => s.sync_status === 'pending'));
            // });
            // if (pendingSales.length > 0) {
            //   // fetch(SYNC_SERVER_URL + '/api/sync/push', { method: 'POST', body: JSON.stringify(pendingSales) })
            //   // If successful, mark as 'synced' and saveDB(db);
            // }
        }
        catch (e) {
            console.error("Error in background sync process:", e);
        }
    }, 10000);
    return app;
}
export const initPosApp = startServer;
