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
  const { lang, setLanguage, languages, activeLanguage, t } = useLanguage();

  // Map state matching https://www.google.com/maps/@12.336655,76.5677671,13z
  const [zoomLevel, setZoomLevel] = useState(13);
  const [mapMode, setMapMode] = useState('terrain'); // 'terrain' | 'satellite'
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedParcel, setLocalSelectedParcel] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
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
          setUserGpsCoords({ lat: 12.336655, lng: 76.5677671, accuracy: 4 });
          showToast(t('landing_gps_locked'), 'info');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsLocating(false);
      setUserGpsCoords({ lat: 12.336655, lng: 76.5677671, accuracy: 4 });
    }
  }

  return (
    <div className="gmaps-viewport" onClick={() => isLangMenuOpen && setIsLangMenuOpen(false)}>
      {/* 1. FULL-SCREEN BLANK CANVAS (Container ready for friend's live map integration) */}
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
            placeholder={t('landing_search_placeholder')}
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
            🌾 {t('landing_chip_all')}
          </button>
          <button
            type="button"
            className={`chip-btn ${activeCategory === 'agricultural' ? 'active' : ''}`}
            onClick={() => setActiveCategory('agricultural')}
          >
            🚜 {t('landing_chip_agri')}
          </button>
          <button
            type="button"
            className={`chip-btn ${activeCategory === 'plantation' ? 'active' : ''}`}
            onClick={() => setActiveCategory('plantation')}
          >
            ☕ {t('landing_chip_plantation')}
          </button>
          <button
            type="button"
            className={`chip-btn ${activeCategory === 'commercial' ? 'active' : ''}`}
            onClick={() => setActiveCategory('commercial')}
          >
            🏢 {t('landing_chip_commercial')}
          </button>
        </div>

        {/* Search Results Dropdown List */}
        {(isSearchFocused || searchQuery.trim()) && (
          <div className="gmaps-search-results-dropdown">
            <div className="dropdown-header">
              <span>{matchingParcels.length} {t('landing_results_found')}</span>
              <button type="button" className="close-dropdown-btn" onClick={() => setIsSearchFocused(false)}>
                {t('landing_btn_hide')}
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
                <span className="sheet-verified-pill">{t('landing_rating_badge')}</span>
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
                {t('landing_btn_dossier')}
              </button>

              <button
                type="button"
                className="sheet-pill-btn"
                onClick={() => setShowCertificateModal(true)}
              >
                📜 {t('landing_btn_cert')}
              </button>

              <button
                type="button"
                className="sheet-pill-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  showToast(t('landing_share_copied'), 'info');
                }}
              >
                🔗 {t('landing_btn_share')}
              </button>
            </div>

            {/* Key Information Table */}
            <div className="sheet-details-table">
              <div className="sheet-row">
                <span className="row-icon">👤</span>
                <div className="row-text">
                  <span className="row-title">{t('landing_owner_label')}</span>
                  <strong className="row-val highlight-green">{selectedParcel.ownerName}</strong>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">📐</span>
                <div className="row-text">
                  <span className="row-title">{t('landing_extent_label')}</span>
                  <span className="row-val">{selectedParcel.extent.formatted}</span>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">🌱</span>
                <div className="row-text">
                  <span className="row-title">{t('landing_class_label')}</span>
                  <span className="row-val">{selectedParcel.landClassification}</span>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">📑</span>
                <div className="row-text">
                  <span className="row-title">{t('landing_khata_label')}</span>
                  <span className="row-val code-font">{selectedParcel.khataNumber} • {selectedParcel.mutationStatus.split(' ')[0]}</span>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">🛡️</span>
                <div className="row-text">
                  <span className="row-title">{t('landing_encumbrance_label')}</span>
                  <span className="row-val success-font">{selectedParcel.encumbranceStatus}</span>
                </div>
              </div>

              <div className="sheet-row">
                <span className="row-icon">🛣️</span>
                <div className="row-text">
                  <span className="row-title">{t('landing_road_label')}</span>
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
                {t('landing_inspect_action')}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 4. GOOGLE MAPS FLOATING CONTROLS (TOP-RIGHT) */}
      <div className="gmaps-top-right-controls">
        {/* Multi-Language Dropdown Selector */}
        <div className="gmaps-lang-dropdown-wrap" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="gmaps-ctrl-pill lang-pill"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            title="Change Language / ಭಾಷೆ / भाषा"
            aria-label="Change Language"
            aria-expanded={isLangMenuOpen}
          >
            <span>🌐</span>
            <span>{activeLanguage?.native || 'English'}</span>
            <span className="lang-arrow-icon">▾</span>
          </button>

          {isLangMenuOpen && (
            <div className="gmaps-lang-menu" role="menu">
              {languages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={`gmaps-lang-item ${lang === item.code ? 'active' : ''}`}
                  onClick={() => {
                    setLanguage(item.code);
                    setIsLangMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <span className="lang-item-native">{item.native}</span>
                  <span className="lang-item-label">({item.label})</span>
                  {lang === item.code && <span className="lang-item-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

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
          <span>{t('landing_btn_sell')}</span>
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
              {t('landing_btn_exit')}
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
              {t('landing_btn_demo')}
            </button>
            <button
              type="button"
              className="gmaps-signin-btn"
              onClick={() => navigateTo('login')}
            >
              {t('landing_btn_signin')}
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
            <span className="layer-mode-title">{mapMode === 'satellite' ? t('landing_layer_map') : t('landing_layer_satellite')}</span>
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
          12.336655° N, 76.567767° E • Zoom {zoomLevel}z • {t('landing_coord_suffix')}
        </span>
        <div className="gmaps-scale-meter">
          <span className="scale-bracket"></span>
          <span className="scale-label">{t('landing_scale_label')}</span>
        </div>
      </div>

      {/* 7. HAMBURGER SLIDE DRAWER (LEFT SIDE) */}
      {isMenuOpen && (
        <div className="gmaps-drawer-backdrop" onClick={() => setIsMenuOpen(false)}>
          <div className="gmaps-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-brand">
                <span className="brand-leaf-icon">🌱</span>
                <strong>{t('brand_title')}</strong>
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
                {t('landing_drawer_search')}
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
                {t('landing_drawer_sell')}
              </button>

              <div className="drawer-divider" />

              <div className="drawer-info-block">
                <h5>{t('landing_drawer_portals')}</h5>
                <ul>
                  <li>{t('landing_drawer_bhoomi')}</li>
                  <li>{t('landing_drawer_mojini')}</li>
                  <li>{t('landing_drawer_kaveri')}</li>
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
