import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = process.env.USER_DATA_PATH 
  ? path.join(process.env.USER_DATA_PATH, 'pos.db') 
  : path.join(__dirname, 'pos.db');

export const db = new sqlite3.Database(DB_PATH);

export function run(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function all(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function get(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function initDB() {
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
  
  console.log('Local SQLite Database initialized at:', DB_PATH);
}

export async function addToSyncQueue(operation: string, payload: any, business_id: string, user_id: string) {
  const id = uuidv4();
  await run(
    'INSERT INTO offline_sync_queue (id, operation, payload, business_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, operation, JSON.stringify(payload), business_id, user_id, new Date().toISOString()]
  );
}

export async function getPendingSyncItems() {
  return all('SELECT * FROM offline_sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC');
}

export async function markSyncItemDone(id: string, error?: string) {
  if (error) {
    await run('UPDATE offline_sync_queue SET sync_error = ? WHERE id = ?', [error, id]);
  } else {
    await run('UPDATE offline_sync_queue SET synced_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  }
}
