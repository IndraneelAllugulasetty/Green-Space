// src/services/versioning-service.js
// Core business logic for normalization, hashing, deterministic versioning, and change detection

const Normalizer = require('../domain/normalizer');
const RecordDiffer = require('../domain/diff');
const ParcelIdentity = require('../domain/parcel-identity');

class VersioningService {
  constructor({ parcelRepository, cacheService }) {
    this.parcelRepo = parcelRepository;
    this.cacheService = cacheService;
  }

  /**
   * Processes freshly fetched land data from an authorized source adapter.
   * Enforces the 4-step versioning logic defined in Section 6.
   *
   * @param {Object} params
   * @param {Object} params.parcelParams - Hierarchy or official ID parameters
   * @param {Object} params.fetchResult - Standardized adapter output (data, sourceId, sourceEffectiveAt, geometry)
   * @param {string} [params.actor] - Triggering actor ('SYSTEM_WORKER', 'USER_API')
   */
  async processFetchedData({ parcelParams, fetchResult, actor = 'SYSTEM_WORKER' }) {
    // Step 1: Normalize incoming record
    const normalizedData = Normalizer.toCanonicalForm(fetchResult.data);
    
    // Step 2 & 3: Deterministic canonical content hash
    const canonicalHash = Normalizer.calculateContentHash(normalizedData);

    // Identify parcel
    const parcelId = ParcelIdentity.buildParcelId(parcelParams);
    const existingRecord = this.parcelRepo.getLatestRecord(parcelId);

    // Case A: New parcel discovered
    if (!existingRecord) {
      const normalizedHierarchy = ParcelIdentity.normalizeHierarchy({
        ...parcelParams,
        officialId: fetchResult.data.officialId || parcelParams.officialId
      });

      const initialResult = this.parcelRepo.createParcelWithInitialVersion({
        parcel: normalizedHierarchy,
        normalizedData,
        canonicalHash,
        sourceId: fetchResult.sourceId,
        sourceRecordId: fetchResult.sourceRecordId,
        sourceEffectiveAt: fetchResult.sourceEffectiveAt,
        geometry: fetchResult.geometry,
        actor
      });

      // Invalidate / Warm cache post-commit
      if (this.cacheService) {
        await this.cacheService.invalidate(parcelId);
      }

      return {
        outcome: 'INITIAL_VERSION_CREATED',
        isNewVersion: true,
        dataChanged: true,
        parcelId,
        versionId: initialResult.versionId,
        sequenceNumber: 1,
        canonicalHash,
        lastVerifiedAt: initialResult.lastVerifiedAt
      };
    }

    // Case B: Existing parcel - Compare canonical hash with latest stored version
    const latestVersion = existingRecord.latestVersion;

    if (latestVersion.canonicalHash === canonicalHash) {
      // Content is identical: Update last verified timestamp without creating duplicate row
      const nowIso = new Date().toISOString();
      this.parcelRepo.updateLastVerified(parcelId, latestVersion.id, nowIso, actor);

      // Invalidate cache so updated verification timestamp is reflected
      if (this.cacheService) {
        await this.cacheService.invalidate(parcelId);
      }

      return {
        outcome: 'UNCHANGED_VERIFIED',
        isNewVersion: false,
        dataChanged: false,
        parcelId,
        versionId: latestVersion.id,
        sequenceNumber: latestVersion.sequenceNumber,
        canonicalHash,
        lastVerifiedAt: nowIso
      };
    }

    // Case C: Meaningful data changed - Create new immutable version
    const diff = RecordDiffer.computeDiff(latestVersion.data, normalizedData);

    const newVersionResult = this.parcelRepo.addNewVersion({
      parcelId,
      normalizedData,
      canonicalHash,
      sourceId: fetchResult.sourceId,
      sourceRecordId: fetchResult.sourceRecordId,
      sourceEffectiveAt: fetchResult.sourceEffectiveAt,
      changeSummary: diff,
      geometry: fetchResult.geometry,
      actor
    });

    // Invalidate cache post-commit
    if (this.cacheService) {
      await this.cacheService.invalidate(parcelId);
    }

    return {
      outcome: 'NEW_VERSION_CREATED',
      isNewVersion: true,
      dataChanged: true,
      parcelId,
      versionId: newVersionResult.versionId,
      sequenceNumber: newVersionResult.sequenceNumber,
      canonicalHash,
      previousVersionId: latestVersion.id,
      changeSummary: diff,
      lastVerifiedAt: newVersionResult.lastVerifiedAt
    };
  }
}

module.exports = VersioningService;
