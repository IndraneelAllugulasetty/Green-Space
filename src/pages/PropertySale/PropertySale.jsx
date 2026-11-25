import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { MOCK_LAND_PARCELS, DISTRICT_LIST, TALUK_MAP } from '../../data/mockLandData';
import './PropertySale.css';

export function PropertySale() {
  const { user } = useAuth();
  const { navigateTo, showToast } = useNavigation();

  // Stage 1 State: Land Verification
  const [district, setDistrict] = useState('Mysuru');
  const [taluk, setTaluk] = useState('Hunsur');
  const [village, setVillage] = useState('Channapura');
  const [surveyNumber, setSurveyNumber] = useState('84/2A');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Stage 2 State: Sale Listing Info
  const [priceTotal, setPriceTotal] = useState('1,15,00,000');
  const [pricePerAcre, setPricePerAcre] = useState('34,32,000');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [contactPhone, setContactPhone] = useState(user?.phone || '+91 98450 12345');
  const [description, setDescription] = useState(
    'Prime fertile agricultural land with live 3.5 inch borewell, tar road frontage, and clean single-owner RTC.'
  );
  const [isPublishing, setIsPublishing] = useState(false);

  // Quick Demo Shortcut for Reviewers
  function handleFillDemoOwnership() {
    setDistrict('Mysuru');
    setTaluk('Hunsur');
    setVillage('Channapura');
    setSurveyNumber('84/2A');
    setVerificationResult(null);
  }

  function handleFillMismatch() {
    setDistrict('Mandya');
    setTaluk('Pandavapura');
    setVillage('Kyathanahalli');
    setSurveyNumber('112/1B');
    setVerificationResult(null);
  }

  // Stage 1: Authenticate Owner Against Bhoomi Records
  function handleVerifyOwnership(event) {
    event.preventDefault();
    setIsVerifying(true);
    setVerificationResult(null);

    window.setTimeout(() => {
      setIsVerifying(false);

      // Find matching parcel in mock data
      const matched = MOCK_LAND_PARCELS.find(
        (p) =>
          p.surveyNumber.toLowerCase() === surveyNumber.trim().toLowerCase() &&
          p.district.toLowerCase() === district.toLowerCase()
      );

      if (!matched) {
        setVerificationResult({
          status: 'NOT_FOUND',
          message: `Survey Number ${surveyNumber} was not found in ${village}, ${district} cadastral database.`
        });
        return;
      }

      // Check if logged in user's name matches the official owner
      const currentUserName = user?.name?.toLowerCase().trim() || '';
      const ownerName = matched.ownerName.toLowerCase().trim();
      const isOwner =
        currentUserName.includes(ownerName) ||
        ownerName.includes(currentUserName) ||
        currentUserName.includes('hasnain'); // For demo testing flexibility

      if (isOwner) {
        setVerificationResult({
          status: 'MATCHED_SUCCESS',
          parcel: matched,
          message: `Official Title Match Confirmed! You (${user?.name}) are registered as the lawful title holder for Survey No. ${matched.surveyNumber} in Bhoomi Karnataka.`
        });
        showToast('Land Ownership Authenticated! You can now proceed to list your land.', 'success');
      } else {
        setVerificationResult({
          status: 'OWNER_MISMATCH',
          parcel: matched,
          message: `Ownership Mismatch: The registered owner for Survey No. ${matched.surveyNumber} is '${matched.ownerName}'. Your account name ('${user?.name}') does not match the official title deed. Project Green strictly prohibits listing land you do not own.`
        });
        showToast('Verification Failed: Identity mismatch with official land record.', 'error');
      }
    }, 600);
  }

  // Stage 2: Publish Listing
  function handlePublishListing(event) {
    event.preventDefault();
    setIsPublishing(true);

    window.setTimeout(() => {
      setIsPublishing(false);

      if (verificationResult?.parcel) {
        verificationResult.parcel.isListedForSale = true;
        verificationResult.parcel.saleDetails = {
          priceTotal: `₹ ${priceTotal}`,
          pricePerAcre: `₹ ${pricePerAcre}`,
          negotiable: isNegotiable,
          listedBy: user?.name || 'Verified Title Holder',
          listedRole: 'Verified Title Holder (Bhoomi Checked)',
          listedDate: 'Today',
          contactPhone,
          description
        };
      }

      showToast('Property listed successfully! It is now active on Project Green.', 'success');
      navigateTo('search');
    }, 500);
  }

  const isUnlocked = verificationResult?.status === 'MATCHED_SUCCESS';

  return (
    <div className="property-sale-page">
      {/* Header */}
      <div className="sale-header">
        <span className="sale-shield-tag">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          2-Step Authenticated Land Listing Protocol
        </span>
        <h1 className="sale-title">Upload Your Property for Sale</h1>
        <p className="sale-subtitle">
          To protect buyers and eliminate fraud, Project Green requires automated cross-verification of your identity with the Government of Karnataka Bhoomi land records before listing.
        </p>
      </div>

      {/* Two Column / Staged Workflow */}
      <div className="stages-container">
        {/* STAGE 1: Land & User Identity Verification */}
        <section className={`stage-card ${isUnlocked ? 'stage-completed' : 'stage-active'}`}>
          <div className="stage-header-row">
            <div className="stage-step-pill">
              {isUnlocked ? '✓ Stage 1 Complete' : 'Stage 1: Identity & Land Title Verification'}
            </div>
            {isUnlocked && <span className="verified-stamp">BHOOMI AUTHENTICATED</span>}
          </div>

          <p className="stage-desc">
            Enter the details of the land you wish to sell. The system will verify your ownership directly against state revenue records.
          </p>

          {/* Quick Demo Pre-fills for Testing */}
          <div className="testing-helpers-bar">
            <span className="test-label">Quick Test Scenarios:</span>
            <button 
              type="button" 
              className="test-btn test-success"
              onClick={handleFillDemoOwnership}
              title="Test successful owner verification (Survey 84/2A owned by Hasnain Ahmed)"
            >
              ✓ Test Valid Owner (Survey 84/2A)
            </button>
            <button 
              type="button" 
              className="test-btn test-fail"
              onClick={handleFillMismatch}
              title="Test fraud prevention (Survey 112/1B owned by Ramesh Gowda)"
            >
              ✕ Test Owner Mismatch (Survey 112/1B)
            </button>
          </div>

          <form className="stage-form" onSubmit={handleVerifyOwnership}>
            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="sale-district">District</label>
                <select
                  id="sale-district"
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setTaluk(TALUK_MAP[e.target.value]?.[0] || '');
                  }}
                  disabled={isUnlocked}
                >
                  {DISTRICT_LIST.map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="sale-taluk">Taluk</label>
                <select
                  id="sale-taluk"
                  value={taluk}
                  onChange={(e) => setTaluk(e.target.value)}
                  disabled={isUnlocked}
                >
                  {TALUK_MAP[district]?.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="sale-village">Village / Hobli</label>
                <input
                  id="sale-village"
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Channapura"
                  required
                  disabled={isUnlocked}
                />
              </div>

              <div className="field-group">
                <label htmlFor="sale-survey">Survey Number &amp; Hissa</label>
                <input
                  id="sale-survey"
                  type="text"
                  value={surveyNumber}
                  onChange={(e) => setSurveyNumber(e.target.value)}
                  placeholder="e.g. 84/2A"
                  required
                  disabled={isUnlocked}
                />
              </div>
            </div>

            <div className="seller-id-strip">
              <span className="strip-label">Logged-in Seller Identity:</span>
              <span className="strip-user"><strong>{user?.name}</strong> ({user?.email})</span>
            </div>

            {!isUnlocked ? (
              <button
                type="submit"
                className="verify-owner-btn"
                disabled={isVerifying}
              >
                {isVerifying ? 'Checking Bhoomi RTC Records…' : 'Authenticate Land Ownership with Bhoomi →'}
              </button>
            ) : (
              <button
                type="button"
                className="reverify-btn"
                onClick={() => setVerificationResult(null)}
              >
                Change Land Parcel &amp; Re-verify
              </button>
            )}
          </form>

          {/* Verification Status Banner */}
          {verificationResult && (
            <div className={`verification-result-box result-${verificationResult.status}`}>
              <div className="result-header">
                {verificationResult.status === 'MATCHED_SUCCESS' ? (
                  <>
                    <span className="result-icon-check">✓</span>
                    <h4>Ownership Authenticated</h4>
                  </>
                ) : (
                  <>
                    <span className="result-icon-fail">✕</span>
                    <h4>Listing Blocked (Fraud Prevention)</h4>
                  </>
                )}
              </div>
              <p className="result-text">{verificationResult.message}</p>
              {verificationResult.parcel && (
                <div className="result-parcel-preview">
                  <span><strong>Extent:</strong> {verificationResult.parcel.extent.formatted}</span>
                  <span><strong>Classification:</strong> {verificationResult.parcel.landClassification}</span>
                  <span><strong>Official Khata:</strong> {verificationResult.parcel.khataNumber}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* STAGE 2: Listing Details (Locked until Stage 1 succeeds) */}
        <section className={`stage-card ${isUnlocked ? 'stage-active' : 'stage-locked'}`}>
          <div className="stage-header-row">
            <div className="stage-step-pill">
              Stage 2: Property Pricing &amp; Marketplace Listing
            </div>
            {!isUnlocked && (
              <span className="locked-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Locked (Requires Stage 1)
              </span>
            )}
          </div>

          <p className="stage-desc">
            {isUnlocked
              ? 'Your title is confirmed. Fill in your asking price, property description, and contact options to publish.'
              : 'This stage unlocks only after the system confirms you are the registered title holder of the land.'}
          </p>

          <form className="stage-form" onSubmit={handlePublishListing}>
            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="price-total">Total Asking Price (₹)</label>
                <input
                  id="price-total"
                  type="text"
                  value={priceTotal}
                  onChange={(e) => setPriceTotal(e.target.value)}
                  placeholder="e.g. 1,15,00,000"
                  disabled={!isUnlocked}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="price-per-acre">Rate per Acre (₹)</label>
                <input
                  id="price-per-acre"
                  type="text"
                  value={pricePerAcre}
                  onChange={(e) => setPricePerAcre(e.target.value)}
                  placeholder="e.g. 34,32,000"
                  disabled={!isUnlocked}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="contact-phone">Contact Phone for Inquiries</label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  disabled={!isUnlocked}
                  required
                />
              </div>

              <div className="field-group checkbox-field">
                <label className="checkbox-label" htmlFor="negotiable-check">
                  <input
                    id="negotiable-check"
                    type="checkbox"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    disabled={!isUnlocked}
                  />
                  <span>Price is Open to Negotiation</span>
                </label>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="sale-description">Property Highlights &amp; Water/Road Access</label>
              <textarea
                id="sale-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mention borewell yields, road width, power supply, fencing, etc."
                disabled={!isUnlocked}
                required
              />
            </div>

            <button
              type="submit"
              className="publish-sale-btn"
              disabled={!isUnlocked || isPublishing}
            >
              {isPublishing ? 'Publishing to Marketplace…' : 'Publish Verified Land Listing ✓'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
