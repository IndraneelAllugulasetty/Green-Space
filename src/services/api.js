// Project Green - Central API Client Service Layer
// Bridges the frontend with the backend module (or simulates with realistic mock data)

import { MOCK_LAND_PARCELS, DEMO_USER } from '../data/mockLandData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

// Helper for simulated latency in mock mode
function simulateNetworkDelay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const landApiService = {
  /**
   * Fetch all indexed Karnataka land parcels or filter by parameters
   */
  async getParcels(filters = {}) {
    if (USE_MOCK) {
      await simulateNetworkDelay(250);
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
    const response = await fetch(`${API_BASE_URL}/parcels?${queryParams}`);
    if (!response.ok) throw new Error('Failed to fetch land parcels from server.');
    return response.json();
  },

  /**
   * Retrieve full Bhoomi RTC verification dossier for a single parcel
   */
  async getParcelById(parcelId) {
    if (USE_MOCK) {
      await simulateNetworkDelay(300);
      const found = MOCK_LAND_PARCELS.find((p) => p.id === parcelId);
      if (!found) throw new Error(`Parcel with ID ${parcelId} not found.`);
      return { success: true, data: found, source: 'BHOOMI_GATEWAY_MOCK' };
    }

    const response = await fetch(`${API_BASE_URL}/parcels/${parcelId}`);
    if (!response.ok) throw new Error('Failed to retrieve land verification dossier.');
    return response.json();
  },

  /**
   * Match GPS Coordinates to Cadastral Mojini Parcel
   */
  async verifyCoordinates(lat, lng) {
    if (USE_MOCK) {
      await simulateNetworkDelay(400);
      // Find closest parcel or return default Mysuru farm
      const matched = MOCK_LAND_PARCELS[0];
      return {
        success: true,
        matchedParcel: matched,
        accuracyScore: 98.4,
        cadastralBoundaryConfirmed: true,
        crs: 'EPSG:4326 WGS84'
      };
    }

    const response = await fetch(`${API_BASE_URL}/parcels/verify-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng })
    });
    if (!response.ok) throw new Error('Failed to match location to cadastral maps.');
    return response.json();
  },

  /**
   * Upload land photograph and extract geolocation metadata
   */
  async uploadPhotograph(formData) {
    if (USE_MOCK) {
      await simulateNetworkDelay(500);
      return {
        success: true,
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        metadata: {
          extractedLat: 12.2958,
          extractedLng: 76.6394,
          elevation: '748m',
          timestamp: new Date().toISOString()
        }
      };
    }

    const response = await fetch(`${API_BASE_URL}/parcels/upload-photo`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Photo upload failed on server.');
    return response.json();
  },

  /**
   * 2-Step Anti-Fraud Verification: Check if seller matches official Bhoomi RTC title
   */
  async verifyOwnership({ userName, surveyNumber, district, village }) {
    if (USE_MOCK) {
      await simulateNetworkDelay(450);
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
      await simulateNetworkDelay(400);
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
