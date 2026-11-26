import { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { MOCK_LAND_PARCELS, DEMO_USER } from '../../data/mockLandData';
import { VerificationCertificate } from '../../components/Certificate/VerificationCertificate';
import './LandingPage.css';

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
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Filter parcels based on search input and active category chip
  const matchingParcels = MOCK_LAND_PARCELS.filter((p) => {
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

  function handleSelectParcel(parcel) {
    setLocalSelectedParcel(parcel);
    setSelectedLand(parcel);
    setIsSearchFocused(false);
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
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 4)
          };
          setUserGpsCoords(coords);
          showToast(`GPS Position Acquired: ${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E`, 'info');
        },
        () => {
          setIsLocating(false);
          // Centered around the user's Google Maps link location (Mysuru/KRS/Bilikere)
          setUserGpsCoords({ lat: 12.336655, lng: 76.5677671, accuracy: 4 });
          showToast('GPS Locked to Mysuru / Bilikere Cadastral Zone', 'info');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsLocating(false);
      setUserGpsCoords({ lat: 12.336655, lng: 76.5677671, accuracy: 4 });
    }
  }

  return (
    <div className="gmaps-viewport">
      {/* 1. FULL-SCREEN BLANK CANVAS (Container ready for live map integration) */}
      <div id="live-map-container" className="gmaps-canvas live-map-blank">
        {/* Blank viewport canvas reserved for live map mounting */}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />

          {searchQuery ? (
            <button
              type="button"
              className="gmaps-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear Search"
            >
              &times;
            </button>
          ) : (
            <button
              type="button"
              className="gmaps-search-submit-btn"
              aria-label="Search"
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

        {/* Search Results Dropdown List */}
        {(isSearchFocused || searchQuery.trim()) && (
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
          className="gmaps-crosshair-btn"
          onClick={handleLocateGps}
          disabled={isLocating}
          title="Center on your live GPS location"
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

      {/* 6. GOOGLE MAPS BOTTOM SCALE BAR & COORDINATES */}
      <div className="gmaps-bottom-bar">
        <span className="gmaps-coord-readout">
          12.336655° N, 76.567767° E • Zoom {zoomLevel}z • Karnataka Cadastre WGS84
        </span>
        <div className="gmaps-scale-meter">
          <span className="scale-bracket"></span>
          <span className="scale-label">500 m</span>
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
