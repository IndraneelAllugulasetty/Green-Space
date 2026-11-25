import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useLanguage } from '../../context/LanguageContext';
import './Navbar.css';

export function Navbar() {
  const { user, logout } = useAuth();
  const { currentView, navigateTo } = useNavigation();
  const { lang, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigateTo('landing');
  }

  function handleNav(view) {
    navigateTo(view);
    setMobileMenuOpen(false);
  }

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand */}
        <div 
          className="navbar-brand" 
          onClick={() => handleNav('search')}
          role="button"
          tabIndex={0}
          aria-label="Project Green Home"
        >
          <span className="navbar-logo-icon" aria-hidden="true">
            <span className="navbar-leaf-left" />
            <span className="navbar-leaf-right" />
          </span>
          <div className="navbar-brand-text">
            <span className="navbar-brand-title">{t('brand_title')}</span>
            <span className="navbar-brand-subtitle">{t('brand_sub')}</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="navbar-links" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-link-btn ${currentView === 'search' || currentView === 'land-details' ? 'active' : ''}`}
            onClick={() => handleNav('search')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            {t('nav_search')}
          </button>

          <button
            type="button"
            className={`nav-link-btn ${currentView === 'upload-sale' ? 'active' : ''}`}
            onClick={() => handleNav('upload-sale')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            {t('nav_sell')}
          </button>
        </nav>

        {/* User Profile & Actions */}
        <div className="navbar-user-actions">
          {/* Language Switcher Pill */}
          <button
            type="button"
            className="lang-switcher-btn"
            onClick={toggleLanguage}
            title={lang === 'en' ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ' : 'Switch to English'}
            aria-label="Toggle Language"
          >
            <span className="lang-globe-icon">🌐</span>
            <span className="lang-code-tag">{lang === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
          </button>

          {user && (
            <div className="user-profile-badge" title={user.email}>
              <div className="user-avatar">{user.avatar || 'PG'}</div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-tag">{t('tag_landholder')}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="navbar-logout-btn"
            onClick={handleLogout}
            title="Sign out of Project Green"
            aria-label="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>{t('nav_exit')}</span>
          </button>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="navbar-mobile-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-menu">
          <button
            type="button"
            className={`mobile-menu-item ${currentView === 'search' || currentView === 'land-details' ? 'active' : ''}`}
            onClick={() => handleNav('search')}
          >
            {t('nav_search')}
          </button>
          <button
            type="button"
            className={`mobile-menu-item ${currentView === 'upload-sale' ? 'active' : ''}`}
            onClick={() => handleNav('upload-sale')}
          >
            {t('nav_sell')}
          </button>
          <button
            type="button"
            className="mobile-menu-item"
            onClick={toggleLanguage}
          >
            🌐 Language: {lang === 'en' ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ' : 'Switch to English'}
          </button>
          <button
            type="button"
            className="mobile-menu-item logout"
            onClick={handleLogout}
          >
            {t('nav_exit')} ({user?.name || 'User'})
          </button>
        </div>
      )}
    </header>
  );
}
