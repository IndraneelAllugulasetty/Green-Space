import { useNavigation } from '../../context/NavigationContext';
import './LandingPage.css';

export function LandingPage() {
  const { navigateTo } = useNavigation();

  return (
    <div className="blank-landing-page">
      {/* Floating Header with Branding & Sign In */}
      <header className="landing-floating-header">
        <div className="landing-brand">
          <span className="brand-mark-sm" aria-hidden="true">
            <span className="leaf-left-sm" />
            <span className="leaf-right-sm" />
          </span>
          <div className="brand-text-col">
            <span className="brand-title">PROJECT GREEN</span>
            <span className="brand-sub">Smart Land Verification</span>
          </div>
        </div>

        <div className="landing-nav-actions">
          <button
            type="button"
            className="landing-signin-btn"
            onClick={() => navigateTo('login')}
          >
            Sign In →
          </button>
        </div>
      </header>

      {/* Blank Canvas Area - Reserved for GIS Teammate's Full-Screen Live Map */}
      <main id="live-map-viewport" className="live-map-blank-slot" aria-label="Live Map Area">
        {/* Left clean and blank for your teammate's live map component */}
      </main>
    </div>
  );
}
