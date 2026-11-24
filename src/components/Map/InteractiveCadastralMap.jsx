
import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Tooltip,
  ScaleControl,
  ZoomControl,
  useMap
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import './InteractiveCadastralMap.css';

const DEFAULT_CENTER = [12.2958, 76.6394];

function MapController({ selectedParcel, userCoordinates, parcels }) {
  const map = useMap();

  // Set the initial map view.
  useEffect(() => {
    const validParcels = parcels.filter(
      (parcel) =>
        Number.isFinite(Number(parcel.coordinates?.lat)) &&
        Number.isFinite(Number(parcel.coordinates?.lng))
    );

    if (validParcels.length > 1) {
      const bounds = validParcels.map((parcel) => [
        Number(parcel.coordinates.lat),
        Number(parcel.coordinates.lng)
      ]);

      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    } else if (validParcels.length === 1) {
      const coordinates = validParcels[0].coordinates;

      map.setView(
        [Number(coordinates.lat), Number(coordinates.lng)],
        13
      );
    }
  }, [map]);

  // Focus on the selected parcel.
  useEffect(() => {
    if (!selectedParcel?.coordinates) return;

    const { lat, lng } = selectedParcel.coordinates;

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      map.setView([Number(lat), Number(lng)], 16, {
        animate: true
      });
    }
  }, [map, selectedParcel?.id]);

  // Focus on the captured device GPS location.
  useEffect(() => {
    if (!userCoordinates) return;

    const { lat, lng } = userCoordinates;

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      map.setView([Number(lat), Number(lng)], 16, {
        animate: true
      });
    }
  }, [map, userCoordinates?.lat, userCoordinates?.lng]);

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
  isLocating = false
}) {
  const [validParcels, invalidParcels] = [
    parcels.filter(
      (parcel) =>
        Number.isFinite(Number(parcel.coordinates?.lat)) &&
        Number.isFinite(Number(parcel.coordinates?.lng))
    ),
    parcels.filter(
      (parcel) =>
        !Number.isFinite(Number(parcel.coordinates?.lat)) ||
        !Number.isFinite(Number(parcel.coordinates?.lng))
    )
  ];

const [mapLayer, setMapLayer] = useState('street');

  return (
    <div className="gis-map-card">
      {/* Map header */}
      <div className="gis-map-header">
        <div className="gis-map-title-wrap">
          <div className="gis-status-indicator">
            <span className="live-pulse" />
            <span className="gis-mode-text">
              GIS Cadastral Engine
            </span>
          </div>

          <span className="gis-crs-tag">
            EPSG:4326 (WGS84)
          </span>
        </div>

        <div className="gis-map-controls">
          <div className="layer-toggle-group">
            <button
              type="button"
              className={`layer-btn ${mapLayer === 'street' ? 'active' : ''}`}
              onClick={() => setMapLayer('street')}
            >
              Street Map
            </button>

            <button
              type="button"
              className={`layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
              onClick={() => setMapLayer('satellite')}
            >
              Satellite
            </button>
          </div>

          <span className="boundary-toggle-btn" title="Real cadastral boundary GeoJSON is not yet available">
            Boundaries: DATA NEEDED
          </span>
        </div>
      </div>

      {/* Actual Leaflet map */}
      <div className="gis-viewport">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          scrollWheelZoom={true}
          zoomControl={false}
          className="gis-leaflet-map"
        >
          {mapLayer === 'street' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          )}

          <ZoomControl position="topright" />
          <ScaleControl position="bottomleft" />

          <MapController
            selectedParcel={selectedParcel}
            userCoordinates={userCoordinates}
            parcels={validParcels}
          />

          <MapResetControl />

          {/* Parcel location markers */}
          {validParcels.map((parcel) => {
            const lat = Number(parcel.coordinates.lat);
            const lng = Number(parcel.coordinates.lng);

            const isSelected = selectedParcel?.id === parcel.id;

            return (
              <CircleMarker
                key={parcel.id}
                center={[lat, lng]}
                radius={isSelected ? 11 : 8}
                pathOptions={{
                  color: isSelected ? '#ffffff' : '#14532d',
                  fillColor: isSelected ? '#16a34a' : '#22c55e',
                  fillOpacity: 0.9,
                  weight: 3
                }}
                eventHandlers={{
                  click: () => onSelectParcel(parcel)
                }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  Survey No. {parcel.surveyNumber}
                </Tooltip>

                <Popup>
                  <div className="leaflet-parcel-popup">
                    <strong>
                      Survey No. {parcel.surveyNumber}
                    </strong>

                    <p>
                      {parcel.village}, {parcel.taluk}, {parcel.district}
                    </p>

                    <p>
                      Owner: {parcel.ownerName}
                    </p>

                    <p>
                      Extent: {parcel.extent.formatted}
                    </p>

                    <button
                      type="button"
                      onClick={() => onSelectParcel(parcel)}
                    >
                      Select Parcel
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* User GPS location */}
          {userCoordinates &&
            Number.isFinite(Number(userCoordinates.lat)) &&
            Number.isFinite(Number(userCoordinates.lng)) && (
              <>
                <Circle
                  center={[
                    Number(userCoordinates.lat),
                    Number(userCoordinates.lng)
                  ]}
                  radius={userCoordinates.accuracyRadiusMeters || 10}
                  pathOptions={{
                    color: '#2563eb',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                    weight: 2
                  }}
                />

                <CircleMarker
                  center={[
                    Number(userCoordinates.lat),
                    Number(userCoordinates.lng)
                  ]}
                  radius={7}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                    weight: 3
                  }}
                >
                  <Popup>
                    <strong>Your captured location</strong>
                    <p>
                      Latitude: {Number(userCoordinates.lat).toFixed(6)}
                    </p>
                    <p>
                      Longitude: {Number(userCoordinates.lng).toFixed(6)}
                    </p>
                    <p>
                      Accuracy: ±{userCoordinates.accuracyRadiusMeters || 'Unknown'} m
                    </p>
                  </Popup>

                  <Tooltip permanent direction="top">
                    You are here
                  </Tooltip>
                </CircleMarker>
              </>
            )}
        </MapContainer>

        {/* GPS loading indicator */}
        {isLocating && (
          <div className="gps-locating-overlay">
            <span className="locating-spinner" />
            <span>Obtaining device GPS location...</span>
          </div>
        )}

        {/* Selected parcel information */}
        {selectedParcel && (
          <div className="map-parcel-popup">
            <div className="popup-header">
              <div className="popup-badge">
                Selected Land Parcel
              </div>

              <span className="popup-survey">
                Survey No. {selectedParcel.surveyNumber}
              </span>
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
                <span className="popup-val">
                  {selectedParcel.extent.formatted}
                </span>
              </div>

              <div className="popup-row">
                <span className="popup-label">Owner:</span>
                <span className="popup-val">
                  {selectedParcel.ownerName}
                </span>
              </div>

              <div className="popup-row">
                <span className="popup-label">Status:</span>
                <span className="popup-val success-val">
                  {selectedParcel.verificationBadge}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map footer */}
      <div className="gis-map-footer">
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
          <span className="coord-label">ELEV:</span>
          <span className="coord-value">
            {selectedParcel?.coordinates?.elevation || '748m'}
          </span>
        </div>

        <div className="map-coord-item">
          <span className="coord-label">PARCELS:</span>
          <span className="coord-value">
            {validParcels.length} mapped
          </span>
        </div>
      </div>

      {invalidParcels.length > 0 && (
        <div className="map-data-warning">
          {invalidParcels.length} parcel(s) have no valid geographic coordinates
          and are not displayed on the map.
        </div>
      )}
    </div>
  );
}
