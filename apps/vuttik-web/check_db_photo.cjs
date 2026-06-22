const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('server/vuttik.db');
db.get("SELECT logo, owner_uid FROM vuttik_business_profiles WHERE uid = 'biz-1781824393975'", (err, row) => console.log('biz:', row));
db.get("SELECT photo_url FROM vuttik_users WHERE uid = '175591b2-0357-44af-94c1-c7b9429101c2'", (err, row) => console.log('owner:', row));
