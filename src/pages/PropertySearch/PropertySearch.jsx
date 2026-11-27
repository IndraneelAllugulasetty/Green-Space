import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useLanguage } from '../../context/LanguageContext';
import { MOCK_LAND_PARCELS, DISTRICT_LIST, TALUK_MAP } from '../../data/mockLandData';
import { InteractiveCadastralMap } from '../../components/Map/InteractiveCadastralMap';
import { formatDistance, identifyParcelAtLocation, rankParcels, toDms } from '../../gis/geo';
import './PropertySearch.css';

export function PropertySearch() {
  const { navigateTo, selectedLand, setSelectedLand, showToast } = useNavigation();
  const { t } = useLanguage();

  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedTaluk, setSelectedTaluk] = useState('All');
  const [surveyQuery, setSurveyQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isWatchingGps, setIsWatchingGps] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState(null);
  const [searchRadius, setSearchRadius] = useState('all');

  const watchIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Filtered parcels based on search & administrative hierarchy
  const filteredParcels = useMemo(() => {
    return MOCK_LAND_PARCELS.filter((parcel) => {
      if (selectedDistrict !== 'All' && parcel.district !== selectedDistrict) {
        return false;
      }
      if (selectedTaluk !== 'All' && parcel.taluk !== selectedTaluk) {
        return false;
      }
      if (surveyQuery.trim()) {
        const q = surveyQuery.trim().toLowerCase();
        const matchSurvey = parcel.surveyNumber.toLowerCase().includes(q);
        const matchVillage = parcel.village.toLowerCase().includes(q);
        const matchOwner = parcel.ownerName.toLowerCase().includes(q);
        return matchSurvey || matchVillage || matchOwner;
      }
      return true;
    });
  }, [selectedDistrict, selectedTaluk, surveyQuery]);

  const spatialMatches = useMemo(() => {
    if (!userCoordinates) return null;
    return rankParcels(userCoordinates, filteredParcels);
  }, [userCoordinates, filteredParcels]);

  const radiusMeters = searchRadius === 'all' ? null : Number(searchRadius);

  const visibleMatches = spatialMatches
    ? spatialMatches.filter((match) => radiusMeters === null || match.distanceMeters <= radiusMeters)
    : filteredParcels.map((parcel) => ({
        parcel,
        distanceMeters: null,
        insideBoundary: false
      }));

  const locationSummary = useMemo(() => {
    if (!userCoordinates) return null;
    return identifyParcelAtLocation(userCoordinates, filteredParcels);
  }, [userCoordinates, filteredParcels]);

  function applyGpsPosition(position, { isSimulated = false } = {}) {
    const coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracyRadiusMeters: Math.round(position.coords.accuracy || 5),
      elevation: 'GNSS Fix',
      timestamp: Date.now(),
      isSimulated
    };
    setUserCoordinates(coords);

    const match = identifyParcelAtLocation(coords, MOCK_LAND_PARCELS);
    if (match.matchedParcel) {
      setSelectedLand(match.matchedParcel);
    }
    return { coords, match };
  }

  // Handle One-Tap Live Device GPS Locate
  function handleCaptureGPS() {
    if (!('geolocation' in navigator)) {
      showToast('Browser geolocation is unavailable in this environment.', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { coords, match } = applyGpsPosition(position);
        showToast(
          `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E (±${coords.accuracyRadiusMeters}m) — ${match.message}`,
          match.matchedParcel ? 'success' : 'info'
        );
      },
      (error) => {
        setIsLocating(false);
        showToast(
          `Unable to obtain device GPS (${error.message || 'permission denied'}). Use Simulate Field GPS or Jump to WGS84 coordinate.`,
          'error'
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  function handleToggleWatchGPS() {
    if (!('geolocation' in navigator)) {
      showToast('Browser geolocation is unavailable.', 'error');
      return;
    }

    if (isWatchingGps) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsWatchingGps(false);
      showToast('Stopped live GPS tracking.', 'info');
      return;
    }

    setIsLocating(true);
    setIsWatchingGps(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setIsLocating(false);
        applyGpsPosition(position);
      },
      (error) => {
        setIsLocating(false);
        setIsWatchingGps(false);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        showToast(`Live GPS tracking error: ${error.message}`, 'error');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }

  function handleSimulateMysuruFix() {
    const sample = MOCK_LAND_PARCELS[0];
    const { match } = applyGpsPosition(
      {
        coords: {
          latitude: sample.coordinates.lat,
          longitude: sample.coordinates.lng,
          accuracy: sample.coordinates.accuracyRadiusMeters
        }
      },
      { isSimulated: true }
    );
    showToast(match.message, 'info');
  }

  function handleSelectParcel(parcel) {
    setSelectedLand(parcel);
  }

  function handleInspectDetails(parcel) {
    navigateTo('land-details', parcel);
  }

  return (
    <div className="property-search-page">
      {/* Search Header Banner */}
      <div className="search-page-header">
        <div>
          <h1 className="search-title">{t('search_header_title')}</h1>
          <p className="search-subtitle">
            {t('search_header_sub')}
          </p>
        </div>

        <button
          type="button"
          className="locate-gps-top-btn"
          onClick={handleCaptureGPS}
          disabled={isLocating}
          title={t('search_btn_locate')}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
          {isLocating ? t('search_btn_locating') : t('search_btn_locate')}
        </button>
            Fetch Karnataka Bhoomi land records directly from your device&apos;s live GNSS location, or search by Survey Number and administrative hierarchy.
          </p>
        </div>

        <div className="gps-header-actions">
          <button
            type="button"
            className="locate-gps-top-btn"
            onClick={handleCaptureGPS}
            disabled={isLocating}
            title="Detect your live device coordinates and match parcel"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            {isLocating ? 'Locating Position…' : 'Fetch by Live Location'}
          </button>

          <button
            type="button"
            className={`watch-gps-btn ${isWatchingGps ? 'active' : ''}`}
            onClick={handleToggleWatchGPS}
          >
            {isWatchingGps ? '● Live Tracking ON' : 'Start Live Tracking'}
          </button>

          <button
            type="button"
            className="simulate-field-btn"
            onClick={handleSimulateMysuruFix}
            title="Test spatial matching on Mysuru Survey No. 84/2A"
          >
            Simulate Field GPS
          </button>
        </div>
      </div>

      {/* Split Layout: Search Box & List (Left) + Interactive Map (Right) */}
      <div className="search-split-layout">
        {/* Left Side: Search Box & Results */}
        <div className="search-left-panel">
          {/* Filter by Survey Number & Hierarchy */}
          <div className="search-filter-card">
            <h3 className="filter-card-title">{t('search_header_title')}</h3>

            <div className="filter-fields-row">
              <div className="filter-field">
                <label htmlFor="district-select">{t('search_filter_district')}</label>
                <select
                  id="district-select"
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedTaluk('All');
                  }}
                >
                  <option value="All">{t('common_all')} {t('search_filter_district')}s</option>
                  {DISTRICT_LIST.map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>

              <div className="filter-field">
                <label htmlFor="taluk-select">{t('search_filter_taluk')}</label>
                <select
                  id="taluk-select"
                  value={selectedTaluk}
                  onChange={(e) => setSelectedTaluk(e.target.value)}
                  disabled={selectedDistrict === 'All'}
                >
                  <option value="All">{t('common_all')} {t('search_filter_taluk')}s</option>
                  {selectedDistrict !== 'All' && TALUK_MAP[selectedDistrict]?.map((taluk) => (
                    <option key={taluk} value={taluk}>{taluk}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="filter-field">
              <label htmlFor="survey-input">{t('search_filter_survey')}</label>
              <div className="search-input-wrap">
                <input
                  id="survey-input"
                  type="text"
                  placeholder={t('search_filter_survey_placeholder')}
                  value={surveyQuery}
                  onChange={(e) => setSurveyQuery(e.target.value)}
                />
                {surveyQuery && (
                  <button
                    type="button"
                    className="clear-input-btn"
                    onClick={() => setSurveyQuery('')}
                    aria-label="Clear search input"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          </div>

          {userCoordinates && locationSummary && (
            <div className="proximity-banner">
              <div>
                <strong>
                  {userCoordinates.isSimulated ? 'Simulated Field GNSS' : 'Live GNSS Proximity Match'}
                </strong>
                <p>
                  Fix {toDms(Number(userCoordinates.lat), 'lat')}, {toDms(Number(userCoordinates.lng), 'lng')} (±
                  {userCoordinates.accuracyRadiusMeters || '?'} m · {locationSummary.accuracyGrade})
                  <br />
                  {locationSummary.message}
                </p>
              </div>
              <label>
                Radius
                <select value={searchRadius} onChange={(event) => setSearchRadius(event.target.value)}>
                  <option value="all">All distances</option>
                  <option value="1000">1 km</option>
                  <option value="5000">5 km</option>
                  <option value="25000">25 km</option>
                  <option value="100000">100 km</option>
                </select>
              </label>
            </div>
          )}

          {/* Results List */}
          <div className="search-results-container">
            <div className="results-header-bar">
              <span className="results-count">
                <strong>{filteredParcels.length}</strong> {t('search_parcels_count')}
              </span>
              <span className="results-tip">✓ {t('search_verified_badge')}</span>
                <strong>{visibleMatches.length}</strong> Land Parcels Found
              </span>
              <span className="results-tip">
                {userCoordinates ? 'Sorted by distance from live GNSS fix' : 'Click a parcel to view on map'}
              </span>
            </div>

            <div className="results-list">
              {visibleMatches.length > 0 ? (
                visibleMatches.map(({ parcel, distanceMeters, insideBoundary }) => {
                  const isSelected = selectedLand?.id === parcel.id;
                  return (
                    <div
                      key={parcel.id}
                      className={`result-item-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectParcel(parcel)}
                    >
                      <div className="item-thumbnail">
                        <img src={parcel.coverImage} alt={parcel.surveyNumber} />
                      </div>

                      <div className="item-body">
                        <div className="item-top">
                          <span className="item-survey">{t('common_survey_no')} {parcel.surveyNumber}</span>
                          <span className="item-extent">{parcel.extent.formatted}</span>
                        </div>

                        <p className="item-location">
                          {parcel.village}, {parcel.taluk}, {parcel.district}
                        </p>

                        <div className="item-meta-row">
                          <span className="item-owner">{t('common_owner')}: {parcel.ownerName}</span>
                          <span className="item-class-tag">{parcel.landClassification.split(' ')[0]}</span>
                          <span className="item-owner">Owner: {parcel.ownerName}</span>
                          {distanceMeters !== null ? (
                            <span className={`item-distance ${insideBoundary ? 'inside' : ''}`}>
                              {insideBoundary ? 'Inside boundary' : formatDistance(distanceMeters)}
                            </span>
                          ) : (
                            <span className="item-class-tag">{parcel.landClassification.split(' ')[0]}</span>
                          )}
                        </div>

                        <div className="item-actions">
                          <button
                            type="button"
                            className="inspect-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectDetails(parcel);
                            }}
                          >
                            {t('search_btn_inspect')} →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-results-box">
                  <p className="empty-title">{t('search_no_results')}</p>
                  <p className="empty-sub">
                    Try adjusting your search criteria, widening the GPS radius filter, or resetting filters.
                  </p>
                  <button
                    type="button"
                    className="reset-search-btn"
                    onClick={() => {
                      setSelectedDistrict('All');
                      setSelectedTaluk('All');
                      setSurveyQuery('');
                      setSearchRadius('all');
                    }}
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Map */}
        <div className="search-right-map-panel">
          <InteractiveCadastralMap
            parcels={filteredParcels}
            selectedParcel={selectedLand}
            onSelectParcel={handleSelectParcel}
            userCoordinates={userCoordinates}
            isLocating={isLocating}
            proximityRadiusMeters={radiusMeters}
            onCoordinateJump={(coords) => {
              setUserCoordinates(coords);
              const match = identifyParcelAtLocation(coords, MOCK_LAND_PARCELS);
              if (match.matchedParcel) {
                setSelectedLand(match.matchedParcel);
              }
              showToast(match.message, match.matchedParcel ? 'success' : 'info');
            }}
          />
        </div>
      </div>
    </div>
  );
}
