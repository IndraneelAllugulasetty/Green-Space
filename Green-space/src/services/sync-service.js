// src/services/sync-service.js
// Orchestrates lookups, freshness evaluations, and dispatches background synchronization

const { FreshnessPolicy } = require('../domain/freshness');
const ParcelIdentity = require('../domain/parcel-identity');

class SyncService {
  constructor({ parcelRepository, jobQueue, cacheService, defaultSourceId = 'MOCK_CADASTRAL_SANDBOX' }) {
    this.parcelRepo = parcelRepository;
    this.jobQueue = jobQueue;
    this.cacheService = cacheService;
    this.defaultSourceId = defaultSourceId;
  }

  /**
   * Resolves a parcel by ID, official ID, or geographic hierarchy.
   * Checks Cache -> Persistent Database -> Freshness Evaluation -> Background Refresh Trigger.
   */
  
async resolveParcel(query) {
  let parcelId = null;

  if (query.parcelId) {
    parcelId = query.parcelId;

  } else if (query.officialId) {
    const p = this.parcelRepo.findParcelByOfficialId(query.officialId);

    if (p) {
      parcelId = p.id;
    } else {
      const validation = ParcelIdentity.validate(query);

      if (validation.isValid) {
        parcelId = ParcelIdentity.buildParcelId(query);
      }
    }

  } else {
    const validation = ParcelIdentity.validate(query);

    if (validation.isValid) {
      parcelId = ParcelIdentity.buildParcelId(query);
    }
  }

  if (!parcelId) {
    return {
      found: false,
      error: 'Invalid or missing parcel identifiers.'
    };
  }

  // Keep the remaining existing implementation unchanged.


    if (!parcelId) {
      return { found: false, error: 'Invalid or missing parcel identifiers.' };
    }

    // 1. Check cache first
    let cached = await this.cacheService.getLatestRecord(parcelId);
    if (cached) {
      const isSyncing = this.jobQueue.isJobActiveForParcel(parcelId);
      const freshness = FreshnessPolicy.evaluate({
        lastVerifiedAt: cached.latestVersion.lastVerifiedAt,
        sourceEffectiveAt: cached.latestVersion.sourceEffectiveAt,
        firstRetrievedAt: cached.latestVersion.firstRetrievedAt,
        isSyncing,
        sourceType: cached.latestVersion.sourceType
      });

      return {
        found: true,
        sourceOfData: 'CACHE',
        parcel: cached.parcel,
        latestVersion: cached.latestVersion,
        freshness
      };
    }

    // 2. Cache miss: Read from persistent central database
    const record = this.parcelRepo.getLatestRecord(parcelId);
    if (!record) {
      return {
        found: false,
        parcelId,
        message: 'Parcel not found in central land repository.'
      };
    }

    // 3. Evaluate freshness
    const recentAttempts = this.parcelRepo.getSyncAttempts(parcelId, 1);
    const lastAttempt = recentAttempts.length > 0 ? recentAttempts[0] : null;
    const isSyncing = this.jobQueue.isJobActiveForParcel(parcelId);

    const freshness = FreshnessPolicy.evaluate({
      lastVerifiedAt: record.latestVersion.lastVerifiedAt,
      sourceEffectiveAt: record.latestVersion.sourceEffectiveAt,
      firstRetrievedAt: record.latestVersion.firstRetrievedAt,
      isSyncing,
      lastSyncAttempt: lastAttempt,
      sourceType: record.latestVersion.sourceType
    });

    // 4. Stale-on-access: If stale and not currently syncing, dispatch background refresh
    if (freshness.isStale && !isSyncing) {
      console.log(`[SYNC] Parcel ${parcelId} is stale (${freshness.verifiedAgeHours}h old). Scheduling background refresh...`);
      this.jobQueue.enqueue({
        parcelId,
        parcelParams: {
          parcelId,
          officialId: record.parcel.officialId,
          state: record.parcel.state,
          district: record.parcel.district,
          taluk: record.parcel.taluk,
          hobli: record.parcel.hobli,
          village: record.parcel.village,
          surveyNumber: record.parcel.surveyNumber,
          hissa: record.parcel.hissa
        },
        sourceId: record.latestVersion.sourceId || this.defaultSourceId,
        triggerType: 'STALE_REFRESH',
        priority: 1
      });
    }

    // 5. Populate cache with latest record from database
    await this.cacheService.setLatestRecord(parcelId, record);

    return {
      found: true,
      sourceOfData: 'DATABASE',
      parcel: record.parcel,
      latestVersion: record.latestVersion,
      freshness
    };
  }

  /**
   * Triggers an authorized manual refresh of a land record.
   */
  async requestRefresh(parcelId, { sourceId, actor = 'USER_API' } = {}) {
    const existing = this.parcelRepo.getLatestRecord(parcelId);
    if (!existing) {
      return {
        success: false,
        error: 'Parcel not found. Cannot refresh unmapped parcel.'
      };
    }

    const targetSourceId = sourceId || existing.latestVersion.sourceId || this.defaultSourceId;

    const enqueueResult = this.jobQueue.enqueue({
      parcelId,
      parcelParams: {
        parcelId,
        officialId: existing.parcel.officialId,
        state: existing.parcel.state,
        district: existing.parcel.district,
        taluk: existing.parcel.taluk,
        hobli: existing.parcel.hobli,
        village: existing.parcel.village,
        surveyNumber: existing.parcel.surveyNumber,
        hissa: existing.parcel.hissa
      },
      sourceId: targetSourceId,
      triggerType: 'MANUAL_REFRESH',
      priority: 5 // Higher priority for manual interactive user refreshes
    });

    return {
      success: true,
      parcelId,
      jobId: enqueueResult.jobId,
      status: enqueueResult.isDuplicate ? 'ALREADY_REFRESHING' : 'REFRESH_QUEUED',
      message: enqueueResult.isDuplicate 
        ? 'A refresh job for this parcel is already queued or in progress.'
        : 'Manual refresh dispatched to background synchronization worker.'
    };
  }

  /**
   * Retrieves synchronization status and history for a parcel.
   */
  getSyncStatus(parcelId) {
    const isSyncing = this.jobQueue.isJobActiveForParcel(parcelId);
    const attempts = this.parcelRepo.getSyncAttempts(parcelId, 10);
    const conflicts = this.parcelRepo.getConflicts(parcelId);

    return {
      parcelId,
      isSyncing,
      activeJobId: this.jobQueue.pendingParcelJobs.get(parcelId) || null,
      lastAttempt: attempts.length > 0 ? attempts[0] : null,
      recentAttempts: attempts,
      conflicts
    };
  }
}

module.exports = SyncService;
