import { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { MOCK_LAND_PARCELS, DISTRICT_LIST, TALUK_MAP } from '../../data/mockLandData';
import { InteractiveCadastralMap } from '../../components/Map/InteractiveCadastralMap';
import './PropertySearch.css';

export function PropertySearch() {
  const { navigateTo, selectedLand, setSelectedLand, showToast } = useNavigation();

  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedTaluk, setSelectedTaluk] = useState('All');
  const [surveyQuery, setSurveyQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState(null);

  // Filtered parcels based on search & administrative hierarchy
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

  // Handle Device GPS Locate Me
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
          showToast(`Device GPS location acquired: ${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E (±${coords.accuracyRadiusMeters}m)`, 'info');
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
            Query Karnataka Bhoomi cadastral boundaries by Survey Number or administrative hierarchy, and inspect verified parcels on the interactive map.
          </p>
        </div>

        <button
          type="button"
          className="locate-gps-top-btn"
          onClick={handleCaptureGPS}
          disabled={isLocating}
          title="Detect your device coordinates on the map"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
          {isLocating ? 'Locating Position…' : 'Locate My Position on Map'}
        </button>
      </div>

      {/* Split Layout: Search Box & List (Left) + Interactive Map (Right) */}
      <div className="search-split-layout">
        {/* Left Side: Search Box & Results */}
        <div className="search-left-panel">
          {/* Filter by Survey Number & Hierarchy */}
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
                    aria-label="Clear search input"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="search-results-container">
            <div className="results-header-bar">
              <span className="results-count">
                <strong>{filteredParcels.length}</strong> Land Parcels Found
              </span>
              <span className="results-tip">Click a parcel to view on map</span>
            </div>

            <div className="results-list">
              {filteredParcels.length > 0 ? (
                filteredParcels.map((parcel) => {
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
                          <span className="item-class-tag">{parcel.landClassification.split(' ')[0]}</span>
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
            parcels={filteredParcels}
            selectedParcel={selectedLand}
            onSelectParcel={handleSelectParcel}
            userCoordinates={userCoordinates}
            isLocating={isLocating}
          />
        </div>
      </div>
    </div>
  );
}
