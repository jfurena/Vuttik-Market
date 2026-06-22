const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./vuttik.db');
db.run("UPDATE vuttik_users SET photo_url = null WHERE display_name = 'Mega Guardian'", (err) => {
  console.log('Reverted test photo', err);
  process.exit();
});
