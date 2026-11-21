// tests/api.test.js
// Automated tests for REST API endpoints, validation, freshness metadata, and rate limiting

const test = require('node:test');
const assert = require('node:assert');

const { createApp } = require('../src/api/server');
const { DatabaseManager } = require('../src/db/database');
const { runMigrations } = require('../src/db/migrate');
const { seedDataSources } = require('../src/db/seed');

async function setupApiTestServer() {
  const dbManager = new DatabaseManager({ path: ':memory:' });
  runMigrations(dbManager);
  seedDataSources(dbManager);

  const app = createApp({ dbManager });
  app.syncWorker.start();

  await new Promise(resolve => {
    app.server.listen(0, '127.0.0.1', resolve);
  });

  const address = app.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    app,
    baseUrl,
    close: async () => {
      app.syncWorker.stop();
      await new Promise(r => app.server.close(r));
    }
  };
}

test('POST /api/v1/parcels/lookup - dispatches initial fetch for unmapped parcel', async () => {
  const env = await setupApiTestServer();

  const res = await fetch(`${env.baseUrl}/api/v1/parcels/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officialId: 'KA-RTC-2026-NID-142-3A',
      state: 'Karnataka',
      district: 'Bangalore Rural',
      taluk: 'Nelamangala',
      village: 'Nidavanda',
      surveyNumber: '142',
      hissa: '3A'
    })
  });

  assert.strictEqual(res.status, 202);
  const data = await res.json();
  assert.strictEqual(data.status, 'FETCH_DISPATCHED');
  assert.ok(data.parcelId);
  assert.ok(data.jobId);

  // Wait for worker to finish
  await new Promise(r => setTimeout(r, 150));

  // Second lookup should now find the parcel in repository
  const res2 = await fetch(`${env.baseUrl}/api/v1/parcels/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officialId: 'KA-RTC-2026-NID-142-3A'
    })
  });

  assert.strictEqual(res2.status, 200);
  const data2 = await res2.json();
  assert.strictEqual(data2.status, 'FOUND');
  assert.strictEqual(data2.parcel.officialId, 'KA-RTC-2026-NID-142-3A');
  assert.strictEqual(data2.latestVersion.sequenceNumber, 1);
  assert.strictEqual(data2.freshness.status, 'FRESH');

  await env.close();
});

test('GET /api/v1/parcels/:parcelId - returns 404 for unknown parcel', async () => {
  const env = await setupApiTestServer();

  const res = await fetch(`${env.baseUrl}/api/v1/parcels/UNKNOWN-PARCEL-ID`);
  assert.strictEqual(res.status, 404);
  const data = await res.json();
  assert.strictEqual(data.error, 'PARCEL_NOT_FOUND');

  await env.close();
});

test('GET /api/v1/parcels/:parcelId/history - returns paginated version history', async () => {
  const env = await setupApiTestServer();

  // Create parcel with version 1
  const parcelParams = {
    officialId: 'KA-RTC-HIST-1',
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '99',
    hissa: '1'
  };

  await env.app.versioningService.processFetchedData({
    parcelParams,
    fetchResult: {
      sourceId: 'MOCK_CADASTRAL_SANDBOX',
      data: { area: 1.0, owner: 'Person A' }
    }
  });

  // Create version 2
  await env.app.versioningService.processFetchedData({
    parcelParams,
    fetchResult: {
      sourceId: 'MOCK_CADASTRAL_SANDBOX',
      data: { area: 1.0, owner: 'Person B' }
    }
  });

  const parcelId = 'OFFICIAL:KA-RTC-HIST-1';

  // Request history with limit=1, offset=0
  const res = await fetch(`${env.baseUrl}/api/v1/parcels/${encodeURIComponent(parcelId)}/history?limit=1&offset=0`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();

  assert.strictEqual(body.totalVersions, 2);
  assert.strictEqual(body.versions.length, 1);
  assert.strictEqual(body.versions[0].sequenceNumber, 2);
  assert.strictEqual(body.versions[0].isLatestKnown, true);

  // Request second page: limit=1, offset=1
  const resPage2 = await fetch(`${env.baseUrl}/api/v1/parcels/${encodeURIComponent(parcelId)}/history?limit=1&offset=1`);
  const body2 = await resPage2.json();
  assert.strictEqual(body2.versions.length, 1);
  assert.strictEqual(body2.versions[0].sequenceNumber, 1);
  assert.strictEqual(body2.versions[0].isLatestKnown, false);
  assert.strictEqual(body2.versions[0].freshness.isHistorical, true);

  await env.close();
});

test('POST /api/v1/parcels/:parcelId/refresh - manual refresh and rate limiting', async () => {
  const env = await setupApiTestServer();

  const parcelParams = {
    officialId: 'KA-RTC-RATE-1',
    state: 'Karnataka',
    district: 'Bangalore Rural',
    taluk: 'Nelamangala',
    village: 'Nidavanda',
    surveyNumber: '50'
  };

  await env.app.versioningService.processFetchedData({
    parcelParams,
    fetchResult: {
      sourceId: 'MOCK_CADASTRAL_SANDBOX',
      data: { area: 4.0 }
    }
  });

  const parcelId = 'OFFICIAL:KA-RTC-RATE-1';

  // Fire manual refreshes up to limit (limit is 5/min)
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${env.baseUrl}/api/v1/parcels/${encodeURIComponent(parcelId)}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 202);
  }

  // 6th call should be blocked by rate limiter
  const blockedRes = await fetch(`${env.baseUrl}/api/v1/parcels/${encodeURIComponent(parcelId)}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  assert.strictEqual(blockedRes.status, 429, 'Excessive manual refreshes must be rate limited.');
  const blockedBody = await blockedRes.json();
  assert.strictEqual(blockedBody.error, 'RATE_LIMIT_EXCEEDED');

  await env.close();
});

test('GET /api/v1/sync/health - reports system observability', async () => {
  const env = await setupApiTestServer();

  const res = await fetch(`${env.baseUrl}/api/v1/sync/health`);
  assert.strictEqual(res.status, 200);
  const health = await res.json();

  assert.strictEqual(health.status, 'HEALTHY');
  assert.strictEqual(health.database.healthy, true);
  assert.ok(health.queue);
  assert.ok(health.cache);
  assert.ok(Array.isArray(health.dataSources));

  await env.close();
});
