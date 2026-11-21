import { useState } from 'react'
import './App.css'

function Brand() {
  return (
    <div className="brand" aria-label="Project Green">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-leaf brand-leaf-left" />
        <span className="brand-leaf brand-leaf-right" />
      </span>
      <span className="brand-name">PROJECT GREEN</span>
    </div>
  )
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [statusMessage, setStatusMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {}
    if (!email.trim()) {
      nextErrors.email = 'Enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Enter your password.'
    }

    setErrors(nextErrors)
    setStatusMessage('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    window.setTimeout(() => {
      setIsSubmitting(false)
      setStatusMessage(
        'Sign-in is unavailable until authentication is connected. Your credentials were not sent.',
      )
    }, 500)
  }

  function updateEmail(value) {
    setEmail(value)
    setErrors((currentErrors) => ({ ...currentErrors, email: '' }))
    setStatusMessage('')
  }

  function updatePassword(value) {
    setPassword(value)
    setErrors((currentErrors) => ({ ...currentErrors, password: '' }))
    setStatusMessage('')
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <Brand />

        <div className="login-intro">
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to continue to your land information workspace.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">Email address</label>
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
              placeholder="you@company.com"
            />
            {errors.email && (
              <span className="field-error" id="email-error">
                {errors.email}
              </span>
            )}
          </div>

          <div className="form-field">
            <div className="label-row">
              <label htmlFor="password">Password</label>
              <button
                className="text-button forgot-link"
                type="button"
                onClick={() =>
                  setStatusMessage(
                    'Password recovery will be available when authentication is connected. Contact your administrator for help.',
                  )
                }
              >
                Forgot password?
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
                placeholder="Enter your password"
              />
              <button
                className="text-button password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Hide' : 'Show'}
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
              <span>Remember me</span>
            </label>
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Connecting…' : 'Sign in'}
          </button>

          <p className="integration-notice" role="status" aria-live="polite">
            Authentication integration is pending. Your credentials are not
            sent or stored.
          </p>
          {statusMessage && (
            <p className="form-status" role="status" aria-live="polite">
              {statusMessage}
            </p>
          )}
        </form>

        <p className="contact-note">
          Don&apos;t have an account?{' '}
          <span>Contact your administrator</span>
        </p>
      </section>
    </main>
  )
}

export default App
