// src/config/index.js
// Centralized configuration management for Project Green

const path = require('node:path');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  // Database configuration
  database: {
    type: process.env.DB_TYPE || 'sqlite', // 'sqlite' or 'postgres'
    sqlitePath: process.env.SQLITE_PATH || path.resolve(__dirname, '../../data/green_space.db'),
    postgresUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/project_green',
  },

  // Cache configuration
  cache: {
    type: process.env.CACHE_TYPE || 'inmemory', // 'redis' or 'inmemory'
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    defaultTtlSeconds: parseInt(process.env.CACHE_DEFAULT_TTL || '3600', 10), // 1 hour
  },

  // Freshness thresholds (configurable per Section 8)
  freshness: {
    // If last verified is within this window (in hours), record is FRESH
    freshThresholdHours: parseInt(process.env.FRESH_THRESHOLD_HOURS || '24', 10),
    // Beyond this window, record is considered STALE and eligible for refresh
    staleThresholdHours: parseInt(process.env.STALE_THRESHOLD_HOURS || '168', 10), // 7 days
    // Minimum interval between manual user refreshes per parcel (seconds)
    manualRefreshCooldownSeconds: parseInt(process.env.MANUAL_REFRESH_COOLDOWN || '60', 10),
  },

  // Worker & Synchronization configuration
  sync: {
    lockTtlSeconds: parseInt(process.env.SYNC_LOCK_TTL || '30', 10),
    maxRetries: parseInt(process.env.SYNC_MAX_RETRIES || '3', 10),
    retryBaseDelayMs: parseInt(process.env.SYNC_RETRY_BASE_MS || '1000', 10),
    jobTimeoutMs: parseInt(process.env.SYNC_TIMEOUT_MS || '15000', 10),
    concurrency: parseInt(process.env.SYNC_CONCURRENCY || '4', 10),
  },

  // Security & Rate Limiting
  security: {
    adminApiKey: process.env.ADMIN_API_KEY || 'green-admin-secret-key-2026',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQ || '100', 10),
    manualRefreshRateLimitMax: parseInt(process.env.MANUAL_REFRESH_RATE_LIMIT || '5', 10), // max 5 refreshes/min
  }
};

module.exports = config;
