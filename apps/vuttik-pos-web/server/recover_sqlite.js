import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
const DB_FILE = process.env.USER_DATA_PATH ? path.join(process.env.USER_DATA_PATH, 'db.json') : path.join(process.cwd(), 'db.json');
const sqlitePath = path.join(process.cwd(), '..', 'vuttik.db');
const sqliteDb = new sqlite3.Database(sqlitePath);
sqliteDb.all('SELECT * FROM vuttik_business_profiles', (err, rows) => {
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
            // Check if business already exists
            const exists = currentDb.businesses.find((b) => b.id === row.uid || b.codigo === row.uid);
            if (!exists) {
                currentDb.businesses.push({
                    id: row.uid,
                    owner_id: row.owner_uid,
                    nombre: row.name,
                    codigo: row.uid.substring(0, 8).toUpperCase(),
                    settings: {
                        nombre_negocio: row.name,
                        itbis: 18,
                        alertas_stock: true,
                        gps_seguro: false,
                        login_locations: []
                    },
                    employees: [],
                    sales: [],
                    expenses: [],
                    shifts: [],
                    clientes: [],
                    pagos_clientes: [],
                    activity_log: [],
                    fecha_creacion: row.created_at,
                    fecha_actualizacion: row.updated_at
                });
                recoveredCount++;
            }
        }
        if (recoveredCount > 0) {
            fs.writeFileSync(DB_FILE, JSON.stringify(currentDb, null, 2));
            console.log(`[SQLite Recovery] Successfully recovered ${recoveredCount} businesses from SQLite to db.json!`);
        }
        else {
            console.log(`[SQLite Recovery] No missing businesses found in SQLite.`);
        }
    }
});
