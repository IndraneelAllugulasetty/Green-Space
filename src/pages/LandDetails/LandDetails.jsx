import { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { VerificationCertificate } from '../../components/Certificate/VerificationCertificate';
import './LandDetails.css';

export function LandDetails() {
  const { selectedLand, navigateTo, showToast } = useNavigation();
  const [showCertificate, setShowCertificate] = useState(false);

  if (!selectedLand) {
    return (
      <div className="land-details-empty">
        <h2>No Land Parcel Selected</h2>
        <p>Please select a property from the search page to inspect its verification dossier.</p>
        <button 
          type="button" 
          className="back-to-search-btn"
          onClick={() => navigateTo('search')}
        >
          ← Return to Property Search
        </button>
      </div>
    );
  }

  function handlePrintDossier() {
    showToast('Official Land Verification Dossier compiled. Ready for download / printing.', 'info');
    window.print();
  }

  return (
    <div className="land-details-page">
      {/* Top Breadcrumb & Navigation */}
      <div className="details-top-bar no-print">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigateTo('search')}
        >
          ← Back to Search &amp; Map
        </button>

        <div className="top-action-btns">
          <button
            type="button"
            className="view-cert-action-btn"
            onClick={() => setShowCertificate(true)}
            title="Open official digital certificate of authenticity"
          >
            <span className="cert-badge-star">★</span>
            Digital Title Certificate
          </button>

          <button
            type="button"
            className="print-dossier-btn"
            onClick={handlePrintDossier}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print / Download Official Dossier
          </button>
          {selectedLand.isListedForSale && (
            <span className="sale-ready-badge">
              ✓ Verified For Sale ({selectedLand.saleDetails?.priceTotal})
            </span>
          )}
        </div>
      </div>

      {/* Main Verification Dossier Header */}
      <header className="dossier-header-card">
        <div className="header-primary-info">
          <div className="dossier-seal-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            <span>KARNATAKA BHOOMI &amp; MOJINI VERIFIED</span>
          </div>
          <h1 className="dossier-title">
            Land Verification Dossier: Survey No. {selectedLand.surveyNumber}
          </h1>
          <p className="dossier-location-hierarchy">
            Village: <strong>{selectedLand.village}</strong> | Hobli: <strong>{selectedLand.hobli}</strong> | Taluk: <strong>{selectedLand.taluk}</strong> | District: <strong>{selectedLand.district}</strong>, Karnataka
          </p>
        </div>

        <div className="header-qr-stamp">
          <div className="qr-sim-box">
            <div className="qr-sim-code" />
          </div>
          <span className="qr-ref-code">{selectedLand.bhoomiRtcRef}</span>
          <span className="qr-verified-text">Official Record Authenticated</span>
        </div>
      </header>

      {/* Quick Summary Highlights Banner */}
      <div className="dossier-highlights-grid">
        <div className="highlight-pill">
          <span className="pill-label">Total Extent</span>
          <span className="pill-val">{selectedLand.extent.formatted}</span>
        </div>
        <div className="highlight-pill">
          <span className="pill-label">Land Classification</span>
          <span className="pill-val">{selectedLand.landClassification}</span>
        </div>
        <div className="highlight-pill">
          <span className="pill-label">Registered Title Holder</span>
          <span className="pill-val highlight-green">{selectedLand.ownerName}</span>
        </div>
        <div className="highlight-pill">
          <span className="pill-label">Govt Guidance Value</span>
          <span className="pill-val">{selectedLand.guidanceValuePerAcre}</span>
        </div>
      </div>

      {/* Dossier Content Grid */}
      <div className="dossier-sections-grid">
        {/* Section 1: Bhoomi RTC & Ownership Details */}
        <div className="dossier-card">
          <div className="card-header-row">
            <div className="card-icon-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              <h3>Bhoomi RTC &amp; Ownership Records</h3>
            </div>
            <span className="source-tag">Source: Revenue Dept. Karnataka</span>
          </div>

          <div className="card-details-table">
            <div className="table-row">
              <span className="row-label">Primary Title Holder</span>
              <span className="row-value bold-val">{selectedLand.ownerName}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Joint / Co-sharers</span>
              <span className="row-value">
                {selectedLand.jointOwners.length > 0 ? selectedLand.jointOwners.join(', ') : 'Single Sole Ownership'}
              </span>
            </div>
            <div className="table-row">
              <span className="row-label">Relationship / Origin</span>
              <span className="row-value">{selectedLand.relationshipType}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Official Khata Number</span>
              <span className="row-value code-font">{selectedLand.khataNumber}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Mutation Register (MR) Status</span>
              <span className="row-value success-badge">{selectedLand.mutationStatus}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Bhoomi RTC Reference</span>
              <span className="row-value code-font">{selectedLand.bhoomiRtcRef}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Legal Encumbrance & Dispute Verification */}
        <div className="dossier-card">
          <div className="card-header-row">
            <div className="card-icon-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <h3>Legal &amp; Encumbrance Clearance</h3>
            </div>
            <span className="source-tag">Source: Kaveri-2 &amp; e-Courts</span>
          </div>

          <div className="card-details-table">
            <div className="table-row">
              <span className="row-label">Encumbrance Certificate (EC)</span>
              <span className="row-value success-text">{selectedLand.encumbranceStatus}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Court Litigation / Civil Suits</span>
              <span className="row-value success-text">{selectedLand.courtLitigation}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Buffer / Acquisition Status</span>
              <span className="row-value">{selectedLand.governmentRestrictions}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Estimated Market Value</span>
              <span className="row-value bold-val">{selectedLand.estimatedMarketValue}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Road &amp; Approach Access</span>
              <span className="row-value">{selectedLand.roadApproach}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Data Freshness Timestamp</span>
              <span className="row-value timestamp-val">{selectedLand.recordFreshness}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Cadastral Boundaries & Adjoining Plots */}
        <div className="dossier-card">
          <div className="card-header-row">
            <div className="card-icon-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              <h3>Cadastral Mojini Boundaries</h3>
            </div>
            <span className="source-tag">Mojini GIS Dataset</span>
          </div>

          <div className="boundaries-direction-box">
            <div className="boundary-compass">
              <div className="compass-dir north">
                <span className="dir-tag">NORTH</span>
                <span className="dir-desc">{selectedLand.boundaries.north}</span>
              </div>
              <div className="compass-dir-middle">
                <div className="compass-dir west">
                  <span className="dir-tag">WEST</span>
                  <span className="dir-desc">{selectedLand.boundaries.west}</span>
                </div>
                <div className="compass-center-parcel">
                  <span className="center-survey">Survey No. {selectedLand.surveyNumber}</span>
                  <span className="center-extent">{selectedLand.extent.formatted}</span>
                </div>
                <div className="compass-dir east">
                  <span className="dir-tag">EAST</span>
                  <span className="dir-desc">{selectedLand.boundaries.east}</span>
                </div>
              </div>
              <div className="compass-dir south">
                <span className="dir-tag">SOUTH</span>
                <span className="dir-desc">{selectedLand.boundaries.south}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Physical Geolocation & Land Specifications */}
        <div className="dossier-card">
          <div className="card-header-row">
            <div className="card-icon-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              <h3>Physical Geolocation &amp; Agro Specs</h3>
            </div>
            <span className="source-tag">GPS GNSS WGS84</span>
          </div>

          <div className="card-details-table">
            <div className="table-row">
              <span className="row-label">GPS Coordinates</span>
              <span className="row-value code-font">{selectedLand.coordinates.lat}° N, {selectedLand.coordinates.lng}° E</span>
            </div>
            <div className="table-row">
              <span className="row-label">Elevation Above Sea Level</span>
              <span className="row-value">{selectedLand.coordinates.elevation}</span>
            </div>
            <div className="table-row">
              <span className="row-label">GNSS Fix Accuracy</span>
              <span className="row-value">±{selectedLand.coordinates.accuracyRadiusMeters} meters (Sub-cadastral)</span>
            </div>
            <div className="table-row">
              <span className="row-label">Soil Classification</span>
              <span className="row-value">{selectedLand.soilType}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Water Source / Irrigation</span>
              <span className="row-value">{selectedLand.waterSource}</span>
            </div>
            <div className="table-row">
              <span className="row-label">Mojini Survey Reference</span>
              <span className="row-value code-font">{selectedLand.mojiniSurveyRef}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Listing Information (If for sale) */}
      {selectedLand.isListedForSale && selectedLand.saleDetails && (
        <section className="dossier-sale-section">
          <div className="sale-section-header">
            <div className="sale-badge-icon">✓</div>
            <div>
              <h3>Verified Landholder Listing</h3>
              <p>This parcel has passed the 2-step owner authentication and is offered for direct sale by the title holder.</p>
            </div>
          </div>

          <div className="sale-details-grid">
            <div className="sale-box">
              <span className="sale-box-label">Asking Price</span>
              <span className="sale-box-price">{selectedLand.saleDetails.priceTotal}</span>
              <span className="sale-box-rate">({selectedLand.saleDetails.pricePerAcre} / acre)</span>
            </div>
            <div className="sale-box">
              <span className="sale-box-label">Verified Seller</span>
              <span className="sale-box-val">{selectedLand.saleDetails.listedBy}</span>
              <span className="sale-box-role">{selectedLand.saleDetails.listedRole}</span>
            </div>
            <div className="sale-box">
              <span className="sale-box-label">Contact Title Holder</span>
              <span className="sale-box-val">{selectedLand.saleDetails.contactPhone}</span>
              <span className="sale-box-sub">Direct owner inquiry</span>
            </div>
          </div>

          <p className="sale-description-text">
            &ldquo;{selectedLand.saleDetails.description}&rdquo;
          </p>
        </section>
      )}

      {/* Official Government Disclaimer */}
      <footer className="dossier-legal-footer">
        <p>
          <strong>Notice:</strong> This verification dossier is compiled by Project Green using digitized cadastral boundaries, Bhoomi land-record feeds, and Mojini spatial indices from the Government of Karnataka. Preliminary research only; official certified copies should be obtained from the respective Taluk Sub-Registrar Office for registration.
        </p>
      </footer>

      {/* Official Digital Land Verification Certificate Modal */}
      {showCertificate && (
        <VerificationCertificate
          parcel={selectedLand}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
}
