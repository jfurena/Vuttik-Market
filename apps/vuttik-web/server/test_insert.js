import { initDB, run, db } from './db.js';
import { v4 as uuidv4 } from 'uuid';

async function testInsert() {
  await initDB();
  const id = uuidv4();
  try {
    await run(
      `INSERT INTO vuttik_products (
        id, title, description, price, currency, category_id, type_id, author_id, 
        author_name, location, phone, lat, lng, barcode, is_on_sale, sale_price, 
        images, custom_fields, created_at, posted_as, chain, store_name, is_independent, country, province
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, "Test Title", "Desc", 100, "DOP", "CAT",
        "type", "author1", "Author", "loc", "123",
        0, 0, "123", 0, 0,
        "[]", "{}",
        new Date().toISOString(), "personal",
        null, null, 0, null, null
      ]
    );
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  }
}
testInsert();
