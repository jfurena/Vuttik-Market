const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/var/www/vuttik/backend/vuttik.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    db.all("SELECT id, title, author_id, author_name, location FROM vuttik_products ORDER BY created_at DESC LIMIT 5;", [], (err, rows) => {
        if (err) {
            console.error(err.message);
            process.exit(1);
        }
        console.log(JSON.stringify(rows, null, 2));
    });
});

db.close();
