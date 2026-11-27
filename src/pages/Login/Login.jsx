import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useLanguage } from '../../context/LanguageContext';
import { DEMO_USER } from '../../data/mockLandData';
import './Login.css';

function Brand() {
  const { t } = useLanguage();
  return (
    <div className="brand" aria-label="Project Green">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-leaf brand-leaf-left" />
        <span className="brand-leaf brand-leaf-right" />
      </span>
      <span className="brand-name">{t('brand_title')}</span>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const { navigateTo, showToast } = useNavigation();
  const { lang, setLanguage, languages, activeLanguage, t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const [isLangOpen, setIsLangOpen] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!email.trim()) {
      nextErrors.email = 'Enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Enter your password.';
    }

    setErrors(nextErrors);
    setStatusMessage('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      const user = login({ email, password });
      showToast(`Welcome back, ${user.name}! Connected to Project Green.`);
      navigateTo('search');
    }, 400);
  }

  function handleDemoFill() {
    setEmail(DEMO_USER.email);
    setPassword('ProjectGreen@2026');
    setErrors({});
    setStatusMessage('Demo credentials filled. Click "Sign in" to explore.');
  }

  function updateEmail(value) {
    setEmail(value);
    setErrors((currentErrors) => ({ ...currentErrors, email: '' }));
    setStatusMessage('');
  }

  function updatePassword(value) {
    setPassword(value);
    setErrors((currentErrors) => ({ ...currentErrors, password: '' }));
    setStatusMessage('');
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-top-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="back-home-link"
            onClick={() => navigateTo('landing')}
          >
            ← {t('brand_title')}
          </button>

          {/* Quick Language Selector on Login Screen */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="lang-switcher-btn"
              onClick={() => setIsLangOpen(!isLangOpen)}
              title="Change Language"
              style={{ padding: '4px 10px', fontSize: '11.5px' }}
            >
              <span>🌐</span>
              <span>{activeLanguage?.native || 'English'}</span>
              <span>▾</span>
            </button>
            {isLangOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: '#ffffff',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  padding: '4px',
                  zIndex: 20,
                  minWidth: '130px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setLanguage(l.code);
                      setIsLangOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: lang === l.code ? 'var(--color-brand-light)' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: lang === l.code ? 'bold' : 'normal',
                      color: 'var(--color-text-body)'
                    }}
                  >
                    <span>{l.native}</span>
                    {lang === l.code && <span style={{ color: 'var(--color-brand-primary)' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Brand />

        <div className="login-intro">
          <h1 id="login-title">{t('login_title')}</h1>
          <p>{t('login_sub')}</p>
        </div>

        {/* Demo Fast Login Pill for Reviewers */}
        <div className="demo-pill-box">
          <button
            type="button"
            className="demo-pill-btn"
            onClick={handleDemoFill}
            title="Auto-fill with sample Karnataka landholder account"
          >
            <span className="demo-pill-badge">{t('login_demo_hint')}</span>
            <span className="demo-pill-text">{DEMO_USER.email}</span>
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">{t('login_lbl_email')}</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => updateEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              placeholder={t('login_placeholder_email')}
            />
            {errors.email && (
              <span className="field-error" id="email-error">
                {errors.email}
              </span>
            )}
          </div>

          <div className="form-field">
            <div className="label-row">
              <label htmlFor="password">{t('login_lbl_password')}</label>
              <button
                className="text-button forgot-link"
                type="button"
                onClick={() =>
                  setStatusMessage(
                    'Demo Mode: Click "Demo Account" above.',
                  )
                }
              >
                Forgot?
              </button>
            </div>
            <div className="password-input-wrap">
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(event) => updatePassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                placeholder={t('login_placeholder_password')}
              />
              <button
                className="text-button password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? t('login_hide_pwd') : t('login_show_pwd')}
              </button>
            </div>
            {errors.password && (
              <span className="field-error" id="password-error">
                {errors.password}
              </span>
            )}
          </div>

          <div className="form-options">
            <label className="remember-option" htmlFor="remember-me">
              <input
                checked={rememberMe}
                id="remember-me"
                name="remember-me"
                type="checkbox"
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>{t('login_remember')}</span>
            </label>
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('login_btn_submitting') : t('login_btn_submit')}
          </button>

          {statusMessage && (
            <p className="form-status" role="status" aria-live="polite">
              {statusMessage}
            </p>
          )}
        </form>

        <p className="contact-note">
          Project Green • Karnataka Bhoomi Land Portal
        </p>
      </section>
    </main>
  );
}
