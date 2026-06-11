const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./vuttik.db');
db.run("UPDATE vuttik_users SET photo_url = 'https://i.pravatar.cc/150?u=megaguardian' WHERE display_name = 'Mega Guardian'", (err) => {
  console.log('Done:', err);
  process.exit();
});
