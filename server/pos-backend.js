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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.posApp = void 0;
var express_1 = require("express");
var fs_1 = require("fs");
var path_1 = require("path");
var url_1 = require("url");
var express_session_1 = require("express-session");
var bcryptjs_1 = require("bcryptjs");
var dotenv_1 = require("dotenv");
dotenv_1.default.config({ path: '.env.local' });
var express_rate_limit_1 = require("express-rate-limit");
var __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
var DB_FILE = process.env.VUTTIK_DB_PATH
    || (process.env.USER_DATA_PATH ? path_1.default.join(process.env.USER_DATA_PATH, 'db.json') : path_1.default.join(__dirname, 'db.json'));
// === DB STRUCTURE ===
var emptyBusiness = function (id, nombre, codigo, owner_id) { return ({
    id: id,
    codigo: codigo,
    nombre: nombre,
    owner_id: owner_id,
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
}); };
var initialDB = {
    owners: [],
    businesses: []
};
// === DB HELPERS ===
var getDB = function () {
    if (!fs_1.default.existsSync(DB_FILE)) {
        fs_1.default.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
        return JSON.parse(JSON.stringify(initialDB));
    }
    var db = JSON.parse(fs_1.default.readFileSync(DB_FILE, 'utf8'));
    if (!db.owners)
        db.owners = [];
    if (!db.businesses)
        db.businesses = [];
    return db;
};
var saveDB = function (data) {
    fs_1.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};
// Get the business data object (throws if not found)
var getBiz = function (db, bizId) {
    var biz = db.businesses.find(function (b) { return b.id === bizId; });
    if (!biz)
        throw new Error('Negocio no encontrado');
    if (!biz.clientes)
        biz.clientes = [];
    if (!biz.pagos_clientes)
        biz.pagos_clientes = [];
    return biz;
};
// Generate a short code like SOL-001
var generateCode = function (nombre, existingCodes) {
    var prefix = nombre.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3) || 'NEG';
    var num = 1;
    var code = "".concat(prefix, "-").concat(String(num).padStart(3, '0'));
    while (existingCodes.includes(code)) {
        num++;
        code = "".concat(prefix, "-").concat(String(num).padStart(3, '0'));
    }
    return code;
};
// Log helper
var logActivity = function (biz, activity) {
    if (!biz.activity_log)
        biz.activity_log = [];
    biz.activity_log.push(__assign({ id: 'log-' + Date.now() + Math.random(), fecha: new Date() }, activity));
};
// === MIDDLEWARES ===
var requireOwnerAuth = function (req, res, next) {
    var s = req.session;
    if (!s.owner_id)
        return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
    next();
};
var requireBizAccess = function (req, res, next) {
    var s = req.session;
    if (!s.business_id)
        return res.status(401).json({ error: 'Selecciona un negocio primero.' });
    // If owner, give access. If employee, verify business matches.
    if (s.owner_id || s.employee_id)
        return next();
    return res.status(401).json({ error: 'No autorizado.' });
};
var requireOwnerBizAccess = function (req, res, next) {
    var s = req.session;
    if (!s.owner_id || !s.business_id)
        return res.status(403).json({ error: 'Solo el dueño puede realizar esta acción.' });
    next();
};
// SEC-007 FIX: Rate limiting to prevent brute-force attacks on authentication endpoints
var authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // max 30 attempts per 15 minutes
    message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' },
    standardHeaders: true,
    legacyHeaders: false,
});
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var app, sessionSecret, distPath_1, createViteServer, vite, SYNC_SERVER_URL;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    app = (0, express_1.default)();
                    app.use(express_1.default.json());
                    sessionSecret = process.env.SESSION_SECRET || 'fallback-dev-secret-change-in-production';
                    app.use((0, express_session_1.default)({
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
                    app.post('/api/auth/register', authLimiter, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, nombre, correo, password, db, exists, password_hash, newOwner, _, safeOwner;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, nombre = _a.nombre, correo = _a.correo, password = _a.password;
                                    if (!nombre || !correo || !password)
                                        return [2 /*return*/, res.status(400).json({ error: 'Completa todos los campos.' })];
                                    if (password.length < 6)
                                        return [2 /*return*/, res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })];
                                    db = getDB();
                                    exists = db.owners.find(function (o) { return o.correo === correo.toLowerCase().trim(); });
                                    if (exists)
                                        return [2 /*return*/, res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' })];
                                    return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
                                case 1:
                                    password_hash = _b.sent();
                                    newOwner = {
                                        id: 'owner-' + Date.now(),
                                        nombre: nombre.trim(),
                                        correo: correo.toLowerCase().trim(),
                                        password_hash: password_hash,
                                        fecha_creacion: new Date()
                                    };
                                    db.owners.push(newOwner);
                                    saveDB(db);
                                    _ = newOwner.password_hash, safeOwner = __rest(newOwner, ["password_hash"]);
                                    req.session.owner_id = newOwner.id;
                                    req.session.owner_nombre = newOwner.nombre;
                                    res.json({ owner: safeOwner });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    // Owner login
                    app.post('/api/auth/login', authLimiter, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, correo, password, db, owner, valid, _, safeOwner;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, correo = _a.correo, password = _a.password;
                                    if (!correo || !password)
                                        return [2 /*return*/, res.status(400).json({ error: 'Correo y contraseña son requeridos.' })];
                                    db = getDB();
                                    owner = db.owners.find(function (o) { return o.correo === correo.toLowerCase().trim(); });
                                    if (!owner)
                                        return [2 /*return*/, res.status(404).json({ error: 'No existe una cuenta con ese correo.' })];
                                    return [4 /*yield*/, bcryptjs_1.default.compare(password, owner.password_hash)];
                                case 1:
                                    valid = _b.sent();
                                    if (!valid)
                                        return [2 /*return*/, res.status(401).json({ error: 'Contraseña incorrecta.' })];
                                    req.session.owner_id = owner.id;
                                    req.session.owner_nombre = owner.nombre;
                                    req.session.business_id = null;
                                    req.session.employee_id = null;
                                    _ = owner.password_hash, safeOwner = __rest(owner, ["password_hash"]);
                                    res.json({ owner: safeOwner });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    // Employee login
                    app.post('/api/auth/employee-login', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, business_codigo, username, password, db, biz, employee, valid;
                        var _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _a = req.body, business_codigo = _a.business_codigo, username = _a.username, password = _a.password;
                                    if (!business_codigo || !username || !password)
                                        return [2 /*return*/, res.status(400).json({ error: 'Completa todos los campos.' })];
                                    db = getDB();
                                    biz = db.businesses.find(function (b) { return b.codigo === business_codigo.toUpperCase().trim(); });
                                    if (!biz)
                                        return [2 /*return*/, res.status(404).json({ error: 'Código de negocio incorrecto.' })];
                                    employee = (_b = biz.employees) === null || _b === void 0 ? void 0 : _b.find(function (e) { return e.username === username.trim() && e.estado === 'activo'; });
                                    if (!employee)
                                        return [2 /*return*/, res.status(404).json({ error: 'Usuario no encontrado en este negocio.' })];
                                    return [4 /*yield*/, bcryptjs_1.default.compare(password, employee.password_hash)];
                                case 1:
                                    valid = _c.sent();
                                    if (!valid)
                                        return [2 /*return*/, res.status(401).json({ error: 'Contraseña incorrecta.' })];
                                    req.session.employee_id = employee.id;
                                    req.session.business_id = biz.id;
                                    req.session.owner_id = null;
                                    logActivity(biz, {
                                        usuario_id: employee.id,
                                        usuario_nombre: employee.nombre,
                                        accion: 'Inicio de Sesión (Empleado)',
                                        detalles: "El empleado ".concat(employee.nombre, " ingres\u00F3 al sistema."),
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
                                            business_codigo: biz.codigo,
                                            owner_id: biz.owner_id
                                        }
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    // Get current session user
                    app.get('/api/auth/me', function (req, res) {
                        var _a;
                        var s = req.session;
                        if (!s.owner_id && !s.employee_id)
                            return res.json(null);
                        var db = getDB();
                        if (s.owner_id && !s.business_id) {
                            // Owner without business selected → return owner info
                            var owner = db.owners.find(function (o) { return o.id === s.owner_id; });
                            if (!owner)
                                return res.json(null);
                            var _ = owner.password_hash, safe = __rest(owner, ["password_hash"]);
                            return res.json(__assign(__assign({}, safe), { rol: 'admin', estado: 'activo' }));
                        }
                        if (s.owner_id && s.business_id) {
                            // Owner inside a business
                            var owner = db.owners.find(function (o) { return o.id === s.owner_id; });
                            var biz = db.businesses.find(function (b) { return b.id === s.business_id; });
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
                            var biz = db.businesses.find(function (b) { return b.id === s.business_id; });
                            if (!biz)
                                return res.json(null);
                            var emp = (_a = biz.employees) === null || _a === void 0 ? void 0 : _a.find(function (e) { return e.id === s.employee_id; });
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
                    app.post('/api/auth/logout', function (req, res) {
                        var _a;
                        var s = req.session;
                        var db = getDB();
                        if (s.employee_id && s.business_id) {
                            var biz = db.businesses.find(function (b) { return b.id === s.business_id; });
                            if (biz) {
                                var emp = (_a = biz.employees) === null || _a === void 0 ? void 0 : _a.find(function (e) { return e.id === s.employee_id; });
                                if (emp) {
                                    logActivity(biz, { usuario_id: emp.id, usuario_nombre: emp.nombre, accion: 'Cierre de Sesión', detalles: "El empleado ".concat(emp.nombre, " sali\u00F3 del sistema."), modulo: 'Seguridad' });
                                    saveDB(db);
                                }
                            }
                        }
                        req.session.destroy(function () { return res.json({ success: true }); });
                    });
                    // Select business (owner switches into a business)
                    app.post('/api/auth/select-business', requireOwnerAuth, function (req, res) {
                        var business_id = req.body.business_id;
                        var db = getDB();
                        var s = req.session;
                        var biz = db.businesses.find(function (b) { return b.id === business_id && b.owner_id === s.owner_id; });
                        if (!biz)
                            return res.status(404).json({ error: 'Negocio no encontrado.' });
                        s.business_id = biz.id;
                        res.json({ business: { id: biz.id, nombre: biz.nombre, codigo: biz.codigo } });
                    });
                    // Exit business (owner goes back to business selector)
                    app.post('/api/auth/exit-business', requireOwnerAuth, function (req, res) {
                        req.session.business_id = null;
                        res.json({ success: true });
                    });
                    // =============================================
                    // === BUSINESS ROUTES ===
                    // =============================================
                    // List my businesses
                    app.get('/api/businesses', requireOwnerAuth, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var myBizList = db.businesses
                            .filter(function (b) { return b.owner_id === s.owner_id; })
                            .map(function (b) {
                            var sales = b.sales || [];
                            var expenses = b.expenses || [];
                            var cobradoSales = sales.filter(function (s) { return s.estado === 'completada' || s.estado === 'pagada'; });
                            var totalVendido = cobradoSales.reduce(function (acc, s) { return acc + (s.total || 0); }, 0);
                            var comprasMercancia = expenses.filter(function (e) { return e.categoria === 'Compras de Mercancía' || e.es_compra_mercancia; });
                            var gastosOperativos = expenses.filter(function (e) { return e.categoria !== 'TRANSFERENCIA' && e.categoria !== 'Compras de Mercancía' && !e.es_compra_mercancia; });
                            var totalComprasMercancia = comprasMercancia.reduce(function (acc, e) { return acc + (e.monto || 0); }, 0);
                            var totalGastosOperativos = gastosOperativos.reduce(function (acc, e) { return acc + (e.monto || 0); }, 0);
                            var gananciaNeta = totalVendido - totalComprasMercancia - totalGastosOperativos;
                            return {
                                id: b.id,
                                nombre: b.nombre,
                                codigo: b.codigo,
                                fecha_creacion: b.fecha_creacion,
                                employee_count: (b.employees || []).length,
                                product_count: (b.products || []).length,
                                sales_count: (b.sales || []).length,
                                ganancia_neta: gananciaNeta
                            };
                        });
                        res.json(myBizList);
                    });
                    // Create business
                    app.post('/api/businesses', requireOwnerAuth, function (req, res) {
                        var nombre = req.body.nombre;
                        if (!nombre || !nombre.trim())
                            return res.status(400).json({ error: 'El nombre del negocio es obligatorio.' });
                        var s = req.session;
                        var db = getDB();
                        var existingCodes = db.businesses.map(function (b) { return b.codigo; });
                        var codigo = generateCode(nombre, existingCodes);
                        var newBiz = emptyBusiness('biz-' + Date.now(), nombre.trim(), codigo, s.owner_id);
                        db.businesses.push(newBiz);
                        saveDB(db);
                        res.json({ id: newBiz.id, nombre: newBiz.nombre, codigo: newBiz.codigo, fecha_creacion: newBiz.fecha_creacion });
                    });
                    // Update business name
                    app.patch('/api/businesses/:bizId', requireOwnerAuth, function (req, res) {
                        var bizId = req.params.bizId;
                        var nombre = req.body.nombre;
                        var s = req.session;
                        var db = getDB();
                        var idx = db.businesses.findIndex(function (b) { return b.id === bizId && b.owner_id === s.owner_id; });
                        if (idx === -1)
                            return res.status(404).json({ error: 'Negocio no encontrado.' });
                        if (nombre)
                            db.businesses[idx].nombre = nombre.trim();
                        saveDB(db);
                        res.json({ id: db.businesses[idx].id, nombre: db.businesses[idx].nombre, codigo: db.businesses[idx].codigo });
                    });
                    // Delete business
                    app.delete('/api/businesses/:bizId', requireOwnerAuth, function (req, res) {
                        var bizId = req.params.bizId;
                        var s = req.session;
                        var db = getDB();
                        var idx = db.businesses.findIndex(function (b) { return b.id === bizId && b.owner_id === s.owner_id; });
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
                    app.get('/api/employees', requireOwnerBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var safe = (biz.employees || []).map(function (_a) {
                            var password_hash = _a.password_hash, e = __rest(_a, ["password_hash"]);
                            return e;
                        });
                        res.json(safe);
                    });
                    // Add employee
                    app.post('/api/employees', requireOwnerBizAccess, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, nombre, username, password, rol, s, db, biz, dup, password_hash, newEmp, _, safe;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, nombre = _a.nombre, username = _a.username, password = _a.password, rol = _a.rol;
                                    if (!nombre || !username || !password)
                                        return [2 /*return*/, res.status(400).json({ error: 'Nombre, usuario y contraseña son obligatorios.' })];
                                    s = req.session;
                                    db = getDB();
                                    biz = getBiz(db, s.business_id);
                                    if (!biz.employees)
                                        biz.employees = [];
                                    dup = biz.employees.find(function (e) { return e.username === username.trim(); });
                                    if (dup)
                                        return [2 /*return*/, res.status(409).json({ error: 'Ya existe un empleado con ese nombre de usuario.' })];
                                    return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
                                case 1:
                                    password_hash = _b.sent();
                                    newEmp = {
                                        id: 'emp-' + Date.now(),
                                        nombre: nombre.trim(),
                                        username: username.trim(),
                                        password_hash: password_hash,
                                        rol: rol || 'cajero',
                                        estado: 'activo',
                                        fecha_creacion: new Date()
                                    };
                                    biz.employees.push(newEmp);
                                    saveDB(db);
                                    _ = newEmp.password_hash, safe = __rest(newEmp, ["password_hash"]);
                                    res.json(safe);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    // Update employee
                    app.put('/api/employees/:empId', requireOwnerBizAccess, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var empId, _a, nombre, username, password, rol, estado, s, db, biz, idx, _b, _c, _, safe;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    empId = req.params.empId;
                                    _a = req.body, nombre = _a.nombre, username = _a.username, password = _a.password, rol = _a.rol, estado = _a.estado;
                                    s = req.session;
                                    db = getDB();
                                    biz = getBiz(db, s.business_id);
                                    idx = (biz.employees || []).findIndex(function (e) { return e.id === empId; });
                                    if (idx === -1)
                                        return [2 /*return*/, res.status(404).json({ error: 'Empleado no encontrado.' })];
                                    if (nombre)
                                        biz.employees[idx].nombre = nombre.trim();
                                    if (username)
                                        biz.employees[idx].username = username.trim();
                                    if (rol)
                                        biz.employees[idx].rol = rol;
                                    if (estado)
                                        biz.employees[idx].estado = estado;
                                    if (!(password && password.length >= 6)) return [3 /*break*/, 2];
                                    _b = biz.employees[idx];
                                    return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
                                case 1:
                                    _b.password_hash = _d.sent();
                                    _d.label = 2;
                                case 2:
                                    saveDB(db);
                                    _c = biz.employees[idx], _ = _c.password_hash, safe = __rest(_c, ["password_hash"]);
                                    res.json(safe);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    // Delete employee
                    app.delete('/api/employees/:empId', requireOwnerBizAccess, function (req, res) {
                        var empId = req.params.empId;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        biz.employees = (biz.employees || []).filter(function (e) { return e.id !== empId; });
                        saveDB(db);
                        res.json({ success: true });
                    });
                    // =============================================
                    // === BUSINESS DATA ROUTES (require biz access) ===
                    // =============================================
                    // Settings
                    app.get('/api/settings', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        res.json(biz.settings || { allowed_location: null });
                    });
                    app.post('/api/settings', requireOwnerBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        biz.settings = __assign(__assign({}, (biz.settings || {})), req.body);
                        saveDB(db);
                        res.json(biz.settings);
                    });
                    app.post('/api/settings/log-location', requireBizAccess, function (req, res) {
                        var _a = req.body, lat = _a.lat, lng = _a.lng;
                        if (!lat || !lng)
                            return res.status(400).json({ error: 'Latitud y longitud requeridas' });
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
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
                        var locations = biz.settings.login_locations;
                        if (locations.length >= 1) {
                            var getDistance = function (lat1, lng1, lat2, lng2) {
                                var R = 6371000;
                                var dLat = (lat2 - lat1) * Math.PI / 180;
                                var dLng = (lng2 - lng1) * Math.PI / 180;
                                var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
                                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            };
                            var bestPoint = { lat: Number(lat), lng: Number(lng) };
                            var maxNeighbors = 0;
                            for (var _i = 0, locations_1 = locations; _i < locations_1.length; _i++) {
                                var p = locations_1[_i];
                                var neighbors = 0;
                                for (var _b = 0, locations_2 = locations; _b < locations_2.length; _b++) {
                                    var other = locations_2[_b];
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
                    app.get('/api/users', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var safe = (biz.employees || []).map(function (_a) {
                            var password_hash = _a.password_hash, e = __rest(_a, ["password_hash"]);
                            return (__assign(__assign({}, e), { correo: "".concat(e.username, "@").concat(biz.codigo.toLowerCase(), ".local") }));
                        });
                        res.json(safe);
                    });
                    // Products
                    app.get('/api/products', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        res.json(getBiz(db, s.business_id).products || []);
                    });
                    app.post('/api/products', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var _a = req.body, usuario_id = _a.usuario_id, productData = __rest(_a, ["usuario_id"]);
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var newProduct = __assign(__assign({}, productData), { id: Date.now().toString(), fecha_creacion: new Date(), fecha_actualizacion: new Date() });
                        biz.products.push(newProduct);
                        if (Number(newProduct.cantidad_disponible) > 0 && Number(newProduct.costo_compra) > 0) {
                            var montoTotal = Number(newProduct.cantidad_disponible) * Number(newProduct.costo_compra);
                            var fuente_pago = productData.fuente_pago || 'Caja';
                            var uid_1 = usuario_id || s.owner_id || s.employee_id;
                            var newExpense = {
                                id: 'exp-compra-' + Date.now(),
                                descripcion: "Compra Inicial: ".concat(newProduct.nombre, " (").concat(newProduct.cantidad_disponible, " ").concat(newProduct.unidad_venta || 'und', " a RD$").concat(newProduct.costo_compra, ")"),
                                monto: montoTotal,
                                categoria: 'Compras de Mercancía',
                                fecha: new Date(),
                                usuario_id: uid_1,
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
                                usuario_id: uid_1,
                                fecha: new Date(),
                                motivo: 'Inventario inicial de nuevo producto',
                                metadata: null
                            });
                            if (fuente_pago === 'Caja') {
                                var activeShift = (biz.shifts || []).find(function (sh) { return sh.usuario_id === uid_1 && sh.estado === 'abierto'; })
                                    || (biz.shifts || []).find(function (sh) { return sh.estado === 'abierto'; });
                                if (activeShift) {
                                    var movement = { id: 'mov-caja-' + Date.now(), turno_id: activeShift.id, usuario_id: uid_1, tipo: 'salida', monto: montoTotal, motivo: "Compra Inicial: ".concat(newProduct.nombre), fecha: new Date() };
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
                        logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Creación de Producto', detalles: "Producto creado: ".concat(newProduct.nombre), modulo: 'Inventario' });
                        saveDB(db);
                        res.json(newProduct);
                    });
                    app.put('/api/products/:id', requireBizAccess, function (req, res) {
                        var id = req.params.id;
                        var _a = req.body, usuario_id = _a.usuario_id, updateData = __rest(_a, ["usuario_id"]);
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var index = biz.products.findIndex(function (p) { return p.id === id; });
                        if (index === -1)
                            return res.status(404).json({ error: 'Producto no encontrado' });
                        var oldProduct = __assign({}, biz.products[index]);
                        biz.products[index] = __assign(__assign(__assign({}, biz.products[index]), updateData), { fecha_actualizacion: new Date() });
                        var deltaCantidad = Number(updateData.cantidad_disponible || oldProduct.cantidad_disponible) - Number(oldProduct.cantidad_disponible);
                        var oldMonto = Number(oldProduct.cantidad_disponible) * Number(oldProduct.costo_compra);
                        var newMonto = Number(updateData.cantidad_disponible || oldProduct.cantidad_disponible) * Number(updateData.costo_compra || oldProduct.costo_compra);
                        var deltaMonto = newMonto - oldMonto;
                        var details = "Producto editado: ".concat(biz.products[index].nombre, ". Motivo: ").concat(updateData.motivo_edicion || 'Ninguno', ". ");
                        if (deltaCantidad !== 0)
                            details += "Stock: ".concat(oldProduct.cantidad_disponible, " -> ").concat(updateData.cantidad_disponible, ". ");
                        if (oldProduct.costo_compra !== updateData.costo_compra)
                            details += "Costo: ".concat(oldProduct.costo_compra, " -> ").concat(updateData.costo_compra, ". ");
                        if (oldProduct.precio_venta !== updateData.precio_venta)
                            details += "Precio: ".concat(oldProduct.precio_venta, " -> ").concat(updateData.precio_venta, ". ");
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
                                motivo: "Ajuste por edici\u00F3n. Motivo: ".concat(updateData.motivo_edicion || 'Corrección de error')
                            });
                            if (deltaMonto !== 0) {
                                if (!biz.expenses)
                                    biz.expenses = [];
                                biz.expenses.push({
                                    id: 'exp-adj-' + Date.now(),
                                    descripcion: "Ajuste de inventario: ".concat(oldProduct.nombre, " (").concat(updateData.motivo_edicion || 'Corrección', ")"),
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
                        res.json(biz.products[index]);
                    });
                    app.delete('/api/products/:id', requireOwnerBizAccess, function (req, res) {
                        var id = req.params.id;
                        var _a = req.body, usuario_id = _a.usuario_id, usuario_nombre = _a.usuario_nombre;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var index = biz.products.findIndex(function (p) { return p.id === id; });
                        if (index === -1)
                            return res.status(404).json({ error: 'Producto no encontrado' });
                        var product = biz.products[index];
                        logActivity(biz, { usuario_id: usuario_id || s.owner_id, usuario_nombre: usuario_nombre || 'Dueño', accion: 'Eliminación de Producto', detalles: "Eliminado: ".concat(product.nombre), modulo: 'Inventario' });
                        biz.products.splice(index, 1);
                        saveDB(db);
                        res.json({ success: true });
                    });
                    app.patch('/api/products/:id/stock', requireBizAccess, function (req, res) {
                        var id = req.params.id;
                        var _a = req.body, cantidad = _a.cantidad, tipo_movimiento = _a.tipo_movimiento, motivo = _a.motivo, usuario_id = _a.usuario_id;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var pIndex = biz.products.findIndex(function (p) { return p.id === id; });
                        if (pIndex === -1)
                            return res.status(404).json({ error: 'Producto no encontrado' });
                        var product = biz.products[pIndex];
                        product.cantidad_disponible += Number(cantidad);
                        product.fecha_actualizacion = new Date();
                        if (!biz.inventory_movements)
                            biz.inventory_movements = [];
                        biz.inventory_movements.push({ id: 'mov-' + Date.now() + Math.random(), producto_id: id, tipo_movimiento: tipo_movimiento, cantidad: Number(cantidad), usuario_id: usuario_id, fecha: new Date(), motivo: motivo || 'Ajuste manual', metadata: req.body.metadata || null });
                        logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Ajuste de Stock', detalles: "".concat(product.nombre, ": ").concat(tipo_movimiento, " de ").concat(cantidad, ". Motivo: ").concat(motivo || 'Ajuste manual', "."), modulo: 'Inventario' });
                        saveDB(db);
                        res.json(product);
                    });
                    app.post('/api/products/:id/restock', requireBizAccess, function (req, res) {
                        var id = req.params.id;
                        var _a = req.body, cantidad = _a.cantidad, costo_unitario = _a.costo_unitario, motivo = _a.motivo, usuario_id = _a.usuario_id, usuario_nombre = _a.usuario_nombre, fuente_pago = _a.fuente_pago;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var pIndex = biz.products.findIndex(function (p) { return p.id === id; });
                        if (pIndex === -1)
                            return res.status(404).json({ error: 'Producto no encontrado' });
                        var product = biz.products[pIndex];
                        var montoTotal = Number(cantidad) * Number(costo_unitario);
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
                        var newExpense = {
                            id: 'exp-compra-' + Date.now(),
                            descripcion: "Compra: ".concat(product.nombre, " (").concat(cantidad, " ").concat(product.unidad_venta || 'und', " \u00D7 RD$").concat(costo_unitario, ")"),
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
                            var uid_2 = usuario_id || s.owner_id || s.employee_id;
                            var activeShift = (biz.shifts || []).find(function (sh) { return sh.usuario_id === uid_2 && sh.estado === 'abierto'; })
                                || (biz.shifts || []).find(function (sh) { return sh.estado === 'abierto'; });
                            if (activeShift) {
                                var movement = { id: 'mov-caja-' + Date.now(), turno_id: activeShift.id, usuario_id: uid_2, tipo: 'salida', monto: montoTotal, motivo: "Compra: ".concat(product.nombre), fecha: new Date() };
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
                            detalles: "".concat(product.nombre, ": ").concat(cantidad, " uds a RD$").concat(costo_unitario, " c/u = RD$").concat(montoTotal, ". Fuente: ").concat(fuente_pago || 'Caja', "."),
                            modulo: 'Inventario'
                        });
                        saveDB(db);
                        res.json(product);
                    });
                    app.get('/api/products/:id/history', requireBizAccess, function (req, res) {
                        var id = req.params.id;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var movements = (biz.inventory_movements || [])
                            .filter(function (m) { return m.producto_id === id; })
                            .sort(function (a, b) { return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); });
                        res.json(movements);
                    });
                    // Expenses
                    app.get('/api/expenses', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var owner = db.users.find(function (u) { return u.id === biz.propietario_id; });
                        var employees = biz.empleados || [];
                        var expenses = (biz.expenses || []).map(function (exp) {
                            var usuario_nombre = exp.usuario_nombre;
                            if (!usuario_nombre && exp.usuario_id) {
                                if (exp.usuario_id === (owner === null || owner === void 0 ? void 0 : owner.id))
                                    usuario_nombre = owner === null || owner === void 0 ? void 0 : owner.nombre;
                                else {
                                    var emp = employees.find(function (e) { return e.id === exp.usuario_id; });
                                    if (emp)
                                        usuario_nombre = emp.nombre;
                                }
                            }
                            return __assign(__assign({}, exp), { usuario_nombre: usuario_nombre || 'Desconocido' });
                        });
                        res.json(expenses);
                    });
                    app.post('/api/expenses', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var _a = req.body, monto = _a.monto, pagado_desde_caja = _a.pagado_desde_caja, usuario_id = _a.usuario_id, metadata = _a.metadata, customFecha = _a.fecha;
                        var expenseFecha = new Date();
                        if (customFecha) {
                            var parts = customFecha.split('-');
                            if (parts.length === 3) {
                                var d = new Date();
                                d.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                expenseFecha = d;
                            }
                        }
                        var newExpense = __assign(__assign({}, req.body), { id: 'exp-' + Date.now(), fecha: expenseFecha, metadata: metadata || null });
                        if (!biz.expenses)
                            biz.expenses = [];
                        biz.expenses.push(newExpense);
                        logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Registro de Gasto', detalles: "Gasto: ".concat(newExpense.descripcion, " - Monto: ").concat(newExpense.monto).concat(pagado_desde_caja ? ' (Pagado desde caja)' : ''), modulo: 'Gastos' });
                        if (pagado_desde_caja) {
                            var activeShift = (biz.shifts || []).find(function (sh) { return sh.usuario_id === usuario_id && sh.estado === 'abierto'; });
                            if (activeShift) {
                                var movement = { id: 'mov-' + Date.now(), turno_id: activeShift.id, usuario_id: usuario_id, tipo: 'salida', monto: Number(monto), motivo: "Gasto: ".concat(newExpense.descripcion), fecha: new Date() };
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
                    app.get('/api/sales', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var salesWithDetails = (biz.sales || []).map(function (sale) {
                            var emp = (biz.employees || []).find(function (e) { return e.id === sale.usuario_id; });
                            var enrichedItems = (sale.items || []).map(function (item) {
                                var product = (biz.products || []).find(function (p) { return p.id === item.producto_id; });
                                return __assign(__assign({}, item), { nombre: item.nombre || (product ? product.nombre : 'Producto Eliminado'), unidad_venta: item.unidad_venta || (product ? product.unidad_venta : 'Unidad') });
                            });
                            return __assign(__assign({}, sale), { usuario_nombre: emp ? emp.nombre : (sale.usuario_nombre || 'Desconocido'), items: enrichedItems });
                        });
                        res.json(salesWithDetails);
                    });
                    app.post('/api/sales', requireBizAccess, function (req, res) {
                        var _a = req.body, sale = _a.sale, items = _a.items;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var _loop_1 = function (item) {
                            var product = (biz.products || []).find(function (p) { return p.id === item.producto_id; });
                            if (!product) {
                                return { value: res.status(400).json({ error: "Producto no encontrado: ".concat(item.nombre || item.producto_id) }) };
                            }
                            if (product.cantidad_disponible < item.cantidad) {
                                return { value: res.status(400).json({
                                        error: "Stock insuficiente para \"".concat(product.nombre, "\". Disponible: ").concat(product.cantidad_disponible, ", solicitado: ").concat(item.cantidad, ".")
                                    }) };
                            }
                        };
                        // BIZ-001 FIX: Validate stock on the server before processing — prevents negative inventory
                        // from direct API calls that bypass frontend validation
                        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                            var item = items_1[_i];
                            var state_1 = _loop_1(item);
                            if (typeof state_1 === "object")
                                return state_1.value;
                        }
                        var costoTotal = 0;
                        items.forEach(function (item) {
                            var pIndex = (biz.products || []).findIndex(function (p) { return p.id === item.producto_id; });
                            if (pIndex !== -1) {
                                biz.products[pIndex].cantidad_disponible -= item.cantidad;
                                biz.products[pIndex].fecha_actualizacion = new Date();
                                costoTotal += (biz.products[pIndex].costo_compra || 0) * item.cantidad;
                            }
                            if (!biz.inventory_movements)
                                biz.inventory_movements = [];
                            biz.inventory_movements.push({ id: 'mov-' + Date.now() + Math.random(), producto_id: item.producto_id, tipo_movimiento: 'Venta', cantidad: -item.cantidad, usuario_id: sale.usuario_id, fecha: new Date(), motivo: "Venta ".concat(sale.codigo_recibo) });
                        });
                        var newSale = __assign(__assign({}, sale), { id: 'sale-' + Date.now(), fecha: new Date(), costo_total: costoTotal, metadata: req.body.metadata || sale.metadata || null, items: items });
                        // SEC-003 FIX: Generate NCF on the server with an atomic counter to ensure uniqueness and sequence
                        if (!biz.ncf_counter)
                            biz.ncf_counter = 1;
                        if (sale.tipo_comprobante && sale.tipo_comprobante !== 'Sin Comprobante') {
                            newSale.ncf = "B01".concat(String(biz.ncf_counter).padStart(9, '0'));
                            biz.ncf_counter++;
                        }
                        if (!biz.sales)
                            biz.sales = [];
                        biz.sales.push(newSale);
                        // BIZ-004 FIX: Validate credit limit on the server — prevents employees from exceeding admin-set limits
                        if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
                            if (!biz.clientes)
                                biz.clientes = [];
                            var creditCliente = biz.clientes.find(function (c) { return c.id === sale.cliente_id; });
                            if (creditCliente && creditCliente.limite_credito > 0) {
                                var newDebt = (creditCliente.deuda_actual || 0) + sale.total;
                                if (newDebt > creditCliente.limite_credito) {
                                    return res.status(400).json({
                                        error: "L\u00EDmite de cr\u00E9dito excedido para \"".concat(creditCliente.nombre, "\". Deuda actual: RD$").concat(creditCliente.deuda_actual, ", L\u00EDmite: RD$").concat(creditCliente.limite_credito, ", Venta: RD$").concat(sale.total, ".")
                                    });
                                }
                            }
                        }
                        // Increment client debt if fiao
                        if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
                            if (!biz.clientes)
                                biz.clientes = [];
                            var clIdx = biz.clientes.findIndex(function (c) { return c.id === sale.cliente_id; });
                            if (clIdx !== -1) {
                                biz.clientes[clIdx].deuda_actual += sale.total;
                            }
                        }
                        var shiftIndex = (biz.shifts || []).findIndex(function (sh) { return sh.id === sale.turno_id; });
                        if (shiftIndex !== -1) {
                            var shift = biz.shifts[shiftIndex];
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
                        logActivity(biz, { usuario_id: sale.usuario_id, usuario_nombre: sale.usuario_nombre || 'Empleado', accion: 'Venta Realizada', detalles: "Venta #".concat(sale.codigo_recibo, " por ").concat(sale.total, ". M\u00E9todo: ").concat(sale.metodo_pago), modulo: 'Ventas' });
                        saveDB(db);
                        res.json(newSale);
                    });
                    app.post('/api/sales/refund/:saleId', requireBizAccess, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var saleId, _a, password, motivo, usuario_nombre, usuario_id, s, db, biz, owner, valid, _b, saleIndex, sale, clIdx, shiftIndex, shift;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    saleId = req.params.saleId;
                                    _a = req.body, password = _a.password, motivo = _a.motivo, usuario_nombre = _a.usuario_nombre, usuario_id = _a.usuario_id;
                                    s = req.session;
                                    db = getDB();
                                    biz = getBiz(db, s.business_id);
                                    owner = db.owners.find(function (o) { return o.id === biz.owner_id; });
                                    if (!owner) return [3 /*break*/, 2];
                                    return [4 /*yield*/, bcryptjs_1.default.compare(password, owner.password_hash)];
                                case 1:
                                    _b = _c.sent();
                                    return [3 /*break*/, 3];
                                case 2:
                                    _b = false;
                                    _c.label = 3;
                                case 3:
                                    valid = _b;
                                    if (!valid)
                                        return [2 /*return*/, res.status(401).json({ error: 'La clave de seguridad ingresada es incorrecta.' })];
                                    if (!motivo || motivo.trim().length === 0)
                                        return [2 /*return*/, res.status(400).json({ error: 'El motivo del reembolso es obligatorio' })];
                                    saleIndex = (biz.sales || []).findIndex(function (sale) { return sale.id === saleId; });
                                    if (saleIndex === -1)
                                        return [2 /*return*/, res.status(404).json({ error: 'Venta no encontrada' })];
                                    sale = biz.sales[saleIndex];
                                    if (sale.estado !== 'completada')
                                        return [2 /*return*/, res.status(400).json({ error: "No se puede reembolsar una venta con estado: ".concat(sale.estado) })];
                                    sale.estado = 'reembolsada';
                                    sale.fecha_actualizacion = new Date();
                                    sale.motivo_reembolso = motivo;
                                    sale.reembolsado_por = usuario_nombre || 'Dueño';
                                    // Deduct client debt if fiao
                                    if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
                                        if (!biz.clientes)
                                            biz.clientes = [];
                                        clIdx = biz.clientes.findIndex(function (c) { return c.id === sale.cliente_id; });
                                        if (clIdx !== -1) {
                                            biz.clientes[clIdx].deuda_actual -= sale.total;
                                            if (biz.clientes[clIdx].deuda_actual < 0)
                                                biz.clientes[clIdx].deuda_actual = 0;
                                        }
                                    }
                                    logActivity(biz, { usuario_id: usuario_id || s.owner_id, usuario_nombre: usuario_nombre || 'Dueño', accion: 'Reembolso de Venta', detalles: "Venta #".concat(sale.codigo_recibo, " reembolsada. Monto: ").concat(sale.total, ". Motivo: ").concat(motivo), modulo: 'Ventas' });
                                    if (sale.items) {
                                        sale.items.forEach(function (item) { var pIndex = (biz.products || []).findIndex(function (p) { return p.id === item.producto_id; }); if (pIndex !== -1) {
                                            biz.products[pIndex].cantidad_disponible += item.cantidad;
                                            biz.products[pIndex].fecha_actualizacion = new Date();
                                        } if (!biz.inventory_movements)
                                            biz.inventory_movements = []; biz.inventory_movements.push({ id: 'mov-' + Date.now() + Math.random(), producto_id: item.producto_id, tipo_movimiento: 'Reembolso', cantidad: item.cantidad, usuario_id: sale.usuario_id, fecha: new Date(), motivo: "Reembolso Venta ".concat(sale.codigo_recibo) }); });
                                    }
                                    shiftIndex = (biz.shifts || []).findIndex(function (sh) { return sh.id === sale.turno_id; });
                                    if (shiftIndex !== -1) {
                                        shift = biz.shifts[shiftIndex];
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
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post('/api/sales/cancel/:saleId', requireBizAccess, function (req, res) {
                        var saleId = req.params.saleId;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var saleIndex = (biz.sales || []).findIndex(function (sale) { return sale.id === saleId; });
                        if (saleIndex === -1)
                            return res.status(404).json({ error: 'Venta no encontrada' });
                        var sale = biz.sales[saleIndex];
                        if (sale.estado !== 'completada')
                            return res.status(400).json({ error: 'No se puede cancelar esta venta' });
                        sale.estado = 'cancelada';
                        sale.fecha_actualizacion = new Date();
                        // Deduct client debt if fiao
                        if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
                            if (!biz.clientes)
                                biz.clientes = [];
                            var clIdx = biz.clientes.findIndex(function (c) { return c.id === sale.cliente_id; });
                            if (clIdx !== -1) {
                                biz.clientes[clIdx].deuda_actual -= sale.total;
                                if (biz.clientes[clIdx].deuda_actual < 0)
                                    biz.clientes[clIdx].deuda_actual = 0;
                            }
                        }
                        logActivity(biz, { usuario_id: s.owner_id || s.employee_id, usuario_nombre: 'Administrador', accion: 'Cancelación de Venta', detalles: "Venta #".concat(sale.codigo_recibo, " cancelada. Monto: ").concat(sale.total), modulo: 'Ventas' });
                        if (sale.items) {
                            sale.items.forEach(function (item) { var pIndex = (biz.products || []).findIndex(function (p) { return p.id === item.producto_id; }); if (pIndex !== -1) {
                                biz.products[pIndex].cantidad_disponible += item.cantidad;
                                biz.products[pIndex].fecha_actualizacion = new Date();
                            } });
                        }
                        var shiftIndex = (biz.shifts || []).findIndex(function (sh) { return sh.id === sale.turno_id; });
                        if (shiftIndex !== -1) {
                            var shift = biz.shifts[shiftIndex];
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
                    app.get('/api/shifts/active/:userId', requireBizAccess, function (req, res) {
                        var userId = req.params.userId;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var shift = (biz.shifts || []).find(function (sh) { return sh.usuario_id === userId && sh.estado === 'abierto'; });
                        res.json(shift || null);
                    });
                    app.get('/api/shifts', requireBizAccess, function (req, res) {
                        var _a = req.query, userId = _a.userId, date = _a.date, status = _a.status;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var shifts = biz.shifts || [];
                        if (userId)
                            shifts = shifts.filter(function (sh) { return sh.usuario_id === userId; });
                        if (status)
                            shifts = shifts.filter(function (sh) { return sh.estado === status; });
                        if (date) {
                            var d_1 = new Date(date).toDateString();
                            shifts = shifts.filter(function (sh) { return new Date(sh.fecha_apertura).toDateString() === d_1; });
                        }
                        res.json(shifts.sort(function (a, b) { return new Date(b.fecha_apertura).getTime() - new Date(a.fecha_apertura).getTime(); }));
                    });
                    app.post('/api/shifts/open', requireBizAccess, function (req, res) {
                        var _a = req.body, userId = _a.userId, userName = _a.userName, montoInicial = _a.montoInicial;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        if (!biz.shifts)
                            biz.shifts = [];
                        var existing = biz.shifts.find(function (sh) { return sh.usuario_id === userId && sh.estado === 'abierto'; });
                        if (existing)
                            return res.status(400).json({ error: 'Ya tienes un turno abierto' });
                        // Check for opening discrepancy
                        var lastShift = biz.shifts.length > 0 ? biz.shifts[biz.shifts.length - 1] : null;
                        var diferencia_apertura = 0;
                        if (lastShift && lastShift.monto_contado !== undefined) {
                            diferencia_apertura = Number(montoInicial) - lastShift.monto_contado;
                        }
                        var newShift = { id: 'shift-' + Date.now(), usuario_id: userId, usuario_nombre: userName, fecha_apertura: new Date(), monto_inicial: Number(montoInicial), total_ventas: 0, total_efectivo: 0, total_tarjeta: 0, total_transferencia: 0, total_mixto: 0, total_reembolsos: 0, total_cancelaciones: 0, total_entradas: 0, total_salidas: 0, monto_esperado: Number(montoInicial), diferencia_apertura: diferencia_apertura, estado: 'abierto', fecha_creacion: new Date(), fecha_actualizacion: new Date() };
                        biz.shifts.push(newShift);
                        logActivity(biz, {
                            usuario_id: userId,
                            usuario_nombre: userName || 'Sistema',
                            accion: 'Apertura de Caja',
                            detalles: "El usuario ".concat(userName || 'Sistema', " abri\u00F3 la caja con un monto inicial de RD$").concat(Number(montoInicial)).concat(diferencia_apertura !== 0 ? ". Diferencia con cierre anterior: RD$".concat(diferencia_apertura) : '', "."),
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
                                id: "act-".concat(Date.now(), "-inv"),
                                usuario_nombre: userName,
                                accion: 'Inversión Externa',
                                detalle: "Se registr\u00F3 Inversi\u00F3n Externa por RD$".concat(Number(montoInicial), " como apertura de la primera caja."),
                                fecha: new Date().toISOString(),
                                modulo: 'Finanzas'
                            });
                        }
                        saveDB(db);
                        res.json(newShift);
                    });
                    app.post('/api/shifts/close/:shiftId', requireBizAccess, function (req, res) {
                        var shiftId = req.params.shiftId;
                        var _a = req.body, montoContado = _a.montoContado, desglose = _a.desglose, motivoDiferencia = _a.motivoDiferencia;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var index = (biz.shifts || []).findIndex(function (sh) { return sh.id === shiftId; });
                        if (index === -1)
                            return res.status(404).json({ error: 'Turno no encontrado' });
                        var shift = biz.shifts[index];
                        var diff = Number(montoContado) - shift.monto_esperado;
                        shift.estado = diff === 0 ? 'cerrado' : 'con_diferencia';
                        shift.fecha_cierre = new Date();
                        shift.monto_contado = Number(montoContado);
                        shift.desglose_denominaciones = desglose;
                        shift.diferencia = diff;
                        shift.motivo_diferencia = motivoDiferencia;
                        shift.fecha_actualizacion = new Date();
                        var usuarioNombre = shift.usuario_nombre || 'Sistema';
                        logActivity(biz, {
                            usuario_id: shift.usuario_id || s.owner_id || s.employee_id,
                            usuario_nombre: usuarioNombre,
                            accion: 'Cierre de Caja',
                            detalles: "El usuario ".concat(usuarioNombre, " cerr\u00F3 la caja. Efectivo contado: RD$").concat(Number(montoContado), ". Diferencia: RD$").concat(diff).concat(motivoDiferencia ? " (".concat(motivoDiferencia, ")") : '', "."),
                            modulo: 'Caja'
                        });
                        saveDB(db);
                        res.json(shift);
                    });
                    app.patch('/api/shifts/:shiftId/status', requireOwnerBizAccess, function (req, res) {
                        var shiftId = req.params.shiftId;
                        var _a = req.body, status = _a.status, notaAdmin = _a.notaAdmin, reviewedBy = _a.reviewedBy;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var index = (biz.shifts || []).findIndex(function (sh) { return sh.id === shiftId; });
                        if (index === -1)
                            return res.status(404).json({ error: 'Turno no encontrado' });
                        biz.shifts[index] = __assign(__assign({}, biz.shifts[index]), { estado: status, nota_admin: notaAdmin, revisado_por: reviewedBy, fecha_revision: new Date(), fecha_actualizacion: new Date() });
                        saveDB(db);
                        res.json(biz.shifts[index]);
                    });
                    // Cash Movements
                    app.get('/api/cash-movements/:shiftId', requireBizAccess, function (req, res) {
                        var shiftId = req.params.shiftId;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        res.json((biz.cash_movements || []).filter(function (m) { return m.turno_id === shiftId; }));
                    });
                    app.post('/api/cash-movements', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var movement = __assign(__assign({}, req.body), { id: 'mov-' + Date.now(), fecha: new Date() });
                        if (!biz.cash_movements)
                            biz.cash_movements = [];
                        biz.cash_movements.push(movement);
                        var shiftIndex = (biz.shifts || []).findIndex(function (sh) { return sh.id === movement.turno_id; });
                        if (shiftIndex !== -1) {
                            var shift = biz.shifts[shiftIndex];
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
                    app.post('/api/transfers', requireBizAccess, function (req, res) {
                        var _a, _b, _c;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var _d = req.body, origen = _d.origen, destino = _d.destino, monto = _d.monto, usuario_id = _d.usuario_id;
                        if (!biz.transfers)
                            biz.transfers = [];
                        var newTransfer = {
                            id: 'trans-' + Date.now(),
                            origen: origen,
                            destino: destino,
                            monto: Number(monto),
                            fecha: new Date().toISOString(),
                            usuario_id: usuario_id
                        };
                        biz.transfers.push(newTransfer);
                        // If Caja is involved, update the active shift's cash movements
                        var activeShift = (_a = biz.shifts) === null || _a === void 0 ? void 0 : _a.find(function (sh) { return sh.estado === 'abierto'; });
                        if (activeShift) {
                            if (origen === 'Caja') {
                                var movement = {
                                    id: 'mov-' + Date.now(),
                                    turno_id: activeShift.id,
                                    usuario_id: usuario_id,
                                    tipo: 'salida',
                                    monto: Number(monto),
                                    motivo: "Transferencia a ".concat(destino),
                                    fecha: new Date().toISOString()
                                };
                                if (!biz.cash_movements)
                                    biz.cash_movements = [];
                                biz.cash_movements.push(movement);
                                activeShift.total_salidas += Number(monto);
                                activeShift.monto_esperado -= Number(monto);
                            }
                            else if (destino === 'Caja') {
                                var movement = {
                                    id: 'mov-' + Date.now(),
                                    turno_id: activeShift.id,
                                    usuario_id: usuario_id,
                                    tipo: 'entrada',
                                    monto: Number(monto),
                                    motivo: "Transferencia desde ".concat(origen),
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
                        var expenseRecord = {
                            id: 'exp-trans-' + Date.now(),
                            descripcion: "Transferencia: ".concat(origen, " a ").concat(destino),
                            monto: Number(monto),
                            categoria: 'Transferencia',
                            fecha: new Date().toISOString(),
                            usuario_id: usuario_id,
                            pagado_desde_caja: origen === 'Caja',
                            es_transferencia: true
                        };
                        if (!biz.expenses)
                            biz.expenses = [];
                        biz.expenses.push(expenseRecord);
                        // Record in Activity Log
                        var user = ((_b = biz.users) === null || _b === void 0 ? void 0 : _b.find(function (u) { return u.id === usuario_id; })) || ((_c = biz.clientes) === null || _c === void 0 ? void 0 : _c.find(function (c) { return c.id === usuario_id; }));
                        var userName = user ? user.nombre : 'Cajero / Dueño';
                        if (!biz.activity_log)
                            biz.activity_log = [];
                        biz.activity_log.unshift({
                            id: "act-".concat(Date.now()),
                            usuario_nombre: userName,
                            accion: 'Transferencia de Fondos',
                            detalle: "Se transfiri\u00F3 RD$".concat(monto, " de ").concat(origen, " a ").concat(destino),
                            fecha: new Date().toISOString()
                        });
                        saveDB(db);
                        res.json(newTransfer);
                    });
                    // Stats
                    app.get('/api/stats', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var today = new Date();
                        today.setHours(0, 0, 0, 0);
                        var monthParam = req.query.month !== undefined ? parseInt(req.query.month) : -1;
                        var yearParam = req.query.year !== undefined ? parseInt(req.query.year) : -1;
                        var startDateParam = req.query.startDate;
                        var endDateParam = req.query.endDate;
                        var filteredSales = biz.sales || [];
                        var filteredExpenses = biz.expenses || [];
                        var rawInvestments = (biz.inventory_movements || []).filter(function (m) { var _a; return m.tipo_movimiento === 'entrada' || m.tipo_movimiento === 'Compra' || ((_a = m.tipo_movimiento) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'entrada'; });
                        if (startDateParam || endDateParam) {
                            var start_1 = startDateParam ? new Date(startDateParam) : null;
                            if (start_1)
                                start_1.setHours(0, 0, 0, 0);
                            var end_1 = endDateParam ? new Date(endDateParam) : null;
                            if (end_1)
                                end_1.setHours(23, 59, 59, 999);
                            if (start_1 && end_1) {
                                filteredSales = filteredSales.filter(function (s) { var d = new Date(s.fecha); return d >= start_1 && d <= end_1; });
                                filteredExpenses = filteredExpenses.filter(function (e) { var d = new Date(e.fecha); return d >= start_1 && d <= end_1; });
                                rawInvestments = rawInvestments.filter(function (m) { var d = new Date(m.fecha); return d >= start_1 && d <= end_1; });
                            }
                        }
                        else if (monthParam !== -1 && yearParam !== -1) {
                            filteredSales = filteredSales.filter(function (s) { var d = new Date(s.fecha); return d.getMonth() === monthParam && d.getFullYear() === yearParam; });
                            filteredExpenses = filteredExpenses.filter(function (e) { var d = new Date(e.fecha); return d.getMonth() === monthParam && d.getFullYear() === yearParam; });
                            rawInvestments = rawInvestments.filter(function (m) { var d = new Date(m.fecha); return d.getMonth() === monthParam && d.getFullYear() === yearParam; });
                        }
                        var todaySales = (biz.sales || []).filter(function (s) { return new Date(s.fecha) >= today; });
                        var lowStock = (biz.products || []).filter(function (p) { return p.cantidad_disponible <= p.stock_minimo; });
                        // Separate fiao sales from real (collected) sales
                        var fiadoSales = filteredSales.filter(function (s) { return s.metodo_pago === 'A Crédito (Fiao)' && s.estado !== 'cancelada' && s.estado !== 'reembolsada'; });
                        var cobradoSales = filteredSales.filter(function (s) { return s.metodo_pago !== 'A Crédito (Fiao)' && s.estado !== 'cancelada' && s.estado !== 'reembolsada'; });
                        var cancelledSales = filteredSales.filter(function (s) { return s.estado === 'cancelada' || s.estado === 'reembolsada'; });
                        var totalVendido = cobradoSales.reduce(function (acc, s) { return acc + (s.total || 0); }, 0);
                        var totalFiado = fiadoSales.reduce(function (acc, s) { return acc + (s.total || 0); }, 0);
                        var totalCostoVentas = cobradoSales.reduce(function (acc, s) { return acc + (s.costo_total || 0); }, 0);
                        var totalGastos = filteredExpenses.reduce(function (acc, e) { return acc + (e.monto || 0); }, 0);
                        // Separate operational expenses from mercancía purchases and transfers
                        var gastosOperativos = filteredExpenses.filter(function (e) { return !e.es_compra_mercancia && !e.es_transferencia; });
                        var comprasMercancia = filteredExpenses.filter(function (e) { return e.es_compra_mercancia; });
                        var totalGastosOperativos = gastosOperativos.reduce(function (acc, e) { return acc + (e.monto || 0); }, 0);
                        var totalComprasMercancia = comprasMercancia.reduce(function (acc, e) { return acc + (e.monto || 0); }, 0);
                        // Financial source tracking (ALL TIME, not filtered by date)
                        var allExpenses = biz.expenses || [];
                        var allTransfers = biz.transfers || [];
                        // Ido al banco: Dinero enviado de Caja a Banco + Ventas al Banco - Compras/Gastos desde Banco - Transferencias desde Banco
                        var bancoEntradasItems = allTransfers.filter(function (t) { return t.destino === 'Banco'; });
                        var bancoEntradas = bancoEntradasItems.reduce(function (acc, t) { return acc + t.monto; }, 0);
                        var bancoSalidasTransItems = allTransfers.filter(function (t) { return t.origen === 'Banco'; });
                        var bancoSalidasTrans = bancoSalidasTransItems.reduce(function (acc, t) { return acc + t.monto; }, 0);
                        var bancoSalidasGastosItems = allExpenses.filter(function (e) { return e.fuente_pago === 'Banco' && !e.es_transferencia; });
                        var bancoSalidasGastos = bancoSalidasGastosItems.reduce(function (acc, e) { return acc + (e.monto || 0); }, 0);
                        var allSales = biz.sales || [];
                        var ventasBancoItems = allSales.filter(function (s) { return (s.metodo_pago === 'Tarjeta' || s.metodo_pago === 'Transferencia') && s.estado !== 'cancelada' && s.estado !== 'reembolsada'; });
                        var ventasBanco = ventasBancoItems.reduce(function (acc, s) { return acc + (s.total || 0); }, 0);
                        var totalIdoBanco = bancoEntradas + ventasBanco - bancoSalidasTrans - bancoSalidasGastos;
                        // Inversión externa: Dinero del bolsillo del dueño 
                        var transferenciasDesdeInversionItems = allTransfers.filter(function (t) { return t.origen === 'Inversion Externa'; });
                        var transferenciasDesdeInversion = transferenciasDesdeInversionItems.reduce(function (acc, t) { return acc + t.monto; }, 0);
                        var transferenciasHaciaInversionItems = allTransfers.filter(function (t) { return t.destino === 'Inversion Externa'; });
                        var transferenciasHaciaInversion = transferenciasHaciaInversionItems.reduce(function (acc, t) { return acc + t.monto; }, 0);
                        var comprasInversionItems = allExpenses.filter(function (e) { return e.fuente_pago === 'Inversion Externa' && !e.es_transferencia; });
                        var comprasInversion = comprasInversionItems.reduce(function (acc, e) { return acc + (e.monto || 0); }, 0);
                        var totalInversionExterna = (transferenciasDesdeInversion - transferenciasHaciaInversion) + comprasInversion;
                        // Estimado en Caja: Tiempo real (Monto esperado del turno activo, o del último turno si no hay activo)
                        var activeShift = (biz.shifts || []).find(function (s) { return s.estado === 'abierto'; });
                        var dineroEstimadoCaja = 0;
                        if (activeShift) {
                            dineroEstimadoCaja = activeShift.monto_esperado || 0;
                        }
                        else {
                            var lastShift = (biz.shifts || []).length > 0 ? biz.shifts[biz.shifts.length - 1] : null;
                            dineroEstimadoCaja = lastShift ? (lastShift.monto_esperado || 0) : 0;
                        }
                        // Keep this for other uses if needed
                        var allCompras = allExpenses.filter(function (e) { return e.es_compra_mercancia; });
                        var totalCompradosDeCaja = allCompras.filter(function (e) { return e.fuente_pago === 'Caja'; }).reduce(function (acc, e) { return acc + (e.monto || 0); }, 0);
                        var totalVentasEfectivo = allSales.filter(function (s) { return s.metodo_pago === 'Efectivo' && s.estado !== 'cancelada' && s.estado !== 'reembolsada'; }).reduce(function (acc, s) { return acc + (s.total || 0); }, 0);
                        // Build fiao history with client info and dates
                        var fiadoHistory = fiadoSales.map(function (s) {
                            var cliente = (biz.clientes || []).find(function (c) { return c.id === s.cliente_id; });
                            return {
                                id: s.id,
                                fecha: s.fecha,
                                cliente_nombre: s.cliente_nombre || (cliente === null || cliente === void 0 ? void 0 : cliente.nombre) || 'Cliente desconocido',
                                cliente_id: s.cliente_id,
                                total: s.total,
                                codigo_recibo: s.codigo_recibo,
                                items: s.items || []
                            };
                        }).sort(function (a, b) { return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); });
                        // Total outstanding fiao from all clients (regardless of date filter)
                        var totalFiadoPendienteGlobal = (biz.clientes || []).reduce(function (acc, c) { return acc + (c.deuda_actual || 0); }, 0);
                        var filteredInvestments = rawInvestments.map(function (m) { var product = (biz.products || []).find(function (p) { return p.id === m.producto_id; }); return __assign(__assign({}, m), { producto_nombre: (product === null || product === void 0 ? void 0 : product.nombre) || 'Producto Desconocido', monto: m.cantidad * ((product === null || product === void 0 ? void 0 : product.costo_compra) || 0) }); });
                        var weeklyData = [];
                        var _loop_2 = function (i) {
                            var date = new Date();
                            date.setDate(date.getDate() - i);
                            date.setHours(0, 0, 0, 0);
                            var nextDay = new Date(date);
                            nextDay.setDate(nextDay.getDate() + 1);
                            var daySales = (biz.sales || []).filter(function (s) { var d = new Date(s.fecha); return d >= date && d < nextDay; });
                            var dayExpenses = (biz.expenses || []).filter(function (e) { var d = new Date(e.fecha); return d >= date && d < nextDay; });
                            var dayTotalVendido = daySales.reduce(function (acc, s) { return acc + (s.total || 0); }, 0);
                            var dayTotalCosto = daySales.reduce(function (acc, s) { return acc + (s.costo_total || 0); }, 0);
                            var dayTotalGastos = dayExpenses.reduce(function (acc, e) { return acc + (e.monto || 0); }, 0);
                            weeklyData.push({
                                day: date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
                                ventas: dayTotalVendido,
                                ganancia: dayTotalVendido - dayTotalCosto - dayTotalGastos
                            });
                        };
                        for (var i = 6; i >= 0; i--) {
                            _loop_2(i);
                        }
                        res.json({
                            todaySales: todaySales.reduce(function (acc, s) { return acc + (s.total || 0); }, 0),
                            totalSalesCount: todaySales.length,
                            lowStock: lowStock.length,
                            weeklyData: weeklyData,
                            details: {
                                sales: filteredSales.map(function (s) { return ({ id: s.id, fecha: s.fecha, cliente: s.cliente_nombre || 'General', total: s.total, ganancia: s.total - (s.costo_total || 0), metodo_pago: s.metodo_pago }); }),
                                expenses: filteredExpenses,
                                investments: filteredInvestments,
                                todaySalesData: todaySales.map(function (s) { return ({ id: s.id, fecha: s.fecha, cliente: s.cliente_nombre || 'General', total: s.total, metodo_pago: s.metodo_pago }); }),
                                lowStockData: lowStock.map(function (p) { return ({ id: p.id, nombre: p.nombre, cantidad: p.cantidad_disponible, minimo: p.stock_minimo }); })
                            },
                            profitStats: {
                                totalVendido: totalVendido,
                                totalCostoVentas: totalCostoVentas,
                                totalGastos: totalGastos,
                                totalGastosOperativos: totalGastosOperativos,
                                totalComprasMercancia: totalComprasMercancia,
                                gananciaBruta: totalVendido - totalComprasMercancia,
                                gananciaNeta: totalVendido - totalComprasMercancia - totalGastosOperativos
                            },
                            financieroStats: {
                                dineroEstimadoCaja: dineroEstimadoCaja,
                                totalIdoBanco: totalIdoBanco,
                                totalInversionExterna: totalInversionExterna,
                                totalCompradosDeCaja: totalCompradosDeCaja,
                                totalVentasEfectivo: totalVentasEfectivo,
                                bancoDetails: {
                                    bancoEntradas: bancoEntradas,
                                    bancoEntradasItems: bancoEntradasItems,
                                    ventasBanco: ventasBanco,
                                    ventasBancoItems: ventasBancoItems,
                                    bancoSalidasTrans: bancoSalidasTrans,
                                    bancoSalidasTransItems: bancoSalidasTransItems,
                                    bancoSalidasGastos: bancoSalidasGastos,
                                    bancoSalidasGastosItems: bancoSalidasGastosItems
                                },
                                inversionDetails: {
                                    transferenciasDesdeInversion: transferenciasDesdeInversion,
                                    transferenciasDesdeInversionItems: transferenciasDesdeInversionItems,
                                    transferenciasHaciaInversion: transferenciasHaciaInversion,
                                    transferenciasHaciaInversionItems: transferenciasHaciaInversionItems,
                                    comprasInversion: comprasInversion,
                                    comprasInversionItems: comprasInversionItems
                                }
                            },
                            fiadoStats: { totalFiado: totalFiado, count: fiadoSales.length, history: fiadoHistory, totalPendienteGlobal: totalFiadoPendienteGlobal }
                        });
                    });
                    // Inventory Movements
                    app.get('/api/inventory/movements', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        res.json((biz.inventory_movements || []).sort(function (a, b) { return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); }));
                    });
                    // Activity Log
                    app.get('/api/activity-log', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        res.json((biz.activity_log || []).sort(function (a, b) { return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); }));
                    });
                    app.post('/api/activity-log', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var _a = req.body, usuario_id = _a.usuario_id, usuario_nombre = _a.usuario_nombre, accion = _a.accion, detalles = _a.detalles, modulo = _a.modulo;
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
                    app.get('/api/approval-requests', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        res.json((biz.approval_requests || []).sort(function (a, b) { return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); }));
                    });
                    app.get('/api/approval-requests/status/:userId', requireBizAccess, function (req, res) {
                        var userId = req.params.userId;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var userReqs = (biz.approval_requests || []).filter(function (r) { return r.usuario_id === userId; }).sort(function (a, b) { return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); });
                        res.json(userReqs[0] || null);
                    });
                    app.post('/api/approval-requests', requireBizAccess, function (req, res) {
                        var _a = req.body, usuario_id = _a.usuario_id, usuario_nombre = _a.usuario_nombre, lat = _a.lat, lng = _a.lng, address = _a.address;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        if (!biz.approval_requests)
                            biz.approval_requests = [];
                        var existingIndex = biz.approval_requests.findIndex(function (r) { return r.usuario_id === usuario_id && r.estado === 'pendiente'; });
                        var requestData = { id: existingIndex >= 0 ? biz.approval_requests[existingIndex].id : 'aprv-' + Date.now(), usuario_id: usuario_id, usuario_nombre: usuario_nombre, lat: Number(lat), lng: Number(lng), address: address || "Lat: ".concat(lat, ", Lng: ").concat(lng), fecha: new Date(), estado: 'pendiente' };
                        if (existingIndex >= 0)
                            biz.approval_requests[existingIndex] = requestData;
                        else
                            biz.approval_requests.push(requestData);
                        logActivity(biz, { usuario_id: usuario_id, usuario_nombre: usuario_nombre, accion: 'Solicitud de Ubicación', detalles: "El empleado ".concat(usuario_nombre, " solicit\u00F3 aprobaci\u00F3n remota desde: ").concat(requestData.address), modulo: 'Seguridad' });
                        saveDB(db);
                        res.json(requestData);
                    });
                    app.post('/api/approval-requests/:id/action', requireOwnerBizAccess, function (req, res) {
                        var id = req.params.id;
                        var _a = req.body, action = _a.action, guardarEnListaBlanca = _a.guardarEnListaBlanca, adminId = _a.adminId, adminNombre = _a.adminNombre;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var rIndex = (biz.approval_requests || []).findIndex(function (r) { return r.id === id; });
                        if (rIndex === -1)
                            return res.status(404).json({ error: 'Solicitud no encontrada' });
                        var request = biz.approval_requests[rIndex];
                        request.estado = action === 'aprobar' ? 'aprobado' : 'rechazado';
                        request.fecha_actualizacion = new Date();
                        if (action === 'aprobar' && guardarEnListaBlanca) {
                            if (!biz.settings)
                                biz.settings = {};
                            if (!biz.settings.whitelisted_locations)
                                biz.settings.whitelisted_locations = [];
                            biz.settings.whitelisted_locations.push({ id: 'wl-' + Date.now(), lat: request.lat, lng: request.lng, address: request.address, radius_meters: 200, fecha_creacion: new Date() });
                        }
                        logActivity(biz, { usuario_id: adminId || s.owner_id, usuario_nombre: adminNombre || 'Dueño', accion: action === 'aprobar' ? 'Aprobar Ubicación' : 'Rechazar Ubicación', detalles: "El due\u00F1o ".concat(action === 'aprobar' ? 'aprobó' : 'rechazó', " el login remoto para ").concat(request.usuario_nombre, "."), modulo: 'Seguridad' });
                        saveDB(db);
                        res.json(request);
                    });
                    // === CLIENTS & CREDITS ENDPOINTS ===
                    app.get('/api/clientes', requireBizAccess, function (req, res) {
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        res.json(biz.clientes || []);
                    });
                    app.post('/api/clientes', requireBizAccess, function (req, res) {
                        try {
                            var _a = req.body, nombre = _a.nombre, telefono = _a.telefono, limite_credito = _a.limite_credito;
                            var s = req.session;
                            var db = getDB();
                            var biz = getBiz(db, s.business_id);
                            if (!nombre)
                                return res.status(400).json({ error: 'El nombre es obligatorio.' });
                            var newCliente = {
                                id: 'cli-' + Date.now(),
                                nombre: nombre,
                                telefono: telefono || '',
                                limite_credito: Number(limite_credito) || 0,
                                deuda_actual: 0,
                                estado: 'activo',
                                fecha_creacion: new Date().toISOString()
                            };
                            if (!biz.clientes)
                                biz.clientes = [];
                            biz.clientes.push(newCliente);
                            logActivity(biz, { usuario_id: s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Creación de Cliente', detalles: "Cliente de cr\u00E9dito creado: ".concat(nombre, " (L\u00EDmite: RD$").concat(limite_credito, ")"), modulo: 'Clientes' });
                            saveDB(db);
                            return res.json(newCliente);
                        }
                        catch (error) {
                            console.error('Error creating client:', error);
                            return res.status(500).json({ error: 'Error interno al crear el cliente.' });
                        }
                    });
                    app.put('/api/clientes/:id', requireBizAccess, function (req, res) {
                        var id = req.params.id;
                        var _a = req.body, nombre = _a.nombre, telefono = _a.telefono, limite_credito = _a.limite_credito, estado = _a.estado;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var cIdx = (biz.clientes || []).findIndex(function (c) { return c.id === id; });
                        if (cIdx === -1)
                            return res.status(404).json({ error: 'Cliente no encontrado.' });
                        var cliente = biz.clientes[cIdx];
                        if (nombre !== undefined)
                            cliente.nombre = nombre;
                        if (telefono !== undefined)
                            cliente.telefono = telefono;
                        if (limite_credito !== undefined)
                            cliente.limite_credito = Number(limite_credito) || 0;
                        if (estado !== undefined)
                            cliente.estado = estado;
                        logActivity(biz, { usuario_id: s.owner_id || s.employee_id, usuario_nombre: req.body.usuario_nombre || 'Sistema', accion: 'Edición de Cliente', detalles: "Cliente ".concat(cliente.nombre, " actualizado."), modulo: 'Clientes' });
                        saveDB(db);
                        res.json(cliente);
                    });
                    app.post('/api/clientes/:id/pay', requireBizAccess, function (req, res) {
                        var id = req.params.id;
                        var _a = req.body, monto = _a.monto, motivo = _a.motivo, usuario_id = _a.usuario_id, usuario_nombre = _a.usuario_nombre;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var cIdx = (biz.clientes || []).findIndex(function (c) { return c.id === id; });
                        if (cIdx === -1)
                            return res.status(404).json({ error: 'Cliente no encontrado.' });
                        if (!monto || Number(monto) <= 0)
                            return res.status(400).json({ error: 'El monto del abono debe ser mayor a cero.' });
                        var cliente = biz.clientes[cIdx];
                        var abono = Number(monto);
                        cliente.deuda_actual -= abono;
                        if (cliente.deuda_actual < 0)
                            cliente.deuda_actual = 0; // Prevent negative balance
                        var newPago = {
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
                        var activeShift = (biz.shifts || []).find(function (sh) { return sh.id === req.body.turno_id; });
                        if (activeShift) {
                            if (!biz.cash_movements)
                                biz.cash_movements = [];
                            biz.cash_movements.push({
                                id: 'mov-' + Date.now() + Math.random(),
                                turno_id: activeShift.id,
                                usuario_id: usuario_id || s.owner_id || s.employee_id,
                                tipo: 'entrada',
                                monto: abono,
                                motivo: "Abono de Cliente: ".concat(cliente.nombre),
                                fecha: new Date()
                            });
                            activeShift.total_entradas += abono;
                            activeShift.total_efectivo += abono;
                            activeShift.monto_esperado += abono;
                            activeShift.fecha_actualizacion = new Date();
                        }
                        logActivity(biz, { usuario_id: usuario_id || s.owner_id || s.employee_id, usuario_nombre: usuario_nombre || 'Sistema', accion: 'Abono de Deuda', detalles: "Cliente ".concat(cliente.nombre, " abon\u00F3 RD$").concat(abono, ". Motivo: ").concat(newPago.motivo), modulo: 'Clientes' });
                        saveDB(db);
                        res.json({ cliente: cliente, pago: newPago });
                    });
                    app.get('/api/clientes/:id/history', requireBizAccess, function (req, res) {
                        var id = req.params.id;
                        var s = req.session;
                        var db = getDB();
                        var biz = getBiz(db, s.business_id);
                        var cliente = (biz.clientes || []).find(function (c) { return c.id === id; });
                        if (!cliente)
                            return res.status(404).json({ error: 'Cliente no encontrado.' });
                        // Get all sales for this client
                        var sales = (biz.sales || []).filter(function (sale) { return sale.cliente_id === id; }).map(function (sale) { return (__assign(__assign({}, sale), { tipo: 'venta' })); });
                        // Get all payments for this client
                        var payments = (biz.pagos_clientes || []).filter(function (pay) { return pay.cliente_id === id; }).map(function (pay) { return (__assign(__assign({}, pay), { tipo: 'pago', fecha: pay.fecha // standardise date
                         })); });
                        // Merge and sort by date descending
                        var history = __spreadArray(__spreadArray([], sales, true), payments, true).sort(function (a, b) { return new Date(b.fecha || b.fecha_creacion).getTime() - new Date(a.fecha || a.fecha_creacion).getTime(); });
                        res.json({ cliente: cliente, history: history });
                    });
                    // === DATABASE BACKUP ENDPOINT ===
                    // SEC-001 FIX: Backup restricted to owner only — employees cannot download db.json
                    app.get('/api/backup/download', requireBizAccess, function (req, res) {
                        var s = req.session;
                        // Employees (employee_id set, owner_id not set) are denied
                        if (s.employee_id && !s.owner_id) {
                            return res.status(403).json({ error: 'No autorizado. Solo el administrador del negocio puede descargar respaldos.' });
                        }
                        res.download(DB_FILE, 'vuttik_backup.json');
                    });
                    // === VITE MIDDLEWARE OR STATIC FILES ===
                    // === GLOBAL ERROR HANDLER — must be BEFORE static/vite middleware ===
                    app.use(function (err, req, res, next) {
                        console.error('Unhandled server error:', err);
                        if (res.headersSent)
                            return next(err);
                        res.status(500).json({ error: (err === null || err === void 0 ? void 0 : err.message) || 'Error interno del servidor.' });
                    });
                    if (!(process.env.NODE_ENV === 'production')) return [3 /*break*/, 1];
                    distPath_1 = path_1.default.join(__dirname, '../dist');
                    app.use(express_1.default.static(distPath_1));
                    app.get('*', function (req, res) {
                        res.sendFile(path_1.default.join(distPath_1, 'index.html'));
                    });
                    return [3 /*break*/, 4];
                case 1: return [4 /*yield*/, Promise.resolve().then(function () { return require('vite'); })];
                case 2:
                    createViteServer = (_a.sent()).createServer;
                    return [4 /*yield*/, createViteServer({ server: { middlewareMode: true }, appType: 'spa' })];
                case 3:
                    vite = _a.sent();
                    app.use(vite.middlewares);
                    _a.label = 4;
                case 4:
                    SYNC_SERVER_URL = process.env.SYNC_SERVER_URL || null;
                    setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                        var db;
                        return __generator(this, function (_a) {
                            if (!SYNC_SERVER_URL)
                                return [2 /*return*/]; // No cloud server configured
                            try {
                                db = getDB();
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
                            return [2 /*return*/];
                        });
                    }); }, 10000);
                    return [2 /*return*/, app];
            }
        });
    });
}
exports.posApp = await startServer();
