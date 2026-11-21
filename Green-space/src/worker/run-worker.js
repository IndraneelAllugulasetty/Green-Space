// src/worker/run-worker.js
// Standalone background synchronization worker process entrypoint

const { defaultDbManager } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const { seedDataSources } = require('../db/seed');
const ParcelRepository = require('../services/parcel-repository');
const VersioningService = require('../services/versioning-service');
const { defaultCacheService } = require('../services/cache-service');
const { defaultJobQueue } = require('./job-queue');
const SyncWorker = require('./sync-worker');
const { defaultRegistry } = require('../adapters');

console.log('[WORKER_PROCESS] Initializing standalone synchronization worker...');

runMigrations();
seedDataSources();

const parcelRepo = new ParcelRepository(defaultDbManager);
const versioningService = new VersioningService({
  parcelRepository: parcelRepo,
  cacheService: defaultCacheService
});

const worker = new SyncWorker({
  jobQueue: defaultJobQueue,
  parcelRepository: parcelRepo,
  versioningService,
  cacheService: defaultCacheService,
  adapterRegistry: defaultRegistry
});

worker.start();
console.log('[WORKER_PROCESS] Standalone background worker process ready.');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[WORKER_PROCESS] Shutting down worker...');
  worker.stop();
  defaultDbManager.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[WORKER_PROCESS] Terminating worker...');
  worker.stop();
  defaultDbManager.close();
  process.exit(0);
});
