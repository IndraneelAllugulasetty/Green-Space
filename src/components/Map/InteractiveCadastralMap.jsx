import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Polygon,
  Polyline,
  Popup,
  Tooltip,
  ScaleControl,
  ZoomControl,
  useMap,
  useMapEvents
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import './InteractiveCadastralMap.css';
import {
  buildParcelRing,
  formatArea,
  formatDistance,
  parseCoordinatePair,
  parcelsToGeoJson,
  pathLengthMeters,
  ringAreaSqMeters
} from '../../gis/geo';

const DEFAULT_CENTER = [12.336655, 76.5677671];

const TILES = {
  street: {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  },
  satellite: {
    attribution:
      'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  },
  terrain: {
    attribution:
      'Tiles &copy; Esri — Sources: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
  }
};

function MapController({
  selectedParcel,
  userCoordinates,
  parcels,
  flyTarget,
  externalZoom,
  fullCanvas
}) {
  const map = useMap();
  const fitted = useRef(false);
  const prevZoomRef = useRef(externalZoom);
  const lastFlyTokenRef = useRef(null);

  useEffect(() => {
    if (fitted.current || parcels.length === 0) return;

    if (fullCanvas) {
      map.setView(DEFAULT_CENTER, externalZoom || 13);
    } else if (parcels.length > 1) {
      const bounds = parcels.map((parcel) => [
        Number(parcel.coordinates.lat),
        Number(parcel.coordinates.lng)
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    } else {
      const coordinates = parcels[0].coordinates;
      map.setView([Number(coordinates.lat), Number(coordinates.lng)], 15);
    }
    fitted.current = true;
  }, [map, parcels, fullCanvas, externalZoom]);

  useEffect(() => {
    if (!flyTarget) return;
    lastFlyTokenRef.current = flyTarget.token || `${flyTarget.lat},${flyTarget.lng}`;
    map.setView([flyTarget.lat, flyTarget.lng], flyTarget.zoom || 16, { animate: true });
  }, [map, flyTarget]);

  useEffect(() => {
    if (flyTarget && lastFlyTokenRef.current) return;
    if (!selectedParcel?.coordinates) return;
    const { lat, lng } = selectedParcel.coordinates;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      map.setView([Number(lat), Number(lng)], Math.max(map.getZoom(), 16), { animate: true });
    }
  }, [map, selectedParcel?.id, flyTarget]);

  useEffect(() => {
    if (flyTarget && lastFlyTokenRef.current) return;
    if (!userCoordinates) return;
    const { lat, lng } = userCoordinates;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      map.setView([Number(lat), Number(lng)], Math.max(map.getZoom(), 16), { animate: true });
    }
  }, [map, userCoordinates?.lat, userCoordinates?.lng, userCoordinates?.timestamp, flyTarget]);

  useEffect(() => {
    if (typeof externalZoom !== 'number') return;
    if (prevZoomRef.current === externalZoom) return;
    prevZoomRef.current = externalZoom;
    if (map.getZoom() !== externalZoom) {
      map.setZoom(externalZoom);
    }
  }, [map, externalZoom]);

  return null;
}

function MapInteraction({
  measureActive,
  onCursor,
  onMeasurePoint,
  onMapClickLocation,
  onViewportChange
}) {
  const map = useMapEvents({
    mousemove(event) {
      onCursor({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
    mouseout() {
      onCursor(null);
    },
    zoomend() {
      const center = map.getCenter();
      onViewportChange?.({ lat: center.lat, lng: center.lng, zoom: map.getZoom() });
    },
    moveend() {
      const center = map.getCenter();
      onViewportChange?.({ lat: center.lat, lng: center.lng, zoom: map.getZoom() });
    },
    click(event) {
      if (measureActive) {
        onMeasurePoint([event.latlng.lat, event.latlng.lng]);
        return;
      }
      onMapClickLocation?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

function MapResetControl() {
  const map = useMap();

  return (
    <div className="leaflet-reset-control">
      <button
        type="button"
        onClick={() => map.setView(DEFAULT_CENTER, 12)}
        title="Reset map view"
      >
        Reset View
      </button>
    </div>
  );
}

export function InteractiveCadastralMap({
  parcels = [],
  selectedParcel = null,
  onSelectParcel = () => {},
  userCoordinates = null,
  isLocating = false,
  proximityRadiusMeters = null,
  compact = false,
  fullCanvas = false,
  externalLayer = null,
  externalZoom = null,
  externalFlyTarget = null,
  onZoomChange = null,
  onViewportChange = null,
  onCursorChange = null,
  onCoordinateJump = null,
  onMapClickLocation = null
}) {
  const [internalLayer, setInternalLayer] = useState('street');
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [measureActive, setMeasureActive] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [internalFlyTarget, setInternalFlyTarget] = useState(null);
  const [coordinateQuery, setCoordinateQuery] = useState('');
  const [coordinateError, setCoordinateError] = useState('');

  const mapLayer = externalLayer || internalLayer;
  const flyTarget = externalFlyTarget || internalFlyTarget;

  const validParcels = parcels.filter(
    (parcel) =>
      Number.isFinite(Number(parcel.coordinates?.lat)) &&
      Number.isFinite(Number(parcel.coordinates?.lng))
  );
  const invalidParcels = parcels.filter(
    (parcel) =>
      !Number.isFinite(Number(parcel.coordinates?.lat)) ||
      !Number.isFinite(Number(parcel.coordinates?.lng))
  );

  const parcelRings = useMemo(() => {
    const rings = new Map();
    validParcels.forEach((parcel) => {
      const ring = buildParcelRing(parcel);
      if (ring) rings.set(parcel.id, ring);
    });
    return rings;
  }, [parcels]);

  const measuredLength = pathLengthMeters(measurePoints);
  const tile = TILES[mapLayer] || TILES.street;

  function handleCoordinateJump(event) {
    event.preventDefault();
    const parsed = parseCoordinatePair(coordinateQuery);
    if (!parsed) {
      setCoordinateError('Enter latitude, longitude in WGS84. Example: 12.2958, 76.6394');
      return;
    }
    setCoordinateError('');
    setInternalFlyTarget({ ...parsed, token: Date.now() });
    onCoordinateJump?.({
      lat: parsed.lat,
      lng: parsed.lng,
      accuracyRadiusMeters: 8,
      elevation: 'GNSS lookup'
    });
  }

  function handleExportGeoJson() {
    const collection = parcelsToGeoJson(validParcels);
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'project-green-parcels.geojson';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleCursorUpdate(coords) {
    setCursor(coords);
    onCursorChange?.(coords);
  }

  function handleViewport(viewport) {
    if (typeof viewport?.zoom === 'number') {
      onZoomChange?.(viewport.zoom);
    }
    onViewportChange?.(viewport);
  }

  const rootClassName = fullCanvas
    ? 'gis-map-full-canvas'
    : `gis-map-card ${compact ? 'compact' : ''}`;

  return (
    <div className={rootClassName}>
      {!fullCanvas && (
        <>
          <div className="gis-map-header">
            <div className="gis-map-title-wrap">
              <div className="gis-status-indicator">
                <span className="live-pulse" />
                <span className="gis-mode-text">GIS Cadastral Engine</span>
              </div>
              <span className="gis-crs-tag">EPSG:4326 (WGS84)</span>
            </div>

            <div className="gis-map-controls">
              <div className="layer-toggle-group">
                {['street', 'satellite', 'terrain'].map((layer) => (
                  <button
                    key={layer}
                    type="button"
                    className={`layer-btn ${mapLayer === layer ? 'active' : ''}`}
                    onClick={() => setInternalLayer(layer)}
                  >
                    {layer === 'street' ? 'Street' : layer === 'satellite' ? 'Satellite' : 'Terrain'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={`boundary-toggle-btn ${showBoundaries ? 'active' : ''}`}
                onClick={() => setShowBoundaries((current) => !current)}
                title="Draw survey boundaries scaled to the recorded RTC extent"
              >
                Boundaries: {showBoundaries ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                className={`layer-btn measure-btn ${measureActive ? 'active' : ''}`}
                onClick={() => {
                  setMeasureActive((current) => !current);
                  setMeasurePoints([]);
                }}
              >
                {measureActive ? 'Stop Measure' : 'Measure'}
              </button>

              <button type="button" className="layer-btn export-btn" onClick={handleExportGeoJson}>
                Export GeoJSON
              </button>
            </div>
          </div>

          <form className="gis-coord-jump" onSubmit={handleCoordinateJump}>
            <label htmlFor="gis-coordinate-input">Jump to WGS84 coordinate</label>
            <input
              id="gis-coordinate-input"
              type="text"
              value={coordinateQuery}
              placeholder="12.2958, 76.6394"
              onChange={(event) => setCoordinateQuery(event.target.value)}
            />
            <button type="submit">Go</button>
            {coordinateError && <span className="coord-jump-error">{coordinateError}</span>}
          </form>
        </>
      )}

      <div className="gis-viewport">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={externalZoom || 12}
          scrollWheelZoom
          zoomControl={false}
          className="gis-leaflet-map"
        >
          <TileLayer attribution={tile.attribution} url={tile.url} maxZoom={19} />
          {!fullCanvas && <ZoomControl position="topright" />}
          {!fullCanvas && <ScaleControl position="bottomleft" imperial={false} />}

          <MapController
            selectedParcel={selectedParcel}
            userCoordinates={userCoordinates}
            parcels={validParcels}
            flyTarget={flyTarget}
            externalZoom={externalZoom}
            fullCanvas={fullCanvas}
          />
          <MapInteraction
            measureActive={measureActive}
            onCursor={handleCursorUpdate}
            onMeasurePoint={(point) => setMeasurePoints((current) => [...current, point])}
            onMapClickLocation={onMapClickLocation}
            onViewportChange={handleViewport}
          />
          {!fullCanvas && <MapResetControl />}

          {showBoundaries &&
            validParcels.map((parcel) => {
              const ring = parcelRings.get(parcel.id);
              if (!ring) return null;
              const isSelected = selectedParcel?.id === parcel.id;
              const area = formatArea(ringAreaSqMeters(ring));
              return (
                <Polygon
                  key={`ring-${parcel.id}`}
                  positions={ring}
                  pathOptions={{
                    color: isSelected ? '#14532d' : '#166534',
                    weight: isSelected ? 3 : 1.5,
                    fillColor: isSelected ? '#22c55e' : '#86efac',
                    fillOpacity: isSelected ? 0.42 : 0.24
                  }}
                  eventHandlers={{
                    click: () => {
                      if (!measureActive) onSelectParcel(parcel);
                    }
                  }}
                >
                  <Tooltip sticky>
                    Survey {parcel.surveyNumber} · {area.label}
                  </Tooltip>
                </Polygon>
              );
            })}

          {validParcels.map((parcel) => {
            const lat = Number(parcel.coordinates.lat);
            const lng = Number(parcel.coordinates.lng);
            const isSelected = selectedParcel?.id === parcel.id;

            return (
              <CircleMarker
                key={parcel.id}
                center={[lat, lng]}
                radius={isSelected ? 9 : 6}
                pathOptions={{
                  color: isSelected ? '#ffffff' : '#14532d',
                  fillColor: isSelected ? '#16a34a' : '#22c55e',
                  fillOpacity: 0.95,
                  weight: 2
                }}
                eventHandlers={{
                  click: () => {
                    if (!measureActive) onSelectParcel(parcel);
                  }
                }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  Survey No. {parcel.surveyNumber} ({parcel.village})
                </Tooltip>
                {!fullCanvas && (
                  <Popup>
                    <div className="leaflet-parcel-popup">
                      <strong>Survey No. {parcel.surveyNumber}</strong>
                      <p>
                        {parcel.village}, {parcel.taluk}, {parcel.district}
                      </p>
                      <p>Owner: {parcel.ownerName}</p>
                      <p>Extent: {parcel.extent.formatted}</p>
                      <p>
                        Centroid: {lat.toFixed(5)}° N, {lng.toFixed(5)}° E
                      </p>
                      <button type="button" onClick={() => onSelectParcel(parcel)}>
                        Select Parcel
                      </button>
                    </div>
                  </Popup>
                )}
              </CircleMarker>
            );
          })}

          {userCoordinates &&
            Number.isFinite(Number(userCoordinates.lat)) &&
            Number.isFinite(Number(userCoordinates.lng)) && (
              <>
                <Circle
                  center={[Number(userCoordinates.lat), Number(userCoordinates.lng)]}
                  radius={userCoordinates.accuracyRadiusMeters || userCoordinates.accuracy || 10}
                  pathOptions={{
                    color: '#2563eb',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.16,
                    weight: 2
                  }}
                />
                {Number.isFinite(Number(proximityRadiusMeters)) && proximityRadiusMeters > 0 && (
                  <Circle
                    center={[Number(userCoordinates.lat), Number(userCoordinates.lng)]}
                    radius={Number(proximityRadiusMeters)}
                    pathOptions={{
                      color: '#1d4ed8',
                      fillColor: '#60a5fa',
                      fillOpacity: 0.06,
                      weight: 1,
                      dashArray: '6 4'
                    }}
                  />
                )}
                <CircleMarker
                  center={[Number(userCoordinates.lat), Number(userCoordinates.lng)]}
                  radius={7}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                    weight: 3
                  }}
                >
                  <Popup>
                    <strong>{userCoordinates.isSimulated ? 'Simulated Field Location' : 'Live Device Location'}</strong>
                    <p>Latitude: {Number(userCoordinates.lat).toFixed(6)}</p>
                    <p>Longitude: {Number(userCoordinates.lng).toFixed(6)}</p>
                    <p>
                      Accuracy: ±
                      {Math.round(userCoordinates.accuracyRadiusMeters || userCoordinates.accuracy || 0) || 'Unknown'} m
                    </p>
                  </Popup>
                  <Tooltip permanent direction="top">
                    {userCoordinates.isSimulated ? 'Simulated GNSS' : 'Live GPS'}
                  </Tooltip>
                </CircleMarker>
              </>
            )}

          {measurePoints.length > 0 && (
            <>
              <Polyline
                positions={measurePoints}
                pathOptions={{ color: '#b45309', weight: 3, dashArray: '6 4' }}
              />
              {measurePoints.map((point, index) => (
                <CircleMarker
                  key={`measure-${index}`}
                  center={point}
                  radius={5}
                  pathOptions={{ color: '#ffffff', fillColor: '#b45309', fillOpacity: 1, weight: 2 }}
                />
              ))}
            </>
          )}
        </MapContainer>

        {isLocating && (
          <div className="gps-locating-overlay">
            <span className="locating-spinner" />
            <span>Acquiring live device GPS location...</span>
          </div>
        )}

        {measureActive && (
          <div className="measure-readout">
            <strong>Geodesic measure</strong>
            <span>
              {measurePoints.length < 2
                ? 'Click the map to drop vertices'
                : formatDistance(measuredLength)}
            </span>
            {measurePoints.length > 0 && (
              <button type="button" onClick={() => setMeasurePoints([])}>
                Clear
              </button>
            )}
          </div>
        )}

        {!fullCanvas && selectedParcel && (
          <div className="map-parcel-popup">
            <div className="popup-header">
              <div className="popup-badge">Selected Land Parcel</div>
              <span className="popup-survey">Survey No. {selectedParcel.surveyNumber}</span>
            </div>
            <div className="popup-details">
              <div className="popup-row">
                <span className="popup-label">Location:</span>
                <span className="popup-val">
                  {selectedParcel.village}, {selectedParcel.taluk}
                </span>
              </div>
              <div className="popup-row">
                <span className="popup-label">Extent:</span>
                <span className="popup-val">{selectedParcel.extent.formatted}</span>
              </div>
              <div className="popup-row">
                <span className="popup-label">Owner:</span>
                <span className="popup-val">{selectedParcel.ownerName}</span>
              </div>
              <div className="popup-row">
                <span className="popup-label">GIS area:</span>
                <span className="popup-val">
                  {parcelRings.get(selectedParcel.id)
                    ? formatArea(ringAreaSqMeters(parcelRings.get(selectedParcel.id))).label
                    : 'No boundary'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!fullCanvas && (
        <>
          <div className="gis-map-footer">
            <div className="map-coord-item">
              <span className="coord-label">CURSOR:</span>
              <span className="coord-value">
                {cursor ? `${cursor.lat.toFixed(5)}°, ${cursor.lng.toFixed(5)}°` : '—'}
              </span>
            </div>
            <div className="map-coord-item">
              <span className="coord-label">LAT:</span>
              <span className="coord-value">
                {selectedParcel?.coordinates?.lat?.toFixed(5) || '12.29580'}°
              </span>
            </div>
            <div className="map-coord-item">
              <span className="coord-label">LNG:</span>
              <span className="coord-value">
                {selectedParcel?.coordinates?.lng?.toFixed(5) || '76.63940'}°
              </span>
            </div>
            <div className="map-coord-item">
              <span className="coord-label">PARCELS:</span>
              <span className="coord-value">{validParcels.length} mapped</span>
            </div>
          </div>

          {invalidParcels.length > 0 && (
            <div className="map-data-warning">
              {invalidParcels.length} parcel(s) have no valid geographic coordinates and are not
              displayed on the map.
            </div>
          )}
        </>
      )}
    </div>
  );
}
