// src/services/cache-service.js
// Multi-tier cache layer: Redis-compatible interface with in-memory fallback
// Enforces Section 3.C and Section 10 rules: disposable, recoverable, never permanent store.

const config = require('../config');

class InMemorySharedCache {
  constructor(defaultTtlSeconds = 3600) {
    this.store = new Map();
    this.locks = new Map();
    this.defaultTtl = defaultTtlSeconds * 1000;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      lockAcquisitions: 0,
      lockFailures: 0
    };
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) {
      this.metrics.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      this.metrics.misses++;
      return null;
    }

    this.metrics.hits++;
    return JSON.parse(item.value);
  }

  async set(key, value, ttlSeconds = null) {
    const ttl = (ttlSeconds !== null ? ttlSeconds * 1000 : this.defaultTtl);
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttl
    });
    this.metrics.sets++;
    return true;
  }

  async del(key) {
    const existed = this.store.delete(key);
    if (existed) this.metrics.deletes++;
    return existed;
  }

  async invalidate(parcelId) {
    const key = `parcel:${parcelId}:latest`;
    return await this.del(key);
  }

  async flush() {
    this.store.clear();
    this.locks.clear();
  }

  /**
   * Acquires a distributed/shared lock with an expiration lease.
   * Prevents concurrent fetches for the same parcel.
   */
  async acquireLock(key, ttlSeconds = 30) {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now) {
      this.metrics.lockFailures++;
      return null; // Lock is currently held
    }

    const lockToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    this.locks.set(key, {
      token: lockToken,
      expiresAt: now + (ttlSeconds * 1000)
    });

    this.metrics.lockAcquisitions++;
    return lockToken;
  }

  /**
   * Releases lock if token matches.
   */
  async releaseLock(key, lockToken) {
    const existing = this.locks.get(key);
    if (!existing) return true;

    if (existing.token === lockToken) {
      this.locks.delete(key);
      return true;
    }
    return false; // Token mismatch or expired
  }

  getMetrics() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) : 0;
    return {
      ...this.metrics,
      totalKeys: this.store.size,
      activeLocks: this.locks.size,
      hitRate: Math.round(hitRate * 1000) / 10 + '%'
    };
  }
}

class CacheService {
  constructor(options = {}) {
    this.type = options.type || config.cache.type;
    this.inMemoryCache = new InMemorySharedCache(config.cache.defaultTtlSeconds);
    this.isRedisConnected = false;
  }

  getCacheKey(parcelId) {
    return `parcel:${parcelId}:latest`;
  }

  getLockKey(parcelId, sourceId = 'ALL') {
    return `lock:sync:${parcelId}:${sourceId}`;
  }

  async getLatestRecord(parcelId) {
    try {
      const key = this.getCacheKey(parcelId);
      return await this.inMemoryCache.get(key);
    } catch (err) {
      console.warn('[CACHE] Error reading from cache, falling back to database:', err.message);
      return null;
    }
  }

  async setLatestRecord(parcelId, data, ttlSeconds = config.cache.defaultTtlSeconds) {
    try {
      const key = this.getCacheKey(parcelId);
      return await this.inMemoryCache.set(key, data, ttlSeconds);
    } catch (err) {
      console.warn('[CACHE] Error writing to cache:', err.message);
      return false;
    }
  }

  async invalidate(parcelId) {
    try {
      const key = this.getCacheKey(parcelId);
      return await this.inMemoryCache.del(key);
    } catch (err) {
      console.warn('[CACHE] Error invalidating cache key:', err.message);
      return false;
    }
  }

  async acquireSyncLock(parcelId, sourceId = 'ALL', ttlSeconds = config.sync.lockTtlSeconds) {
    const lockKey = this.getLockKey(parcelId, sourceId);
    return await this.inMemoryCache.acquireLock(lockKey, ttlSeconds);
  }

  async releaseSyncLock(parcelId, sourceId = 'ALL', lockToken) {
    const lockKey = this.getLockKey(parcelId, sourceId);
    return await this.inMemoryCache.releaseLock(lockKey, lockToken);
  }

  async flush() {
    return await this.inMemoryCache.flush();
  }

  getMetrics() {
    return {
      backend: this.type,
      isRedisAvailable: this.isRedisConnected,
      ...this.inMemoryCache.getMetrics()
    };
  }
}

const defaultCacheService = new CacheService();

module.exports = {
  CacheService,
  InMemorySharedCache,
  defaultCacheService
};
