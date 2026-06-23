const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const dbPath = path.join(__dirname, '..', '..', '..', 'vuttik.db'); 
const jsonDbPath = path.join(__dirname, '..', 'server', 'db.json');

const db = new sqlite3.Database(path.join(__dirname, '..', 'vuttik.db'), (err) => {
    if (err) console.error('Error abriendo SQLite:', err.message);
    else console.log('SQLite conectado para migración.');
});

async function runMigration() {
    console.log('Iniciando migración de datos...');

    const sqliteTables = [
        'vuttik_users', 'vuttik_categories', 'vuttik_products', 'vuttik_posts',
        'vuttik_business_profiles', 'vuttik_ean_database'
    ];

    let validUserIds = new Set();

    for (const table of sqliteTables) {
        console.log(`Migrando ${table}...`);
        const rows = await new Promise((resolve) => {
            db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
                if (err) {
                    console.log(`Error leyendo ${table} (podría estar vacía o no existir). Saltando.`);
                    resolve([]);
                }
                resolve(rows);
            });
        });

        if (rows && rows.length > 0) {
            let cleanRows = rows.map(r => {
                if(r.uid === null) delete r.uid;
                
                if (table === 'vuttik_users') {
                    delete r.photo_url;
                }
                if (table === 'vuttik_categories') {
                    if (!r.slug && r.name) {
                        r.slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    }
                    delete r.allowed_types;
                    delete r.description;
                    delete r.fields;
                    delete r.order_index;
                    delete r.system_fields;
                }
                if (table === 'vuttik_products') {
                    r.owner_id = r.author_id || r.owner_id;
                    r.name = r.title || r.name;
                    if (!r.name) r.name = 'Producto sin nombre';
                    delete r.author_id;
                    delete r.author_name;
                    delete r.currency;
                    delete r.custom_fields;
                    delete r.title;
                    delete r.type_id;
                }
                return r;
            });

            if (table === 'vuttik_users') {
                cleanRows.forEach(r => { if(r.uid) validUserIds.add(r.uid) });
            }

            if (table === 'vuttik_products') {
                // Filtrar productos cuyo owner no exista en vuttik_users para evitar violar Foreign Key
                cleanRows = cleanRows.filter(r => validUserIds.has(r.owner_id));
            }

            if (table === 'vuttik_posts') {
                // Filtrar posts cuyo author_id no exista
                cleanRows = cleanRows.filter(r => validUserIds.has(r.author_id));
            }

            if (table === 'vuttik_business_profiles') {
                // Filtrar perfiles cuyo owner_uid no exista
                cleanRows = cleanRows.filter(r => validUserIds.has(r.owner_uid));
            }

            if (cleanRows.length === 0) {
                console.log(`- 0 filas válidas para insertar en ${table}`);
                continue;
            }
            
            const { error } = await supabase.from(table).upsert(cleanRows, { ignoreDuplicates: true });
            if (error) console.error(`Error insertando en ${table}:`, error.message);
            else console.log(`✓ ${cleanRows.length} filas insertadas en ${table}`);
        } else {
            console.log(`- 0 filas en ${table}`);
        }
    }

    if (fs.existsSync(jsonDbPath)) {
        console.log('Migrando db.json (POS)...');
        const posData = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));

        const posTables = [
            { key: 'businesses', table: 'pos_businesses' },
            { key: 'employees', table: 'pos_employees' },
            { key: 'products', table: 'pos_products' },
            { key: 'clients', table: 'pos_clients' },
            { key: 'sales', table: 'pos_sales' },
            { key: 'saleItems', table: 'pos_sale_items' },
            { key: 'expenses', table: 'pos_expenses' },
            { key: 'shifts', table: 'pos_shifts' },
            { key: 'inventoryMovements', table: 'pos_inventory_movements' },
            { key: 'cashMovements', table: 'pos_cash_movements' }
        ];

        for (const mapping of posTables) {
            const dataToInsert = posData[mapping.key];
            if (dataToInsert && dataToInsert.length > 0) {
                const cleanData = dataToInsert.map(r => {
                    delete r._id;
                    delete r.__v;
                    return r;
                });

                const { error } = await supabase.from(mapping.table).upsert(cleanData, { ignoreDuplicates: true });
                if (error) console.error(`Error insertando en ${mapping.table}:`, error.message);
                else console.log(`✓ ${cleanData.length} filas insertadas en ${mapping.table}`);
            } else {
                console.log(`- 0 filas en ${mapping.table}`);
            }
        }
    } else {
        console.log('db.json no encontrado, saltando datos del POS.');
    }

    console.log('Migración completada!');
    process.exit(0);
}

runMigration();
