// ─── Emergency Controller ───────────────────────────────────────────────────
// Break-Glass Emergency Override: POST /api/emergency/override
// Bypasses standard QR authentication to return critical patient data.
//
// This endpoint:
//   1. Returns critical FHIR data (allergies, blood type) immediately
//   2. Writes an immutable audit record with EMERGENCY_ACCESS action
//   3. Triggers simulated webhook notifications to trusted contacts
//   4. Emits EMERGENCY_ACCESS event on the event bus
// ─────────────────────────────────────────────────────────────────────────────

import { supabaseAdmin } from '../config/supabase.js';
import { recordAudit } from '../services/auditLog.service.js';
import { notifyTrustedContacts } from '../services/emergencyNotifier.service.js';
import eventBus, { Events } from '../lib/eventBus.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * POST /api/emergency/override
 * Body: {
 *   patientId: string,
 *   accessorId: string,
 *   accessorRole: string,
 *   reason: string
 * }
 *
 * NO QR TOKEN REQUIRED — this is the break-glass path.
 */
export async function handleEmergencyOverride(req, res) {
  const { patientId, accessorId, accessorRole, reason } = req.body;

  // Validate required fields
  if (!patientId) throw new AppError('patientId is required', 400, 'INVALID_INPUT');
  if (!accessorId) throw new AppError('accessorId is required', 400, 'INVALID_INPUT');
  if (!reason || reason.trim().length < 10) {
    throw new AppError('reason is required and must be at least 10 characters', 400, 'INVALID_INPUT');
  }

  const timestamp = new Date().toISOString();

  // 1. Fetch critical patient data (plaintext emergency fields)
  const { data: patient, error } = await supabaseAdmin
    .from('patient')
    .select('id, blood_type, allergies_summary, gender, birth_date, active')
    .eq('id', patientId)
    .single();

  if (error || !patient) {
    throw new AppError('Patient not found', 404, 'NOT_FOUND');
  }

  // 2. Fetch most recent critical observations (vital signs)
  const { data: recentVitals } = await supabaseAdmin
    .from('observation')
    .select('code_display, code_value, value_quantity, value_unit, effective_dt, status')
    .eq('patient_id', patientId)
    .eq('category_code', 'vital-signs')
    .order('effective_dt', { ascending: false })
    .limit(10);

  // 3. Write immutable audit record (MUST succeed)
  const auditRecord = await recordAudit({
    accessorId,
    accessorRole: accessorRole || 'emergency_provider',
    action: 'EMERGENCY_ACCESS',
    resourceType: 'Patient',
    resourceId: patientId,
    patientId,
    scopeRequested: 'emergency:*',
    scopeGranted: true,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    isEmergency: true,
    emergencyReason: reason,
  });

  // 4. Emit EMERGENCY_ACCESS event
  eventBus.publish(Events.EMERGENCY_ACCESS, {
    patientId,
    accessorId,
    reason,
    timestamp,
    auditId: auditRecord.id,
  });

  // 5. Trigger simulated notifications to trusted contacts (fire-and-forget)
  const notifications = notifyTrustedContacts({
    patientId,
    accessorId,
    reason,
    timestamp,
  }).catch((err) => {
    console.error('[EmergencyNotifier] Failed:', err.message);
    return [];
  });

  // 6. Build FHIR-compliant emergency response
  const emergencyData = {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp,
    meta: {
      tag: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
          code: 'ETREAT',
          display: 'Emergency Treatment',
        },
      ],
    },
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          active: patient.active,
          gender: patient.gender,
          birthDate: patient.birth_date,
        },
      },
      {
        resource: {
          resourceType: 'AllergyIntolerance',
          patient: { reference: `Patient/${patientId}` },
          clinicalStatus: {
            coding: [{ code: 'active', display: 'Active' }],
          },
          note: [
            {
              text: patient.allergies_summary || 'No known allergies on file',
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '882-1',
                display: 'ABO and Rh group [Type] in Blood',
              },
            ],
          },
          valueString: patient.blood_type || 'Unknown',
          subject: { reference: `Patient/${patientId}` },
        },
      },
    ],
  };

  // Add recent vitals to the bundle
  if (recentVitals && recentVitals.length > 0) {
    for (const vital of recentVitals) {
      emergencyData.entry.push({
        resource: {
          resourceType: 'Observation',
          status: vital.status,
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: vital.code_value,
                display: vital.code_display,
              },
            ],
          },
          subject: { reference: `Patient/${patientId}` },
          effectiveDateTime: vital.effective_dt,
          valueQuantity: vital.value_quantity
            ? {
                value: parseFloat(vital.value_quantity),
                unit: vital.value_unit,
              }
            : undefined,
        },
      });
    }
  }

  // Wait for notifications to complete (best-effort)
  const notificationResults = await notifications;

  res.status(200).json({
    emergency: true,
    auditId: auditRecord.id,
    accessedAt: timestamp,
    notifications: notificationResults,
    data: emergencyData,
  });
}
