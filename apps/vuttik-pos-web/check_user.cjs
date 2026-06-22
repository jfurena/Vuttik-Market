const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./vuttik.db');
db.get("SELECT * FROM vuttik_users WHERE display_name = 'Mega Guardian'", (err, row) => {
  console.log('USER:', row);
  process.exit();
});
