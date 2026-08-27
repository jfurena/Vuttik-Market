import sqlite3 from 'sqlite3';
import path from 'path';
const dbPath = path.join(process.cwd(), 'vuttik.db');
const db = new sqlite3.Database(dbPath);
db.all('SELECT * FROM vuttik_business_profiles', (err, rows) => {
    if (err) {
        console.error('Error reading sqlite:', err);
    }
    else {
        console.log(`Found ${rows.length} businesses in SQLite:`);
        console.log(JSON.stringify(rows, null, 2));
    }
});
