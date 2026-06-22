import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), '../vuttik.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("ALTER TABLE vuttik_subscription_plans ADD COLUMN is_hidden BOOLEAN DEFAULT 0", (err) => {
    if (err) console.error("Error adding is_hidden:", err.message);
    else console.log("Added is_hidden column");
  });
  
  db.run("ALTER TABLE vuttik_subscription_plans ADD COLUMN is_coming_soon BOOLEAN DEFAULT 0", (err) => {
    if (err) console.error("Error adding is_coming_soon:", err.message);
    else console.log("Added is_coming_soon column");
  });
});
