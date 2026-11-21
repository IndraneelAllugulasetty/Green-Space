// public/app.js
// Client-side controller for Project Green Land Data Repository UI

const app = {
  currentParcelId: null,
  currentRecord: null,

  async init() {
    await this.fetchHealth();
    // Auto-poll health every 15 seconds
    setInterval(() => this.fetchHealth(), 15000);
  },

  async fetchHealth() {
    try {
      const res = await fetch('/api/v1/sync/health');
      if (!res.ok) return;
      const data = await res.json();

      const pillDb = document.getElementById('pill-db');
      const pillCache = document.getElementById('pill-cache');
      const pillQueue = document.getElementById('pill-queue');

      if (pillDb) {
        pillDb.textContent = `DB: ${data.database.totalParcels} Parcels (${data.database.totalVersions} Vers)`;
        pillDb.style.backgroundColor = data.database.healthy ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)';
      }

      if (pillCache) {
        pillCache.textContent = `Cache: ${data.cache.backend} (${data.cache.hitRate} Hit)`;
      }

      if (pillQueue) {
        pillQueue.textContent = `Worker: ${data.queue.activeJobs} Active / ${data.queue.queuedJobs} Queued`;
      }
    } catch (err) {
      console.warn('Health check error:', err);
    }
  },

  quickLoad(officialId) {
    document.getElementById('official-id').value = officialId;
    if (officialId.startsWith('KA')) {
      document.getElementById('input-state').value = 'Karnataka';
      document.getElementById('input-district').value = 'Bangalore Rural';
      document.getElementById('input-taluk').value = 'Nelamangala';
      document.getElementById('input-village').value = 'Nidavanda';
      document.getElementById('input-survey').value = '142';
      document.getElementById('input-hissa').value = '3A';
    } else {
      document.getElementById('input-state').value = 'Maharashtra';
      document.getElementById('input-district').value = 'Pune';
      document.getElementById('input-taluk').value = 'Haveli';
      document.getElementById('input-village').value = 'Kesnand';
      document.getElementById('input-survey').value = '78';
      document.getElementById('input-hissa').value = '1B';
    }
    document.getElementById('lookup-form').dispatchEvent(new Event('submit', { cancelable: true }));
  },

  async handleLookup(e) {
    if (e) e.preventDefault();
    this.hideAlert();
    this.showLoading('Resolving parcel identity and querying central repository...');

    const payload = {
      officialId: document.getElementById('official-id').value.trim() || undefined,
      state: document.getElementById('input-state').value.trim(),
      district: document.getElementById('input-district').value.trim(),
      taluk: document.getElementById('input-taluk').value.trim(),
      village: document.getElementById('input-village').value.trim(),
      surveyNumber: document.getElementById('input-survey').value.trim(),
      hissa: document.getElementById('input-hissa').value.trim() || undefined
    };

    try {
      const res = await fetch('/api/v1/parcels/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      this.hideLoading();

      if (!res.ok) {
        this.showAlert(data.message || 'Lookup failed', 'alert-danger');
        return;
      }

      if (data.status === 'FETCH_DISPATCHED') {
        this.showAlert(`Parcel not in repository. Initial background fetch dispatched (Job ID: ${data.jobId}). Waiting for worker...`, 'alert-info');
        // Poll for completion
        setTimeout(() => this.pollForParcel(data.parcelId), 1500);
        return;
      }

      if (data.status === 'FOUND') {
        this.currentParcelId = data.parcel.id;
        this.currentRecord = data;
        this.renderParcel(data);
        this.loadSyncStatus(data.parcel.id);
      }
    } catch (err) {
      this.hideLoading();
      this.showAlert(`Network error: ${err.message}`, 'alert-danger');
    }
  },

  async pollForParcel(parcelId, attempts = 0) {
    if (attempts > 10) {
      this.showAlert('Background fetch timed out. Please try again.', 'alert-danger');
      return;
    }

    try {
      const res = await fetch(`/api/v1/parcels/${encodeURIComponent(parcelId)}`);
      if (res.ok) {
        const data = await res.json();
        this.hideAlert();
        this.currentParcelId = data.parcel.id;
        this.currentRecord = data;
        this.renderParcel(data);
        this.loadSyncStatus(data.parcel.id);
      } else {
        setTimeout(() => this.pollForParcel(parcelId, attempts + 1), 1000);
      }
    } catch (err) {
      setTimeout(() => this.pollForParcel(parcelId, attempts + 1), 1000);
    }
  },

  renderParcel(data) {
    const p = data.parcel;
    const v = data.latestVersion;
    const f = data.freshness;
    const details = v.data?.landDetails || {};
    const owners = v.data?.owners || [];
    const liabilities = v.data?.liabilities || [];

    // Freshness Banner configuration
    const banner = document.getElementById('freshness-banner');
    const bannerTitle = document.getElementById('banner-status-text');
    const bannerWarning = document.getElementById('banner-warning-text');
    const bannerIcon = document.getElementById('banner-icon');

    banner.className = 'freshness-banner';

    if (f.isHistorical) {
      banner.classList.add('banner-historical');
      bannerIcon.textContent = '📜';
      bannerTitle.textContent = 'Historical Version';
    } else if (f.status === 'FRESH') {
      banner.classList.add('banner-fresh');
      bannerIcon.textContent = '✔';
      bannerTitle.textContent = 'Verified Fresh Record';
    } else if (f.status === 'STALE') {
      banner.classList.add('banner-stale');
      bannerIcon.textContent = '⚠';
      bannerTitle.textContent = 'Stale Stored Record';
    } else if (f.status === 'REFRESH_IN_PROGRESS') {
      banner.classList.add('banner-syncing');
      bannerIcon.textContent = '⏳';
      bannerTitle.textContent = 'Refresh in Progress';
    } else if (f.status === 'REFRESH_FAILED') {
      banner.classList.add('banner-failed');
      bannerIcon.textContent = '✖';
      bannerTitle.textContent = 'Refresh Failed';
    } else {
      banner.classList.add('banner-stale');
      bannerIcon.textContent = 'ℹ';
      bannerTitle.textContent = 'Unverified Data';
    }

    bannerWarning.textContent = f.primaryWarning || f.displayLabel || 'Stored land record.';

    document.getElementById('badge-version').textContent = `v${v.sequenceNumber}`;
    document.getElementById('badge-source-type').textContent = v.source?.type || 'UNKNOWN';

    // Details
    document.getElementById('parcel-id-label').textContent = p.id;
    document.getElementById('val-survey').textContent = `${p.surveyNumber} / ${p.hissa || 'Main'}`;
    document.getElementById('val-official-id').textContent = p.officialId || 'N/A';
    document.getElementById('val-hierarchy').textContent = `${p.village}, ${p.taluk}, ${p.district}, ${p.state}`;
    document.getElementById('val-area').textContent = details.areaBreakup || `${details.totalAreaAcres || '-'} Acres`;
    document.getElementById('val-classification').textContent = details.landClassification || 'Unclassified';
    document.getElementById('val-soil').textContent = details.soilType || 'N/A';

    // Owners table
    const tbodyOwners = document.getElementById('tbody-owners');
    tbodyOwners.innerHTML = '';
    if (owners.length === 0) {
      tbodyOwners.innerHTML = '<tr><td colspan="5" class="text-muted">No owner records reported.</td></tr>';
    } else {
      for (const o of owners) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${o.name || '-'}</strong></td>
          <td>${o.relation || '-'}</td>
          <td><code>${o.khataNumber || '-'}</code></td>
          <td>${o.sharePercentage ? `${o.sharePercentage}%` : '-'}</td>
          <td>${o.acquisitionType || '-'}</td>
        `;
        tbodyOwners.appendChild(tr);
      }
    }

    // Liabilities
    const liabContainer = document.getElementById('liabilities-container');
    if (liabilities.length === 0) {
      liabContainer.innerHTML = '<p class="text-muted">No encumbrances or mortgage charges reported by source.</p>';
    } else {
      let html = '<table class="data-table"><thead><tr><th>Institution</th><th>Amount (INR)</th><th>Charge Type</th><th>Status</th></tr></thead><tbody>';
      for (const l of liabilities) {
        html += `
          <tr>
            <td>${l.bankName}</td>
            <td>₹${l.amountInr.toLocaleString()}</td>
            <td>${l.chargeType}</td>
            <td><span class="badge ${l.chargeStatus === 'ACTIVE' ? 'badge-version' : 'badge-neutral'}">${l.chargeStatus}</span></td>
          </tr>
        `;
      }
      html += '</tbody></table>';
      liabContainer.innerHTML = html;
    }

    // Provenance
    document.getElementById('val-source-name').textContent = v.source?.name || v.sourceId || '-';
    document.getElementById('val-effective-date').textContent = v.effectiveDate ? new Date(v.effectiveDate).toLocaleString() : 'N/A';
    document.getElementById('val-retrieved-date').textContent = v.firstRetrievedDate ? new Date(v.firstRetrievedDate).toLocaleString() : 'N/A';
    document.getElementById('val-verified-date').textContent = v.lastVerifiedDate ? new Date(v.lastVerifiedDate).toLocaleString() : 'N/A';
    document.getElementById('val-hash').textContent = v.canonicalHash || '-';
    document.getElementById('val-cache-source').textContent = data.cacheSource || 'DATABASE';

    document.getElementById('parcel-view').classList.remove('hidden');
  },

  async triggerManualRefresh() {
    if (!this.currentParcelId) return;

    const btn = document.getElementById('btn-manual-refresh');
    btn.disabled = true;
    btn.textContent = '⏳ Queuing Refresh...';

    try {
      const res = await fetch(`/api/v1/parcels/${encodeURIComponent(this.currentParcelId)}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (!res.ok) {
        this.showAlert(data.message || 'Refresh failed', 'alert-danger');
        btn.disabled = false;
        btn.textContent = '🔄 Request Source Refresh';
        return;
      }

      this.showAlert('Manual refresh job enqueued. Waiting for worker execution...', 'alert-info');

      // Wait 1.5 seconds and re-fetch parcel to show outcome
      setTimeout(async () => {
        const fetchRes = await fetch(`/api/v1/parcels/${encodeURIComponent(this.currentParcelId)}`);
        if (fetchRes.ok) {
          const updated = await fetchRes.json();
          this.renderParcel(updated);
          this.loadSyncStatus(this.currentParcelId);
          this.showAlert('Refresh completed. Latest verification data loaded.', 'alert-info');
        }
        btn.disabled = false;
        btn.textContent = '🔄 Request Source Refresh';
      }, 1500);

    } catch (err) {
      this.showAlert(`Error: ${err.message}`, 'alert-danger');
      btn.disabled = false;
      btn.textContent = '🔄 Request Source Refresh';
    }
  },

  async loadHistory() {
    if (!this.currentParcelId) return;

    const container = document.getElementById('history-timeline');
    container.innerHTML = '<p class="text-muted">Loading version snapshots...</p>';

    try {
      const res = await fetch(`/api/v1/parcels/${encodeURIComponent(this.currentParcelId)}/history`);
      if (!res.ok) {
        container.innerHTML = '<p class="text-muted">Failed to load history.</p>';
        return;
      }

      const data = await res.json();
      if (data.versions.length === 0) {
        container.innerHTML = '<p class="text-muted">No historical versions available.</p>';
        return;
      }

      container.innerHTML = '';
      data.versions.forEach(v => {
        const item = document.createElement('div');
        item.className = `history-item ${v.isLatestKnown ? 'is-selected' : ''}`;
        
        let diffHtml = '';
        if (v.changeSummary && v.changeSummary.hasChanges) {
          diffHtml = `<div class="diff-box">Changes: ${JSON.stringify(v.changeSummary.modified || v.changeSummary, null, 2)}</div>`;
        }

        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>Version #${v.sequenceNumber} ${v.isLatestKnown ? '<span class="badge badge-version">LATEST</span>' : '<span class="badge badge-neutral">HISTORICAL</span>'}</strong>
            <span style="font-size: 0.75rem; color: #666;">Verified: ${new Date(v.lastVerifiedDate).toLocaleDateString()}</span>
          </div>
          <p style="font-size: 0.75rem; color: #666; margin-top: 0.2rem;">Hash: ${v.canonicalHash.substring(0, 16)}...</p>
          ${diffHtml}
        `;

        item.onclick = () => {
          // Display historical version preview
          this.renderParcel({
            parcel: this.currentRecord.parcel,
            latestVersion: v,
            freshness: v.freshness,
            cacheSource: 'DATABASE (HISTORICAL SNAPSHOT)'
          });
        };

        container.appendChild(item);
      });
    } catch (err) {
      container.innerHTML = `<p class="text-muted">Error: ${err.message}</p>`;
    }
  },

  async loadSyncStatus(parcelId) {
    const container = document.getElementById('sync-attempts-list');
    try {
      const res = await fetch(`/api/v1/parcels/${encodeURIComponent(parcelId)}/sync-status`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.recentAttempts || data.recentAttempts.length === 0) {
        container.innerHTML = '<p class="text-muted">No sync attempts recorded yet.</p>';
        return;
      }

      container.innerHTML = '';
      data.recentAttempts.forEach(att => {
        const div = document.createElement('div');
        div.className = 'sync-item';
        const isSuccess = att.status === 'SUCCESS';
        div.innerHTML = `
          <span>
            <strong style="color: ${isSuccess ? '#2e7d32' : '#c62828'}">${att.status}</strong> 
            (${att.trigger_type})
          </span>
          <span>${att.data_changed ? '⚡ Data Changed' : 'Unchanged'}</span>
          <span style="color: #888;">${new Date(att.started_at).toLocaleTimeString()}</span>
        `;
        container.appendChild(div);
      });
    } catch (err) {
      console.warn('Sync status load error:', err);
    }
  },

  showLoading(text) {
    const el = document.getElementById('loading-indicator');
    document.getElementById('loading-text').textContent = text;
    el.classList.remove('hidden');
  },

  hideLoading() {
    document.getElementById('loading-indicator').classList.add('hidden');
  },

  showAlert(message, type = 'alert-danger') {
    const box = document.getElementById('alert-box');
    box.className = `alert-box ${type}`;
    box.textContent = message;
    box.classList.remove('hidden');
  },

  hideAlert() {
    document.getElementById('alert-box').classList.add('hidden');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
