import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
const DB_FILE = process.env.USER_DATA_PATH ? path.join(process.env.USER_DATA_PATH, 'db.json') : path.join(process.cwd(), 'db.json');
const sqlitePath = path.join(process.cwd(), '..', 'vuttik.db');
const sqliteDb = new sqlite3.Database(sqlitePath);
// Read current db.json to get active businesses
let activeBusinessIds = new Set();
if (fs.existsSync(DB_FILE)) {
    try {
        const currentDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (currentDb.businesses) {
            for (const biz of currentDb.businesses) {
                if (biz.id)
                    activeBusinessIds.add(biz.id);
            }
        }
    }
    catch (e) {
        console.error('Error reading db.json for cleanup:', e);
    }
}
sqliteDb.all("SELECT id, author_id FROM vuttik_products WHERE id LIKE 'pos-%'", (err, rows) => {
    if (err) {
        console.error('SQLite Error:', err);
        return;
    }
    if (rows && rows.length > 0) {
        let deletedCount = 0;
        // Find orphaned products
        for (const row of rows) {
            if (!activeBusinessIds.has(row.author_id)) {
                // Business doesn't exist in db.json anymore, so this product is orphaned
                sqliteDb.run('DELETE FROM vuttik_products WHERE id = ?', [row.id], (delErr) => {
                    if (delErr) {
                        console.error('Error deleting orphaned product:', delErr);
                    }
                    else {
                        console.log(`[Cleanup] Deleted orphaned product ${row.id} from business ${row.author_id}`);
                    }
                });
                deletedCount++;
            }
        }
        console.log(`[Cleanup] Scheduled deletion of ${deletedCount} orphaned products from SQLite.`);
        // Also clean up orphaned business profiles just in case
        sqliteDb.all("SELECT uid FROM vuttik_business_profiles", (err2, bizRows) => {
            if (!err2 && bizRows) {
                let deletedBizCount = 0;
                for (const bizRow of bizRows) {
                    if (!activeBusinessIds.has(bizRow.uid)) {
                        sqliteDb.run('DELETE FROM vuttik_business_profiles WHERE uid = ?', [bizRow.uid]);
                        deletedBizCount++;
                    }
                }
                console.log(`[Cleanup] Scheduled deletion of ${deletedBizCount} orphaned business profiles.`);
            }
        });
    }
    else {
        console.log('[Cleanup] No POS products found in SQLite to check.');
    }
});
