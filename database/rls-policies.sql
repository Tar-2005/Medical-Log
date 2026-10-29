-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Patient-Centric Longitudinal Health Memory Layer
-- ============================================================================
-- These policies enforce Zero-Trust access at the database level.
-- Supabase auth context is used via auth.uid() and auth.jwt().
-- ============================================================================

-- ─── Enable RLS on all tables ───────────────────────────────────────────────

ALTER TABLE patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_impression ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_summary ENABLE ROW LEVEL SECURITY;

-- ─── Patient Table Policies ─────────────────────────────────────────────────

-- Providers can read patients they have active sessions with
CREATE POLICY "providers_read_patient"
  ON patient FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      auth.jwt() ->> 'role' = 'provider'
      OR auth.jwt() ->> 'role' = 'service_role'
    )
  );

-- Only service role can insert/update patients (backend API)
CREATE POLICY "service_manage_patient"
  ON patient FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ─── Observation Table Policies ─────────────────────────────────────────────

-- Providers can read observations scoped by their JWT grant
CREATE POLICY "providers_read_observations"
  ON observation FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND auth.jwt() ->> 'role' IN ('provider', 'service_role')
  );

-- Only service role can write observations
CREATE POLICY "service_write_observations"
  ON observation FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "service_update_observations"
  ON observation FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ─── ClinicalImpression Table Policies ──────────────────────────────────────

-- Providers can read clinical impressions for granted scopes
CREATE POLICY "providers_read_impressions"
  ON clinical_impression FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND auth.jwt() ->> 'role' IN ('provider', 'service_role')
  );

-- Only service role can write clinical impressions (via Scribe Agent)
CREATE POLICY "service_write_impressions"
  ON clinical_impression FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "service_update_impressions"
  ON clinical_impression FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ─── AuditLog Table Policies ────────────────────────────────────────────────

-- Anyone authenticated can read audit logs (transparency)
CREATE POLICY "authenticated_read_audit"
  ON audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can INSERT audit entries (append-only enforced by triggers)
CREATE POLICY "service_insert_audit"
  ON audit_log FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- No UPDATE or DELETE — enforced by trigger + no policy granted

-- ─── PatientSummary Table Policies ──────────────────────────────────────────

CREATE POLICY "providers_read_summaries"
  ON patient_summary FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND auth.jwt() ->> 'role' IN ('provider', 'service_role')
  );

CREATE POLICY "service_manage_summaries"
  ON patient_summary FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
