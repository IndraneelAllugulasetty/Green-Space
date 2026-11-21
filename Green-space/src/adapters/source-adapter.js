// src/adapters/source-adapter.js
// Abstract Base Class / Interface for authorized land data sources

class SourceError extends Error {
  constructor(message, category = 'INTERNAL', statusCode = 500) {
    super(message);
    this.name = 'SourceError';
    this.category = category; // 'TIMEOUT', 'AUTH_ERROR', 'RATE_LIMITED', 'MALFORMED_DATA', 'SOURCE_UNAVAILABLE', 'NOT_FOUND'
    this.statusCode = statusCode;
  }
}

class DataSourceAdapter {
  constructor(config = {}) {
    this.id = config.id || 'ABSTRACT_SOURCE';
    this.name = config.name || 'Abstract Data Source';
    this.sourceType = config.sourceType || 'UNKNOWN';
    this.isEnabled = config.isEnabled ?? true;
  }

  /**
   * Fetches land parcel details from the external authority.
   *
   * @param {Object} query - Identification attributes (state, district, taluk, village, surveyNumber, hissa, officialId)
   * @returns {Promise<{
   *   sourceId: string,
   *   sourceRecordId: string,
   *   sourceEffectiveAt: string,
   *   data: Object,
   *   rawMetadata: Object
   * }>}
   */
  async fetchParcel(query) {
    throw new Error('fetchParcel() must be implemented by subclass.');
  }

  /**
   * Health check probe for the external integration.
   */
  async checkHealth() {
    throw new Error('checkHealth() must be implemented by subclass.');
  }
}

module.exports = {
  DataSourceAdapter,
  SourceError
};
