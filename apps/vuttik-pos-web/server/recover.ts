import fs from 'fs';
import path from 'path';
import { jsonrepair } from 'jsonrepair';

const DB_FILE = process.env.USER_DATA_PATH ? path.join(process.env.USER_DATA_PATH, 'db.json') : path.join(process.cwd(), 'db.json');
const dir = path.dirname(DB_FILE);

try {
  const files = fs.readdirSync(dir);
  const corruptedFiles = files.filter(f => f.startsWith('db.json.corrupted.'));

  if (corruptedFiles.length > 0) {
    // Find the largest corrupted file (the original one with data)
    let largestFile = '';
    let maxSize = -1;
    for (const f of corruptedFiles) {
      const stats = fs.statSync(path.join(dir, f));
      console.log(`[Recovery] File ${f} is ${stats.size} bytes.`);
      if (stats.size > maxSize) {
        maxSize = stats.size;
        largestFile = f;
      }
    }
    const latestCorrupted = path.join(dir, largestFile);
    console.log(`[Recovery] Found corrupted backup: ${latestCorrupted} (${maxSize} bytes)`);
    
    const raw = fs.readFileSync(latestCorrupted, 'utf8');
    
    try {
      console.log('[Recovery] Attempting to repair JSON...');
      const repairedJson = jsonrepair(raw);
      const parsed = JSON.parse(repairedJson);
      
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.businesses)) {
        console.log(`[Recovery] Repair successful! Recovered ${parsed.businesses.length} businesses.`);
        
        // Merge recovered data with the current db.json
        let currentDb = { owners: [], businesses: [] };
        if (fs.existsSync(DB_FILE)) {
          try {
            currentDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
          } catch (e) {
            console.error('[Recovery] Current db.json is also invalid, overwriting.');
          }
        }
        
        // Prefer recovered businesses, but keep new ones if they were created
        const recoveredIds = new Set(parsed.businesses.map((b: any) => b.id));
        const combinedBusinesses = [...parsed.businesses];
        
        for (const b of currentDb.businesses) {
          if (!recoveredIds.has(b.id)) {
            combinedBusinesses.push(b);
          }
        }
        
        parsed.businesses = combinedBusinesses;
        
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
        console.log('[Recovery] Successfully saved recovered database.');
        
        // Rename the corrupted file so we don't recover it again
        fs.renameSync(latestCorrupted, `${latestCorrupted}.recovered`);
      } else {
        console.error('[Recovery] Repair yielded invalid structure (missing businesses array).');
      }
    } catch (err) {
      console.error('[Recovery] jsonrepair failed:', err);
    }
  } else {
    console.log('[Recovery] No corrupted files found.');
  }
} catch (err) {
  console.error('[Recovery] Fatal error during recovery:', err);
}
