// src/adapters/mock-cadastral-adapter.js
// Mock Cadastral Adapter for testing, sandboxing, and test verification
// DISCLAIMER: Generates synthetic test records. Never claims to be official government data.

const { DataSourceAdapter, SourceError } = require('./source-adapter');

class MockCadastralAdapter extends DataSourceAdapter {
  constructor(config = {}) {
    super({
      id: config.id || 'MOCK_CADASTRAL_SANDBOX',
      name: config.name || 'Project Green Cadastral Sandbox Adapter',
      sourceType: 'MOCK_ADAPTER',
      isEnabled: config.isEnabled ?? true
    });

    // In-memory simulated remote authority state
    this.simulatedParcels = new Map();
    this.failureMode = null; // 'TIMEOUT', 'SOURCE_UNAVAILABLE', 'RATE_LIMITED'
    this.latencyMs = config.latencyMs || 10;

    this.initializeDefaultData();
  }

  initializeDefaultData() {
    // Seed standard test parcels
    this.seedParcel({
      state: 'KARNATAKA',
      district: 'BANGALORE_RURAL',
      taluk: 'NELAMANGALA',
      hobli: 'SOMPURA',
      village: 'NIDAVANDA',
      surveyNumber: '142',
      hissa: '3A',
      officialId: 'KA-RTC-2026-NID-142-3A',
      effectiveDate: '2026-01-15T00:00:00.000Z',
      landDetails: {
        totalAreaAcres: 2.50,
        units: 'Acres-Guntas',
        areaBreakup: '2 Acres 20 Guntas',
        landClassification: 'Dry Agricultural (Kharab Class-A: 0-02)',
        soilType: 'Red Sandy Loam',
        annualAssessmentInr: 45.50
      },
      owners: [
        {
          name: 'Ramesh Gowda',
          relation: 'Son of Late Byrappa',
          khataNumber: 'KT-8842',
          sharePercentage: 60.00,
          acquisitionType: 'Inheritance (Pouthi Khata)'
        },
        {
          name: 'Suresh Gowda',
          relation: 'Son of Late Byrappa',
          khataNumber: 'KT-8843',
          sharePercentage: 40.00,
          acquisitionType: 'Inheritance (Pouthi Khata)'
        }
      ],
      liabilities: [
        {
          bankName: 'Canara Bank Nelamangala Branch',
          amountInr: 250000,
          chargeType: 'Crop Loan Hypothecation',
          chargeStatus: 'ACTIVE',
          registeredDate: '2024-06-10T00:00:00.000Z'
        }
      ],
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.2341, 13.2345],
            [77.2365, 13.2347],
            [77.2363, 13.2321],
            [77.2339, 13.2320],
            [77.2341, 13.2345]
          ]
        ]
      }
    });

    this.seedParcel({
      state: 'MAHARASHTRA',
      district: 'PUNE',
      taluk: 'HAVELI',
      hobli: 'WAGHOLI',
      village: 'KESNAND',
      surveyNumber: '78',
      hissa: '1B',
      officialId: 'MH-7-12-PUN-HAV-78-1B',
      effectiveDate: '2025-11-20T00:00:00.000Z',
      landDetails: {
        totalAreaAcres: 1.75,
        units: 'Hectare-Are',
        landClassification: 'Jirayat (Rainfed Agricultural)',
        soilType: 'Medium Black'
      },
      owners: [
        {
          name: 'Anand Patil',
          relation: 'Son of Dnyaneshwar Patil',
          khataNumber: '712-441',
          sharePercentage: 100.00,
          acquisitionType: 'Registered Sale Deed'
        }
      ],
      liabilities: [],
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [73.9812, 18.5741],
            [73.9845, 18.5745],
            [73.9842, 18.5719],
            [73.9810, 18.5718],
            [73.9812, 18.5741]
          ]
        ]
      }
    });
  }

  seedParcel(item) {
    const key = `${item.state}:${item.district}:${item.taluk}:${item.village}:${item.surveyNumber}:${item.hissa || 'MAIN'}`.toUpperCase();
    this.simulatedParcels.set(key, item);
    if (item.officialId) {
      this.simulatedParcels.set(`OFFICIAL:${item.officialId.toUpperCase()}`, item);
    }
  }

  /**
   * Helper to simulate mutations (e.g. sale deed, mutation, new owner) during test scenarios.
   */
  mutateParcel(lookupKey, updates = {}) {
    const key = lookupKey.toUpperCase();
    const existing = this.simulatedParcels.get(key);
    if (!existing) {
      throw new Error(`Cannot mutate non-existent test parcel: ${key}`);
    }

    const updated = {
      ...existing,
      ...updates,
      effectiveDate: updates.effectiveDate || new Date().toISOString()
    };

    this.simulatedParcels.set(key, updated);
    if (updated.officialId) {
      this.simulatedParcels.set(`OFFICIAL:${updated.officialId.toUpperCase()}`, updated);
    }
    return updated;
  }

  setFailureMode(mode) {
    this.failureMode = mode;
  }

  async fetchParcel(query) {
    if (this.latencyMs > 0) {
      await new Promise(r => setTimeout(r, this.latencyMs));
    }

    if (this.failureMode === 'TIMEOUT') {
      throw new SourceError('External cadastral gateway timed out after 10000ms', 'TIMEOUT', 504);
    }
    if (this.failureMode === 'SOURCE_UNAVAILABLE') {
      throw new SourceError('Remote revenue server returned HTTP 503 Service Unavailable', 'SOURCE_UNAVAILABLE', 503);
    }
    if (this.failureMode === 'RATE_LIMITED') {
      throw new SourceError('Remote source rate limit exceeded. Retry later.', 'RATE_LIMITED', 429);
    }

    let found = null;
    if (query.officialId) {
      found = this.simulatedParcels.get(`OFFICIAL:${query.officialId.toUpperCase()}`);
    }

    if (!found && query.state && query.district && query.taluk && query.village && query.surveyNumber) {
      const key = `${query.state}:${query.district}:${query.taluk}:${query.village}:${query.surveyNumber}:${query.hissa || 'MAIN'}`.toUpperCase();
      found = this.simulatedParcels.get(key);
    }

    if (!found) {
      throw new SourceError(`Land record not found in cadastral registry for query: ${JSON.stringify(query)}`, 'NOT_FOUND', 404);
    }

    // Return normalized format
    return {
      sourceId: this.id,
      sourceRecordId: found.officialId || `SR-${found.surveyNumber}-${found.hissa || '0'}`,
      sourceEffectiveAt: found.effectiveDate || new Date().toISOString(),
      geometry: found.geometry || null,
      data: {
        officialId: found.officialId,
        state: found.state,
        district: found.district,
        taluk: found.taluk,
        hobli: found.hobli,
        village: found.village,
        surveyNumber: found.surveyNumber,
        hissa: found.hissa,
        landDetails: found.landDetails,
        owners: found.owners,
        liabilities: found.liabilities,
        isSyntheticSandbox: true,
        disclaimer: 'SYNTHETIC_TEST_RECORD: Generated for Project Green testing. Not an official legal record.'
      },
      rawMetadata: {
        serverTime: new Date().toISOString(),
        gatewayNode: 'mock-cadastral-node-1'
      }
    };
  }

  async checkHealth() {
    return {
      sourceId: this.id,
      status: this.failureMode ? 'DEGRADED' : 'UP',
      latencyMs: this.latencyMs,
      details: 'Mock sandbox operational'
    };
  }
}

module.exports = MockCadastralAdapter;
