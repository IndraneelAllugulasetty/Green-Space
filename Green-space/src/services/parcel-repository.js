// src/services/parcel-repository.js
// Persistent shared repository data-access layer

const crypto = require('node:crypto');
const { defaultDbManager } = require('../db/database');

class ParcelRepository {
  constructor(dbManager = defaultDbManager) {
    this.dbManager = dbManager;
  }

  get db() {
    return this.dbManager.getDb();
  }

  findParcelById(parcelId) {
    const stmt = this.db.prepare(`
      SELECT p.*, s.name as latest_source_name
      FROM parcels p
      LEFT JOIN data_sources s ON p.latest_source_id = s.id
      WHERE p.id = ?
    `);
    const row = stmt.get(parcelId);
    return row ? this.mapParcel(row) : null;
  }

  findParcelByOfficialId(officialId) {
    const stmt = this.db.prepare(`
      SELECT p.*, s.name as latest_source_name
      FROM parcels p
      LEFT JOIN data_sources s ON p.latest_source_id = s.id
      WHERE p.official_id = ?
    `);
    const row = stmt.get(officialId);
    return row ? this.mapParcel(row) : null;
  }

  findParcelByHierarchy(state, district, taluk, village, surveyNumber, hissa) {
    let sql = `
      SELECT p.*, s.name as latest_source_name
      FROM parcels p
      LEFT JOIN data_sources s ON p.latest_source_id = s.id
      WHERE p.state = ? AND p.district = ? AND p.taluk = ? AND p.village = ? AND p.survey_number = ?
    `;
    const params = [state, district, taluk, village, surveyNumber];
    if (hissa) {
      sql += ' AND p.hissa = ?';
      params.push(hissa);
    }

    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    return row ? this.mapParcel(row) : null;
  }

  listActiveParcelsWithGeometry() {
    const stmt = this.db.prepare(`
      SELECT p.*, s.name as latest_source_name
      FROM parcels p
      LEFT JOIN data_sources s ON p.latest_source_id = s.id
      WHERE p.status = 'ACTIVE' AND p.geometry IS NOT NULL
    `);
    return stmt.all().map((row) => this.mapParcel(row));
  }

  getLatestRecord(parcelId) {
    const stmt = this.db.prepare(`
      SELECT 
        p.id as parcel_id,
        p.official_id,
        p.state,
        p.district,
        p.taluk,
        p.hobli,
        p.village,
        p.survey_number,
        p.hissa,
        p.geometry,
        p.status as parcel_status,
        v.id as version_id,
        v.sequence_number,
        v.normalized_data,
        v.canonical_hash,
        v.source_id,
        v.source_record_id,
        v.source_effective_at,
        v.first_retrieved_at,
        v.last_verified_at,
        v.change_summary,
        v.status as version_status,
        v.created_at as version_created_at,
        s.name as source_name,
        s.source_type
      FROM parcels p
      JOIN parcel_record_versions v ON p.latest_version_id = v.id
      JOIN data_sources s ON v.source_id = s.id
      WHERE p.id = ?
    `);
    const row = stmt.get(parcelId);
    return row ? this.mapRecordView(row) : null;
  }

  getVersionById(versionId) {
    const stmt = this.db.prepare(`
      SELECT v.*, s.name as source_name, s.source_type
      FROM parcel_record_versions v
      JOIN data_sources s ON v.source_id = s.id
      WHERE v.id = ?
    `);
    const row = stmt.get(versionId);
    return row ? this.mapVersion(row) : null;
  }

  getVersionHistory(parcelId, limit = 20, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT v.*, s.name as source_name, s.source_type
      FROM parcel_record_versions v
      JOIN data_sources s ON v.source_id = s.id
      WHERE v.parcel_id = ?
      ORDER BY v.sequence_number DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(parcelId, limit, offset);

    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total FROM parcel_record_versions WHERE parcel_id = ?
    `);
    const total = countStmt.get(parcelId).total;

    return {
      total,
      limit,
      offset,
      versions: rows.map(r => this.mapVersion(r))
    };
  }

  getSyncAttempts(parcelId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT a.*, s.name as source_name
      FROM sync_attempts a
      JOIN data_sources s ON a.source_id = s.id
      WHERE a.parcel_id = ?
      ORDER BY a.started_at DESC
      LIMIT ?
    `);
    return stmt.all(parcelId, limit);
  }

  getAuditEvents(parcelId, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_events
      WHERE parcel_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(parcelId, limit).map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : {}
    }));
  }

  getConflicts(parcelId) {
    const stmt = this.db.prepare(`
      SELECT c.*, s1.name as source_a_name, s2.name as source_b_name
      FROM source_conflicts c
      JOIN data_sources s1 ON c.source_a_id = s1.id
      JOIN data_sources s2 ON c.source_b_id = s2.id
      WHERE c.parcel_id = ?
      ORDER BY c.detected_at DESC
    `);
    return stmt.all(parcelId).map(row => ({
      ...row,
      conflict_details: row.conflict_details ? JSON.parse(row.conflict_details) : {}
    }));
  }

  /**
   * Atomically creates parcel identity, initial version, and audit events in a single transaction.
   */
  createParcelWithInitialVersion({
    parcel,
    normalizedData,
    canonicalHash,
    sourceId,
    sourceRecordId,
    sourceEffectiveAt,
    geometry,
    actor = 'SYSTEM_WORKER'
  }) {
    return this.dbManager.transaction(db => {
      const versionId = crypto.randomUUID();
      const nowIso = new Date().toISOString();

      // 1. Insert parcel
      db.prepare(`
        INSERT INTO parcels (
          id, official_id, state, district, taluk, hobli, village, survey_number, hissa,
          geometry, latest_version_id, latest_source_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(
        parcel.id,
        parcel.officialId || null,
        parcel.state,
        parcel.district,
        parcel.taluk,
        parcel.hobli || null,
        parcel.village,
        parcel.surveyNumber,
        parcel.hissa || null,
        geometry ? JSON.stringify(geometry) : null,
        versionId,
        sourceId,
        nowIso,
        nowIso
      );

      // 2. Insert initial version (sequence 1)
      db.prepare(`
        INSERT INTO parcel_record_versions (
          id, parcel_id, sequence_number, normalized_data, canonical_hash,
          source_id, source_record_id, source_effective_at, first_retrieved_at,
          last_verified_at, change_summary, status, created_at
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'COMMITTED', ?)
      `).run(
        versionId,
        parcel.id,
        JSON.stringify(normalizedData),
        canonicalHash,
        sourceId,
        sourceRecordId || null,
        sourceEffectiveAt || nowIso,
        nowIso,
        nowIso,
        JSON.stringify({ note: 'Initial baseline record version' }),
        nowIso
      );

      // 3. Insert audit events
      const auditStmt = db.prepare(`
        INSERT INTO audit_events (id, parcel_id, event_type, actor, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      auditStmt.run(
        crypto.randomUUID(),
        parcel.id,
        'PARCEL_DISCOVERED',
        actor,
        JSON.stringify({ officialId: parcel.officialId, sourceId }),
        nowIso
      );

      auditStmt.run(
        crypto.randomUUID(),
        parcel.id,
        'VERSION_CREATED',
        actor,
        JSON.stringify({ versionId, sequenceNumber: 1, canonicalHash, sourceId }),
        nowIso
      );

      return {
        parcelId: parcel.id,
        versionId,
        sequenceNumber: 1,
        canonicalHash,
        lastVerifiedAt: nowIso
      };
    });
  }

  /**
   * Atomically adds a new immutable version and updates the latest-version pointer in a single transaction.
   */
  addNewVersion({
    parcelId,
    normalizedData,
    canonicalHash,
    sourceId,
    sourceRecordId,
    sourceEffectiveAt,
    changeSummary,
    geometry,
    actor = 'SYSTEM_WORKER'
  }) {
    return this.dbManager.transaction(db => {
      const nowIso = new Date().toISOString();

      // Get current max sequence number
      const seqRow = db.prepare(`
        SELECT COALESCE(MAX(sequence_number), 0) as max_seq
        FROM parcel_record_versions
        WHERE parcel_id = ?
      `).get(parcelId);

      const nextSequence = (seqRow ? seqRow.max_seq : 0) + 1;
      const versionId = crypto.randomUUID();

      // 1. Insert new immutable version
      db.prepare(`
        INSERT INTO parcel_record_versions (
          id, parcel_id, sequence_number, normalized_data, canonical_hash,
          source_id, source_record_id, source_effective_at, first_retrieved_at,
          last_verified_at, change_summary, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMMITTED', ?)
      `).run(
        versionId,
        parcelId,
        nextSequence,
        JSON.stringify(normalizedData),
        canonicalHash,
        sourceId,
        sourceRecordId || null,
        sourceEffectiveAt || nowIso,
        nowIso,
        nowIso,
        changeSummary ? JSON.stringify(changeSummary) : null,
        nowIso
      );

      // 2. Mark previous version as SUPERSEDED
      db.prepare(`
        UPDATE parcel_record_versions
        SET status = 'SUPERSEDED'
        WHERE parcel_id = ? AND sequence_number < ?
      `).run(parcelId, nextSequence);

      // 3. Atomically update parcel's latest_version_id and latest_source_id
      let updateSql = `
        UPDATE parcels
        SET latest_version_id = ?, latest_source_id = ?, updated_at = ?
      `;
      const updateParams = [versionId, sourceId, nowIso];

      if (geometry) {
        updateSql += ', geometry = ?';
        updateParams.push(JSON.stringify(geometry));
      }

      updateSql += ' WHERE id = ?';
      updateParams.push(parcelId);

      db.prepare(updateSql).run(...updateParams);

      // 4. Audit events
      const auditStmt = db.prepare(`
        INSERT INTO audit_events (id, parcel_id, event_type, actor, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      auditStmt.run(
        crypto.randomUUID(),
        parcelId,
        'VERSION_CREATED',
        actor,
        JSON.stringify({ versionId, sequenceNumber: nextSequence, canonicalHash, sourceId }),
        nowIso
      );

      auditStmt.run(
        crypto.randomUUID(),
        parcelId,
        'LATEST_POINTER_UPDATED',
        actor,
        JSON.stringify({ previousVersionSequence: nextSequence - 1, newVersionId: versionId }),
        nowIso
      );

      return {
        parcelId,
        versionId,
        sequenceNumber: nextSequence,
        canonicalHash,
        lastVerifiedAt: nowIso
      };
    });
  }

  /**
   * Updates verification timestamp without creating a duplicate version.
   */
  updateLastVerified(parcelId, versionId, timestampIso = new Date().toISOString(), actor = 'SYSTEM_WORKER') {
    return this.dbManager.transaction(db => {
      db.prepare(`
        UPDATE parcel_record_versions
        SET last_verified_at = ?
        WHERE id = ? AND parcel_id = ?
      `).run(timestampIso, versionId, parcelId);

      db.prepare(`
        UPDATE parcels
        SET updated_at = ?
        WHERE id = ?
      `).run(timestampIso, parcelId);

      db.prepare(`
        INSERT INTO audit_events (id, parcel_id, event_type, actor, details, created_at)
        VALUES (?, ?, 'UNCHANGED_VERIFIED', ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        parcelId,
        actor,
        JSON.stringify({ versionId, verifiedAt: timestampIso }),
        timestampIso
      );
    });
  }

  /**
   * Records a synchronization attempt for traceability and observability.
   */
  recordSyncAttempt({
    parcelId,
    sourceId,
    triggerType,
    startedAt,
    completedAt = new Date().toISOString(),
    status,
    retryCount = 0,
    errorCategory = null,
    errorMessage = null,
    dataChanged = false,
    previousVersionId = null,
    newVersionId = null
  }) {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO sync_attempts (
        id, parcel_id, source_id, trigger_type, started_at, completed_at,
        status, retry_count, error_category, error_message, data_changed,
        previous_version_id, new_version_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      id,
      parcelId,
      sourceId,
      triggerType,
      startedAt,
      completedAt,
      status,
      retryCount,
      errorCategory,
      errorMessage,
      dataChanged ? 1 : 0,
      previousVersionId,
      newVersionId
    );

    return id;
  }

  /**
   * Records source conflicts when two sources disagree.
   */
  recordConflict({
    parcelId,
    sourceAId,
    sourceBId,
    versionAId,
    versionBId,
    conflictDetails,
    actor = 'SYSTEM_WORKER'
  }) {
    return this.dbManager.transaction(db => {
      const conflictId = crypto.randomUUID();
      const nowIso = new Date().toISOString();

      db.prepare(`
        INSERT INTO source_conflicts (
          id, parcel_id, source_a_id, source_b_id, version_a_id, version_b_id,
          conflict_details, status, detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'UNRESOLVED', ?)
      `).run(
        conflictId,
        parcelId,
        sourceAId,
        sourceBId,
        versionAId || null,
        versionBId || null,
        JSON.stringify(conflictDetails),
        nowIso
      );

      // Flag parcel as CONFLICT status
      db.prepare(`
        UPDATE parcels
        SET status = 'CONFLICT', updated_at = ?
        WHERE id = ?
      `).run(nowIso, parcelId);

      db.prepare(`
        INSERT INTO audit_events (id, parcel_id, event_type, actor, details, created_at)
        VALUES (?, ?, 'CONFLICT_DETECTED', ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        parcelId,
        actor,
        JSON.stringify({ conflictId, sourceAId, sourceBId, conflictDetails }),
        nowIso
      );

      return conflictId;
    });
  }

  mapParcel(row) {
    return {
      id: row.id,
      officialId: row.official_id,
      state: row.state,
      district: row.district,
      taluk: row.taluk,
      hobli: row.hobli,
      village: row.village,
      surveyNumber: row.survey_number,
      hissa: row.hissa,
      geometry: row.geometry ? JSON.parse(row.geometry) : null,
      latestVersionId: row.latest_version_id,
      latestSourceId: row.latest_source_id,
      latestSourceName: row.latest_source_name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapVersion(row) {
    return {
      id: row.id,
      parcelId: row.parcel_id,
      sequenceNumber: row.sequence_number,
      normalizedData: row.normalized_data ? JSON.parse(row.normalized_data) : {},
      canonicalHash: row.canonical_hash,
      sourceId: row.source_id,
      sourceName: row.source_name,
      sourceType: row.source_type,
      sourceRecordId: row.source_record_id,
      sourceEffectiveAt: row.source_effective_at,
      firstRetrievedAt: row.first_retrieved_at,
      lastVerifiedAt: row.last_verified_at,
      changeSummary: row.change_summary ? JSON.parse(row.change_summary) : null,
      status: row.status,
      createdAt: row.created_at
    };
  }

  mapRecordView(row) {
    return {
      parcel: {
        id: row.parcel_id,
        officialId: row.official_id,
        state: row.state,
        district: row.district,
        taluk: row.taluk,
        hobli: row.hobli,
        village: row.village,
        surveyNumber: row.survey_number,
        hissa: row.hissa,
        geometry: row.geometry ? JSON.parse(row.geometry) : null,
        status: row.parcel_status
      },
      latestVersion: {
        id: row.version_id,
        sequenceNumber: row.sequence_number,
        data: row.normalized_data ? JSON.parse(row.normalized_data) : {},
        canonicalHash: row.canonical_hash,
        sourceId: row.source_id,
        sourceName: row.source_name,
        sourceType: row.source_type,
        sourceRecordId: row.source_record_id,
        sourceEffectiveAt: row.source_effective_at,
        firstRetrievedAt: row.first_retrieved_at,
        lastVerifiedAt: row.last_verified_at,
        changeSummary: row.change_summary ? JSON.parse(row.change_summary) : null,
        status: row.version_status,
        createdAt: row.version_created_at
      }
    };
  }
}

module.exports = ParcelRepository;
