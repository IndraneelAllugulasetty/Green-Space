import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { MOCK_LAND_PARCELS, DEMO_USER } from '../../data/mockLandData';
import heroImg from '../../assets/hero.png';
import './LandingPage.css';

export function LandingPage() {
  const { navigateTo, setSelectedLand, showToast } = useNavigation();
  const { login } = useAuth();

  function handleQuickDemo() {
    login({ email: DEMO_USER.email, password: 'ProjectGreen@2026' });
    showToast(`Signed in as ${DEMO_USER.name} (Demo Landholder)`, 'success');
    navigateTo('dashboard');
  }

  function handleInspectSample(parcel) {
    setSelectedLand(parcel);
    // Sign in demo user so they can view details smoothly
    login({ email: DEMO_USER.email, password: 'ProjectGreen@2026' });
    navigateTo('land-details', parcel);
  }

  return (
    <div className="landing-page">
      {/* Public Header Navigation */}
      <header className="public-nav">
        <div className="public-nav-container">
          <div className="public-brand">
            <span className="brand-mark-sm">
              <span className="leaf-left-sm" />
              <span className="leaf-right-sm" />
            </span>
            <div className="brand-text-wrap">
              <span className="brand-main-title">PROJECT GREEN</span>
              <span className="brand-sub-title">Smart Land Verification</span>
            </div>
          </div>

          <nav className="public-nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#problem-solution">Why Project Green</a>
            <a href="#pilot-districts">Pilot Districts</a>
            <a href="#anti-fraud">Anti-Fraud Guarantee</a>
          </nav>

          <div className="public-nav-actions">
            <button
              type="button"
              className="quick-demo-pill-btn"
              onClick={handleQuickDemo}
              title="One-click test account"
            >
              <span className="pill-pulse" />
              <span>Instant Demo</span>
            </button>
            <button
              type="button"
              className="sign-in-nav-btn"
              onClick={() => navigateTo('login')}
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-text-col">
            <div className="hero-launch-badge">
              <span className="badge-leaf-icon">🌱</span>
              <span>Karnataka Land Verification &amp; Cadastral GIS Platform</span>
            </div>

            <h1 className="hero-main-heading">
              Bridging Physical Land to <span className="gradient-text">Verified Digital Records</span>
            </h1>

            <p className="hero-description">
              Verify land ownership, inspect surveyed cadastral boundaries, and eliminate real-estate fraud. Simply capture a geotagged photograph on-site or search by Survey Number to access official Karnataka Bhoomi &amp; Mojini records in seconds.
            </p>

            <div className="hero-cta-group">
              <button
                type="button"
                className="primary-hero-btn"
                onClick={handleQuickDemo}
              >
                <span>Launch Citizen Workspace</span>
                <span className="btn-arrow">→</span>
              </button>

              <a href="#pilot-districts" className="secondary-hero-btn">
                <span>Browse Pilot Cadastre</span>
                <span className="btn-down">↓</span>
              </a>
            </div>

            <div className="hero-trust-metrics">
              <div className="trust-metric-item">
                <strong>14,280+</strong>
                <span>Parcels Indexed</span>
              </div>
              <div className="metric-divider" />
              <div className="trust-metric-item">
                <strong>&lt; 4.0m</strong>
                <span>GNSS Accuracy</span>
              </div>
              <div className="metric-divider" />
              <div className="trust-metric-item">
                <strong>100%</strong>
                <span>Bhoomi Synced</span>
              </div>
            </div>
          </div>

          <div className="hero-visual-col">
            <div className="hero-image-frame">
              <img src={heroImg} alt="Project Green Land Information Platform" className="hero-main-img" />
              
              <div className="floating-cadastre-badge">
                <div className="live-gnss-dot" />
                <div className="badge-info">
                  <span className="badge-title">Cadastral Lock Active</span>
                  <span className="badge-coords">12.2958° N, 76.6394° E</span>
                </div>
              </div>

              <div className="floating-bhoomi-card">
                <div className="check-circle-icon">✓</div>
                <div>
                  <span className="card-karnataka">Govt of Karnataka</span>
                  <span className="card-rtc">Bhoomi RTC Verified Title</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Section */}
      <section id="problem-solution" className="problem-solution-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-kicker">The Land Research Challenge</span>
            <h2 className="section-heading">Traditional Property Research vs. Project Green</h2>
            <p className="section-subheading">
              How modern geolocation technology and open government data transform land discovery for ordinary citizens.
            </p>
          </div>

          <div className="comparison-cards-grid">
            {/* The Old Way */}
            <div className="comp-card old-way-card">
              <div className="comp-card-header">
                <span className="comp-badge old-badge">Traditional Method</span>
                <h3>The Complicated Old Way</h3>
              </div>
              <ul className="comp-points-list">
                <li>
                  <span className="comp-cross">✕</span>
                  <span><strong>Multiple Office Visits:</strong> Visiting Taluk, Sub-Registrar, and Bhoomi offices to pull physical paper RTCs.</span>
                </li>
                <li>
                  <span className="comp-cross">✕</span>
                  <span><strong>Unverified Listings:</strong> Fraudulent sellers listing properties they do not lawfully own on unverified classifieds.</span>
                </li>
                <li>
                  <span className="comp-cross">✕</span>
                  <span><strong>Boundary Disputes:</strong> Inability to know exact physical boundaries, risking encroachment by neighboring plots.</span>
                </li>
                <li>
                  <span className="comp-cross">✕</span>
                  <span><strong>Hidden Encumbrances:</strong> Undisclosed bank mortgages or pending civil court litigations discovered after buying.</span>
                </li>
              </ul>
            </div>

            {/* The Project Green Way */}
            <div className="comp-card new-way-card">
              <div className="comp-card-header">
                <span className="comp-badge new-badge">Project Green Solution</span>
                <h3>The Smart Location-First Way</h3>
              </div>
              <ul className="comp-points-list">
                <li>
                  <span className="comp-check">✓</span>
                  <span><strong>1-Click GPS Ground Check:</strong> Stand on the field, snap a photo, and immediately retrieve digital survey numbers.</span>
                </li>
                <li>
                  <span className="comp-check">✓</span>
                  <span><strong>2-Step Title Authentication:</strong> Sellers must verify their identity against Bhoomi records before listing land for sale.</span>
                </li>
                <li>
                  <span className="comp-check">✓</span>
                  <span><strong>Interactive Cadastral GIS:</strong> Visual survey polygons displaying neighbors to the North, South, East, and West.</span>
                </li>
                <li>
                  <span className="comp-check">✓</span>
                  <span><strong>Instant Legal Transparency:</strong> Automated checking of Encumbrance Certificates (EC) and dispute registries.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / 4-Step Pipeline */}
      <section id="how-it-works" className="pipeline-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-kicker">Core System Architecture</span>
            <h2 className="section-heading">From Physical Soil to Digital Verification</h2>
            <p className="section-subheading">
              Our 4-step processing pipeline connects real-world coordinates with state land records.
            </p>
          </div>

          <div className="pipeline-steps-container">
            <div className="pipeline-card">
              <div className="pipeline-step-badge">01</div>
              <div className="pipeline-icon">📸</div>
              <h4>Geotagged Photo / GPS</h4>
              <p>User visits the land and captures a photo or uses device GPS to obtain precision WGS84 coordinates.</p>
            </div>

            <div className="pipeline-arrow-connector">→</div>

            <div className="pipeline-card">
              <div className="pipeline-step-badge">02</div>
              <div className="pipeline-icon">🗺️</div>
              <h4>Cadastral Boundary Match</h4>
              <p>Coordinates are cross-referenced with Mojini survey datasets to identify the exact survey parcel.</p>
            </div>

            <div className="pipeline-arrow-connector">→</div>

            <div className="pipeline-card">
              <div className="pipeline-step-badge">03</div>
              <div className="pipeline-icon">🏛️</div>
              <h4>Bhoomi RTC Retrieval</h4>
              <p>The identified survey number queries the Karnataka Revenue database for verified ownership and tenancy.</p>
            </div>

            <div className="pipeline-arrow-connector">→</div>

            <div className="pipeline-card highlight-card">
              <div className="pipeline-step-badge">04</div>
              <div className="pipeline-icon">🛡️</div>
              <h4>Official Verification Dossier</h4>
              <p>A printable, tamper-evident report complete with legal clearance, soil classification, and market guidance value.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pilot Districts Showcase */}
      <section id="pilot-districts" className="pilot-section">
        <div className="section-container">
          <div className="section-header-row">
            <div>
              <span className="section-kicker">Real-World Case Studies</span>
              <h2 className="section-heading">Pilot Coverage Across Karnataka</h2>
              <p className="section-subheading">
                Explore real cadastral parcels digitized and verified across 4 diverse agricultural &amp; commercial zones.
              </p>
            </div>
            <button
              type="button"
              className="open-full-map-btn"
              onClick={handleQuickDemo}
            >
              Open Interactive Map Workspace →
            </button>
          </div>

          <div className="pilot-parcels-grid">
            {MOCK_LAND_PARCELS.map((parcel) => (
              <div
                key={parcel.id}
                className="pilot-parcel-card"
                onClick={() => handleInspectSample(parcel)}
              >
                <div className="pilot-card-img-wrap">
                  <img src={parcel.coverImage} alt={parcel.surveyNumber} />
                  <span className="pilot-dist-pill">{parcel.district}</span>
                  <span className="pilot-rtc-status">✓ Bhoomi Verified</span>
                </div>

                <div className="pilot-card-body">
                  <div className="pilot-top-line">
                    <span className="pilot-survey-no">Survey No. {parcel.surveyNumber}</span>
                    <span className="pilot-extent-tag">{parcel.extent.formatted}</span>
                  </div>

                  <p className="pilot-location-line">
                    {parcel.village}, {parcel.taluk}
                  </p>

                  <div className="pilot-meta-strip">
                    <div>
                      <span className="strip-lbl">Classification:</span>
                      <span className="strip-val">{parcel.landClassification.split('(')[0]}</span>
                    </div>
                    <div>
                      <span className="strip-lbl">Title Holder:</span>
                      <span className="strip-val highlight-bold">{parcel.ownerName}</span>
                    </div>
                  </div>

                  <div className="pilot-card-action">
                    <span>Inspect Cadastral Dossier →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Anti-Fraud Guarantee Section */}
      <section id="anti-fraud" className="anti-fraud-section">
        <div className="section-container">
          <div className="anti-fraud-banner">
            <div className="shield-icon-col">
              <div className="large-shield-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
            </div>

            <div className="shield-text-col">
              <span className="fraud-kicker">Zero-Fraud Protocol</span>
              <h3>Only Verified Title Holders Can List Property for Sale</h3>
              <p>
                Unlike generic classified websites where anyone can post someone else&apos;s land, Project Green requires a <strong>2-Step Automated Bhoomi Cross-Check</strong>. The seller&apos;s authenticated government identity must match the state revenue owner of record before a listing is unlocked.
              </p>
              <div className="fraud-checklist">
                <span>✓ Direct Bhoomi RTC match</span>
                <span>✓ Mutation order confirmed</span>
                <span>✓ No unauthorized broker listings</span>
              </div>
            </div>

            <div className="shield-cta-col">
              <button
                type="button"
                className="fraud-cta-btn"
                onClick={handleQuickDemo}
              >
                Test 2-Step Listing Flow →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="public-footer">
        <div className="footer-container">
          <div className="footer-top-row">
            <div className="footer-brand-col">
              <div className="public-brand">
                <span className="brand-mark-sm">
                  <span className="leaf-left-sm" />
                  <span className="leaf-right-sm" />
                </span>
                <span className="brand-main-title">PROJECT GREEN</span>
              </div>
              <p className="footer-brand-desc">
                Smart Land Information &amp; Verification System. Simplifying land research, transparency, and cadastral mapping for Karnataka.
              </p>
            </div>

            <div className="footer-links-col">
              <h5>Data Sources &amp; Services</h5>
              <ul>
                <li>Bhoomi RTC Land Records (Karnataka)</li>
                <li>Mojini Cadastral Survey &amp; Mapping</li>
                <li>e-Khata Urban Property Records</li>
                <li>Kaveri-2 Encumbrance Index</li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h5>Pilot Zones</h5>
              <ul>
                <li>Mysuru District (Hunsur Taluk)</li>
                <li>Mandya District (Pandavapura)</li>
                <li>Bengaluru Rural (Devanahalli)</li>
                <li>Hassan District (Belur Taluk)</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-row">
            <p>© 2026 Project Green Space. Production-ready Frontend Engineering Demonstration.</p>
            <p className="footer-disclaimer">
              Built with React 19 &amp; Vite. Information compiled for research and preliminary verification.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
