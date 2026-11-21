// src/domain/normalizer.js
// Normalization, volatile metadata stripping, and deterministic canonical SHA-256 hashing

const crypto = require('node:crypto');

// Volatile fields that must NEVER contribute to data versioning
const VOLATILE_FIELDS = new Set([
  'fetch_timestamp',
  'retrieved_at',
  'first_retrieved_at',
  'last_verified_at',
  'sync_attempt_id',
  'request_id',
  'api_response_metadata',
  'internal_processing_timestamps',
  'trace_id',
  'cached',
  '_cache_ttl',
  '_sync_status'
]);

class Normalizer {
  /**
   * Deep normalizes an arbitrary data structure:
   * - Trims string whitespace
   * - Converts NaN / undefined to null
   * - Ensures ISO-8601 formatting for recognizable Date objects or date strings
   * - Recursively processes objects and arrays
   */
  static normalizeValue(val) {
    if (val === null || val === undefined) {
      return null;
    }

    if (val instanceof Date) {
      return val.toISOString();
    }

    if (Array.isArray(val)) {
      return val.map(item => this.normalizeValue(item));
    }

    if (typeof val === 'object') {
      const normalizedObj = {};
      for (const [key, rawVal] of Object.entries(val)) {
        normalizedObj[key] = this.normalizeValue(rawVal);
      }
      return normalizedObj;
    }

    if (typeof val === 'string') {
      const trimmed = val.trim();
      // Check if it's an ISO date string and canonicalize
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(trimmed)) {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        }
      }
      return trimmed;
    }

    if (typeof val === 'number') {
      if (isNaN(val) || !isFinite(val)) return null;
      return val;
    }

    return val;
  }

  /**
   * Filters out volatile metadata and returns a canonical object with recursively sorted keys.
   */
  static toCanonicalForm(data) {
    if (data === null || data === undefined) {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.toCanonicalForm(item));
    }

    if (typeof data === 'object' && !(data instanceof Date)) {
      const sortedKeys = Object.keys(data)
        .filter(key => !VOLATILE_FIELDS.has(key))
        .sort();

      const canonicalObj = {};
      for (const key of sortedKeys) {
        canonicalObj[key] = this.toCanonicalForm(data[key]);
      }
      return canonicalObj;
    }

    return this.normalizeValue(data);
  }

  /**
   * Generates a deterministic canonical JSON string.
   */
  static canonicalize(data) {
    const canonical = this.toCanonicalForm(data);
    return JSON.stringify(canonical);
  }

  /**
   * Computes deterministic SHA-256 content hash of the canonical representation.
   */
  static calculateContentHash(data) {
    const canonicalJson = this.canonicalize(data);
    return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  }

  /**
   * Compares two normalized data objects.
   * Returns true if their canonical content hashes are identical.
   */
  static isContentEqual(dataA, dataB) {
    if (!dataA && !dataB) return true;
    if (!dataA || !dataB) return false;
    return this.calculateContentHash(dataA) === this.calculateContentHash(dataB);
  }
}

module.exports = Normalizer;
