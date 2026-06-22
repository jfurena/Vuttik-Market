/**
 * Simple In-Memory Cache (LRU-like approach for specific keys)
 * Stores data with an expiration time to avoid hitting SQLite.
 */

interface CacheItem {
  data: any;
  expiry: number;
}

class MemCache {
  private cache: Map<string, CacheItem> = new Map();

  /**
   * Get an item from the cache. Returns null if missing or expired.
   */
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set an item in the cache with a TTL (Time To Live) in seconds.
   */
  set(key: string, data: any, ttlSeconds: number = 10) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  /**
   * Delete an item from the cache
   */
  delete(key: string) {
    this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this.cache.clear();
  }
}

export const globalCache = new MemCache();
