import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
const DB_FILE = process.env.USER_DATA_PATH ? path.join(process.env.USER_DATA_PATH, 'db.json') : path.join(process.cwd(), 'db.json');
const sqlitePath = path.join(process.cwd(), '..', 'vuttik.db');
const sqliteDb = new sqlite3.Database(sqlitePath);
sqliteDb.all("SELECT * FROM vuttik_products WHERE id LIKE 'pos-%'", (err, rows) => {
    if (err) {
        console.error('SQLite Error:', err);
        return;
    }
    if (rows && rows.length > 0) {
        let currentDb = { owners: [], businesses: [] };
        if (fs.existsSync(DB_FILE)) {
            try {
                currentDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            }
            catch (e) { }
        }
        if (!currentDb.businesses)
            currentDb.businesses = [];
        let recoveredCount = 0;
        for (const row of rows) {
            const biz = currentDb.businesses.find((b) => b.id === row.author_id);
            if (biz) {
                if (!biz.products)
                    biz.products = [];
                const originalId = row.id.replace('pos-', '');
                const exists = biz.products.find((p) => p.id === originalId);
                if (!exists) {
                    biz.products.push({
                        id: originalId,
                        nombre: row.title,
                        codigo_barras: row.barcode || '',
                        precio_compra: 0, // Lost in 0-byte corruption, not synced to SQLite
                        precio_venta: row.price || 0,
                        cantidad_disponible: row.stock || 0,
                        categoria_id: row.category_id || null,
                        proveedor_id: null,
                        fecha_creacion: row.created_at || new Date().toISOString(),
                        fecha_actualizacion: new Date().toISOString()
                    });
                    recoveredCount++;
                }
            }
        }
        if (recoveredCount > 0) {
            fs.writeFileSync(DB_FILE, JSON.stringify(currentDb, null, 2));
            console.log(`[Product Recovery] Successfully recovered ${recoveredCount} products from SQLite to db.json!`);
        }
        else {
            console.log(`[Product Recovery] No missing products found in SQLite.`);
        }
    }
});
