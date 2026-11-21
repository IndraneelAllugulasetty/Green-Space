// tests/synchronization.test.js
// Automated tests for synchronization lifecycle, stale refresh, and error resilience

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
const SyncWorker = require('../src/worker/sync-worker');
const { SourceAdapterRegistry } = require('../src/adapters');
const MockCadastralAdapter = require('../src/adapters/mock-cadastral-adapter');

function setupSyncEnvironment() {
  const dbManager = new DatabaseManager({ path: ':memory:' });
  runMigrations(dbManager);
  seedDataSources(dbManager);

  const cacheService = new CacheService();
  const repo = new ParcelRepository(dbManager);
  const versioningService = new VersioningService({
    parcelRepository: repo,
    cacheService
  });

  const jobQueue = new JobQueue({ concurrency: 2 });
  const registry = new SourceAdapterRegistry();
  const mockAdapter = new MockCadastralAdapter({ latencyMs: 0 });
  registry.register(mockAdapter);

  const worker = new SyncWorker({
    jobQueue,
    parcelRepository: repo,
    versioningService,
    cacheService,
    adapterRegistry: registry
  });
  worker.start();

  const syncService = new SyncService({
    parcelRepository: repo,
    jobQueue,
    cacheService,
    defaultSourceId: mockAdapter.id
  });

  return { dbManager, repo, versioningService, cacheService, jobQueue, worker, mockAdapter, syncService };
}

test('Initial synchronization via worker establishes baseline version', async () => {
  const env = setupSyncEnvironment();

  const parcelParams = {
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '142',
    hissa: '3A',
    officialId: 'KA-RTC-2026-NID-142-3A'
  };

  const parcelId = 'OFFICIAL:KA-RTC-2026-NID-142-3A';

  const jobResult = env.jobQueue.enqueue({
    parcelId,
    parcelParams,
    sourceId: 'MOCK_CADASTRAL_SANDBOX',
    triggerType: 'INITIAL_LOOKUP'
  });

  assert.strictEqual(jobResult.status, 'QUEUED');

  // Wait for worker to finish processing
  await new Promise(r => setTimeout(r, 100));

  const record = env.repo.getLatestRecord(parcelId);
  assert.ok(record, 'Record must be persisted in database.');
  assert.strictEqual(record.latestVersion.sequenceNumber, 1);
  assert.strictEqual(record.latestVersion.data.officialId, 'KA-RTC-2026-NID-142-3A');

  // Verify sync attempt was recorded as SUCCESS
  const attempts = env.repo.getSyncAttempts(parcelId);
  assert.strictEqual(attempts.length, 1);
  assert.strictEqual(attempts[0].status, 'SUCCESS');
  assert.strictEqual(attempts[0].data_changed, 1);

  env.worker.stop();
});

test('Fresh data returns without unnecessary external source call', async () => {
  const env = setupSyncEnvironment();
  const parcelId = 'OFFICIAL:KA-RTC-2026-NID-142-3A';

  // Seed baseline
  env.jobQueue.enqueue({
    parcelId,
    parcelParams: { officialId: 'KA-RTC-2026-NID-142-3A' },
    sourceId: 'MOCK_CADASTRAL_SANDBOX'
  });
  await new Promise(r => setTimeout(r, 100));

  // Request parcel lookup
  const initialFetchCount = env.repo.getSyncAttempts(parcelId).length;
  const lookupResult = await env.syncService.resolveParcel({ officialId: 'KA-RTC-2026-NID-142-3A' });

  assert.strictEqual(lookupResult.found, true);
  assert.strictEqual(lookupResult.freshness.status, 'FRESH');
  assert.strictEqual(lookupResult.freshness.isFresh, true);

  // Sync attempts count must not increase because it is fresh
  const afterFetchCount = env.repo.getSyncAttempts(parcelId).length;
  assert.strictEqual(afterFetchCount, initialFetchCount, 'Fresh record must not trigger external fetch.');

  env.worker.stop();
});

test('Failed refresh preserves previous valid stored data', async () => {
  const env = setupSyncEnvironment();
  const parcelId = 'OFFICIAL:KA-RTC-2026-NID-142-3A';

  // 1. Establish valid baseline
  env.jobQueue.enqueue({
    parcelId,
    parcelParams: { officialId: 'KA-RTC-2026-NID-142-3A' },
    sourceId: 'MOCK_CADASTRAL_SANDBOX'
  });
  await new Promise(r => setTimeout(r, 100));

  const originalRecord = env.repo.getLatestRecord(parcelId);
  assert.ok(originalRecord);
  const originalVersionId = originalRecord.latestVersion.id;

  // 2. Set adapter to simulate remote gateway outage (503 / SOURCE_UNAVAILABLE)
  env.mockAdapter.setFailureMode('SOURCE_UNAVAILABLE');

  // 3. Trigger manual refresh
  await env.syncService.requestRefresh(parcelId);
  await new Promise(r => setTimeout(r, 200));

  // 4. Assert previous valid data is untouched and NOT deleted or corrupted
  const currentRecord = env.repo.getLatestRecord(parcelId);
  assert.ok(currentRecord, 'Previous record must still exist.');
  assert.strictEqual(currentRecord.latestVersion.id, originalVersionId, 'Version must not be overwritten or corrupted.');

  // Check sync attempt logged the failure
  const attempts = env.repo.getSyncAttempts(parcelId);
  assert.strictEqual(attempts[0].status, 'FAILED');
  assert.strictEqual(attempts[0].error_category, 'SOURCE_UNAVAILABLE');

  env.worker.stop();
});

test('Source conflict records conflict without silently overwriting data', async () => {
  const env = setupSyncEnvironment();
  const parcelId = 'OFFICIAL:KA-RTC-2026-NID-142-3A';

  // Seed initial version from Source A (MOCK_CADASTRAL_SANDBOX)
  env.jobQueue.enqueue({
    parcelId,
    parcelParams: { officialId: 'KA-RTC-2026-NID-142-3A' },
    sourceId: 'MOCK_CADASTRAL_SANDBOX'
  });
  await new Promise(r => setTimeout(r, 100));

  // Record conflict
  const conflictId = env.repo.recordConflict({
    parcelId,
    sourceAId: 'KA_BHOOMI_CADASTRE',
    sourceBId: 'MOCK_CADASTRAL_SANDBOX',
    versionAId: null,
    versionBId: null,
    conflictDetails: {
      disputedField: 'owners',
      sourceA: 'Ramesh Gowda (100%)',
      sourceB: 'Suresh Gowda (100%)',
      reason: 'Cross-registry disagreement'
    }
  });

  assert.ok(conflictId);

  // Parcel status must be flagged as CONFLICT
  const parcel = env.repo.findParcelById(parcelId);
  assert.strictEqual(parcel.status, 'CONFLICT', 'Conflicting parcel must be flagged as CONFLICT status.');

  const conflicts = env.repo.getConflicts(parcelId);
  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].conflict_details.disputedField, 'owners');

  env.worker.stop();
});
