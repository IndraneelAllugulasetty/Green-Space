// src/api/controllers/parcel-controller.js
// Handles parcel lookup, freshness responses, version history, and manual refresh requests

const { FreshnessPolicy } = require('../../domain/freshness');

class ParcelController {
  constructor({ syncService, parcelRepository, jobQueue, cacheService, adapterRegistry = null }) {
    this.syncService = syncService;
    this.parcelRepo = parcelRepository;
    this.jobQueue = jobQueue;
    this.cacheService = cacheService;
    this.adapterRegistry = adapterRegistry;
  }

  async listParcels(req, res) {
    try {
      const parcels = this.parcelRepo.listActiveParcelsWithGeometry();
      const records = parcels
        .map((p) => this.parcelRepo.getLatestRecord(p.id))
        .filter(Boolean);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ total: records.length, parcels: records }, null, 2));
    } catch (err) {
      console.error('[API] listParcels error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
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

  async lookupByLocation(req, res, params, url, body) {
    try {
      if (!body || body.lat === undefined || body.lng === undefined) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'INVALID_INPUT',
          message: 'Latitude (lat) and longitude (lng) are required.'
        }));
        return;
      }

      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const accuracyMeters = body.accuracyMeters ?? null;
      const maxDistanceMeters = body.maxDistanceMeters ?? 2000;

      const repoResult = await this.syncService.resolveByLocation({
        lat,
        lng,
        accuracyMeters,
        maxDistanceMeters
      });

      if (repoResult.status === 'INVALID_COORDINATES') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'INVALID_COORDINATES',
          message: repoResult.message
        }));
        return;
      }

      if (repoResult.found) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: repoResult.status,
          confidence: repoResult.confidence,
          insideBoundary: repoResult.insideBoundary,
          distanceMeters: repoResult.distanceMeters,
          message: repoResult.message,
          validation: repoResult.validation,
          parcel: repoResult.parcel,
          latestVersion: repoResult.latestVersion,
          freshness: repoResult.freshness,
          sourceOfData: repoResult.sourceOfData
        }, null, 2));
        return;
      }

      // Check configured source adapter if not yet persisted in local repository
      const adapter = this.adapterRegistry?.getDefault?.();
      let remoteMatch = null;
      if (adapter && typeof adapter.findByCoordinates === 'function') {
        remoteMatch = adapter.findByCoordinates({
          lat,
          lng,
          accuracyMeters,
          maxDistanceMeters
        });

        if (remoteMatch.matched) {
          const parcelParams = {
            officialId: remoteMatch.matched.officialId,
            state: remoteMatch.matched.state,
            district: remoteMatch.matched.district,
            taluk: remoteMatch.matched.taluk,
            hobli: remoteMatch.matched.hobli,
            village: remoteMatch.matched.village,
            surveyNumber: remoteMatch.matched.surveyNumber,
            hissa: remoteMatch.matched.hissa
          };

          const resolved = await this.syncService.resolveParcel(parcelParams);
          if (resolved.found) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: remoteMatch.status,
              confidence: remoteMatch.confidence,
              insideBoundary: remoteMatch.insideBoundary,
              distanceMeters: remoteMatch.distanceMeters,
              message: remoteMatch.message,
              validation: remoteMatch.validation,
              parcel: resolved.parcel,
              latestVersion: resolved.latestVersion,
              freshness: resolved.freshness,
              sourceOfData: resolved.sourceOfData
            }, null, 2));
            return;
          }

          const enqueueResult = this.jobQueue.enqueue({
            parcelId: resolved.parcelId,
            parcelParams,
            sourceId: adapter.id,
            triggerType: 'INITIAL_LOOKUP',
            priority: 10
          });

          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'FETCH_DISPATCHED',
            spatialStatus: remoteMatch.status,
            confidence: remoteMatch.confidence,
            distanceMeters: remoteMatch.distanceMeters,
            parcelId: resolved.parcelId,
            jobId: enqueueResult.jobId,
            message: 'Parcel matched by live location. Background fetch initiated from cadastral source.'
          }, null, 2));
          return;
        }
      }

      const finalMiss = remoteMatch || repoResult;
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: finalMiss.status || 'OUTSIDE_COVERAGE',
        confidence: 'NONE',
        message: finalMiss.message || 'No matching parcel found for supplied location.',
        distanceMeters: finalMiss.distanceMeters ?? null
      }, null, 2));
    } catch (err) {
      console.error('[API] lookupByLocation error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  }
}

module.exports = ParcelController;
