const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('server/vuttik.db');
db.all("SELECT id, author_id, posted_as FROM vuttik_products WHERE author_id LIKE 'biz-%' LIMIT 5", (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
});
