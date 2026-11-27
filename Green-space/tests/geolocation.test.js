// tests/geolocation.test.js
// Automated tests for live-location coordinate validation and spatial parcel lookup

const test = require('node:test');
const assert = require('node:assert');

const { createApp } = require('../src/api/server');
const { DatabaseManager } = require('../src/db/database');
const { runMigrations } = require('../src/db/migrate');
const { seedDataSources } = require('../src/db/seed');
const { CacheService } = require('../src/services/cache-service');
const { JobQueue } = require('../src/worker/job-queue');
const { validateCoordinates, identifyParcelFromRecords } = require('../src/domain/spatial-lookup');

async function setupGeoTestServer() {
  const dbManager = new DatabaseManager({ path: ':memory:' });
  runMigrations(dbManager);
  seedDataSources(dbManager);

  const cacheService = new CacheService();
  const jobQueue = new JobQueue();
  const app = createApp({ dbManager, cacheService, jobQueue });
  app.syncWorker.start();

  await new Promise((resolve) => {
    app.server.listen(0, '127.0.0.1', resolve);
  });

  const address = app.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    app,
    baseUrl,
    close: async () => {
      app.syncWorker.stop();
      app.server.closeAllConnections?.();
      await new Promise((r) => app.server.close(r));
    }
  };
}

test('validateCoordinates rejects invalid and null-island coordinates and grades accuracy', () => {
  assert.strictEqual(validateCoordinates(0, 0).isValid, false);
  assert.strictEqual(validateCoordinates(95, 76).isValid, false);
  assert.strictEqual(validateCoordinates(12.2958, 76.6394, 4).accuracyGrade, 'HIGH');
  assert.strictEqual(validateCoordinates(12.2958, 76.6394, 30).accuracyGrade, 'MODERATE');
  assert.strictEqual(validateCoordinates(12.2958, 76.6394, 120).accuracyGrade, 'LOW');
});

test('identifyParcelFromRecords distinguishes exact vs coarse accuracy boundary hits', () => {
  const parcels = [
    {
      id: 'TEST-1',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [76.6388, 12.2964],
            [76.6400, 12.2964],
            [76.6400, 12.2952],
            [76.6388, 12.2952],
            [76.6388, 12.2964]
          ]
        ]
      }
    }
  ];

  const exact = identifyParcelFromRecords({ lat: 12.2958, lng: 76.6394, accuracyMeters: 4 }, parcels);
  assert.strictEqual(exact.status, 'EXACT_BOUNDARY_MATCH');
  assert.strictEqual(exact.insideBoundary, true);

  const coarse = identifyParcelFromRecords({ lat: 12.2958, lng: 76.6394, accuracyMeters: 85 }, parcels);
  assert.strictEqual(coarse.status, 'APPROXIMATE_BOUNDARY_MATCH');
  assert.strictEqual(coarse.confidence, 'LOW');
});

test('POST /api/v1/parcels/by-location - rejects invalid coordinates', async () => {
  const env = await setupGeoTestServer();
  try {
    const res = await fetch(`${env.baseUrl}/api/v1/parcels/by-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 0, lng: 0 })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'INVALID_COORDINATES');
  } finally {
    await env.close();
  }
});

test('POST /api/v1/parcels/by-location - dispatches fetch then resolves parcel directly from live GPS', async () => {
  const env = await setupGeoTestServer();
  try {
    // First call hits adapter spatial lookup and dispatches background sync
    const res = await fetch(`${env.baseUrl}/api/v1/parcels/by-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 12.2958, lng: 76.6394, accuracyMeters: 4 })
    });

    assert.strictEqual(res.status, 202);
    const dispatchBody = await res.json();
    assert.strictEqual(dispatchBody.status, 'FETCH_DISPATCHED');
    assert.strictEqual(dispatchBody.spatialStatus, 'EXACT_BOUNDARY_MATCH');

    await new Promise((r) => setTimeout(r, 150));

    // Second call resolves directly from SQLite repository + cache
    const res2 = await fetch(`${env.baseUrl}/api/v1/parcels/by-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 12.2958, lng: 76.6394, accuracyMeters: 4 })
    });

    assert.strictEqual(res2.status, 200);
    const foundBody = await res2.json();
    assert.strictEqual(foundBody.status, 'EXACT_BOUNDARY_MATCH');
    assert.strictEqual(foundBody.insideBoundary, true);
    assert.strictEqual(foundBody.parcel.surveyNumber, '84');
    assert.strictEqual(foundBody.freshness.status, 'FRESH');

    // Verify GET /api/v1/parcels returns persisted geocoded records
    const listRes = await fetch(`${env.baseUrl}/api/v1/parcels`);
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.strictEqual(listBody.total, 1);
    assert.strictEqual(listBody.parcels[0].parcel.surveyNumber, '84');
  } finally {
    await env.close();
  }
});

test('POST /api/v1/parcels/by-location - returns 404 when outside coverage', async () => {
  const env = await setupGeoTestServer();
  try {
    const res = await fetch(`${env.baseUrl}/api/v1/parcels/by-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 15.3647, lng: 75.124, accuracyMeters: 5 })
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.status, 'OUTSIDE_COVERAGE');
  } finally {
    await env.close();
  }
});
