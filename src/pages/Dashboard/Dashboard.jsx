import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { MOCK_LAND_PARCELS } from '../../data/mockLandData';
import './Dashboard.css';

export function Dashboard() {
  const { user } = useAuth();
  const { navigateTo, viewLandDetails } = useNavigation();

  return (
    <div className="dashboard-page">
      {/* Welcome Banner */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Karnataka Bhoomi & Mojini System Active
          </div>
          <h1 className="hero-greeting">
            Welcome back, <span className="highlight-name">{user?.name || 'Citizen'}</span>
          </h1>
          <p className="hero-subtext">
            Your centralized workspace for verifying Karnataka land titles, inspecting cadastral boundaries, and managing verified property listings.
          </p>
        </div>

        <div className="hero-stats-grid">
          <div className="stat-card">
            <span className="stat-label">Parcels Mapped</span>
            <span className="stat-value">14,280+</span>
            <span className="stat-sub">Across 4 Pilot Districts</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">GPS Precision</span>
            <span className="stat-value">&lt; 4.0m</span>
            <span className="stat-sub">Multi-Constellation GNSS</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Bhoomi RTC Sync</span>
            <span className="stat-value">100%</span>
            <span className="stat-sub">Direct Govt Cadastre</span>
          </div>
        </div>
      </section>

      {/* Primary Actions (Directly from Architecture Diagram) */}
      <section className="dashboard-actions-section">
        <h2 className="section-title">Platform Workspaces</h2>
        <p className="section-subtitle">Select an action to begin your land verification or listing workflow.</p>

        <div className="action-cards-grid">
          {/* Action 1: Search Property Page */}
          <div 
            className="action-card action-search"
            onClick={() => navigateTo('search')}
            role="button"
            tabIndex={0}
          >
            <div className="action-card-header">
              <div className="action-icon search-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <span className="action-tag">Interactive GIS &amp; Search</span>
            </div>

            <div className="action-card-body">
              <h3 className="action-card-title">Search &amp; Verify a Property</h3>
              <p className="action-card-desc">
                Locate any land parcel by Survey Number, Village, or capture a live geotagged photograph to retrieve instant Bhoomi RTC ownership and boundaries.
              </p>

              <ul className="action-feature-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Search by Survey No. / Village / Taluk
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Interactive Cadastral &amp; Satellite Map
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Geotagged Photo Location Extraction
                </li>
              </ul>
            </div>

            <div className="action-card-footer">
              <span className="action-cta-text">Open Search &amp; Map Engine</span>
              <span className="action-arrow">→</span>
            </div>
          </div>

          {/* Action 2: Upload for Sale Page */}
          <div 
            className="action-card action-sell"
            onClick={() => navigateTo('upload-sale')}
            role="button"
            tabIndex={0}
          >
            <div className="action-card-header">
              <div className="action-icon sell-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <span className="action-tag verified-tag">2-Step Owner Verified</span>
            </div>

            <div className="action-card-body">
              <h3 className="action-card-title">Upload Property for Sale</h3>
              <p className="action-card-desc">
                Anti-fraud listing workflow. Authenticates seller identity against official Bhoomi title records before permitting property listing on the market.
              </p>

              <ul className="action-feature-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Step 1: Automated Bhoomi RTC Title Match
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Step 2: Authenticated Pricing &amp; Photo Listing
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Zero Unverified Listings Guarantee
                </li>
              </ul>
            </div>

            <div className="action-card-footer">
              <span className="action-cta-text">Start Verification &amp; Listing</span>
              <span className="action-arrow">→</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured / Verified Land Parcels */}
      <section className="dashboard-featured-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Verified Land Records in System</h2>
            <p className="section-subtitle">Official sample parcels synchronized with Karnataka Bhoomi and Mojini GIS.</p>
          </div>
          <button 
            type="button" 
            className="view-all-btn"
            onClick={() => navigateTo('search')}
          >
            Explore All on Map →
          </button>
        </div>

        <div className="featured-parcels-grid">
          {MOCK_LAND_PARCELS.map((parcel) => (
            <div 
              key={parcel.id} 
              className="parcel-card"
              onClick={() => navigateTo('land-details', parcel)}
              role="button"
              tabIndex={0}
            >
              <div className="parcel-card-media">
                <img src={parcel.coverImage} alt={`Land at Survey ${parcel.surveyNumber}`} loading="lazy" />
                <span className="parcel-status-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  RTC Verified
                </span>
                {parcel.isListedForSale && (
                  <span className="parcel-for-sale-badge">For Sale</span>
                )}
              </div>

              <div className="parcel-card-content">
                <div className="parcel-title-row">
                  <h4 className="parcel-survey-no">Survey No. {parcel.surveyNumber}</h4>
                  <span className="parcel-extent">{parcel.extent.formatted}</span>
                </div>

                <p className="parcel-location-text">
                  {parcel.village}, {parcel.taluk}, {parcel.district}
                </p>

                <div className="parcel-specs-grid">
                  <div className="spec-item">
                    <span className="spec-label">Classification</span>
                    <span className="spec-val">{parcel.landClassification.split('(')[0]}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Owner (Bhoomi)</span>
                    <span className="spec-val highlight-owner">{parcel.ownerName}</span>
                  </div>
                </div>

                <div className="parcel-card-actions">
                  <span className="inspect-link">View Verification Dossier →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4-Step Verification Architecture Explained */}
      <section className="dashboard-workflow-section">
        <h2 className="section-title">How Project Green Works</h2>
        <p className="section-subtitle">Bridging physical land locations with authorized digital government records.</p>

        <div className="workflow-steps-grid">
          <div className="workflow-step">
            <span className="step-number">01</span>
            <h4 className="step-title">Geotagged Photo / GPS</h4>
            <p className="step-desc">
              User visits the land and captures a photo or uses device GPS to obtain precise high-accuracy coordinates.
            </p>
          </div>

          <div className="workflow-step">
            <span className="step-number">02</span>
            <h4 className="step-title">Cadastral Boundary Match</h4>
            <p className="step-desc">
              Coordinates are matched against Karnataka Mojini survey maps to locate the corresponding survey parcel.
            </p>
          </div>

          <div className="workflow-step">
            <span className="step-number">03</span>
            <h4 className="step-title">Bhoomi Record Retrieval</h4>
            <p className="step-desc">
              The identified survey number queries the state land record database for official RTC, mutation, and ownership.
            </p>
          </div>

          <div className="workflow-step">
            <span className="step-number">04</span>
            <h4 className="step-title">Verified Dossier &amp; Marketplace</h4>
            <p className="step-desc">
              Presents an authenticated verification dossier with encumbrance status, preventing land disputes and fraud.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
