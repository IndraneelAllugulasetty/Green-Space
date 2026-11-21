// tests/concurrency.test.js
// Automated tests for race conditions, atomic transactions, and distributed locks

const test = require('node:test');
const assert = require('node:assert');

const { DatabaseManager } = require('../src/db/database');
const { runMigrations } = require('../src/db/migrate');
const { seedDataSources } = require('../src/db/seed');
const ParcelRepository = require('../src/services/parcel-repository');
const VersioningService = require('../src/services/versioning-service');
const { InMemorySharedCache } = require('../src/services/cache-service');
const { JobQueue } = require('../src/worker/job-queue');

function setupTestEnvironment() {
  const dbManager = new DatabaseManager({ path: ':memory:' });
  runMigrations(dbManager);
  seedDataSources(dbManager);
  const cache = new InMemorySharedCache();
  const repo = new ParcelRepository(dbManager);
  const versioningService = new VersioningService({
    parcelRepository: repo,
    cacheService: cache
  });
  return { dbManager, repo, versioningService, cache };
}

test('Simultaneous identical requests deduplicate without creating duplicate records', async () => {
  const queue = new JobQueue();
  queue.pause(); // Keep jobs in queue to inspect queue count
  const parcelId = 'IN-KA:BANGALORE_RURAL:NELAMANGALA:SOMPURA:NIDAVANDA:142:3A';

  // 10 concurrent requests enqueued simultaneously for the exact same parcel
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(queue.enqueue({
      parcelId,
      parcelParams: { surveyNumber: '142', village: 'Nidavanda' },
      triggerType: 'MANUAL_REFRESH'
    }));
  }

  // Exactly 1 job should be created, and 9 should be deduplicated
  const firstJobId = results[0].jobId;
  assert.strictEqual(results[0].isDuplicate, false);

  for (let i = 1; i < 10; i++) {
    assert.strictEqual(results[i].isDuplicate, true, `Request #${i + 1} must be detected as duplicate`);
    assert.strictEqual(results[i].jobId, firstJobId, 'Deduplicated requests must share the primary job ID');
  }

  assert.strictEqual(queue.queue.length, 1, 'Only 1 job must exist in the queue');
});

test('Atomic Transactions - rollback on failure leaves database uncorrupted', () => {
  const { dbManager, repo } = setupTestEnvironment();
  const parcelId = 'IN-KA:BANGALORE_RURAL:NELAMANGALA:SOMPURA:NIDAVANDA:142:3A';

  // Attempt a transaction that fails halfway
  assert.throws(() => {
    dbManager.transaction(db => {
      db.prepare(`
        INSERT INTO parcels (id, state, district, taluk, village, survey_number)
        VALUES (?, 'Karnataka', 'Bangalore Rural', 'Nelamangala', 'Nidavanda', '142')
      `).run(parcelId);

      // Intentionally trigger an error
      throw new Error('Simulated transaction failure');
    });
  }, /Simulated transaction failure/);

  // Assert parcel was rolled back and does NOT exist in database
  const p = repo.findParcelById(parcelId);
  assert.strictEqual(p, null, 'Uncommitted transaction must roll back cleanly.');
});

test('Lock Manager - lease expiration recovers abandoned locks safely', async () => {
  const cache = new InMemorySharedCache();
  const lockKey = 'lock:sync:test-parcel-999';

  // 1. Acquire lock with 1-second TTL
  const token1 = await cache.acquireLock(lockKey, 1);
  assert.ok(token1, 'First acquisition must succeed');

  // 2. Immediate second acquisition must fail (lock held)
  const token2 = await cache.acquireLock(lockKey, 1);
  assert.strictEqual(token2, null, 'Second acquisition while locked must return null');

  // 3. Wait for TTL to expire (1100ms)
  await new Promise(r => setTimeout(r, 1100));

  // 4. Acquisition after TTL expiry must succeed (automatic recovery)
  const token3 = await cache.acquireLock(lockKey, 1);
  assert.ok(token3, 'Acquisition after TTL expiry must succeed without deadlock');

  // Clean release
  const released = await cache.releaseLock(lockKey, token3);
  assert.strictEqual(released, true);
});

test('Idempotent versioning under concurrent processing', async () => {
  const { repo, versioningService } = setupTestEnvironment();

  const parcelParams = {
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '142',
    hissa: '3A',
    officialId: 'KA-RTC-CONCURRENCY-142'
  };

  const fetchResult = {
    sourceId: 'MOCK_CADASTRAL_SANDBOX',
    sourceRecordId: 'KA-RTC-CONCURRENCY-142',
    data: { area: 2.5, classification: 'Dry Agricultural' }
  };

  // Run 5 sequential processFetchedData calls with identical data
  for (let i = 0; i < 5; i++) {
    await versioningService.processFetchedData({ parcelParams, fetchResult });
  }

  const parcelId = 'OFFICIAL:KA-RTC-CONCURRENCY-142';
  const history = repo.getVersionHistory(parcelId);

  assert.strictEqual(history.total, 1, 'Multiple identical sync results must idempotently result in only 1 version.');
  assert.strictEqual(history.versions[0].sequenceNumber, 1);
});
