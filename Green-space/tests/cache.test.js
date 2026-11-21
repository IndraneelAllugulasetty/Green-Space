// tests/cache.test.js
// Automated tests for cache hit/miss, invalidation, and fallback resilience

const test = require('node:test');
const assert = require('node:assert');

const { DatabaseManager } = require('../src/db/database');
const { runMigrations } = require('../src/db/migrate');
const { seedDataSources } = require('../src/db/seed');
const ParcelRepository = require('../src/services/parcel-repository');
const VersioningService = require('../src/services/versioning-service');
const { CacheService } = require('../src/services/cache-service');
const SyncService = require('../src/services/sync-service');
const { JobQueue } = require('../src/worker/job-queue');

function setupCacheTestEnv() {
  const dbManager = new DatabaseManager({ path: ':memory:' });
  runMigrations(dbManager);
  seedDataSources(dbManager);

  const cacheService = new CacheService();
  const repo = new ParcelRepository(dbManager);
  const versioningService = new VersioningService({
    parcelRepository: repo,
    cacheService
  });
  const jobQueue = new JobQueue();
  const syncService = new SyncService({
    parcelRepository: repo,
    jobQueue,
    cacheService
  });

  return { dbManager, repo, versioningService, cacheService, syncService };
}

test('Cache hit returns cached record quickly', async () => {
  const { syncService, cacheService, versioningService } = setupCacheTestEnv();

  const parcelParams = {
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '142',
    hissa: '3A',
    officialId: 'KA-CACHE-TEST-1'
  };

  await versioningService.processFetchedData({
    parcelParams,
    fetchResult: {
      sourceId: 'MOCK_CADASTRAL_SANDBOX',
      sourceRecordId: 'KA-CACHE-TEST-1',
      data: { area: 2.5 }
    }
  });

  const parcelId = 'OFFICIAL:KA-CACHE-TEST-1';

  // First resolution: loads from DB and warms cache
  const first = await syncService.resolveParcel({ officialId: 'KA-CACHE-TEST-1' });
  assert.strictEqual(first.sourceOfData, 'DATABASE');

  // Second resolution: must hit cache
  const second = await syncService.resolveParcel({ officialId: 'KA-CACHE-TEST-1' });
  assert.strictEqual(second.sourceOfData, 'CACHE');
  assert.strictEqual(second.latestVersion.data.area, 2.5);

  const metrics = cacheService.getMetrics();
  assert.ok(metrics.hits >= 1, 'Cache hits counter must have incremented');
});

test('Cache invalidation on new version creation', async () => {
  const { syncService, versioningService, cacheService } = setupCacheTestEnv();

  const parcelParams = {
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '142',
    officialId: 'KA-CACHE-TEST-2'
  };

  // 1. Initial version
  await versioningService.processFetchedData({
    parcelParams,
    fetchResult: {
      sourceId: 'MOCK_CADASTRAL_SANDBOX',
      data: { area: 2.5, classification: 'Dry' }
    }
  });

  // Warm cache
  await syncService.resolveParcel({ officialId: 'KA-CACHE-TEST-2' });

  // 2. Commit Version 2
  await versioningService.processFetchedData({
    parcelParams,
    fetchResult: {
      sourceId: 'MOCK_CADASTRAL_SANDBOX',
      data: { area: 2.5, classification: 'Converted Commercial' }
    }
  });

  // Verify that the cache was invalidated: next read must fetch fresh from DB
  const third = await syncService.resolveParcel({ officialId: 'KA-CACHE-TEST-2' });
  assert.strictEqual(third.sourceOfData, 'DATABASE', 'Must reload from DB after invalidation');
  assert.strictEqual(third.latestVersion.sequenceNumber, 2);
  assert.strictEqual(third.latestVersion.data.classification, 'Converted Commercial');
});

test('Cache outage / flush does not cause persistent data loss', async () => {
  const { syncService, versioningService, cacheService, repo } = setupCacheTestEnv();

  const parcelParams = {
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '142',
    officialId: 'KA-CACHE-TEST-3'
  };

  await versioningService.processFetchedData({
    parcelParams,
    fetchResult: {
      sourceId: 'MOCK_CADASTRAL_SANDBOX',
      data: { area: 3.0 }
    }
  });

  // Simulate total cache flush (e.g. Redis restart / evictions)
  await cacheService.flush();

  // Read must transparently fall back to persistent central database
  const res = await syncService.resolveParcel({ officialId: 'KA-CACHE-TEST-3' });
  assert.strictEqual(res.found, true);
  assert.strictEqual(res.sourceOfData, 'DATABASE');
  assert.strictEqual(res.latestVersion.data.area, 3.0);

  // Database must still have the record
  const dbRecord = repo.getLatestRecord(res.parcel.id);
  assert.ok(dbRecord, 'Persistent DB record must never be deleted by cache flush');
});
