import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./vuttik.db');
db.run("ALTER TABLE vuttik_products ADD COLUMN stock INTEGER DEFAULT -1", (err) => {
  if (err) console.error(err);
  else console.log("Success");
});
