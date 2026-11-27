// src/domain/freshness.js
// Evaluates data freshness, age, and generates user-facing warnings

const config = require('../config');

const FreshnessStatus = Object.freeze({
  FRESH: 'FRESH',
  STALE: 'STALE',
  UNKNOWN: 'UNKNOWN',
  REFRESH_IN_PROGRESS: 'REFRESH_IN_PROGRESS',
  REFRESH_FAILED: 'REFRESH_FAILED'
});

class FreshnessPolicy {
  /**
   * Calculates freshness metadata based on timestamps and synchronization status.
   *
   * @param {Object} params
   * @param {string|Date} [params.lastVerifiedAt] - When the data was last confirmed with the source
   * @param {string|Date} [params.sourceEffectiveAt] - Official timestamp when record took effect
   * @param {string|Date} [params.firstRetrievedAt] - When Project Green first retrieved this version
   * @param {boolean} [params.isHistorical] - Whether this version is superseded
   * @param {boolean} [params.isSyncing] - Whether a refresh job is currently running
   * @param {Object} [params.lastSyncAttempt] - Metadata on the most recent sync attempt
   * @param {string} [params.sourceType] - Type of data source (e.g. MOCK_ADAPTER)
   */
  static evaluate(params = {}) {
    const now = new Date();
    const isHistorical = Boolean(params.isHistorical);
    const isSyncing = Boolean(params.isSyncing);

    let status = FreshnessStatus.UNKNOWN;
    let ageHours = null;
    let verifiedAgeHours = null;
    let warning = null;

    if (params.lastVerifiedAt) {
      const verifiedDate = new Date(params.lastVerifiedAt);
      if (!isNaN(verifiedDate.getTime())) {
        const diffMs = Math.max(0, now.getTime() - verifiedDate.getTime());
        verifiedAgeHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        
        if (verifiedAgeHours <= config.freshness.freshThresholdHours) {
          status = FreshnessStatus.FRESH;
        } else {
          status = FreshnessStatus.STALE;
        }
      }
    }

    if (params.firstRetrievedAt) {
      const retrievedDate = new Date(params.firstRetrievedAt);
      if (!isNaN(retrievedDate.getTime())) {
        const diffMs = Math.max(0, now.getTime() - retrievedDate.getTime());
        ageHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      }
    }

    // Override status if synchronization is actively in progress or recently failed
    if (isSyncing) {
      status = FreshnessStatus.REFRESH_IN_PROGRESS;
    } else if (params.lastSyncAttempt && params.lastSyncAttempt.status === 'FAILED') {
      // Check if failure is recent (e.g. within 1 hour)
      const attemptDate = new Date(params.lastSyncAttempt.started_at);
      if (!isNaN(attemptDate.getTime()) && (now.getTime() - attemptDate.getTime()) < 3600000) {
        status = FreshnessStatus.REFRESH_FAILED;
      }
    }

    // Generate accurate, non-misleading user labels
    const warnings = [];

    if (isHistorical) {
      warnings.push('Historical record — this snapshot has been superseded by a newer verified record.');
    }

    if (status === FreshnessStatus.STALE) {
      const days = Math.floor(verifiedAgeHours / 24);
      warnings.push(`Last available record — not recently verified (verified ${days > 0 ? `${days} day(s)` : `${verifiedAgeHours} hour(s)`} ago).`);
    } else if (status === FreshnessStatus.REFRESH_FAILED) {
      warnings.push(`Refresh failed: ${params.lastSyncAttempt?.error_message || 'Source temporarily unreachable'}. Displaying previously stored information.`);
    } else if (status === FreshnessStatus.REFRESH_IN_PROGRESS) {
      warnings.push('A background refresh is currently in progress. Fresh data will be available shortly.');
    } else if (status === FreshnessStatus.UNKNOWN) {
      warnings.push('Record freshness is unverified with central cadastral authority.');
    }

    if (params.sourceType === 'MOCK_ADAPTER') {
      warnings.push('Synthetic test sandbox data — not official government land records.');
    }

    return {
      status,
      isFresh: status === FreshnessStatus.FRESH,
      isStale: status === FreshnessStatus.STALE,
      isHistorical,
      ageHours,
      verifiedAgeHours,
      lastVerifiedAt: params.lastVerifiedAt || null,
      sourceEffectiveAt: params.sourceEffectiveAt || null,
      firstRetrievedAt: params.firstRetrievedAt || null,
      warnings,
      primaryWarning: warnings.length > 0 ? warnings[0] : null,
      displayLabel: this.getDisplayLabel(status, params.lastVerifiedAt)
    };
  }

  static getDisplayLabel(status, lastVerifiedAt) {
    if (status === FreshnessStatus.FRESH) {
      return `Verified with source on ${lastVerifiedAt ? new Date(lastVerifiedAt).toLocaleDateString() : 'recent date'}`;
    }
    if (status === FreshnessStatus.STALE) {
      return 'Last available record — not recently verified';
    }
    if (status === FreshnessStatus.REFRESH_IN_PROGRESS) {
      return 'Refresh in progress';
    }
    if (status === FreshnessStatus.REFRESH_FAILED) {
      return 'Refresh failed — showing previously stored information';
    }
    return 'Unverified data';
  }
}

module.exports = {
  FreshnessStatus,
  FreshnessPolicy
};
