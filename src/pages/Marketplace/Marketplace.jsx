import { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { MOCK_LAND_PARCELS, DISTRICT_LIST } from '../../data/mockLandData';
import './Marketplace.css';

export function Marketplace() {
  const { navigateTo, setSelectedLand, showToast } = useNavigation();
  const { user } = useAuth();

  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedClassification, setSelectedClassification] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inquiryModalParcel, setInquiryModalParcel] = useState(null);

  // Inquiry form states
  const [buyerName, setBuyerName] = useState(user?.name || '');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '');
  const [buyerMessage, setBuyerMessage] = useState(
    'Hello, I reviewed your Bhoomi RTC verification on Project Green and would like to arrange a site visit.'
  );

  // Filter listings marked for sale
  const saleListings = MOCK_LAND_PARCELS.filter((p) => p.isListedForSale);

  const filteredListings = saleListings.filter((parcel) => {
    if (selectedDistrict !== 'All' && parcel.district !== selectedDistrict) {
      return false;
    }
    if (selectedClassification !== 'All') {
      if (selectedClassification === 'Agricultural' && !parcel.landClassification.includes('Agricultural')) {
        return false;
      }
      if (selectedClassification === 'Commercial' && !parcel.landClassification.includes('Commercial')) {
        return false;
      }
      if (selectedClassification === 'Plantation' && !parcel.landClassification.includes('Plantation')) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSurvey = parcel.surveyNumber.toLowerCase().includes(q);
      const matchVillage = parcel.village.toLowerCase().includes(q);
      const matchOwner = parcel.ownerName.toLowerCase().includes(q);
      return matchSurvey || matchVillage || matchOwner;
    }
    return true;
  });

  function handleInspect(parcel) {
    setSelectedLand(parcel);
    navigateTo('land-details', parcel);
  }

  function handleSendInquiry(event) {
    event.preventDefault();
    if (!inquiryModalParcel) return;

    showToast(
      `Inquiry successfully sent to ${inquiryModalParcel.saleDetails?.listedBy || 'the title holder'}! They will contact you shortly.`,
      'success'
    );
    setInquiryModalParcel(null);
  }

  return (
    <div className="marketplace-page">
      {/* Header Banner */}
      <section className="marketplace-hero">
        <div className="marketplace-hero-content">
          <div className="hero-shield-pill">
            <span className="shield-dot" />
            <span>Zero Broker Fraud — 100% Bhoomi Title Checked</span>
          </div>
          <h1 className="marketplace-headline">
            Verified Karnataka Land Marketplace
          </h1>
          <p className="marketplace-sub">
            Direct transactions with authenticated title holders. Every parcel listed below has successfully completed automated cross-verification with official Government of Karnataka revenue records.
          </p>
        </div>

        <div className="marketplace-cta-card">
          <div className="cta-inner">
            <span className="cta-icon">🏡</span>
            <div>
              <h4>Are you a landholder?</h4>
              <p>Pass the 2-step Bhoomi title check and list your property directly to buyers.</p>
            </div>
          </div>
          <button
            type="button"
            className="cta-sell-btn"
            onClick={() => navigateTo('upload-sale')}
          >
            Authenticate &amp; List Your Land →
          </button>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="marketplace-filter-bar">
        <div className="filter-item-search">
          <label htmlFor="market-search">Search Marketplace</label>
          <input
            id="market-search"
            type="text"
            placeholder="Search by survey no, village, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label htmlFor="market-district">District</label>
          <select
            id="market-district"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            <option value="All">All Districts ({saleListings.length})</option>
            {DISTRICT_LIST.map((dist) => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="market-class">Zoning / Classification</label>
          <select
            id="market-class"
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value)}
          >
            <option value="All">All Classifications</option>
            <option value="Agricultural">Agricultural (Kushki / Tari)</option>
            <option value="Plantation">Plantation (Coffee / Pepper)</option>
            <option value="Commercial">Commercial / DC Converted</option>
          </select>
        </div>
      </section>

      {/* Listings Count & Grid */}
      <section className="marketplace-listings-container">
        <div className="listings-counter-row">
          <span className="counter-text">
            Showing <strong>{filteredListings.length}</strong> Bhoomi-Authenticated Properties
          </span>
          <span className="counter-badge">✓ Clean Titles Guaranteed</span>
        </div>

        {filteredListings.length > 0 ? (
          <div className="marketplace-grid">
            {filteredListings.map((parcel) => (
              <div key={parcel.id} className="market-card">
                <div className="market-card-media">
                  <img src={parcel.coverImage} alt={`Survey ${parcel.surveyNumber}`} />
                  <span className="market-price-tag">
                    {parcel.saleDetails?.priceTotal || 'Price on Request'}
                  </span>
                  <span className="market-verified-badge">
                    ✓ Bhoomi Verified
                  </span>
                </div>

                <div className="market-card-content">
                  <div className="market-title-row">
                    <h3 className="market-survey-title">Survey No. {parcel.surveyNumber}</h3>
                    <span className="market-rate-pill">
                      {parcel.saleDetails?.pricePerAcre ? `${parcel.saleDetails.pricePerAcre} / acre` : ''}
                    </span>
                  </div>

                  <p className="market-location-text">
                    {parcel.village}, {parcel.taluk}, {parcel.district}
                  </p>

                  <div className="market-specs-chips">
                    <span className="spec-chip">📐 {parcel.extent.formatted}</span>
                    <span className="spec-chip">🌱 {parcel.landClassification.split('(')[0]}</span>
                    <span className="spec-chip">💧 {parcel.waterSource.split('+')[0]}</span>
                  </div>

                  <p className="market-description-excerpt">
                    &ldquo;{parcel.saleDetails?.description || 'Prime land parcel cleared of encumbrance with verified single-owner RTC.'}&rdquo;
                  </p>

                  <div className="market-seller-row">
                    <div className="seller-avatar-chip">
                      <span className="seller-initials">
                        {parcel.saleDetails?.listedBy?.slice(0, 2).toUpperCase() || 'TO'}
                      </span>
                      <div className="seller-text">
                        <span className="seller-name">{parcel.saleDetails?.listedBy || parcel.ownerName}</span>
                        <span className="seller-verified-label">✓ Recorded Title Holder</span>
                      </div>
                    </div>
                  </div>

                  <div className="market-card-actions">
                    <button
                      type="button"
                      className="market-inspect-btn"
                      onClick={() => handleInspect(parcel)}
                    >
                      Inspect Bhoomi Dossier →
                    </button>

                    <button
                      type="button"
                      className="market-contact-btn"
                      onClick={() => setInquiryModalParcel(parcel)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      Contact Owner
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="market-empty-box">
            <h4>No Verified Properties Match Your Filter</h4>
            <p>Try resetting filters or changing the selected district.</p>
            <button
              type="button"
              className="market-reset-btn"
              onClick={() => {
                setSelectedDistrict('All');
                setSelectedClassification('All');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Buyer Inquiry Modal */}
      {inquiryModalParcel && (
        <div className="inquiry-modal-backdrop" role="dialog" aria-modal="true" aria-label="Contact Verified Title Holder">
          <div className="inquiry-modal-card">
            <div className="inquiry-modal-header">
              <div>
                <span className="inquiry-kicker">Direct Landholder Inquiry</span>
                <h3>Survey No. {inquiryModalParcel.surveyNumber} ({inquiryModalParcel.village})</h3>
              </div>
              <button 
                type="button" 
                className="inquiry-close" 
                onClick={() => setInquiryModalParcel(null)}
              >
                &times;
              </button>
            </div>

            <div className="inquiry-verified-banner">
              <span className="inquiry-check">✓</span>
              <div>
                <strong>Direct Title Holder: {inquiryModalParcel.saleDetails?.listedBy || inquiryModalParcel.ownerName}</strong>
                <span>Verified phone: {inquiryModalParcel.saleDetails?.contactPhone || '+91 98450 12345'}</span>
              </div>
            </div>

            <form className="inquiry-form" onSubmit={handleSendInquiry}>
              <div className="inquiry-field">
                <label htmlFor="inquiry-name">Your Full Name</label>
                <input
                  id="inquiry-name"
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="inquiry-field">
                <label htmlFor="inquiry-phone">Your Phone Number</label>
                <input
                  id="inquiry-phone"
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                />
              </div>

              <div className="inquiry-field">
                <label htmlFor="inquiry-msg">Message to Landholder</label>
                <textarea
                  id="inquiry-msg"
                  rows={3}
                  required
                  value={buyerMessage}
                  onChange={(e) => setBuyerMessage(e.target.value)}
                />
              </div>

              <div className="inquiry-actions">
                <button
                  type="button"
                  className="inquiry-cancel-btn"
                  onClick={() => setInquiryModalParcel(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="inquiry-submit-btn">
                  Send Direct Inquiry →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
