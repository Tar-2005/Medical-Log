-- ============================================================================
-- PATIENT-CENTRIC LONGITUDINAL HEALTH MEMORY LAYER
-- PostgreSQL Schema — Strictly mapped to HL7 FHIR R4 Resources
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM TYPES ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE fhir_gender AS ENUM ('male', 'female', 'other', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE observation_status AS ENUM (
    'registered', 'preliminary', 'final', 'amended',
    'corrected', 'cancelled', 'entered-in-error', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE clinical_impression_status AS ENUM (
    'in-progress', 'completed', 'entered-in-error'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'CREATE', 'READ', 'UPDATE', 'DELETE',
    'EMERGENCY_ACCESS', 'QR_AUTH', 'SCOPE_DENIED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── FHIR: Patient ─────────────────────────────────────────────────────────
-- Maps to: https://hl7.org/fhir/R4/patient.html
-- PHI fields are stored AES-256 encrypted (ciphertext in `encrypted_payload`)

CREATE TABLE IF NOT EXISTS patient (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type     TEXT NOT NULL DEFAULT 'Patient' CHECK (resource_type = 'Patient'),
  active            BOOLEAN NOT NULL DEFAULT true,

  -- FHIR HumanName (encrypted)
  encrypted_name    TEXT NOT NULL,

  -- FHIR ContactPoint (encrypted)
  encrypted_telecom TEXT,

  -- Demographics
  gender            fhir_gender NOT NULL DEFAULT 'unknown',
  birth_date        DATE,

  -- FHIR Address (encrypted)
  encrypted_address TEXT,

  -- Emergency / Critical (stored plaintext for break-glass)
  blood_type        TEXT,
  allergies_summary TEXT,  -- Comma-separated critical allergies for emergency

  -- FHIR Meta
  version_id        INTEGER NOT NULL DEFAULT 1,
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Encryption metadata
  encryption_iv     TEXT NOT NULL,
  encryption_tag    TEXT
);

CREATE INDEX idx_patient_active ON patient(active);
CREATE INDEX idx_patient_last_updated ON patient(last_updated DESC);

-- ─── FHIR: Observation ─────────────────────────────────────────────────────
-- Maps to: https://hl7.org/fhir/R4/observation.html
-- Used for lab results, vital signs, biometric readings

CREATE TABLE IF NOT EXISTS observation (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type     TEXT NOT NULL DEFAULT 'Observation' CHECK (resource_type = 'Observation'),

  -- Reference to Patient
  patient_id        UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,

  -- FHIR Observation fields
  status            observation_status NOT NULL DEFAULT 'final',

  -- FHIR CodeableConcept — LOINC code for the observation type
  code_system       TEXT NOT NULL DEFAULT 'http://loinc.org',
  code_value        TEXT NOT NULL,          -- e.g., '8867-4' for heart rate
  code_display      TEXT NOT NULL,          -- e.g., 'Heart rate'

  -- FHIR Category (vital-signs, laboratory, etc.)
  category_code     TEXT NOT NULL DEFAULT 'vital-signs',
  category_display  TEXT NOT NULL DEFAULT 'Vital Signs',

  -- Value (encrypted for sensitive labs)
  value_quantity    NUMERIC,
  value_unit        TEXT,
  value_system      TEXT DEFAULT 'http://unitsofmeasure.org',
  value_code        TEXT,                   -- UCUM unit code

  -- Encrypted full FHIR payload (for complex observations)
  encrypted_payload TEXT,

  -- Effective datetime
  effective_dt      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- FHIR Meta
  version_id        INTEGER NOT NULL DEFAULT 1,
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Encryption metadata
  encryption_iv     TEXT,
  encryption_tag    TEXT
);

CREATE INDEX idx_observation_patient ON observation(patient_id);
CREATE INDEX idx_observation_code ON observation(code_value);
CREATE INDEX idx_observation_effective ON observation(effective_dt DESC);
CREATE INDEX idx_observation_category ON observation(category_code);

-- ─── FHIR: ClinicalImpression ──────────────────────────────────────────────
-- Maps to: https://hl7.org/fhir/R4/clinicalimpression.html
-- Used for scribe agent notes / clinician impressions

CREATE TABLE IF NOT EXISTS clinical_impression (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type     TEXT NOT NULL DEFAULT 'ClinicalImpression'
                    CHECK (resource_type = 'ClinicalImpression'),

  -- Reference to Patient
  patient_id        UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,

  -- FHIR ClinicalImpression fields
  status            clinical_impression_status NOT NULL DEFAULT 'completed',
  description       TEXT,                   -- Brief human-readable summary (non-PHI)

  -- Encrypted structured FHIR JSON payload
  encrypted_payload TEXT NOT NULL,

  -- The raw shorthand input from the clinician (encrypted)
  encrypted_raw_input TEXT,

  -- FHIR CodeableConcept for clinical specialty
  specialty_code    TEXT,                   -- e.g., 'cardiology'
  specialty_display TEXT,                   -- e.g., 'Cardiology'

  -- AI synthesis metadata
  ai_model_used     TEXT,
  ai_confidence     NUMERIC(4,3),           -- 0.000 – 1.000

  -- Effective period
  effective_start   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_end     TIMESTAMPTZ,

  -- FHIR Meta
  version_id        INTEGER NOT NULL DEFAULT 1,
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Encryption metadata
  encryption_iv     TEXT NOT NULL,
  encryption_tag    TEXT
);

CREATE INDEX idx_ci_patient ON clinical_impression(patient_id);
CREATE INDEX idx_ci_status ON clinical_impression(status);
CREATE INDEX idx_ci_specialty ON clinical_impression(specialty_code);
CREATE INDEX idx_ci_effective ON clinical_impression(effective_start DESC);

-- ─── AuditLog ───────────────────────────────────────────────────────────────
-- Immutable access tracking — append-only, no UPDATE/DELETE allowed

CREATE TABLE IF NOT EXISTS audit_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who accessed
  accessor_id       TEXT NOT NULL,           -- Provider ID or system identifier
  accessor_role     TEXT NOT NULL DEFAULT 'provider',

  -- What was accessed
  action            audit_action NOT NULL,
  resource_type     TEXT NOT NULL,           -- 'Patient', 'Observation', etc.
  resource_id       UUID,

  -- Patient context
  patient_id        UUID REFERENCES patient(id),

  -- Access details
  scope_requested   TEXT,                    -- e.g., 'read:cardiology'
  scope_granted     BOOLEAN NOT NULL DEFAULT true,
  ip_address        INET,
  user_agent        TEXT,

  -- Emergency context
  is_emergency      BOOLEAN NOT NULL DEFAULT false,
  emergency_reason  TEXT,

  -- Integrity hash (SHA-256 of the row for tamper detection)
  integrity_hash    TEXT NOT NULL,

  -- Timestamp (immutable)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: no updates or deletes on audit_log
CREATE INDEX idx_audit_patient ON audit_log(patient_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_emergency ON audit_log(is_emergency) WHERE is_emergency = true;
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ─── Synthesized Summaries ──────────────────────────────────────────────────
-- Stores AI-generated clinical summaries and risk flags per patient

CREATE TABLE IF NOT EXISTS patient_summary (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,

  -- Encrypted clinical summary
  encrypted_summary TEXT NOT NULL,

  -- Risk prediction flags (stored as JSONB for flexibility)
  risk_flags        JSONB DEFAULT '[]'::jsonb,

  -- Generation metadata
  data_points_count INTEGER NOT NULL DEFAULT 0,
  ai_model_used     TEXT,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Encryption metadata
  encryption_iv     TEXT NOT NULL,
  encryption_tag    TEXT,

  -- Is this the current active summary?
  is_current        BOOLEAN NOT NULL DEFAULT true,
  superseded_by     UUID REFERENCES patient_summary(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_summary_patient ON patient_summary(patient_id);
CREATE INDEX idx_summary_current ON patient_summary(patient_id, is_current) WHERE is_current = true;

-- ============================================================================
-- TRIGGER: Auto-update last_updated timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  NEW.version_id = OLD.version_id + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_updated ON patient;
CREATE TRIGGER trg_patient_updated
  BEFORE UPDATE ON patient
  FOR EACH ROW EXECUTE FUNCTION update_last_updated();

DROP TRIGGER IF EXISTS trg_observation_updated ON observation;
CREATE TRIGGER trg_observation_updated
  BEFORE UPDATE ON observation
  FOR EACH ROW EXECUTE FUNCTION update_last_updated();

DROP TRIGGER IF EXISTS trg_ci_updated ON clinical_impression;
CREATE TRIGGER trg_ci_updated
  BEFORE UPDATE ON clinical_impression
  FOR EACH ROW EXECUTE FUNCTION update_last_updated();

-- ============================================================================
-- PREVENT: Mutations on audit_log (immutability enforcement)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_log;
CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_log;
CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
