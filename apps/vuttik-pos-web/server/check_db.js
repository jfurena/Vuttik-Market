import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), '../vuttik.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT id, name, is_hidden, is_coming_soon FROM vuttik_subscription_plans', (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(rows);
  }
});
