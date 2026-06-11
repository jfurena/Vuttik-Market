import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./vuttik.db');
db.all("PRAGMA table_info(vuttik_products);", (err, rows) => {
  console.log("COLUMNS:");
  console.log(rows.map(r => r.name).join(', '));
  db.get("SELECT * FROM vuttik_products ORDER BY created_at DESC LIMIT 1", (err, row) => {
    console.log("LATEST PRODUCT:");
    console.log(row);
    process.exit();
  });
});
