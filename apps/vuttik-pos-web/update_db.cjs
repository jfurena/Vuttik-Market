const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./vuttik.db');
db.run("UPDATE vuttik_products SET store_name = 'Ágora Mall', country = 'República Dominicana', province = 'Distrito Nacional' WHERE title = 'XX'", (err) => {
  console.log('Done:', err);
  process.exit();
});
