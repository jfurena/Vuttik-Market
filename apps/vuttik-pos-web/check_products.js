const sqlite3 = require('/home/sinagjwx/domains/vuttik.com/server/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('/home/sinagjwx/domains/vuttik.com/vuttik.db');
db.all('SELECT id, title, category_id, type_id, author_id, location, created_at FROM products ORDER BY created_at DESC LIMIT 5', [], (err, rows) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(rows, null, 2));
  db.close();
});
