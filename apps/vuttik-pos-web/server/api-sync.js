import express from 'express';
import { getDB, saveDB } from './pos-backend.js';
export const syncRouter = express.Router();
syncRouter.post('/push', async (req, res) => {
    try {
        const { businessCode, sales, inventory_movements, products } = req.body;
        if (!businessCode) {
            return res.status(400).json({ error: 'businessCode is required' });
        }
        const db = getDB();
        const biz = db.businesses.find((b) => b.codigo === businessCode);
        if (!biz) {
            return res.status(404).json({ error: 'Business not found' });
        }
        let modified = false;
        // Process new sales
        if (sales && sales.length > 0) {
            for (const sale of sales) {
                const exists = biz.sales.find((s) => s.id === sale.id);
                if (!exists) {
                    // ensure it doesn't overwrite anything, just appends
                    const saleCopy = { ...sale };
                    delete saleCopy.synced; // remove local sync flag
                    biz.sales.push(saleCopy);
                    modified = true;
                }
            }
        }
        // Process inventory movements
        if (inventory_movements && inventory_movements.length > 0) {
            for (const mov of inventory_movements) {
                const exists = biz.inventory_movements.find((m) => m.id === mov.id);
                if (!exists) {
                    const movCopy = { ...mov };
                    delete movCopy.synced;
                    biz.inventory_movements.push(movCopy);
                    modified = true;
                }
            }
        }
        // Process products (Update existing or push new)
        if (products && products.length > 0) {
            const { run, get } = await import('./db.js');
            const now = new Date().toISOString();
            for (const prod of products) {
                const idx = biz.products.findIndex((p) => p.id === prod.id);
                const prodCopy = { ...prod };
                delete prodCopy.synced;
                if (idx >= 0) {
                    biz.products[idx] = { ...biz.products[idx], ...prodCopy };
                    modified = true;
                }
                else {
                    biz.products.push(prodCopy);
                    modified = true;
                }
                // Also insert/update into LIVE SQLite database so it shows up in Market immediately!
                try {
                    const p = prodCopy;
                    const sqliteProductId = 'pos-' + p.id;
                    const ownerName = biz.nombre || 'Negocio POS';
                    const locationObj = biz.settings?.allowed_location;
                    const location = typeof locationObj === 'object' ? locationObj.address : (locationObj || 'Ubicación no especificada');
                    const lat = typeof locationObj === 'object' ? locationObj.lat : null;
                    const lng = typeof locationObj === 'object' ? locationObj.lng : null;
                    // Resolve category
                    const seccion = p.seccion || 'General';
                    let catId = 'GLOBAL';
                    const existingCat = await get('SELECT id FROM vuttik_categories WHERE name = ? COLLATE NOCASE', [seccion]);
                    if (existingCat) {
                        catId = existingCat.id;
                    }
                    else {
                        catId = seccion.toUpperCase().replace(/\s+/g, '_').substring(0, 50);
                        await run('INSERT OR IGNORE INTO vuttik_categories (id, name, order_index, allowed_types, fields, system_fields, is_service, requires_ean) VALUES (?, ?, ?, ?, ?, ?, 0, 0)', [catId, seccion, 100, '["sell"]', '[]', '{}']);
                    }
                    await run(`
                INSERT INTO vuttik_products 
                (id, title, price, author_id, author_name, location, lat, lng, store_name, is_independent, created_at, barcode, posted_as, category_id, type_id, stock) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                title=excluded.title, price=excluded.price, barcode=excluded.barcode,
                location=excluded.location, lat=excluded.lat, lng=excluded.lng,
                category_id=excluded.category_id, type_id=excluded.type_id, stock=excluded.stock
            `, [
                        sqliteProductId, p.nombre, Number(p.precio_venta) || 0, biz.id, ownerName,
                        location, lat, lng, ownerName, 1, p.fecha_creacion || now, p.codigo_barras || '',
                        'business', catId, 'sell', Number(p.cantidad_disponible) || 0
                    ]);
                }
                catch (e) {
                    console.error('SQLite Sync Error for product:', e);
                }
            }
        }
        if (modified) {
            saveDB(db);
        }
        res.json({ success: true, processed: { sales: sales?.length || 0, movements: inventory_movements?.length || 0, products: products?.length || 0 } });
    }
    catch (err) {
        console.error('Sync Error:', err);
        res.status(500).json({ error: err.message });
    }
});
syncRouter.get('/pull', async (req, res) => {
    res.json({ success: true, message: 'Pull endpoint' });
});
