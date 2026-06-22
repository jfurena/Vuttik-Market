import { run } from './db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory background queue for offloading heavy tasks (e.g. analytics).
 * Accumulates tasks and processes them in batches to prevent event loop blocking
 * and database locking during high traffic.
 */
class MetricsQueue {
  private queue: any[] = [];
  private isProcessing: boolean = false;
  private readonly BATCH_SIZE = 50;
  private timer: NodeJS.Timeout;

  constructor() {
    // Process queue every 5 seconds
    this.timer = setInterval(() => this.processQueue(), 5000);
  }

  /**
   * Enqueue a metric to be saved later.
   * Returns immediately.
   */
  enqueue(metric: any) {
    this.queue.push(metric);
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const batch = this.queue.splice(0, this.BATCH_SIZE);

    try {
      // In a real high-perf scenario, we'd use a single transaction batch insert.
      // For SQLite, doing sequential awaits inside a transaction is very fast.
      await (run as any)('BEGIN TRANSACTION');
      for (const metric of batch) {
        await (run as any)(
          'INSERT INTO vuttik_metrics (id, user_id, action, target_id, target_type, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            uuidv4(),
            metric.userId || 'anonymous',
            metric.action,
            metric.targetId || null,
            metric.targetType || null,
            metric.metadata ? JSON.stringify(metric.metadata) : null,
            new Date().toISOString()
          ]
        );

        // Update Daily Aggregated Stats
        const action = metric.action;
        if (['view', 'search', 'contact'].includes(action)) {
          const dateStr = new Date().toISOString().split('T')[0];
          const field = action === 'view' ? 'views' : (action === 'search' ? 'searches' : 'contacts');
          
          let volumeIncrement = 0;
          if (action === 'contact' && metric.targetId) {
            // Note: Since we are in a transaction, `get` will just read the current state
            // If the product doesn't exist, it defaults to 0
            const product = await import('./db.js').then(m => (m.get as any)('SELECT price FROM vuttik_products WHERE id = ?', [metric.targetId]));
            volumeIncrement = (product as any)?.price || 0;
          }

          await (run as any)(`
            INSERT INTO vuttik_daily_stats (date, ${field}, total_p2p_volume) 
            VALUES (?, 1, ?) 
            ON CONFLICT(date) DO UPDATE SET 
              ${field} = ${field} + 1,
              total_p2p_volume = total_p2p_volume + ?
          `, [dateStr, volumeIncrement, volumeIncrement]);
        }
      }
      await (run as any)('COMMIT');
    } catch (error) {
      console.error('Error processing metrics queue:', error);
      await (run as any)('ROLLBACK').catch(() => {});
      // In a real scenario, we might requeue the failed items.
      // For metrics, it's often acceptable to drop them on catastrophic failure.
    } finally {
      this.isProcessing = false;
      // If there are still items, trigger again immediately
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  shutdown() {
    clearInterval(this.timer);
    // Try to flush remaining metrics before exit (best effort)
    this.processQueue();
  }
}

export const metricsQueue = new MetricsQueue();
