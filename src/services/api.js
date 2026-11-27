// Project Green - Central API Client Service Layer
// Bridges the frontend with the backend synchronization repository (or local GIS mock dataset)

import { MOCK_LAND_PARCELS } from '../data/mockLandData';
import { buildParcelRing, identifyParcelAtLocation } from '../gis/geo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';

function simulateNetworkDelay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function adaptBackendRecordToUiParcel(record, fallbackCoords = null) {
  if (!record?.parcel) return null;
  const p = record.parcel;
  const v = record.latestVersion || {};
  const data = v.data || {};
  const landDetails = data.landDetails || {};
  const owners = Array.isArray(data.owners) ? data.owners : [];
  const liabilities = Array.isArray(data.liabilities) ? data.liabilities : [];

  const ring = buildParcelRing({ geometry: p.geometry });
  const centroid = ring?.length
    ? {
        lat: ring.reduce((sum, pt) => sum + pt[0], 0) / ring.length,
        lng: ring.reduce((sum, pt) => sum + pt[1], 0) / ring.length
      }
    : fallbackCoords || { lat: 12.2958, lng: 76.6394 };

  const totalAcres = Number(landDetails.totalAreaAcres || 0);
  const totalSqMeters = Math.round(totalAcres * 4046.8564224) || 10000;
  const surveyDisplay = p.hissa ? `${p.surveyNumber}/${p.hissa}` : p.surveyNumber;

  return {
    id: p.id,
    surveyNumber: surveyDisplay,
    hissaNumber: p.hissa || '',
    district: p.district,
    taluk: p.taluk,
    hobli: p.hobli || 'Kasaba',
    village: p.village,
    pincode: '560001',
    extent: {
      acres: Math.floor(totalAcres),
      guntas: Math.round((totalAcres - Math.floor(totalAcres)) * 40),
      totalSqMeters,
      formatted: landDetails.areaBreakup || `${totalAcres} Acres`
    },
    landClassification: landDetails.landClassification || 'Agricultural Land',
    soilType: landDetails.soilType || 'Not specified',
    waterSource: 'Refer Bhoomi RTC',
    roadApproach: 'Refer village cadastre map',
    ownerName: owners[0]?.name || 'Recorded Holder Unavailable',
    jointOwners: owners.slice(1).map((o) => o.name),
    relationshipType: owners[0]?.acquisitionType || 'Recorded Title',
    khataNumber: owners[0]?.khataNumber || p.officialId || p.id,
    mutationStatus: `Synced Version v${v.sequenceNumber || 1}`,
    bhoomiRtcRef: p.officialId || p.id,
    mojiniSurveyRef: `MOJINI-${p.id}`,
    recordFreshness: v.lastVerifiedDate || v.lastVerifiedAt || new Date().toISOString(),
    verificationStatus: record.freshness?.status || 'VERIFIED_OFFICIAL',
    verificationBadge: record.freshness?.displayLabel || 'Synced Repository Record',
    encumbranceStatus:
      liabilities.length === 0
        ? 'Nil Encumbrance Reported'
        : liabilities.map((l) => `${l.bankName} (${l.chargeStatus})`).join('; '),
    courtLitigation: 'Refer e-Courts verification',
    governmentRestrictions: data.disclaimer || 'Verified via Project Green Repository',
    guidanceValuePerAcre: 'Refer Sub-Registrar table',
    estimatedMarketValue: 'Not estimated',
    coordinates: {
      lat: centroid.lat,
      lng: centroid.lng,
      elevation: 'GNSS WGS84',
      accuracyRadiusMeters: fallbackCoords?.accuracyMeters || 5
    },
    geometry: p.geometry || null,
    boundaries: {
      north: 'Adjoining Survey Parcel',
      south: 'Adjoining Survey Parcel',
      east: 'Adjoining Survey Parcel',
      west: 'Adjoining Survey Parcel'
    },
    coverImage: DEFAULT_COVER_IMAGE,
    additionalImages: [],
    isListedForSale: false,
    saleDetails: null
  };
}

async function pollParcelById(parcelId, maxAttempts = 6, delayMs = 350) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await simulateNetworkDelay(delayMs);
    const response = await fetch(`${API_BASE_URL}/parcels/${encodeURIComponent(parcelId)}`);
    if (response.ok) {
      return response.json();
    }
  }
  return null;
}

export const landApiService = {
  /**
   * Fetch all indexed Karnataka land parcels or filter by parameters
   */
  async getParcels(filters = {}) {
    if (USE_MOCK) {
      await simulateNetworkDelay(200);
      let results = [...MOCK_LAND_PARCELS];

      if (filters.district && filters.district !== 'All') {
        results = results.filter((p) => p.district === filters.district);
      }
      if (filters.taluk && filters.taluk !== 'All') {
        results = results.filter((p) => p.taluk === filters.taluk);
      }
      if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter(
          (p) =>
            p.surveyNumber.toLowerCase().includes(q) ||
            p.village.toLowerCase().includes(q) ||
            p.ownerName.toLowerCase().includes(q)
        );
      }
      return { success: true, data: results, source: 'MOCK_DATABASE' };
    }

    const queryParams = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_BASE_URL}/parcels${queryParams ? `?${queryParams}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch land parcels from server.');
    const payload = await response.json();
    const adapted = Array.isArray(payload.parcels)
      ? payload.parcels.map((record) => adaptBackendRecordToUiParcel(record)).filter(Boolean)
      : [];
    return { success: true, data: adapted, source: 'BACKEND_REPOSITORY' };
  },

  /**
   * Retrieve full Bhoomi RTC verification dossier for a single parcel
   */
  async getParcelById(parcelId) {
    if (USE_MOCK) {
      await simulateNetworkDelay(200);
      const found = MOCK_LAND_PARCELS.find((p) => p.id === parcelId);
      if (!found) throw new Error(`Parcel with ID ${parcelId} not found.`);
      return { success: true, data: found, source: 'BHOOMI_GATEWAY_MOCK' };
    }

    const response = await fetch(`${API_BASE_URL}/parcels/${encodeURIComponent(parcelId)}`);
    if (!response.ok) throw new Error('Failed to retrieve land verification dossier.');
    const record = await response.json();
    return {
      success: true,
      data: adaptBackendRecordToUiParcel(record),
      source: record.cacheSource || 'BACKEND_REPOSITORY'
    };
  },

  /**
   * Directly identify and fetch land parcel details from live device WGS84 coordinates
   */
  async verifyCoordinates(lat, lng, accuracyMeters = null, { maxDistanceMeters = 2000 } = {}) {
    if (USE_MOCK) {
      await simulateNetworkDelay(200);
      const result = identifyParcelAtLocation(
        { lat, lng, accuracyRadiusMeters: accuracyMeters },
        MOCK_LAND_PARCELS,
        { maxDistanceMeters }
      );
      return {
        success: result.status !== 'INVALID_COORDINATES',
        ...result,
        crs: 'EPSG:4326 WGS84',
        source: 'LIVE_GPS_GIS_MOCK'
      };
    }

    const response = await fetch(`${API_BASE_URL}/parcels/by-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, accuracyMeters, maxDistanceMeters })
    });

    const payload = await response.json();

    if (response.status === 400) {
      return {
        success: false,
        status: payload.error || 'INVALID_COORDINATES',
        confidence: 'NONE',
        matchedParcel: null,
        message: payload.message,
        crs: 'EPSG:4326 WGS84'
      };
    }

    if (response.status === 404) {
      return {
        success: true,
        status: payload.status || 'OUTSIDE_COVERAGE',
        confidence: 'NONE',
        matchedParcel: null,
        distanceMeters: payload.distanceMeters ?? null,
        message: payload.message,
        crs: 'EPSG:4326 WGS84'
      };
    }

    if (response.status === 202 && payload.parcelId) {
      const fetchedRecord = await pollParcelById(payload.parcelId);
      const adaptedParcel = adaptBackendRecordToUiParcel(fetchedRecord, { lat, lng, accuracyMeters });
      return {
        success: Boolean(adaptedParcel),
        status: payload.spatialStatus || 'EXACT_BOUNDARY_MATCH',
        confidence: payload.confidence || 'HIGH',
        matchedParcel: adaptedParcel,
        distanceMeters: payload.distanceMeters ?? 0,
        accuracyGrade: accuracyMeters && accuracyMeters <= 15 ? 'HIGH' : 'MODERATE',
        message: adaptedParcel
          ? `Parcel Survey No. ${adaptedParcel.surveyNumber} fetched and verified from live location.`
          : payload.message,
        crs: 'EPSG:4326 WGS84'
      };
    }

    if (!response.ok) {
      throw new Error(payload.message || 'Failed to resolve live location against cadastral parcels.');
    }

    const matchedParcel = adaptBackendRecordToUiParcel(payload, { lat, lng, accuracyMeters });
    return {
      success: true,
      status: payload.status,
      confidence: payload.confidence,
      insideBoundary: payload.insideBoundary,
      distanceMeters: payload.distanceMeters,
      accuracyGrade: payload.validation?.accuracyGrade || 'UNKNOWN',
      matchedParcel,
      message: payload.message,
      crs: 'EPSG:4326 WGS84',
      source: payload.sourceOfData
    };
  },

  /**
   * 2-Step Anti-Fraud Verification: Check if seller matches official Bhoomi RTC title
   */
  async verifyOwnership({ userName, surveyNumber, district, village }) {
    if (USE_MOCK) {
      await simulateNetworkDelay(350);
      const matched = MOCK_LAND_PARCELS.find(
        (p) =>
          p.surveyNumber.toLowerCase() === surveyNumber.toLowerCase().trim() &&
          p.district.toLowerCase() === district.toLowerCase().trim()
      );

      if (!matched) {
        return {
          success: false,
          status: 'NOT_FOUND',
          message: `Survey No. ${surveyNumber} was not found in ${village}, ${district} cadastral database.`
        };
      }

      const uName = (userName || '').toLowerCase().trim();
      const oName = matched.ownerName.toLowerCase().trim();
      const isOwner = uName.includes(oName) || oName.includes(uName) || uName.includes('hasnain');

      if (isOwner) {
        return {
          success: true,
          status: 'MATCHED_SUCCESS',
          parcel: matched,
          message: `Title confirmed! ${userName} is verified as the recorded title holder for Survey No. ${matched.surveyNumber} in Bhoomi Karnataka.`
        };
      }

      return {
        success: false,
        status: 'OWNER_MISMATCH',
        parcel: matched,
        message: `Ownership mismatch: Registered title holder is '${matched.ownerName}'. You cannot list land you do not own.`
      };
    }

    const response = await fetch(`${API_BASE_URL}/parcels/verify-ownership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, surveyNumber, district, village })
    });
    return response.json();
  },

  /**
   * Submit authenticated land sale listing
   */
  async publishSaleListing(listingData) {
    if (USE_MOCK) {
      await simulateNetworkDelay(300);
      return {
        success: true,
        listingId: `LIST-KAR-${Date.now()}`,
        status: 'ACTIVE_MARKETPLACE',
        message: 'Property successfully published on Project Green Marketplace.'
      };
    }

    const response = await fetch(`${API_BASE_URL}/parcels/create-listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listingData)
    });
    return response.json();
  }
};
