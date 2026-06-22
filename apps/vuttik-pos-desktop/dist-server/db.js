"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.run = run;
exports.all = all;
exports.get = get;
exports.initDB = initDB;
exports.addToSyncQueue = addToSyncQueue;
exports.getPendingSyncItems = getPendingSyncItems;
exports.markSyncItemDone = markSyncItemDone;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const DB_PATH = process.env.USER_DATA_PATH
    ? path_1.default.join(process.env.USER_DATA_PATH, 'pos.db')
    : path_1.default.join(__dirname, 'pos.db');
exports.db = new sqlite3_1.default.Database(DB_PATH);
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        exports.db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        exports.db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        exports.db.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
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
      sync_error TEXT
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
    console.log('Local SQLite Database initialized at:', DB_PATH);
}
async function addToSyncQueue(operation, payload, business_id, user_id) {
    const id = (0, uuid_1.v4)();
    await run('INSERT INTO offline_sync_queue (id, operation, payload, business_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, operation, JSON.stringify(payload), business_id, user_id, new Date().toISOString()]);
}
async function getPendingSyncItems() {
    return all('SELECT * FROM offline_sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC');
}
async function markSyncItemDone(id, error) {
    if (error) {
        await run('UPDATE offline_sync_queue SET sync_error = ? WHERE id = ?', [error, id]);
    }
    else {
        await run('UPDATE offline_sync_queue SET synced_at = ? WHERE id = ?', [new Date().toISOString(), id]);
    }
}
