const EARTH_RADIUS_M = 6371008.8;
const METERS_PER_DEG = 111320;
const WGS84_A = 6378137;
const WGS84_F = 1 / 298.257223563;
const UTM_K0 = 0.9996;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function toDms(value, axis) {
  const hemisphere = axis === 'lat' ? (value < 0 ? 'S' : 'N') : value < 0 ? 'W' : 'E';
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return `${degrees}° ${String(minutes).padStart(2, '0')}' ${seconds.toFixed(2)}" ${hemisphere}`;
}

export function toUtm(lat, lng) {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const lambda0 = toRadians((zone - 1) * 6 - 180 + 3);
  const phi = toRadians(lat);
  const lambda = toRadians(lng);
  const e2 = WGS84_F * (2 - WGS84_F);
  const ep2 = e2 / (1 - e2);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const n = WGS84_A / Math.sqrt(1 - e2 * sinPhi ** 2);
  const t = Math.tan(phi) ** 2;
  const c = ep2 * cosPhi ** 2;
  const a = cosPhi * (lambda - lambda0);
  const e4 = e2 * e2;
  const e6 = e4 * e2;

  const meridian =
    WGS84_A *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi));

  let easting =
    UTM_K0 *
      n *
      (a +
        ((1 - t + c) * a ** 3) / 6 +
        ((5 - 18 * t + t * t + 72 * c - 58 * ep2) * a ** 5) / 120) +
    500000;

  let northing =
    UTM_K0 *
    (meridian +
      n *
        Math.tan(phi) *
        (a ** 2 / 2 +
          ((5 - t + 9 * c + 4 * c * c) * a ** 4) / 24 +
          ((61 - 58 * t + t * t + 600 * c - 330 * ep2) * a ** 6) / 720));

  if (lat < 0) northing += 10000000;

  const hemisphere = lat >= 0 ? 'N' : 'S';
  return {
    zone,
    hemisphere,
    easting,
    northing,
    label: `${zone}${hemisphere}  ${easting.toFixed(1)} E,  ${northing.toFixed(1)} N`
  };
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const digits = meters < 10000 ? 2 : 1;
  return `${(meters / 1000).toFixed(digits)} km`;
}

export function formatArea(sqMeters) {
  const acres = sqMeters / 4046.8564224;
  const hectares = sqMeters / 10000;
  const guntas = (acres - Math.floor(acres)) * 40;
  return {
    sqMeters: Math.round(sqMeters),
    hectares: hectares.toFixed(2),
    label: `${Math.floor(acres)} Acres ${Math.round(guntas)} Guntas (${hectares.toFixed(2)} ha)`
  };
}

function ringCentroid(ring) {
  const lat = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
  const lng = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
  return { lat, lng };
}

export function ringAreaSqMeters(ring) {
  if (!ring || ring.length < 3) return 0;
  const origin = ringCentroid(ring);
  const cosLat = Math.cos(toRadians(origin.lat));
  const projected = ring.map(([lat, lng]) => [
    (lng - origin.lng) * METERS_PER_DEG * cosLat,
    (lat - origin.lat) * METERS_PER_DEG
  ]);

  let sum = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const [x1, y1] = projected[index];
    const [x2, y2] = projected[(index + 1) % projected.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function ringPerimeterMeters(ring) {
  if (!ring || ring.length < 2) return 0;
  let total = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [lat1, lng1] = ring[index];
    const [lat2, lng2] = ring[(index + 1) % ring.length];
    total += haversineMeters(lat1, lng1, lat2, lng2);
  }
  return total;
}

export function pointInRing(lat, lng, ring) {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const latI = ring[index][0];
    const lngI = ring[index][1];
    const latJ = ring[previous][0];
    const lngJ = ring[previous][1];
    const crossesLatitude = latI > lat !== latJ > lat;
    const intersectLng = ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (crossesLatitude && lng < intersectLng) inside = !inside;
  }
  return inside;
}

export function pathLengthMeters(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversineMeters(points[index - 1][0], points[index - 1][1], points[index][0], points[index][1]);
  }
  return total;
}

/**
 * Builds a WGS84 ring around the parcel centroid.
 * The recorded Mojini sketch (0–100 drawing units) is scaled so its
 * geodesic area matches the RTC extent in square metres.
 */
export function buildParcelRing(parcel) {
  const lat = Number(parcel?.coordinates?.lat);
  const lng = Number(parcel?.coordinates?.lng);
  const shape = parcel?.polygonPoints;
  const targetArea = Number(parcel?.extent?.totalSqMeters);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !shape || shape.length < 3) {
    return null;
  }
  if (!Number.isFinite(targetArea) || targetArea <= 0) return null;

  const centerX = shape.reduce((sum, point) => sum + point.x, 0) / shape.length;
  const centerY = shape.reduce((sum, point) => sum + point.y, 0) / shape.length;
  const local = shape.map((point) => [point.x - centerX, -(point.y - centerY)]);

  let rawArea = 0;
  for (let index = 0; index < local.length; index += 1) {
    const [x1, y1] = local[index];
    const [x2, y2] = local[(index + 1) % local.length];
    rawArea += x1 * y2 - x2 * y1;
  }
  rawArea = Math.abs(rawArea) / 2;
  if (rawArea === 0) return null;

  const scale = Math.sqrt(targetArea / rawArea);
  const cosLat = Math.cos(toRadians(lat));

  return local.map(([eastUnits, northUnits]) => {
    const east = eastUnits * scale;
    const north = northUnits * scale;
    return [lat + north / METERS_PER_DEG, lng + east / (METERS_PER_DEG * cosLat)];
  });
}

export function describeParcel(parcel) {
  const ring = buildParcelRing(parcel);
  const lat = Number(parcel.coordinates.lat);
  const lng = Number(parcel.coordinates.lng);
  const area = ring ? ringAreaSqMeters(ring) : null;
  const perimeter = ring ? ringPerimeterMeters(ring) : null;

  return {
    ring,
    area,
    perimeter,
    utm: toUtm(lat, lng),
    latDms: toDms(lat, 'lat'),
    lngDms: toDms(lng, 'lng'),
    areaLabel: area ? formatArea(area).label : '—'
  };
}

export function rankParcels(origin, parcels) {
  const lat = Number(origin?.lat);
  const lng = Number(origin?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  return parcels
    .map((parcel) => {
      const parcelLat = Number(parcel.coordinates?.lat);
      const parcelLng = Number(parcel.coordinates?.lng);
      if (!Number.isFinite(parcelLat) || !Number.isFinite(parcelLng)) return null;
      const ring = buildParcelRing(parcel);
      return {
        parcel,
        ring,
        distanceMeters: haversineMeters(lat, lng, parcelLat, parcelLng),
        insideBoundary: ring ? pointInRing(lat, lng, ring) : false
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.insideBoundary !== right.insideBoundary) return left.insideBoundary ? -1 : 1;
      return left.distanceMeters - right.distanceMeters;
    });
}

export function parcelsToGeoJson(parcels) {
  return {
    type: 'FeatureCollection',
    name: 'project-green-cadastral-parcels',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
    },
    features: parcels
      .map((parcel) => {
        const ring = buildParcelRing(parcel);
        if (!ring) return null;
        const closed = [...ring.map(([lat, lng]) => [lng, lat]), [ring[0][1], ring[0][0]]];
        return {
          type: 'Feature',
          id: parcel.id,
          properties: {
            surveyNumber: parcel.surveyNumber,
            village: parcel.village,
            taluk: parcel.taluk,
            district: parcel.district,
            ownerName: parcel.ownerName,
            extentSqMeters: parcel.extent?.totalSqMeters,
            mojiniSurveyRef: parcel.mojiniSurveyRef
          },
          geometry: {
            type: 'Polygon',
            coordinates: [closed]
          }
        };
      })
      .filter(Boolean)
  };
}

export function parseCoordinatePair(value) {
  if (!value) return null;
  const parts = value
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
