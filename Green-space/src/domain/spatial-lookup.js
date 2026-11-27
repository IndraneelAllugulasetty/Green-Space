// src/domain/spatial-lookup.js
// WGS84 coordinate validation, Haversine distance, and GeoJSON point-in-polygon matching

const EARTH_RADIUS_M = 6371008.8;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function validateCoordinates(lat, lng, accuracyMeters = null) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  const accuracy = accuracyMeters === null || accuracyMeters === undefined ? null : Number(accuracyMeters);

  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
    return { isValid: false, reason: 'Latitude and longitude must be finite numbers.' };
  }
  if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
    return { isValid: false, reason: 'Coordinates are outside valid WGS84 range.' };
  }
  if (Math.abs(numLat) < 0.0001 && Math.abs(numLng) < 0.0001) {
    return { isValid: false, reason: 'Invalid (0, 0) null-island coordinates.' };
  }

  let accuracyGrade = 'UNKNOWN';
  if (Number.isFinite(accuracy) && accuracy >= 0) {
    if (accuracy <= 15) accuracyGrade = 'HIGH';
    else if (accuracy <= 50) accuracyGrade = 'MODERATE';
    else accuracyGrade = 'LOW';
  }

  return {
    isValid: true,
    lat: numLat,
    lng: numLng,
    accuracyMeters: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
    accuracyGrade,
    reason: null
  };
}

function extractOuterRing(geometry) {
  if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) {
    return null;
  }
  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;
  return ring;
}

function pointInGeoJsonRing(lat, lng, ring) {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const lngI = Number(ring[i][0]);
    const latI = Number(ring[i][1]);
    const lngJ = Number(ring[j][0]);
    const latJ = Number(ring[j][1]);
    const crosses = latI > lat !== latJ > lat;
    const intersectLng = ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (crosses && lng < intersectLng) inside = !inside;
  }
  return inside;
}

function ringCentroid(ring) {
  const sum = ring.reduce(
    (acc, [lng, lat]) => {
      acc.lat += Number(lat);
      acc.lng += Number(lng);
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / ring.length,
    lng: sum.lng / ring.length
  };
}

function identifyParcelFromRecords({ lat, lng, accuracyMeters = null, maxDistanceMeters = 2000 }, parcels = []) {
  const validation = validateCoordinates(lat, lng, accuracyMeters);
  if (!validation.isValid) {
    return {
      status: 'INVALID_COORDINATES',
      confidence: 'NONE',
      matched: null,
      nearest: null,
      validation,
      message: validation.reason
    };
  }

  const ranked = parcels
    .map((parcel) => {
      const ring = extractOuterRing(parcel.geometry);
      if (!ring) return null;
      const centroid = ringCentroid(ring);
      const distanceMeters = haversineMeters(validation.lat, validation.lng, centroid.lat, centroid.lng);
      const insideBoundary = pointInGeoJsonRing(validation.lat, validation.lng, ring);
      return { parcel, distanceMeters, insideBoundary };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.insideBoundary !== b.insideBoundary) return a.insideBoundary ? -1 : 1;
      return a.distanceMeters - b.distanceMeters;
    });

  const top = ranked[0] || null;
  if (!top) {
    return {
      status: 'NO_PARCEL_FOUND',
      confidence: 'NONE',
      matched: null,
      nearest: null,
      validation,
      message: 'No geocoded parcels available in repository.'
    };
  }

  if (top.insideBoundary) {
    const lowAccuracy = validation.accuracyGrade === 'LOW';
    return {
      status: lowAccuracy ? 'APPROXIMATE_BOUNDARY_MATCH' : 'EXACT_BOUNDARY_MATCH',
      confidence: lowAccuracy ? 'LOW' : validation.accuracyGrade === 'MODERATE' ? 'MEDIUM' : 'HIGH',
      matched: top.parcel,
      nearest: top.parcel,
      distanceMeters: Math.round(top.distanceMeters * 10) / 10,
      insideBoundary: true,
      validation,
      message: lowAccuracy
        ? `Coordinate lies inside parcel boundary, but GPS accuracy (±${Math.round(validation.accuracyMeters)}m) is coarse.`
        : 'Coordinate matched inside parcel boundary.'
    };
  }

  if (top.distanceMeters <= maxDistanceMeters) {
    return {
      status: 'NEARBY_PARCEL',
      confidence: 'APPROXIMATE',
      matched: top.parcel,
      nearest: top.parcel,
      distanceMeters: Math.round(top.distanceMeters * 10) / 10,
      insideBoundary: false,
      validation,
      message: `Outside parcel polygon; nearest parcel is ${Math.round(top.distanceMeters)}m away.`
    };
  }

  return {
    status: 'OUTSIDE_COVERAGE',
    confidence: 'NONE',
    matched: null,
    nearest: top.parcel,
    distanceMeters: Math.round(top.distanceMeters * 10) / 10,
    insideBoundary: false,
    validation,
    message: `No parcel within ${maxDistanceMeters}m of supplied location.`
  };
}

module.exports = {
  haversineMeters,
  validateCoordinates,
  pointInGeoJsonRing,
  ringCentroid,
  identifyParcelFromRecords
};
