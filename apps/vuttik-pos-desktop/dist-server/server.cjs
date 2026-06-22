var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/server.ts
var server_exports = {};
__export(server_exports, {
  start: () => start
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);

// server/db.ts
var import_sqlite3 = __toESM(require("sqlite3"), 1);
var import_path = __toESM(require("path"), 1);
var import_uuid = require("uuid");
var DB_PATH = process.env.USER_DATA_PATH ? import_path.default.join(process.env.USER_DATA_PATH, "pos.db") : import_path.default.join(__dirname, "pos.db");
var db = new import_sqlite3.default.Database(DB_PATH);
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
async function initDB() {
  await run(`
    CREATE TABLE IF NOT EXISTS offline_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      correo TEXT NOT NULL,
      nombre TEXT,
      role TEXT DEFAULT 'owner',
      password_hash TEXT,
      cloud_token TEXT,
      business_data TEXT,
      created_at TEXT,
      expires_at TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS offline_sync_queue (
      id TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      business_id TEXT,
      user_id TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT,
      sync_error TEXT,
      status TEXT DEFAULT 'pending'
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS products_cache (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      category TEXT,
      image TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS clients_cache (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      credit_limit REAL DEFAULT 0,
      balance REAL DEFAULT 0
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      opening_amount REAL NOT NULL,
      closing_amount REAL,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      status TEXT DEFAULT 'open'
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      client_id TEXT,
      total REAL NOT NULL,
      items TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT DEFAULT 'draft'
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      codigo TEXT UNIQUE,
      nombre TEXT,
      owner_id TEXT,
      settings TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      business_id TEXT,
      title TEXT,
      price REAL,
      cost REAL,
      stock INTEGER,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      business_id TEXT,
      user_id TEXT,
      total REAL,
      items TEXT,
      created_at TEXT,
      synced BOOLEAN DEFAULT 0,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    )
  `);
  console.log("Local SQLite Database initialized at:", DB_PATH);
}
async function addToSyncQueue(operation, payload, business_id, user_id) {
  const id = (0, import_uuid.v4)();
  await run(
    "INSERT INTO offline_sync_queue (id, operation, payload, business_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, operation, JSON.stringify(payload), business_id, user_id, (/* @__PURE__ */ new Date()).toISOString()]
  );
}
async function getPendingSyncItems() {
  return all("SELECT * FROM offline_sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC");
}
async function markSyncItemDone(id, error) {
  if (error) {
    await run("UPDATE offline_sync_queue SET sync_error = ? WHERE id = ?", [error, id]);
  } else {
    await run("UPDATE offline_sync_queue SET synced_at = ? WHERE id = ?", [(/* @__PURE__ */ new Date()).toISOString(), id]);
  }
}

// server/cloud-proxy.ts
var import_https = __toESM(require("https"), 1);
var import_http = __toESM(require("http"), 1);
var import_url = require("url");
var CLOUD_URL = process.env.CLOUD_URL || "http://localhost:3005/api";
function request(method, endpoint, data, token) {
  return new Promise((resolve, reject) => {
    const url = new import_url.URL(`${CLOUD_URL}${endpoint}`);
    const lib = url.protocol === "https:" ? import_https.default : import_http.default;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json"
      }
    };
    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }
    const req = lib.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body || "{}"));
          } else {
            reject(new Error(`Status ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", (e) => reject(e));
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}
async function isCloudOnline() {
  try {
    await request("GET", "/auth/ping");
    return true;
  } catch (e) {
    if (e.message.includes("Status 401") || e.message.includes("Status 404")) return true;
    return false;
  }
}
async function cloudLogin(correo, password, codigoNegocio) {
  const payload = { correo, password };
  if (codigoNegocio) payload.codigo_negocio = codigoNegocio;
  return request("POST", "/auth/login", payload);
}
async function cloudSyncPush(token, operations) {
  return request("POST", "/pos/sync", { operations }, token);
}

// server/server.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_uuid2 = require("uuid");
var import_path2 = __toESM(require("path"), 1);
var app = (0, import_express.default)();
app.use((0, import_cors.default)());
app.use(import_express.default.json());
async function processSyncQueue() {
  try {
    const online = await isCloudOnline();
    if (!online) return;
    const pending = await getPendingSyncItems();
    if (pending.length === 0) return;
    console.log(`Syncing ${pending.length} items to cloud...`);
    const sessions = await all("SELECT cloud_token FROM offline_sessions WHERE cloud_token IS NOT NULL ORDER BY created_at DESC LIMIT 1");
    if (sessions.length === 0) return;
    const token = sessions[0].cloud_token;
    const operations = pending.map((p) => ({
      operation: p.operation,
      payload: JSON.parse(p.payload),
      timestamp: p.created_at
    }));
    await cloudSyncPush(token, operations);
    for (const p of pending) {
      await markSyncItemDone(p.id);
    }
    console.log("Sync complete.");
  } catch (err) {
    console.error("Background sync failed:", err.message);
  }
}
setInterval(processSyncQueue, 3e4);
app.post("/api/auth/login", async (req, res) => {
  const { correo, password, codigoNegocio } = req.body;
  const online = await isCloudOnline();
  if (online) {
    try {
      const cloudRes = await cloudLogin(correo, password, codigoNegocio);
      const hash = await import_bcryptjs.default.hash(password, 10);
      const businessData = JSON.stringify(cloudRes.profile?.business || {});
      await run(
        `INSERT OR REPLACE INTO offline_sessions (id, user_id, correo, nombre, role, password_hash, cloud_token, business_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [(0, import_uuid2.v4)(), cloudRes.user.id, correo, cloudRes.profile?.nombre, cloudRes.profile?.rol, hash, cloudRes.token, businessData, (/* @__PURE__ */ new Date()).toISOString()]
      );
      if (cloudRes.profile?.business_id) {
        await run(
          `INSERT OR REPLACE INTO businesses (id, nombre, owner_id) VALUES (?, ?, ?)`,
          [cloudRes.profile.business_id, cloudRes.profile.business?.nombre || "Mi Negocio", cloudRes.user.id]
        );
      }
      return res.json({ token: cloudRes.token, user: cloudRes.user, profile: cloudRes.profile, isOnline: true });
    } catch (err) {
      return res.status(401).json({ error: "Credenciales inv\xE1lidas o error de red: " + err.message });
    }
  } else {
    const sessions = await all("SELECT * FROM offline_sessions WHERE correo = ? ORDER BY created_at DESC", [correo]);
    if (sessions.length === 0) return res.status(401).json({ error: "No hay sesiones previas para este usuario. Necesitas internet para el primer inicio de sesi\xF3n." });
    const session = sessions[0];
    const match = await import_bcryptjs.default.compare(password, session.password_hash);
    if (!match) return res.status(401).json({ error: "Contrase\xF1a incorrecta (Offline)" });
    return res.json({
      token: "offline-token",
      user: { id: session.user_id, email: session.correo },
      profile: {
        id: session.id,
        nombre: session.nombre,
        rol: session.role,
        business: JSON.parse(session.business_data || "{}")
      },
      isOnline: false
    });
  }
});
app.post("/api/auth/social-sync", async (req, res) => {
  const { authData } = req.body;
  if (!authData) return res.status(400).json({ error: "No auth data provided" });
  try {
    let token = "social-token";
    let email = "usuario@social.vuttik";
    let userId = (0, import_uuid2.v4)();
    let businessId = "NEG-DEFAULT";
    if (authData.rawLocalStorage) {
      const storage = authData.rawLocalStorage;
      for (const key of Object.keys(storage)) {
        try {
          const parsed = JSON.parse(storage[key]);
          if (parsed.token) token = parsed.token;
          if (parsed.idToken) token = parsed.idToken;
          if (parsed.email) email = parsed.email;
          if (parsed.uid || parsed.localId) userId = parsed.uid || parsed.localId;
          if (parsed.business_id || parsed.businessId) businessId = parsed.business_id || parsed.businessId;
        } catch (e) {
        }
      }
    } else {
      token = authData.idToken || authData.token || token;
      email = authData.email || email;
      userId = authData.localId || authData.userId || userId;
    }
    const hash = await import_bcryptjs.default.hash("social-login", 10);
    await run(
      `INSERT OR REPLACE INTO offline_sessions (id, user_id, correo, nombre, role, password_hash, cloud_token, business_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [(0, import_uuid2.v4)(), userId, email, "Usuario Social", "admin", hash, token, "{}", (/* @__PURE__ */ new Date()).toISOString()]
    );
    return res.json({
      token,
      user: { id: userId, email },
      profile: { nombre: "Usuario Social", rol: "admin", business: { id: businessId, nombre: "Mi Negocio" }, business_id: businessId },
      isOnline: true
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/pos/sale", async (req, res) => {
  const { business_id, user_id, total, items } = req.body;
  const id = (0, import_uuid2.v4)();
  await run(
    "INSERT INTO sales (id, business_id, user_id, total, items, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, business_id, user_id, total, JSON.stringify(items), (/* @__PURE__ */ new Date()).toISOString()]
  );
  await addToSyncQueue("CREATE_SALE", { id, business_id, user_id, total, items }, business_id, user_id);
  processSyncQueue().catch(() => {
  });
  res.json({ success: true, saleId: id });
});
app.get("/api/status", async (req, res) => {
  const online = await isCloudOnline();
  res.json({ online });
});
app.get("/api/products/:businessId", async (req, res) => {
  const products = await all("SELECT * FROM products_cache WHERE business_id = ?", [req.params.businessId]);
  res.json(products);
});
app.get("/api/clients/:businessId", async (req, res) => {
  const clients = await all("SELECT * FROM clients_cache WHERE business_id = ?", [req.params.businessId]);
  res.json(clients);
});
app.post("/api/clients", async (req, res) => {
  const { business_id, user_id, name, phone } = req.body;
  const id = (0, import_uuid2.v4)();
  await run("INSERT INTO clients_cache (id, business_id, name, phone) VALUES (?, ?, ?, ?)", [id, business_id, name, phone]);
  await addToSyncQueue("CREATE_CLIENT", { id, business_id, name, phone }, business_id, user_id);
  processSyncQueue().catch(() => {
  });
  res.json({ success: true, client: { id, business_id, name, phone } });
});
app.get("/api/shifts/:businessId/active", async (req, res) => {
  const shifts = await all("SELECT * FROM shifts WHERE business_id = ? AND status = ? ORDER BY opened_at DESC LIMIT 1", [req.params.businessId, "open"]);
  res.json(shifts.length > 0 ? shifts[0] : null);
});
app.post("/api/shifts/open", async (req, res) => {
  const { business_id, user_id, opening_amount } = req.body;
  const id = (0, import_uuid2.v4)();
  await run(
    "INSERT INTO shifts (id, business_id, user_id, opening_amount, opened_at, status) VALUES (?, ?, ?, ?, ?, ?)",
    [id, business_id, user_id, opening_amount, (/* @__PURE__ */ new Date()).toISOString(), "open"]
  );
  await addToSyncQueue("OPEN_SHIFT", { id, business_id, opening_amount }, business_id, user_id);
  processSyncQueue().catch(() => {
  });
  res.json({ success: true, shiftId: id });
});
app.post("/api/shifts/close", async (req, res) => {
  const { id, closing_amount, user_id } = req.body;
  const shift = await all("SELECT * FROM shifts WHERE id = ?", [id]);
  if (!shift.length) return res.status(404).json({ error: "Shift not found" });
  await run(
    "UPDATE shifts SET closing_amount = ?, closed_at = ?, status = ? WHERE id = ?",
    [closing_amount, (/* @__PURE__ */ new Date()).toISOString(), "closed", id]
  );
  await addToSyncQueue("CLOSE_SHIFT", { id, closing_amount }, shift[0].business_id, user_id);
  processSyncQueue().catch(() => {
  });
  res.json({ success: true });
});
app.post("/api/quotes", async (req, res) => {
  const { business_id, client_id, total, items, user_id } = req.body;
  const id = (0, import_uuid2.v4)();
  await run(
    "INSERT INTO quotes (id, business_id, client_id, total, items, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, business_id, client_id, total, JSON.stringify(items), (/* @__PURE__ */ new Date()).toISOString()]
  );
  await addToSyncQueue("CREATE_QUOTE", { id, business_id, client_id, total, items }, business_id, user_id);
  processSyncQueue().catch(() => {
  });
  res.json({ success: true, quoteId: id });
});
var distPath = import_path2.default.join(__dirname, "../dist");
app.use(import_express.default.static(distPath));
app.use((req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "API route not found" });
  res.sendFile(import_path2.default.join(distPath, "index.html"));
});
async function start() {
  await initDB();
  const PORT = process.env.PORT || 3005;
  app.listen(PORT, () => {
    console.log(`Local POS Backend running at http://localhost:${PORT}`);
  });
}
if (require.main === module) {
  start();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  start
});
