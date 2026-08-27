import fetch from 'node-fetch';
import { getDB, saveDB } from './pos-backend.js';

const SYNC_INTERVAL = 60000 * 5; // 5 minutes
const REMOTE_API = 'https://pos.vuttik.com/api/sync';

let syncWorkerTimer: NodeJS.Timeout | null = null;

export const startSyncWorker = () => {
  if (syncWorkerTimer) return;
  console.log('[SyncWorker] Started offline sync worker. Checking every 5 minutes.');
  syncWorkerTimer = setInterval(performSync, SYNC_INTERVAL);
  // Perform an immediate sync on startup
  performSync();
};

export const performSync = async () => {
  try {
    const db = getDB();
    if (!db || !db.businesses || db.businesses.length === 0) {
      return;
    }

    // console.log('[SyncWorker] Attempting to sync with remote server...');

    for (const business of db.businesses) {
      const pendingSales = business.sales.filter((s: any) => !s.synced);
      const pendingMovements = business.inventory_movements.filter((m: any) => !m.synced);
      const pendingProducts = business.products.filter((p: any) => !p.synced);

      if (pendingSales.length === 0 && pendingMovements.length === 0 && pendingProducts.length === 0) {
        continue; // Nothing to push
      }

      console.log(`[SyncWorker] Business ${business.codigo} has ${pendingSales.length} pending sales, ${pendingMovements.length} movements.`);

      const payload = {
        businessCode: business.codigo,
        sales: pendingSales,
        inventory_movements: pendingMovements,
        products: pendingProducts
      };

      try {
        const res = await fetch(`${REMOTE_API}/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          console.log(`[SyncWorker] Successfully pushed data for ${business.codigo}`);
          // Mark local as synced
          pendingSales.forEach((s: any) => s.synced = true);
          pendingMovements.forEach((m: any) => m.synced = true);
          pendingProducts.forEach((p: any) => p.synced = true);
          saveDB(db);
        } else {
          console.error(`[SyncWorker] Failed to push: ${res.statusText}`);
        }
      } catch (e: any) {
        // Cannot connect, which is normal in offline mode. Do not throw.
        // console.error(`[SyncWorker] Connection error: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('[SyncWorker] Error during sync:', err);
  }
};
