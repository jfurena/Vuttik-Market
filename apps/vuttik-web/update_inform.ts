import { db, run, all } from './server/db.js';

async function update() {
  try {
    console.log('Adding "inform" transaction type...');

    // 1. Add 'inform' to transaction types
    await run("INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)", ['inform', 'Informar', 'Eye', 1]);
    
    // 2. Add 'inform' to allowed_types of ALL categories (if not already there)
    // We want it to be the first option: ['inform', 'sell', 'buy', ...]
    const categories: any[] = await all("SELECT id, name, allowed_types FROM vuttik_categories");
    
    for (const cat of categories) {
      let allowed = [];
      try {
        allowed = JSON.parse(cat.allowed_types);
      } catch (e) {
        allowed = [];
      }
      
      // Remove 'inform' if it exists to avoid duplicates
      allowed = allowed.filter((t: string) => t !== 'inform');
      
      // Unshift it to the beginning
      allowed.unshift('inform');
      
      await run("UPDATE vuttik_categories SET allowed_types = ? WHERE id = ?", [JSON.stringify(allowed), cat.id]);
    }

    console.log('Database update completed! Inform is now the first option for all categories.');
  } catch (err) {
    console.error('Error updating types:', err);
  }
}

update();
