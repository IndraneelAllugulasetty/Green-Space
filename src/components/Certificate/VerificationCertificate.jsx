import { useLanguage } from '../../context/LanguageContext';
import './VerificationCertificate.css';

export function VerificationCertificate({ parcel, onClose }) {
  const { t } = useLanguage();
  if (!parcel) return null;

  function handlePrint() {
    window.print();
  }

  // Simulated certificate serial & SHA256 integrity hash
  const certSerial = `KA-REV-PG-${parcel.surveyNumber.replace('/', '-')}-${parcel.district.slice(0, 3).toUpperCase()}-2026`;
  const integrityHash = `e8f49a2b7c61d503e2910fa88921be047d89c3f2716490ab7632ce881023d5a7`;

  return (
    <div className="cert-modal-backdrop" role="dialog" aria-modal="true" aria-label="Official Land Verification Certificate">
      <div className="cert-modal-container">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="cert-modal-actions no-print">
          <div className="cert-status-tag">
            <span className="cert-pulse-dot" />
            <span>{t('cert_badge')}</span>
          </div>

          <div className="cert-btn-group">
            <button
              type="button"
              className="cert-print-btn"
              onClick={handlePrint}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              {t('cert_print_btn')}
            </button>
            <button
              type="button"
              className="cert-close-btn"
              onClick={onClose}
              aria-label="Close Certificate"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Printable Certificate Parchment */}
        <div className="cert-parchment-sheet">
          {/* Ornate Double Border */}
          <div className="cert-inner-frame">
            {/* Certificate Header */}
            <header className="cert-header">
              <div className="cert-emblem-wrap">
                <div className="cert-emblem-badge">
                  <span className="cert-leaf-icon">🌱</span>
                </div>
              </div>

              <div className="cert-title-group">
                <span className="cert-authority-title">{t('cert_govt_header')}</span>
                <span className="cert-project-title">{t('cert_sub_header')}</span>
                <h1 className="cert-main-headline">{t('landing_btn_cert').toUpperCase()}</h1>
                <span className="cert-issued-under">Bhoomi RTC &amp; Mojini GIS Spatial Record</span>
              </div>
            </header>

            {/* Serial & Integrity Ribbon */}
            <div className="cert-serial-bar">
              <div>
                <span className="serial-label">CERTIFICATE ID:</span>
                <strong className="serial-value">{certSerial}</strong>
              </div>
              <div>
                <span className="serial-label">TIMESTAMP:</span>
                <strong className="serial-value">{parcel.recordFreshness}</strong>
              </div>
            </div>

            {/* Certificate Body Paragraph */}
            <div className="cert-prose-body">
              <p>
                This is to officially certify that the land parcel detailed hereunder has been cross-referenced against the
                Government of Karnataka digitized <strong>Bhoomi RTC (Record of Rights, Tenancy and Crops)</strong> and
                <strong>Mojini Cadastral Boundary</strong> GIS indices. The records confirm that the ownership title and spatial
                extents stand verified as of the date of inquiry.
              </p>
            </div>

            {/* Structured Land Details Grid */}
            <div className="cert-details-grid">
              <div className="cert-detail-cell">
                <span className="cell-label">{t('common_survey_no').toUpperCase()} &amp; HISSA</span>
                <strong className="cell-val highlight-val">{t('common_survey_no')} {parcel.surveyNumber} (Hissa {parcel.hissaNumber})</strong>
              </div>

              <div className="cert-detail-cell">
                <span className="cell-label">{t('common_owner').toUpperCase()}</span>
                <strong className="cell-val highlight-val">{parcel.ownerName}</strong>
              </div>

              <div className="cert-detail-cell">
                <span className="cell-label">LOCATION</span>
                <span className="cell-val">{parcel.village}, {parcel.hobli} Hobli, {parcel.taluk} Taluk, {parcel.district}</span>
              </div>

              <div className="cert-detail-cell">
                <span className="cell-label">{t('common_extent').toUpperCase()}</span>
                <span className="cell-val">{parcel.extent.formatted} ({parcel.extent.totalSqMeters.toLocaleString()} sq. meters)</span>
              </div>

              <div className="cert-detail-cell">
                <span className="cell-label">{t('common_class').toUpperCase()}</span>
                <span className="cell-val">{parcel.landClassification}</span>
              </div>

              <div className="cert-detail-cell">
                <span className="cell-label">OFFICIAL KHATA NUMBER</span>
                <span className="cell-val code-style">{parcel.khataNumber}</span>
              </div>

              <div className="cert-detail-cell">
                <span className="cell-label">{t('common_encumbrance').toUpperCase()}</span>
                <span className="cell-val success-val">{parcel.encumbranceStatus}</span>
              </div>

              <div className="cert-detail-cell">
                <span className="cell-label">{t('details_lbl_guideline').toUpperCase()}</span>
                <span className="cell-val">{parcel.guidanceValuePerAcre}</span>
              </div>
            </div>

            {/* Cadastral Coordinates & Neighbors Strip */}
            <div className="cert-spatial-box">
              <div className="spatial-coords">
                <strong>GNSS WGS84 Coordinates:</strong> {parcel.coordinates.lat}° N, {parcel.coordinates.lng}° E ({parcel.coordinates.elevation})
              </div>
              <div className="spatial-boundaries">
                <span><strong>North:</strong> {parcel.boundaries.north}</span>
                <span><strong>South:</strong> {parcel.boundaries.south}</span>
                <span><strong>East:</strong> {parcel.boundaries.east}</span>
                <span><strong>West:</strong> {parcel.boundaries.west}</span>
              </div>
            </div>

            {/* Cryptographic Seal & Signature Block */}
            <footer className="cert-signature-footer">
              <div className="cert-qr-col">
                <div className="cert-qr-box">
                  <div className="cert-qr-pattern" />
                </div>
                <span className="cert-qr-sub">{t('cert_qr_notice')}</span>
              </div>

              <div className="cert-crypto-col">
                <span className="crypto-title">SHA-256 DIGITAL INTEGRITY HASH</span>
                <code className="crypto-hash">{integrityHash}</code>
                <span className="crypto-disclaimer">
                  Tamper-evident verification token generated by Project Green Gateway.
                </span>
              </div>

              <div className="cert-seal-col">
                <div className="cert-gold-seal">
                  <span className="seal-text-top">BHOOMI &amp; MOJINI</span>
                  <span className="seal-center-check">✓</span>
                  <span className="seal-text-bot">VERIFIED 2026</span>
                </div>
                <span className="seal-officer">{t('cert_seal_text')}</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
