// tests/versioning.test.js
// Automated tests for parcel versioning, hashing, and immutability

const test = require('node:test');
const assert = require('node:assert');

const { DatabaseManager } = require('../src/db/database');
const { runMigrations } = require('../src/db/migrate');
const { seedDataSources } = require('../src/db/seed');
const ParcelRepository = require('../src/services/parcel-repository');
const VersioningService = require('../src/services/versioning-service');
const Normalizer = require('../src/domain/normalizer');
const { InMemorySharedCache } = require('../src/services/cache-service');

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

test('Deterministic Content Hashing - independent of key order', () => {
  const objA = {
    surveyNumber: '142',
    village: 'Nidavanda',
    owners: [{ name: 'Ramesh', share: 60 }, { name: 'Suresh', share: 40 }],
    landDetails: { areaAcres: 2.5, soil: 'Red Loam' }
  };

  // Same content with keys in completely reverse/scrambled order
  const objB = {
    landDetails: { soil: 'Red Loam', areaAcres: 2.5 },
    village: 'Nidavanda',
    owners: [{ share: 60, name: 'Ramesh' }, { name: 'Suresh', share: 40 }],
    surveyNumber: '142'
  };

  const hashA = Normalizer.calculateContentHash(objA);
  const hashB = Normalizer.calculateContentHash(objB);

  assert.strictEqual(hashA, hashB, 'Deterministic SHA-256 hashes must match regardless of object key order.');
});

test('Volatile Metadata Stripping - does not alter content hash', () => {
  const baseData = {
    surveyNumber: '142',
    village: 'Nidavanda',
    area: 2.5
  };

  const dataWithVolatile = {
    ...baseData,
    fetch_timestamp: '2026-11-21T18:00:00Z',
    request_id: 'req-xyz-999',
    sync_attempt_id: 'sync-12345',
    api_response_metadata: { node: 'edge-1' }
  };

  const hash1 = Normalizer.calculateContentHash(baseData);
  const hash2 = Normalizer.calculateContentHash(dataWithVolatile);

  assert.strictEqual(hash1, hash2, 'Volatile fields must be stripped and not change the content hash.');
});

test('New parcel creates initial version (sequence 1) and latest pointer', async () => {
  const { repo, versioningService } = setupTestEnvironment();

  const parcelParams = {
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '142',
    hissa: '3A',
    officialId: 'KA-RTC-TEST-142'
  };

  const fetchResult = {
    sourceId: 'MOCK_CADASTRAL_SANDBOX',
    sourceRecordId: 'KA-RTC-TEST-142',
    sourceEffectiveAt: '2026-01-01T00:00:00Z',
    geometry: { type: 'Point', coordinates: [77.123, 13.123] },
    data: {
      officialId: 'KA-RTC-TEST-142',
      surveyNumber: '142',
      areaAcres: 2.5,
      classification: 'Agricultural'
    }
  };

  const result = await versioningService.processFetchedData({
    parcelParams,
    fetchResult
  });

  assert.strictEqual(result.outcome, 'INITIAL_VERSION_CREATED');
  assert.strictEqual(result.sequenceNumber, 1);
  assert.strictEqual(result.isNewVersion, true);

  // Verify in repository
  const record = repo.getLatestRecord(result.parcelId);
  assert.ok(record);
  assert.strictEqual(record.parcel.id, result.parcelId);
  assert.strictEqual(record.latestVersion.sequenceNumber, 1);
  assert.strictEqual(record.latestVersion.id, result.versionId);
  assert.strictEqual(record.latestVersion.data.classification, 'Agricultural');
});

test('Identical fetched data does NOT create duplicate version', async () => {
  const { repo, versioningService } = setupTestEnvironment();

  const parcelParams = {
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '142',
    hissa: '3A',
    officialId: 'KA-RTC-TEST-142'
  };

  const fetchResult = {
    sourceId: 'MOCK_CADASTRAL_SANDBOX',
    sourceRecordId: 'KA-RTC-TEST-142',
    data: {
      officialId: 'KA-RTC-TEST-142',
      surveyNumber: '142',
      areaAcres: 2.5
    }
  };

  // Initial creation
  const res1 = await versioningService.processFetchedData({ parcelParams, fetchResult });
  assert.strictEqual(res1.sequenceNumber, 1);

  // Identical subsequent fetch
  const res2 = await versioningService.processFetchedData({ parcelParams, fetchResult });
  assert.strictEqual(res2.outcome, 'UNCHANGED_VERIFIED');
  assert.strictEqual(res2.isNewVersion, false);
  assert.strictEqual(res2.sequenceNumber, 1);
  assert.strictEqual(res2.versionId, res1.versionId);

  // Total versions in DB must strictly remain 1
  const history = repo.getVersionHistory(res1.parcelId);
  assert.strictEqual(history.total, 1, 'Duplicate identical fetch must not create extra versions.');
});

test('Meaningful data change creates a new version, preserving previous version intact', async () => {
  const { repo, versioningService } = setupTestEnvironment();

  const parcelParams = {
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '142',
    hissa: '3A',
    officialId: 'KA-RTC-TEST-142'
  };

  // Version 1
  const fetch1 = {
    sourceId: 'MOCK_CADASTRAL_SANDBOX',
    sourceRecordId: 'KA-RTC-TEST-142',
    data: { areaAcres: 2.5, classification: 'Agricultural', owners: ['Ramesh'] }
  };
  const res1 = await versioningService.processFetchedData({ parcelParams, fetchResult: fetch1 });

  // Version 2: Owner changed and classification converted
  const fetch2 = {
    sourceId: 'MOCK_CADASTRAL_SANDBOX',
    sourceRecordId: 'KA-RTC-TEST-142',
    data: { areaAcres: 2.5, classification: 'Converted Commercial', owners: ['Ramesh', 'New Buyer LLC'] }
  };
  const res2 = await versioningService.processFetchedData({ parcelParams, fetchResult: fetch2 });

  assert.strictEqual(res2.outcome, 'NEW_VERSION_CREATED');
  assert.strictEqual(res2.sequenceNumber, 2);
  assert.strictEqual(res2.isNewVersion, true);
  assert.notStrictEqual(res1.versionId, res2.versionId);

  // Check latest pointer
  const latest = repo.getLatestRecord(res1.parcelId);
  assert.strictEqual(latest.latestVersion.sequenceNumber, 2);
  assert.strictEqual(latest.latestVersion.data.classification, 'Converted Commercial');

  // Verify history contains both versions intact
  const history = repo.getVersionHistory(res1.parcelId);
  assert.strictEqual(history.total, 2);
  assert.strictEqual(history.versions[0].sequenceNumber, 2);
  assert.strictEqual(history.versions[1].sequenceNumber, 1);
  assert.strictEqual(history.versions[1].normalizedData.classification, 'Agricultural');
  assert.strictEqual(history.versions[1].status, 'SUPERSEDED');
});
