// src/api/controllers/parcel-controller.js
// Handles parcel lookup, freshness responses, version history, and manual refresh requests

const { FreshnessPolicy } = require('../../domain/freshness');

class ParcelController {
  constructor({ syncService, parcelRepository, jobQueue, cacheService }) {
    this.syncService = syncService;
    this.parcelRepo = parcelRepository;
    this.jobQueue = jobQueue;
    this.cacheService = cacheService;
  }

  async getParcel(req, res, { parcelId }) {
    try {
      const result = await this.syncService.resolveParcel({ parcelId });

      if (!result.found) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'PARCEL_NOT_FOUND',
          message: `Parcel '${parcelId}' was not found in the shared repository.`
        }));
        return;
      }

      // Structure user-facing response per Section 15
      const responsePayload = {
        parcel: result.parcel,
        latestVersion: {
          id: result.latestVersion.id,
          sequenceNumber: result.latestVersion.sequenceNumber,
          data: result.latestVersion.data,
          canonicalHash: result.latestVersion.canonicalHash,
          source: {
            id: result.latestVersion.sourceId,
            name: result.latestVersion.sourceName,
            type: result.latestVersion.sourceType,
            recordId: result.latestVersion.sourceRecordId
          },
          effectiveDate: result.latestVersion.sourceEffectiveAt,
          firstRetrievedDate: result.latestVersion.firstRetrievedAt,
          lastVerifiedDate: result.latestVersion.lastVerifiedAt,
          isLatestKnown: true,
          status: result.latestVersion.status
        },
        freshness: result.freshness,
        cacheSource: result.sourceOfData,
        retrievalTimestamp: new Date().toISOString()
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload, null, 2));
    } catch (err) {
      console.error('[API] getParcel error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  }

  async getParcelHistory(req, res, { parcelId }, url) {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

      const parcel = this.parcelRepo.findParcelById(parcelId);
      if (!parcel) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'PARCEL_NOT_FOUND',
          message: `Parcel '${parcelId}' was not found.`
        }));
        return;
      }

      const history = this.parcelRepo.getVersionHistory(parcelId, limit, offset);

      // Decorate versions with historical labels per Section 15
      const decoratedVersions = history.versions.map(v => {
        const isLatest = v.id === parcel.latestVersionId;
        const freshness = FreshnessPolicy.evaluate({
          lastVerifiedAt: v.lastVerifiedAt,
          sourceEffectiveAt: v.sourceEffectiveAt,
          firstRetrievedAt: v.firstRetrievedAt,
          isHistorical: !isLatest,
          sourceType: v.sourceType
        });

        return {
          id: v.id,
          sequenceNumber: v.sequenceNumber,
          isLatestKnown: isLatest,
          canonicalHash: v.canonicalHash,
          source: {
            id: v.sourceId,
            name: v.sourceName,
            type: v.sourceType,
            recordId: v.sourceRecordId
          },
          effectiveDate: v.sourceEffectiveAt,
          firstRetrievedDate: v.firstRetrievedAt,
          lastVerifiedDate: v.lastVerifiedAt,
          changeSummary: v.changeSummary,
          data: v.normalizedData,
          freshness
        };
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        parcelId,
        totalVersions: history.total,
        limit,
        offset,
        versions: decoratedVersions
      }, null, 2));
    } catch (err) {
      console.error('[API] getParcelHistory error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  }

  async requestRefresh(req, res, { parcelId }, url, body) {
    try {
      const result = await this.syncService.requestRefresh(parcelId, {
        sourceId: body?.sourceId,
        actor: 'USER_API'
      });

      if (!result.success) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'REFRESH_FAILED', message: result.error }));
        return;
      }

      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('[API] requestRefresh error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  }

  async lookupOrCreate(req, res, params, url, body) {
    try {
      if (!body) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'INVALID_INPUT', message: 'Request body is required.' }));
        return;
      }

      const result = await this.syncService.resolveParcel(body);

      if (result.found) {
        // Return existing parcel record
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'FOUND',
          parcel: result.parcel,
          latestVersion: result.latestVersion,
          freshness: result.freshness,
          sourceOfData: result.sourceOfData
        }, null, 2));
        return;
      }

      // If not found, dispatch initial registration/fetch to worker
      const enqueueResult = this.jobQueue.enqueue({
        parcelId: result.parcelId,
        parcelParams: body,
        sourceId: body.sourceId || 'MOCK_CADASTRAL_SANDBOX',
        triggerType: 'INITIAL_LOOKUP',
        priority: 10 // High priority for active user search
      });

      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'FETCH_DISPATCHED',
        parcelId: result.parcelId,
        jobId: enqueueResult.jobId,
        message: 'Parcel not found in local repository. Background fetch initiated from authorized data source.'
      }, null, 2));
    } catch (err) {
      console.error('[API] lookup error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  }
}

module.exports = ParcelController;
