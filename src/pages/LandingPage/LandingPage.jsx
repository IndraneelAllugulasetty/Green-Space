import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { MOCK_LAND_PARCELS, DEMO_USER } from '../../data/mockLandData';
import { VerificationCertificate } from '../../components/Certificate/VerificationCertificate';
import { InteractiveCadastralMap } from '../../components/Map/InteractiveCadastralMap';
import { landApiService } from '../../services/api';
import { describeParcel, formatDistance, toDms, toUtm } from '../../gis/geo';
import './LandingPage.css';

const ZOOM_SCALE_LABELS = {
  8: '20 km',
  9: '10 km',
  10: '5 km',
  11: '2 km',
  12: '1 km',
  13: '500 m',
  14: '250 m',
  15: '100 m',
  16: '50 m',
  17: '25 m',
  18: '10 m'
};

export function LandingPage() {
  const { navigateTo, setSelectedLand, showToast } = useNavigation();
  const { user, isAuthenticated, login, logout } = useAuth();
  const { lang, toggleLanguage } = useLanguage();

  // Map state matching https://www.google.com/maps/@12.336655,76.5677671,13z
  const [zoomLevel, setZoomLevel] = useState(13);
  const [mapMode, setMapMode] = useState('terrain'); // 'terrain' | 'satellite'
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedParcel, setLocalSelectedParcel] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userGpsCoords, setUserGpsCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isWatchingGps, setIsWatchingGps] = useState(false);
  const [locationMatch, setLocationMatch] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [viewportCenter, setViewportCenter] = useState({ lat: 12.336655, lng: 76.5677671 });
  const [cursorCoords, setCursorCoords] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const watchIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Filter parcels based on search input and active category chip
  const matchingParcels = useMemo(() => {
    return MOCK_LAND_PARCELS.filter((p) => {
      if (activeCategory === 'agricultural' && !p.landClassification.includes('Agricultural')) {
        return false;
      }
      if (activeCategory === 'plantation' && !p.landClassification.includes('Plantation')) {
        return false;
      }
      if (activeCategory === 'commercial' && !p.landClassification.includes('Commercial')) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSurvey = p.surveyNumber.toLowerCase().includes(q);
        const matchVillage = p.village.toLowerCase().includes(q);
        const matchTaluk = p.taluk.toLowerCase().includes(q);
        const matchDistrict = p.district.toLowerCase().includes(q);
        const matchOwner = p.ownerName.toLowerCase().includes(q);
        return matchSurvey || matchVillage || matchTaluk || matchDistrict || matchOwner;
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

  const selectedParcelSpatial = useMemo(
    () => (selectedParcel?.coordinates ? describeParcel(selectedParcel) : null),
    [selectedParcel]
  );

  async function resolveLiveCoordinate(coords, { openSheet = true, silentToast = false } = {}) {
    setUserGpsCoords(coords);
    setGpsError(null);
    setZoomLevel(17);
    setFlyTarget({ lat: coords.lat, lng: coords.lng, zoom: 17, token: Date.now() });

    try {
      const result = await landApiService.verifyCoordinates(
        coords.lat,
        coords.lng,
        coords.accuracyRadiusMeters
      );
      setLocationMatch(result);

      if (result.matchedParcel && openSheet) {
        setLocalSelectedParcel(result.matchedParcel);
        setSelectedLand(result.matchedParcel);
      } else if (!result.matchedParcel && openSheet) {
        setLocalSelectedParcel(null);
      }

      if (!silentToast) {
        if (result.status === 'EXACT_BOUNDARY_MATCH') {
          showToast(
            `Parcel identified: Survey No. ${result.matchedParcel.surveyNumber} (${result.matchedParcel.village})`,
            'success'
          );
        } else {
          showToast(result.message, 'info');
        }
      }
    } catch (err) {
      showToast(err.message || 'Could not resolve land parcel for coordinates.', 'error');
    }
  }

  function handleSelectParcel(parcel) {
    setLocalSelectedParcel(parcel);
    setSelectedLand(parcel);
    setIsSearchFocused(false);
    if (parcel?.coordinates) {
      setZoomLevel(17);
      setFlyTarget({
        lat: Number(parcel.coordinates.lat),
        lng: Number(parcel.coordinates.lng),
        zoom: 17,
        token: Date.now()
      });
    }
  }

  function handleInspectFullDossier(parcel) {
    setSelectedLand(parcel);
    if (!isAuthenticated) {
      login({ email: DEMO_USER.email, password: 'ProjectGreen@2026' });
    }
    navigateTo('land-details', parcel);
  }

  function handleQuickDemoSign() {
    login({ email: DEMO_USER.email, password: 'ProjectGreen@2026' });
    showToast(`Signed in as ${DEMO_USER.name} (Demo Landholder)`, 'success');
  }

  function handleLocateGps() {
    if (!('geolocation' in navigator)) {
      setGpsError('Browser Geolocation API is unavailable. Use Simulate Field Location below.');
      showToast('Device geolocation is not supported in this browser.', 'error');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const accuracy = Math.round(pos.coords.accuracy || 10);
        resolveLiveCoordinate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyRadiusMeters: accuracy,
          timestamp: Date.now(),
          isSimulated: false
        });
      },
      (err) => {
        setIsLocating(false);
        setGpsError(
          err?.message ||
            'Location access denied or unavailable. You can simulate a Karnataka field position to test.'
        );
        showToast('Could not read device GPS. Use Simulate Field GPS or tap a parcel on the map.', 'error');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  function handleToggleWatchGps() {
    if (!('geolocation' in navigator)) {
      setGpsError('Browser Geolocation API is unavailable.');
      return;
    }

    if (isWatchingGps) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsWatchingGps(false);
      showToast('Live GPS tracking paused.', 'info');
      return;
    }

    setIsLocating(true);
    setGpsError(null);
    setIsWatchingGps(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setIsLocating(false);
        const accuracy = Math.round(pos.coords.accuracy || 10);
        resolveLiveCoordinate(
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyRadiusMeters: accuracy,
            timestamp: Date.now(),
            isSimulated: false
          },
          { openSheet: true, silentToast: true }
        );
      },
      (err) => {
        setIsLocating(false);
        setIsWatchingGps(false);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setGpsError(err?.message || 'Live GPS tracking failed.');
        showToast('Live GPS tracking stopped due to location error.', 'error');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }

  function handleSimulateFieldGps(parcel = MOCK_LAND_PARCELS[0]) {
    if (isWatchingGps && watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsWatchingGps(false);
    }
    resolveLiveCoordinate({
      lat: Number(parcel.coordinates.lat),
      lng: Number(parcel.coordinates.lng),
      accuracyRadiusMeters: parcel.coordinates.accuracyRadiusMeters || 4,
      timestamp: Date.now(),
      isSimulated: true
    });
  }

  async function handleMapTapLocation({ lat, lng }) {
    try {
      const result = await landApiService.verifyCoordinates(lat, lng, 5, {
        maxDistanceMeters: 500
      });
      setLocationMatch(result);
      if (result.matchedParcel) {
        setLocalSelectedParcel(result.matchedParcel);
        setSelectedLand(result.matchedParcel);
      }
    } catch {
      // Ignore transient map click failures
    }
  }

  const readoutCoords = cursorCoords || userGpsCoords || viewportCenter;
  const readoutUtm = useMemo(() => {
    if (!readoutCoords || !Number.isFinite(Number(readoutCoords.lat))) return null;
    return toUtm(Number(readoutCoords.lat), Number(readoutCoords.lng));
  }, [readoutCoords]);

  return (
    <div className="gmaps-viewport">
      {/* 1. FULL-SCREEN LIVE LEAFLET GIS CANVAS */}
      <div id="live-map-container" className="gmaps-canvas">
        <InteractiveCadastralMap
          fullCanvas
          parcels={matchingParcels}
          selectedParcel={selectedParcel}
          onSelectParcel={handleSelectParcel}
          userCoordinates={userGpsCoords}
          isLocating={isLocating}
          externalLayer={mapMode}
          externalZoom={zoomLevel}
          externalFlyTarget={flyTarget}
          onZoomChange={setZoomLevel}
          onViewportChange={(vp) => {
            if (vp && Number.isFinite(vp.lat) && Number.isFinite(vp.lng)) {
              setViewportCenter({ lat: vp.lat, lng: vp.lng });
            }
          }}
          onCursorChange={setCursorCoords}
          onMapClickLocation={handleMapTapLocation}
        />
      </div>

      {/* 2. GOOGLE MAPS FLOATING SEARCH CARD (TOP-LEFT) */}
      <div className="gmaps-search-box-card">
        <div className="search-bar-input-wrap">
          <button
            type="button"
            className="gmaps-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <input
            type="text"
            className="gmaps-search-input"
            placeholder={lang === 'en' ? 'Search Survey No, Village, or Taluk...' : 'ಸರ್ವೆ ನಂಬರ್, ಗ್ರಾಮ ಹುಡುಕಿ...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
          />

          {searchQuery ? (
            <button
              type="button"
              className="gmaps-clear-btn"
              onClick={() => {
                setSearchQuery('');
                setIsSearchFocused(false);
              }}
              aria-label="Clear Search"
            >
              &times;
            </button>
          ) : (
            <button
              type="button"
              className="gmaps-search-submit-btn"
              onClick={handleLocateGps}
              title="Fetch land info at my live device location"
              aria-label="Fetch Live Location"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Quick Filter Category Chips */}
        <div className="gmaps-filter-chips-row">
          <button
            type="button"
            className={`chip-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            🌾 {lang === 'en' ? 'All Lands' : 'ಎಲ್ಲಾ ಜಮೀನು'}
          </button>
          <button
            type="button"
            className={`chip-btn ${activeCategory === 'agricultural' ? 'active' : ''}`}
            onClick={() => setActiveCategory('agricultural')}
          >
            🚜 {lang === 'en' ? 'Agricultural' : 'ಕೃಷಿ ಜಮೀನು'}
          </button>
          <button
            type="button"
            className={`chip-btn ${activeCategory === 'plantation' ? 'active' : ''}`}
            onClick={() => setActiveCategory('plantation')}
          >
            ☕ {lang === 'en' ? 'Plantation' : 'ತೋಟಗಾರಿಕೆ'}
          </button>
          <button
            type="button"
            className={`chip-btn ${activeCategory === 'commercial' ? 'active' : ''}`}
            onClick={() => setActiveCategory('commercial')}
          >
            🏢 {lang === 'en' ? 'DC Converted' : 'ವಾಣಿಜ್ಯ ಪರಿವರ್ತಿತ'}
          </button>
        </div>

        {/* Live Device Location Action & Status Card */}
        <div className="gmaps-live-gps-card">
          <div className="live-gps-actions">
            <button
              type="button"
              className="live-gps-fetch-btn"
              onClick={handleLocateGps}
              disabled={isLocating}
            >
              📍 {isLocating ? 'Acquiring GNSS...' : 'Fetch Land at Live Location'}
            </button>
            <button
              type="button"
              className={`live-gps-watch-btn ${isWatchingGps ? 'active' : ''}`}
              onClick={handleToggleWatchGps}
              title="Continuously track device GPS movement"
            >
              {isWatchingGps ? '● Tracking' : 'Live Track'}
            </button>
          </div>

          {userGpsCoords && locationMatch && (
            <div className={`live-gps-status status-${locationMatch.status.toLowerCase()}`}>
              <div className="live-gps-coords-line">
                <span>
                  {userGpsCoords.isSimulated ? 'Simulated' : 'Device'} GNSS:{' '}
                  <strong>
                    {toDms(userGpsCoords.lat, 'lat')}, {toDms(userGpsCoords.lng, 'lng')}
                  </strong>
                </span>
                <span className="gps-acc-pill">
                  ±{userGpsCoords.accuracyRadiusMeters}m ({locationMatch.accuracyGrade})
                </span>
              </div>
              <p className="live-gps-match-msg">{locationMatch.message}</p>
            </div>
          )}

          {gpsError && (
            <div className="live-gps-error-box">
              <span>{gpsError}</span>
              <button
                type="button"
                className="simulate-gps-btn"
                onClick={() => handleSimulateFieldGps(MOCK_LAND_PARCELS[0])}
              >
                Simulate Field GPS (Mysuru 84/2A)
              </button>
            </div>
          )}

          {!gpsError && locationMatch?.status === 'OUTSIDE_COVERAGE' && (
            <div className="live-gps-fallback-row">
              <button
                type="button"
                className="simulate-gps-btn"
                onClick={() => handleSimulateFieldGps(MOCK_LAND_PARCELS[0])}
              >
                Test Demo Parcel (Mysuru 84/2A)
              </button>
            </div>
          )}
        </div>

        {/* Search Results Dropdown List */}
        {isSearchFocused && (
          <div className="gmaps-search-results-dropdown">
            <div className="dropdown-header">
              <span>{matchingParcels.length} Verified Land Parcels Found</span>
              <button type="button" className="close-dropdown-btn" onClick={() => setIsSearchFocused(false)}>
                Hide
              </button>
            </div>
            {matchingParcels.map((parcel) => (
              <div
                key={parcel.id}
                className="dropdown-result-item"
                onClick={() => handleSelectParcel(parcel)}
              >
                <div className="item-pin-icon">📍</div>
                <div className="item-text">
                  <div className="item-primary-line">
                    <strong>Survey No. {parcel.surveyNumber}</strong>
                    <span>({parcel.extent.formatted})</span>
                  </div>
                  <div className="item-secondary-line">
                    {parcel.village}, {parcel.taluk}, {parcel.district} • {parcel.ownerName}
                  </div>
                </div>
                <span className="item-verified-badge">✓ Bhoomi</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. GOOGLE MAPS LEFT SIDEBAR (PLACE DETAILS SHEET) */}
      {selectedParcel && (
        <aside className="gmaps-place-sheet" aria-label="Land Parcel Inspection Sheet">
          <button
            type="button"
            className="sheet-close-cross"
            onClick={() => setLocalSelectedParcel(null)}
            aria-label="Close details"
          >
            &times;
          </button>

          <div className="sheet-hero-media">
            <img src={selectedParcel.coverImage} alt={selectedParcel.surveyNumber} />
            <div className="sheet-media-badge">
              <span>✓ Official Karnataka Bhoomi RTC Verified</span>
            </div>
          </div>

          <div className="sheet-content-scroll">
            <div className="sheet-title-section">
              <h2 className="sheet-main-title">Survey No. {selectedParcel.surveyNumber}</h2>
              <p className="sheet-location-subtitle">
                {selectedParcel.village}, {selectedParcel.hobli} Hobli, {selectedParcel.taluk} Taluk, {selectedParcel.district}
              </p>
              <div className="sheet-rating-row">
                <span className="sheet-rating-star">★ 4.9</span>
                <span className="sheet-verified-pill">Bhoomi Cadastre Clean Title</span>
              </div>
            </div>

            {/* Google Maps Style Action Buttons Row */}
            <div className="sheet-action-pills-row">
              <button
                type="button"
                className="sheet-pill-btn primary"
                onClick={() => handleInspectFullDossier(selectedParcel)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Full Dossier
              </button>

              <button
                type="button"
                className="sheet-pill-btn"
                onClick={() => setShowCertificateModal(true)}
              >
                📜 Title Certificate
              </button>

              <button
                type="button"
                className="sheet-pill-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  showToast('Parcel share link copied to clipboard!', 'info');
                }}
              >
                🔗 Share
              </button>
            </div>

            {/* Key Information Table */}
            <div className="sheet-details-table">
              <div className="sheet-row">
                <span className="row-icon">👤</span>
                <div className="row-text">
                  <span className="row-title">Recorded Title Holder (RTC)</span>
                  <strong className="row-val highlight-green">{selectedParcel.ownerName}</strong>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">📐</span>
                <div className="row-text">
                  <span className="row-title">Total Measured Extent</span>
                  <span className="row-val">{selectedParcel.extent.formatted}</span>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">🛰️</span>
                <div className="row-text">
                  <span className="row-title">WGS84 / UTM GIS Telemetry</span>
                  <span className="row-val code-font">
                    {selectedParcel.coordinates.lat.toFixed(5)}° N, {selectedParcel.coordinates.lng.toFixed(5)}° E
                  </span>
                  {selectedParcelSpatial && (
                    <span className="row-title" style={{ marginTop: 2 }}>
                      UTM {selectedParcelSpatial.utm.label} • Perimeter {formatDistance(selectedParcelSpatial.perimeter)}
                    </span>
                  )}
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">🌱</span>
                <div className="row-text">
                  <span className="row-title">Land Classification</span>
                  <span className="row-val">{selectedParcel.landClassification}</span>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">📑</span>
                <div className="row-text">
                  <span className="row-title">Official Khata &amp; Mutation</span>
                  <span className="row-val code-font">{selectedParcel.khataNumber} • {selectedParcel.mutationStatus.split(' ')[0]}</span>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">🛡️</span>
                <div className="row-text">
                  <span className="row-title">Encumbrance &amp; Legal Clearance</span>
                  <span className="row-val success-font">{selectedParcel.encumbranceStatus}</span>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">🛣️</span>
                <div className="row-text">
                  <span className="row-title">Road Frontage &amp; Access</span>
                  <span className="row-val">{selectedParcel.roadApproach}</span>
                </div>
              </div>
            </div>

            <div className="sheet-footer-action">
              <button
                type="button"
                className="sheet-view-dossier-large"
                onClick={() => handleInspectFullDossier(selectedParcel)}
              >
                Inspect Official Bhoomi Dossier →
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 4. GOOGLE MAPS FLOATING CONTROLS (TOP-RIGHT) */}
      <div className="gmaps-top-right-controls">
        {/* Language Switcher Pill */}
        <button
          type="button"
          className="gmaps-ctrl-pill"
          onClick={toggleLanguage}
          title={lang === 'en' ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ' : 'Switch to English'}
        >
          <span>🌐</span>
          <span>{lang === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
        </button>

        {/* Sell Land Quick Trigger */}
        <button
          type="button"
          className="gmaps-ctrl-pill sell-pill"
          onClick={() => {
            if (!isAuthenticated) {
              login({ email: DEMO_USER.email, password: 'ProjectGreen@2026' });
            }
            navigateTo('upload-sale');
          }}
          title="Authenticate and list property for sale"
        >
          <span>🏷️</span>
          <span>{lang === 'en' ? 'Sell Land' : 'ಮಾರಾಟ'}</span>
        </button>

        {/* Sign In / User Profile */}
        {isAuthenticated && user ? (
          <div className="gmaps-profile-chip" title={user.email}>
            <div className="gmaps-avatar">{user.avatar || 'PG'}</div>
            <button
              type="button"
              className="gmaps-logout-text-btn"
              onClick={() => {
                logout();
                showToast('Signed out of Project Green session', 'info');
              }}
            >
              Exit
            </button>
          </div>
        ) : (
          <div className="gmaps-signin-btn-group">
            <button
              type="button"
              className="gmaps-quick-demo-btn"
              onClick={handleQuickDemoSign}
              title="One-click test account"
            >
              Demo Auto-Sign
            </button>
            <button
              type="button"
              className="gmaps-signin-btn"
              onClick={() => navigateTo('login')}
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* 5. GOOGLE MAPS FLOATING CONTROLS (BOTTOM-RIGHT) */}
      <div className="gmaps-bottom-right-controls">
        {/* Layer Mode Switcher (Terrain vs Satellite) */}
        <button
          type="button"
          className="gmaps-layer-thumbnail-btn"
          onClick={() => setMapMode(mapMode === 'terrain' ? 'satellite' : 'terrain')}
          title="Switch Map Layers (Satellite / Terrain)"
        >
          <div className={`thumbnail-inner ${mapMode === 'satellite' ? 'thumb-satellite' : 'thumb-terrain'}`}>
            <span className="layer-mode-title">{mapMode === 'satellite' ? 'Map' : 'Satellite'}</span>
          </div>
        </button>

        {/* Zoom In & Out Stack */}
        <div className="gmaps-zoom-stack">
          <button
            type="button"
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.min(z + 1, 18))}
            title="Zoom in"
          >
            +
          </button>
          <div className="zoom-divider" />
          <button
            type="button"
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.max(z - 1, 8))}
            title="Zoom out"
          >
            −
          </button>
        </div>

        {/* Locate GPS Crosshair */}
        <button
          type="button"
          className={`gmaps-crosshair-btn ${isWatchingGps ? 'tracking-active' : ''}`}
          onClick={handleLocateGps}
          disabled={isLocating}
          title="Center on your live GPS location & fetch parcel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="12" y1="2" x2="12" y2="5"></line>
            <line x1="12" y1="19" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="5" y2="12"></line>
            <line x1="19" y1="12" x2="22" y2="12"></line>
          </svg>
        </button>
      </div>

      {/* 6. GOOGLE MAPS BOTTOM SCALE BAR & LIVE COORDINATES */}
      <div className="gmaps-bottom-bar">
        <span className="gmaps-coord-readout">
          {Number(readoutCoords.lat).toFixed(6)}° N, {Number(readoutCoords.lng).toFixed(6)}° E
          {readoutUtm ? ` • UTM ${readoutUtm.zone}${readoutUtm.hemisphere}` : ''} • Zoom {zoomLevel}z •{' '}
          {matchingParcels.length} Parcels • WGS84
        </span>
        <div className="gmaps-scale-meter">
          <span className="scale-bracket"></span>
          <span className="scale-label">{ZOOM_SCALE_LABELS[zoomLevel] || '500 m'}</span>
        </div>
      </div>

      {/* 7. HAMBURGER SLIDE DRAWER (LEFT SIDE) */}
      {isMenuOpen && (
        <div className="gmaps-drawer-backdrop" onClick={() => setIsMenuOpen(false)}>
          <div className="gmaps-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-brand">
                <span className="brand-leaf-icon">🌱</span>
                <strong>PROJECT GREEN</strong>
              </div>
              <button type="button" className="drawer-close" onClick={() => setIsMenuOpen(false)}>
                &times;
              </button>
            </div>

            <div className="drawer-menu-links">
              <button
                type="button"
                className="drawer-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (!isAuthenticated) login({ email: DEMO_USER.email, password: 'ProjectGreen@2026' });
                  navigateTo('search');
                }}
              >
                📍 Search &amp; Verify Land Workspace
              </button>

              <button
                type="button"
                className="drawer-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (!isAuthenticated) login({ email: DEMO_USER.email, password: 'ProjectGreen@2026' });
                  navigateTo('upload-sale');
                }}
              >
                🏷️ Upload Property for Sale (2-Step Bhoomi Check)
              </button>

              <div className="drawer-divider" />

              <div className="drawer-info-block">
                <h5>Simulate Field GNSS Location</h5>
                <div className="drawer-sim-list">
                  {MOCK_LAND_PARCELS.map((parcel) => (
                    <button
                      key={parcel.id}
                      type="button"
                      className="drawer-sim-btn"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleSimulateFieldGps(parcel);
                      }}
                    >
                      Survey {parcel.surveyNumber} • {parcel.village}, {parcel.district}
                    </button>
                  ))}
                </div>
              </div>

              <div className="drawer-divider" />

              <div className="drawer-info-block">
                <h5>Integrated Karnataka Portals</h5>
                <ul>
                  <li>Bhoomi RTC Revenue Records</li>
                  <li>Mojini Cadastral Spatial Surveys</li>
                  <li>Kaveri-2 Encumbrance Index</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificateModal && selectedParcel && (
        <VerificationCertificate
          parcel={selectedParcel}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  );
}
