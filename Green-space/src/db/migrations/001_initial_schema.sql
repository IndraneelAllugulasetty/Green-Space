-- migrations/001_initial_schema.sql
-- Production PostgreSQL + PostGIS schema for Project Green

-- Enable PostGIS extension if available
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. DATA SOURCES REGISTRY
CREATE TABLE IF NOT EXISTS data_sources (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(64) NOT NULL,
    access_method VARCHAR(64) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reliability_score NUMERIC(3, 2) DEFAULT 1.00,
    config JSONB DEFAULT '{}'::jsonb,
    last_successful_fetch TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PARCELS TABLE (Stable Land Parcel Identity)
CREATE TABLE IF NOT EXISTS parcels (
    id VARCHAR(128) PRIMARY KEY,
    official_id VARCHAR(128),
    state VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    taluk VARCHAR(64) NOT NULL,
    hobli VARCHAR(64),
    village VARCHAR(64) NOT NULL,
    survey_number VARCHAR(32) NOT NULL,
    hissa VARCHAR(32),
    geometry GEOMETRY(Geometry, 4326),
    latest_version_id VARCHAR(64),
    latest_source_id VARCHAR(64) REFERENCES data_sources(id),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcels_official_id ON parcels(official_id);
CREATE INDEX IF NOT EXISTS idx_parcels_hierarchy ON parcels(state, district, taluk, village, survey_number);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);

-- 3. PARCEL RECORD VERSIONS (Immutable historical snapshots)
CREATE TABLE IF NOT EXISTS parcel_record_versions (
    id VARCHAR(64) PRIMARY KEY,
    parcel_id VARCHAR(128) NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    normalized_data JSONB NOT NULL,
    canonical_hash CHAR(64) NOT NULL,
    source_id VARCHAR(64) NOT NULL REFERENCES data_sources(id),
    source_record_id VARCHAR(128),
    source_effective_at TIMESTAMPTZ,
    first_retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_summary JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'COMMITTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_parcel_sequence UNIQUE (parcel_id, sequence_number),
    CONSTRAINT uq_parcel_hash UNIQUE (parcel_id, canonical_hash)
);

CREATE INDEX IF NOT EXISTS idx_versions_parcel_seq ON parcel_record_versions(parcel_id, sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_versions_last_verified ON parcel_record_versions(last_verified_at);

-- Foreign key on parcels to latest_version_id
ALTER TABLE parcels 
ADD CONSTRAINT fk_parcels_latest_version 
FOREIGN KEY (latest_version_id) REFERENCES parcel_record_versions(id) DEFERRABLE INITIALLY DEFERRED;

-- 4. SYNCHRONIZATION ATTEMPTS (Audit of every refresh & fetch)
CREATE TABLE IF NOT EXISTS sync_attempts (
    id VARCHAR(64) PRIMARY KEY,
    parcel_id VARCHAR(128) NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES data_sources(id),
    trigger_type VARCHAR(32) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_category VARCHAR(64),
    error_message TEXT,
    data_changed BOOLEAN NOT NULL DEFAULT FALSE,
    previous_version_id VARCHAR(64),
    new_version_id VARCHAR(64) REFERENCES parcel_record_versions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_attempts_parcel ON sync_attempts(parcel_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_attempts_status ON sync_attempts(status);

-- 5. AUDIT HISTORY (Append-only audit trail)
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    parcel_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    actor VARCHAR(64) NOT NULL DEFAULT 'SYSTEM_WORKER',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_parcel ON audit_events(parcel_id, created_at DESC);

-- 6. SOURCE CONFLICTS (Preserves disagreements without silent overwrite)
CREATE TABLE IF NOT EXISTS source_conflicts (
    id VARCHAR(64) PRIMARY KEY,
    parcel_id VARCHAR(128) NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    source_a_id VARCHAR(64) NOT NULL REFERENCES data_sources(id),
    source_b_id VARCHAR(64) NOT NULL REFERENCES data_sources(id),
    version_a_id VARCHAR(64) REFERENCES parcel_record_versions(id),
    version_b_id VARCHAR(64) REFERENCES parcel_record_versions(id),
    conflict_details JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'UNRESOLVED',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conflicts_parcel ON source_conflicts(parcel_id, status);
