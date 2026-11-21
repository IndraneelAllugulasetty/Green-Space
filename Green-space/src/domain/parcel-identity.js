// src/domain/parcel-identity.js
// Handles stable parcel identity creation, normalization, and validation

class ParcelIdentity {
  /**
   * Sanitizes a geographic or administrative token without destroying valid characters.
   */
  static cleanToken(val, defaultValue = '') {
    if (val === null || val === undefined) return defaultValue;
    return String(val)
      .trim()
      .toUpperCase()
      .replace(/[\s\-_]+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');
  }

  /**
   * Cleans survey or subdivision number while preserving legal formatting:
   * e.g., '142/3A', '0042', '142-P1', '12/1+2'
   */
  static cleanSurveyNumber(val) {
    if (!val) return '';
    return String(val)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  /**
   * Validates minimum requirements to construct or identify a parcel.
   */
  static validate(params) {
    const errors = [];
    if (!params) {
      errors.push('Parcel parameters are required.');
      return { isValid: false, errors };
    }

    if (params.officialId) {
      // If official ID is supplied, it must be non-empty
      if (typeof params.officialId !== 'string' || params.officialId.trim().length === 0) {
        errors.push('Official ID must be a valid non-empty string.');
      }
    } else {
      // Must have geographic hierarchy and survey number
      if (!params.state) errors.push('State is required.');
      if (!params.district) errors.push('District is required.');
      if (!params.taluk) errors.push('Taluk is required.');
      if (!params.village) errors.push('Village is required.');
      if (!params.surveyNumber) errors.push('Survey number is required.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Constructs a deterministic, collision-safe internal parcel ID.
   * Format:
   *   If officialId exists: ULPIN:{OFFICIAL_ID} or BHOOMI:{OFFICIAL_ID}
   *   Otherwise composite: IN-{STATE}:{DISTRICT}:{TALUK}:{HOBLI}:{VILLAGE}:{SURVEY}:{HISSA}
   */
  static buildParcelId(params) {
    const validation = this.validate(params);
    if (!validation.isValid) {
      throw new Error(`Invalid parcel parameters: ${validation.errors.join('; ')}`);
    }

    if (params.officialId && params.officialId.trim().length > 0) {
      const cleanOfficial = params.officialId.trim().toUpperCase().replace(/[^A-Z0-9_\-\/]/g, '');
      return `OFFICIAL:${cleanOfficial}`;
    }

    const state = this.cleanToken(params.state);
    const district = this.cleanToken(params.district);
    const taluk = this.cleanToken(params.taluk);
    const hobli = this.cleanToken(params.hobli, 'NONE');
    const village = this.cleanToken(params.village);
    const survey = this.cleanSurveyNumber(params.surveyNumber);
    const hissa = this.cleanSurveyNumber(params.hissa || 'MAIN');

    return `IN-${state}:${district}:${taluk}:${hobli}:${village}:${survey}:${hissa}`;
  }

  /**
   * Returns normalized parcel identity attributes.
   */
  static normalizeHierarchy(params) {
    return {
      id: this.buildParcelId(params),
      officialId: params.officialId ? params.officialId.trim() : null,
      state: this.cleanToken(params.state),
      district: this.cleanToken(params.district),
      taluk: this.cleanToken(params.taluk),
      hobli: params.hobli ? this.cleanToken(params.hobli) : null,
      village: this.cleanToken(params.village),
      surveyNumber: this.cleanSurveyNumber(params.surveyNumber),
      hissa: params.hissa ? this.cleanSurveyNumber(params.hissa) : null,
    };
  }
}

module.exports = ParcelIdentity;
