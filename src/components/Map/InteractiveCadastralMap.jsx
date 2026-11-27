import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './InteractiveCadastralMap.css';

export function InteractiveCadastralMap({ 
  parcels = [], 
  selectedParcel = null, 
  onSelectParcel = () => {},
  userCoordinates = null,
  isLocating = false
}) {
  const { t } = useLanguage();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapLayer, setMapLayer] = useState('cadastral'); // 'cadastral' | 'satellite'
  const [showBoundaries, setShowBoundaries] = useState(true);

  function handleZoomIn() {
    setZoomLevel((prev) => Math.min(prev + 0.25, 2.0));
  }

  function handleZoomOut() {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  }

  function handleReset() {
    setZoomLevel(1);
  }

  return (
    <div className="gis-map-card">
      {/* Top Map Control Bar */}
      <div className="gis-map-header">
        <div className="gis-map-title-wrap">
          <div className="gis-status-indicator">
            <span className="live-pulse" />
            <span className="gis-mode-text">GIS Cadastral Engine</span>
          </div>
          <span className="gis-crs-tag">EPSG:4326 (WGS84 / Karnataka Cadastre)</span>
        </div>

        <div className="gis-map-controls">
          <div className="layer-toggle-group">
            <button
              type="button"
              className={`layer-btn ${mapLayer === 'cadastral' ? 'active' : ''}`}
              onClick={() => setMapLayer('cadastral')}
              title={t('landing_layer_map')}
            >
              {t('landing_layer_map')}
            </button>
            <button
              type="button"
              className={`layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
              onClick={() => setMapLayer('satellite')}
              title={t('landing_layer_satellite')}
            >
              {t('landing_layer_satellite')}
            </button>
          </div>

          <button
            type="button"
            className={`boundary-toggle-btn ${showBoundaries ? 'active' : ''}`}
            onClick={() => setShowBoundaries(!showBoundaries)}
            title="Toggle Parcel Boundary Overlay"
          >
            Boundaries: {showBoundaries ? 'ON' : 'OFF'}
          </button>

          <div className="zoom-btn-group">
            <button type="button" onClick={handleZoomIn} title="Zoom In" aria-label="Zoom in">+</button>
            <button type="button" onClick={handleZoomOut} title="Zoom Out" aria-label="Zoom out">-</button>
            <button type="button" onClick={handleReset} title="Reset View" aria-label="Reset zoom">⟲</button>
          </div>
        </div>
      </div>

      {/* Map Viewport Area */}
      <div className={`gis-viewport ${mapLayer === 'satellite' ? 'satellite-mode' : 'cadastral-mode'}`}>
        <div 
          className="gis-pan-canvas"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Cadastral Grid Overlay */}
          <div className="cadastral-grid" />

          {/* Interactive SVG Cadastral Polygons */}
          <svg className="gis-cadastral-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {parcels.map((parcel) => {
              const isSelected = selectedParcel?.id === parcel.id;
              const pointsString = parcel.polygonPoints
                .map((pt) => `${pt.x},${pt.y}`)
                .join(' ');

              // Approximate center for survey number label
              const avgX = parcel.polygonPoints.reduce((acc, p) => acc + p.x, 0) / parcel.polygonPoints.length;
              const avgY = parcel.polygonPoints.reduce((acc, p) => acc + p.y, 0) / parcel.polygonPoints.length;

              return (
                <g 
                  key={parcel.id} 
                  className={`parcel-group ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectParcel(parcel)}
                >
                  <polygon
                    points={pointsString}
                    className={`parcel-polygon ${isSelected ? 'active-polygon' : ''}`}
                  />
                  {showBoundaries && (
                    <text
                      x={avgX}
                      y={avgY}
                      className="parcel-survey-label"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      Sy. {parcel.surveyNumber}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* User Live GPS Marker */}
          {userCoordinates && (
            <div 
              className="user-gps-marker"
              style={{
                top: `${((userCoordinates.lat - 12.0) / 1.5) * 60 + 20}%`,
                left: `${((userCoordinates.lng - 75.5) / 2.5) * 60 + 20}%`
              }}
              title={`Live Geolocation: ${userCoordinates.lat.toFixed(4)}, ${userCoordinates.lng.toFixed(4)}`}
            >
              <div className="gps-accuracy-circle" />
              <div className="gps-center-dot" />
              <div className="gps-pin-tooltip">
                <span className="gps-pin-title">You are here</span>
                <span className="gps-pin-acc">±{userCoordinates.accuracyRadiusMeters || 3.8}m</span>
              </div>
            </div>
          )}

          {isLocating && (
            <div className="gps-locating-overlay">
              <span className="locating-spinner" />
              <span>Querying GPS Satellites...</span>
            </div>
          )}
        </div>

        {/* Selected Parcel Quick Card on Map */}
        {selectedParcel && (
          <div className="map-parcel-popup">
            <div className="popup-header">
              <div className="popup-badge">✓ {t('details_lbl_verified')}</div>
              <span className="popup-survey">{t('common_survey_no')} {selectedParcel.surveyNumber}</span>
            </div>
            <div className="popup-details">
              <div className="popup-row">
                <span className="popup-label">{t('common_village')}:</span>
                <span className="popup-val">{selectedParcel.village}, {selectedParcel.taluk}, {selectedParcel.district}</span>
              </div>
              <div className="popup-row">
                <span className="popup-label">{t('common_extent')}:</span>
                <span className="popup-val">{selectedParcel.extent.formatted}</span>
              </div>
              <div className="popup-row">
                <span className="popup-label">{t('common_owner')}:</span>
                <span className="popup-val">{selectedParcel.ownerName}</span>
              </div>
              <div className="popup-row">
                <span className="popup-label">{t('common_status')}:</span>
                <span className="popup-val success-val">{selectedParcel.verificationBadge}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Coordinates & Scale Bar */}
      <div className="gis-map-footer">
        <div className="map-coord-item">
          <span className="coord-label">LAT:</span>
          <span className="coord-value">{selectedParcel?.coordinates.lat.toFixed(5) || '12.29580'}° N</span>
        </div>
        <div className="map-coord-item">
          <span className="coord-label">LNG:</span>
          <span className="coord-value">{selectedParcel?.coordinates.lng.toFixed(5) || '76.63940'}° E</span>
        </div>
        <div className="map-coord-item">
          <span className="coord-label">ELEV:</span>
          <span className="coord-value">{selectedParcel?.coordinates.elevation || '748m'}</span>
        </div>
        <div className="map-coord-item scale-item">
          <span className="map-scale-line"></span>
          <span className="coord-value">50 meters</span>
        </div>
      </div>
    </div>
  );
}
