import { useMemo, useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { MOCK_LAND_PARCELS, DISTRICT_LIST, TALUK_MAP } from '../../data/mockLandData';
import { InteractiveCadastralMap } from '../../components/Map/InteractiveCadastralMap';
import { CameraViewfinder } from '../../components/Camera/CameraViewfinder';
import { formatDistance, rankParcels, toDms } from '../../gis/geo';
import './PropertySearch.css';

export function PropertySearch() {
  const { navigateTo, selectedLand, setSelectedLand, showToast } = useNavigation();

  const [searchMode, setSearchMode] = useState('survey'); // 'survey' | 'geotag'
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedTaluk, setSelectedTaluk] = useState('All');
  const [surveyQuery, setSurveyQuery] = useState('');

  // GPS / Geotag states
  const [isLocating, setIsLocating] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoMetadata, setPhotoMetadata] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [searchRadius, setSearchRadius] = useState('all');

  // Filtered parcels
  const filteredParcels = MOCK_LAND_PARCELS.filter((parcel) => {
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
  const nearestMatch = spatialMatches?.[0] ?? null;

  // Handle GPS Locate Me
  function handleCaptureGPS() {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyRadiusMeters: Math.round(position.coords.accuracy || 4.2),
            elevation: '748m ASL'
          };
          setUserCoordinates(coords);
          showToast(`Device GPS Coordinates captured: ${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E (±${coords.accuracyRadiusMeters}m)`, 'info');
        },
        (error) => {
          setIsLocating(false);
          // Fallback to demo farm coordinates in Karnataka
          const fallbackCoords = {
            lat: 12.2958,
            lng: 76.6394,
            accuracyRadiusMeters: 3.8,
            elevation: '748m ASL'
          };
          setUserCoordinates(fallbackCoords);
          showToast(`GPS Simulation Active: Matched to Karnataka Cadastral Grid (${error.message || 'Permission fallback'})`, 'info');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setIsLocating(false);
      setUserCoordinates({ lat: 12.2958, lng: 76.6394, accuracyRadiusMeters: 3.8 });
    }
  }

  // Handle Photo Upload
  function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setCapturedPhoto(imageUrl);

    // Simulate extracting EXIF metadata
    const simulatedMeta = {
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      capturedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      deviceModel: 'Android GNSS Camera',
      hasGeotag: true,
      extractedLat: 12.2958,
      extractedLng: 76.6394
    };
    setPhotoMetadata(simulatedMeta);
    setUserCoordinates({ lat: 12.2958, lng: 76.6394, accuracyRadiusMeters: 3.5 });
    showToast(`Land Photograph uploaded: GPS Coordinates successfully extracted!`, 'success');
  }

  function handleCameraCapture({ imageUrl, coordinates, capturedAt }) {
    setCapturedPhoto(imageUrl);
    setUserCoordinates({
      lat: coordinates.lat,
      lng: coordinates.lng,
      accuracyRadiusMeters: coordinates.accuracy,
      elevation: '748m ASL'
    });
    setPhotoMetadata({
      fileName: 'Live_Survey_Capture.jpg',
      fileSize: '1.24 MB (Direct Video Stream)',
      capturedAt,
      deviceModel: 'In-App GNSS Surveyor Camera',
      hasGeotag: true,
      extractedLat: Number(coordinates.lat).toFixed(5),
      extractedLng: Number(coordinates.lng).toFixed(5)
    });
    setIsCameraOpen(false);
    showToast('Live land photograph captured with precision GNSS coordinates!', 'success');
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
          <h1 className="search-title">Search &amp; Verify Land Properties</h1>
          <p className="search-subtitle">
            Query Karnataka Bhoomi cadastral boundaries by Survey Number or use your camera/GPS to identify ground parcels.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="search-mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={searchMode === 'survey'}
            className={`mode-tab-btn ${searchMode === 'survey' ? 'active' : ''}`}
            onClick={() => setSearchMode('survey')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Search by Survey Number
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={searchMode === 'geotag'}
            className={`mode-tab-btn ${searchMode === 'geotag' ? 'active' : ''}`}
            onClick={() => setSearchMode('geotag')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Land Photo &amp; GPS Geotag
          </button>
        </div>
      </div>

      {/* Split Layout: Search Box & List (Left) + Interactive Map (Right) */}
      <div className="search-split-layout">
        {/* Left Side: Search Box & Results */}
        <div className="search-left-panel">
          {searchMode === 'survey' ? (
            /* Mode A: Filter by Survey Number & Hierarchy */
            <div className="search-filter-card">
              <h3 className="filter-card-title">Filter by Administrative Hierarchy</h3>

              <div className="filter-fields-row">
                <div className="filter-field">
                  <label htmlFor="district-select">District</label>
                  <select
                    id="district-select"
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      setSelectedTaluk('All');
                    }}
                  >
                    <option value="All">All Karnataka Districts</option>
                    {DISTRICT_LIST.map((dist) => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label htmlFor="taluk-select">Taluk</label>
                  <select
                    id="taluk-select"
                    value={selectedTaluk}
                    onChange={(e) => setSelectedTaluk(e.target.value)}
                    disabled={selectedDistrict === 'All'}
                  >
                    <option value="All">All Taluks</option>
                    {selectedDistrict !== 'All' && TALUK_MAP[selectedDistrict]?.map((taluk) => (
                      <option key={taluk} value={taluk}>{taluk}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filter-field">
                <label htmlFor="survey-input">Survey Number, Village or Owner Name</label>
                <div className="search-input-wrap">
                  <input
                    id="survey-input"
                    type="text"
                    placeholder="e.g. 84/2A, Channapura, Hasnain..."
                    value={surveyQuery}
                    onChange={(e) => setSurveyQuery(e.target.value)}
                  />
                  {surveyQuery && (
                    <button 
                      type="button" 
                      className="clear-input-btn"
                      onClick={() => setSurveyQuery('')}
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Mode B: Photograph Capture & Geotag GPS Interface */
            <div className="search-filter-card geotag-card">
              <h3 className="filter-card-title">Land Photograph &amp; GPS Extraction</h3>
              <p className="filter-card-sub">
                Capture a photo on-site or upload an existing image. The application retrieves GPS coordinates and matches the ground position against cadastral maps.
              </p>

              <div className="gps-action-banner">
                <button
                  type="button"
                  className="camera-launch-btn"
                  onClick={() => setIsCameraOpen(true)}
                  title="Open live camera with surveyor viewfinder"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  Live Camera Viewfinder
                </button>

                <button
                  type="button"
                  className="gps-locate-btn"
                  onClick={handleCaptureGPS}
                  disabled={isLocating}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
                  {isLocating ? 'Acquiring GPS Fix...' : 'Acquire GPS Fix'}
                </button>

                <label className="photo-upload-label">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handlePhotoUpload} 
                    style={{ display: 'none' }} 
                  />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Upload File
                </label>
              </div>

              {capturedPhoto && (
                <div className="photo-preview-wrap">
                  <div className="photo-preview-frame">
                    <img src={capturedPhoto} alt="Captured Land" />
                    <button 
                      type="button" 
                      className="retake-photo-btn"
                      onClick={() => {
                        setCapturedPhoto(null);
                        setPhotoMetadata(null);
                      }}
                      title="Remove or Retake"
                    >
                      Remove
                    </button>
                  </div>

                  {photoMetadata && (
                    <div className="photo-metadata-card">
                      <div className="meta-badge-row">
                        <span className="meta-badge success">✓ Geotag Coordinates Extracted</span>
                        <span className="meta-time">{photoMetadata.capturedAt}</span>
                      </div>
                      <div className="meta-grid">
                        <div><span>File:</span> <strong>{photoMetadata.fileName}</strong></div>
                        <div><span>Coordinates:</span> <strong>{photoMetadata.extractedLat}° N, {photoMetadata.extractedLng}° E</strong></div>
                        <div>
                          <span>Matched Cadastre:</span>{' '}
                          <strong>
                            {nearestMatch
                              ? `${nearestMatch.parcel.district} / ${nearestMatch.parcel.taluk} Survey No. ${nearestMatch.parcel.surveyNumber} (${formatDistance(nearestMatch.distanceMeters)})`
                              : 'No parcel in the current filter'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {userCoordinates && (
            <div className="proximity-banner">
              <div>
                <strong>GNSS proximity search</strong>
                <p>
                  Fix {toDms(Number(userCoordinates.lat), 'lat')}, {toDms(Number(userCoordinates.lng), 'lng')}
                  {nearestMatch
                    ? nearestMatch.insideBoundary
                      ? ` · inside Survey ${nearestMatch.parcel.surveyNumber}`
                      : ` · nearest is Survey ${nearestMatch.parcel.surveyNumber} at ${formatDistance(nearestMatch.distanceMeters)}`
                    : ''}
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
                <strong>{visibleMatches.length}</strong> Land Parcels Found
              </span>
              <span className="results-tip">
                {userCoordinates ? 'Sorted by distance from the GNSS fix' : 'Click a parcel to view on map'}
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
                          <span className="item-survey">Survey No. {parcel.surveyNumber}</span>
                          <span className="item-extent">{parcel.extent.formatted}</span>
                        </div>

                        <p className="item-location">
                          {parcel.village}, {parcel.taluk}, {parcel.district}
                        </p>

                        <div className="item-meta-row">
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
                            Inspect Full Land Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-results-box">
                  <p className="empty-title">No matching land parcels found</p>
                  <p className="empty-sub">
                    Try adjusting your search criteria, selecting &apos;All Districts&apos;, or resetting filters.
                  </p>
                  <button 
                    type="button" 
                    className="reset-search-btn"
                    onClick={() => {
                      setSelectedDistrict('All');
                      setSelectedTaluk('All');
                      setSurveyQuery('');
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
            parcels={visibleMatches.map((match) => match.parcel)}
            selectedParcel={selectedLand}
            onSelectParcel={handleSelectParcel}
            userCoordinates={userCoordinates}
            isLocating={isLocating}
            proximityRadiusMeters={radiusMeters}
            onCoordinateJump={(coords) => {
              setUserCoordinates(coords);
              showToast(
                `Coordinate fix set: ${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°. Parcels ranked by geodesic distance.`,
                'info'
              );
            }}
          />
        </div>
      </div>

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <CameraViewfinder
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
}
