import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';

const db = new sqlite3.Database('./vuttik.db');
const run = promisify(db.run.bind(db));

async function migrate() {
  const data = JSON.parse(fs.readFileSync('./server/db.json'));
  for (const b of data.businesses) {
    await run(
      "INSERT INTO vuttik_business_profiles (uid, owner_uid, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET owner_uid=excluded.owner_uid, name=excluded.name",
      [b.id, b.owner_id, b.nombre, b.fecha_creacion, new Date().toISOString()]
    );
    console.log('Migrated', b.nombre);
  }
}
migrate();
