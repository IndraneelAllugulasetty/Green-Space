-- src/db/migrations/001_sqlite_schema.sql
-- Production SQLite schema for Project Green (ACID compliant with WAL)

PRAGMA foreign_keys = ON;

-- 1. DATA SOURCES REGISTRY
CREATE TABLE IF NOT EXISTS data_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    access_method TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    reliability_score REAL DEFAULT 1.00,
    config TEXT DEFAULT '{}',
    last_successful_fetch TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. PARCELS TABLE (Stable Land Parcel Identity)
CREATE TABLE IF NOT EXISTS parcels (
    id TEXT PRIMARY KEY,
    official_id TEXT,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    taluk TEXT NOT NULL,
    hobli TEXT,
    village TEXT NOT NULL,
    survey_number TEXT NOT NULL,
    hissa TEXT,
    geometry TEXT,
    latest_version_id TEXT,
    latest_source_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (latest_source_id) REFERENCES data_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_parcels_official_id ON parcels(official_id);
CREATE INDEX IF NOT EXISTS idx_parcels_hierarchy ON parcels(state, district, taluk, village, survey_number);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);

-- 3. PARCEL RECORD VERSIONS (Immutable historical snapshots)
CREATE TABLE IF NOT EXISTS parcel_record_versions (
    id TEXT PRIMARY KEY,
    parcel_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    normalized_data TEXT NOT NULL,
    canonical_hash TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_record_id TEXT,
    source_effective_at TEXT,
    first_retrieved_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_verified_at TEXT NOT NULL DEFAULT (datetime('now')),
    change_summary TEXT,
    status TEXT NOT NULL DEFAULT 'COMMITTED',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES data_sources(id),
    CONSTRAINT uq_parcel_sequence UNIQUE (parcel_id, sequence_number),
    CONSTRAINT uq_parcel_hash UNIQUE (parcel_id, canonical_hash)
);

CREATE INDEX IF NOT EXISTS idx_versions_parcel_seq ON parcel_record_versions(parcel_id, sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_versions_last_verified ON parcel_record_versions(last_verified_at);

-- 4. SYNCHRONIZATION ATTEMPTS (Audit of every refresh & fetch)
CREATE TABLE IF NOT EXISTS sync_attempts (
    id TEXT PRIMARY KEY,
    parcel_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_category TEXT,
    error_message TEXT,
    data_changed INTEGER NOT NULL DEFAULT 0,
    previous_version_id TEXT,
    new_version_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (source_id) REFERENCES data_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_sync_attempts_parcel ON sync_attempts(parcel_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_attempts_status ON sync_attempts(status);

-- 5. AUDIT HISTORY (Append-only audit trail)
CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    parcel_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'SYSTEM_WORKER',
    details TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_parcel ON audit_events(parcel_id, created_at DESC);

-- 6. SOURCE CONFLICTS (Preserves disagreements without silent overwrite)
CREATE TABLE IF NOT EXISTS source_conflicts (
    id TEXT PRIMARY KEY,
    parcel_id TEXT NOT NULL,
    source_a_id TEXT NOT NULL,
    source_b_id TEXT NOT NULL,
    version_a_id TEXT,
    version_b_id TEXT,
    conflict_details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNRESOLVED',
    detected_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE CASCADE,
    FOREIGN KEY (source_a_id) REFERENCES data_sources(id),
    FOREIGN KEY (source_b_id) REFERENCES data_sources(id),
    FOREIGN KEY (version_a_id) REFERENCES parcel_record_versions(id),
    FOREIGN KEY (version_b_id) REFERENCES parcel_record_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_conflicts_parcel ON source_conflicts(parcel_id, status);
