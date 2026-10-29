// ─── Audit Log Service ──────────────────────────────────────────────────────
// Writes immutable audit entries to the audit_log table.
// Every data access, auth event, and emergency override is tracked.
// ─────────────────────────────────────────────────────────────────────────────

import { supabaseAdmin } from '../config/supabase.js';
import { generateIntegrityHash } from '../lib/cryptoUtils.js';
import eventBus, { Events } from '../lib/eventBus.js';

/**
 * Records an immutable audit log entry.
 *
 * @param {object} entry
 * @param {string} entry.accessorId     — Who accessed (provider/system ID)
 * @param {string} [entry.accessorRole] — Role of accessor (default: 'provider')
 * @param {string} entry.action         — One of: CREATE, READ, UPDATE, DELETE, EMERGENCY_ACCESS, QR_AUTH, SCOPE_DENIED
 * @param {string} entry.resourceType   — FHIR resource type accessed
 * @param {string} [entry.resourceId]   — UUID of specific resource
 * @param {string} [entry.patientId]    — UUID of the patient context
 * @param {string} [entry.scopeRequested]
 * @param {boolean} [entry.scopeGranted]
 * @param {string} [entry.ipAddress]
 * @param {string} [entry.userAgent]
 * @param {boolean} [entry.isEmergency]
 * @param {string} [entry.emergencyReason]
 * @returns {Promise<object>} The inserted audit record
 */
export async function recordAudit(entry) {
  const auditData = {
    accessor_id: entry.accessorId,
    accessor_role: entry.accessorRole || 'provider',
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId || null,
    patient_id: entry.patientId || null,
    scope_requested: entry.scopeRequested || null,
    scope_granted: entry.scopeGranted !== undefined ? entry.scopeGranted : true,
    ip_address: entry.ipAddress || null,
    user_agent: entry.userAgent || null,
    is_emergency: entry.isEmergency || false,
    emergency_reason: entry.emergencyReason || null,
  };

  // Generate integrity hash for tamper detection
  auditData.integrity_hash = generateIntegrityHash(auditData);

  let { data, error } = await supabaseAdmin
    .from('audit_log')
    .insert(auditData)
    .select()
    .single();

  // If insert fails due to patient_id FK constraint (e.g. newly registered auth user not yet in public.patient table),
  // fallback and write the audit record with patient_id = null so audit trail is preserved without crashing
  if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
    console.warn('[AuditLog] Patient ID not found in patient table, writing audit with null patient_id');
    auditData.patient_id = null;
    auditData.integrity_hash = generateIntegrityHash(auditData);
    const retry = await supabaseAdmin
      .from('audit_log')
      .insert(auditData)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.warn('[AuditLog] Insert warning:', error.message);
    // Non-fatal: do not crash API response for secondary audit logging
    return null;
  }

  // Emit audit event
  if (data) {
    eventBus.publish(Events.AUDIT_RECORDED, {
      auditId: data.id,
      action: data.action,
      patientId: data.patient_id,
      isEmergency: data.is_emergency,
    });
  }

  return data;
}

/**
 * Retrieves audit logs for a specific patient.
 *
 * @param {string} patientId — UUID of the patient
 * @param {object} [options]
 * @param {number} [options.limit] — Max records (default 50)
 * @param {number} [options.offset] — Pagination offset
 * @returns {Promise<object[]>}
 */
export async function getAuditsByPatient(patientId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Audit log query failed: ${error.message}`);
  }

  return data;
}
