// ─── Observation Controller ─────────────────────────────────────────────────
// CRUD operations for FHIR Observation resources (lab results, biometrics).
// ─────────────────────────────────────────────────────────────────────────────

import { supabaseAdmin } from '../config/supabase.js';
import { validate } from '../lib/fhirValidator.js';
import { recordAudit } from '../services/auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';
import eventBus, { Events } from '../lib/eventBus.js';

/**
 * POST /api/observations
 * Creates a new FHIR Observation resource.
 */
export async function createObservation(req, res) {
  const fhirData = req.body;

  // Validate FHIR schema
  const validation = validate.Observation(fhirData);
  if (!validation.success) {
    throw new AppError(
      `FHIR validation failed: ${validation.errors.join('; ')}`,
      400,
      'FHIR_VALIDATION_ERROR'
    );
  }

  const patientId = fhirData.subject?.reference?.replace('Patient/', '') || req.auth.patientId;

  const { data, error } = await supabaseAdmin
    .from('observation')
    .insert({
      patient_id: patientId,
      status: validation.data.status,
      code_system: validation.data.code.coding[0].system || 'http://loinc.org',
      code_value: validation.data.code.coding[0].code,
      code_display: validation.data.code.coding[0].display || validation.data.code.text || '',
      category_code: validation.data.category?.[0]?.coding?.[0]?.code || 'vital-signs',
      category_display: validation.data.category?.[0]?.coding?.[0]?.display || 'Vital Signs',
      value_quantity: validation.data.valueQuantity?.value || null,
      value_unit: validation.data.valueQuantity?.unit || null,
      value_system: validation.data.valueQuantity?.system || 'http://unitsofmeasure.org',
      value_code: validation.data.valueQuantity?.code || null,
      effective_dt: validation.data.effectiveDateTime || new Date().toISOString(),
      issued: validation.data.issued || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to create observation: ${error.message}`, 500);
  }

  // Emit DATA_ADDED event
  eventBus.publish(Events.DATA_ADDED, {
    patientId,
    resourceType: 'Observation',
    resourceId: data.id,
    timestamp: new Date().toISOString(),
  });

  // Audit
  await recordAudit({
    accessorId: req.auth?.providerId || 'system',
    action: 'CREATE',
    resourceType: 'Observation',
    resourceId: data.id,
    patientId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Return FHIR-compliant response
  res.status(201).json({
    resourceType: 'Observation',
    id: data.id,
    meta: {
      versionId: String(data.version_id),
      lastUpdated: data.last_updated,
    },
    status: data.status,
    code: {
      coding: [
        {
          system: data.code_system,
          code: data.code_value,
          display: data.code_display,
        },
      ],
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: data.effective_dt,
    valueQuantity: data.value_quantity
      ? {
          value: parseFloat(data.value_quantity),
          unit: data.value_unit,
          system: data.value_system,
          code: data.value_code,
        }
      : undefined,
  });
}

/**
 * GET /api/observations/patient/:patientId
 * Retrieves all observations for a patient, with optional filtering.
 */
export async function getObservationsByPatient(req, res) {
  const { patientId } = req.params;
  const { category, code, limit = 100, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from('observation')
    .select('*')
    .eq('patient_id', patientId)
    .order('effective_dt', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (category) query = query.eq('category_code', category);
  if (code) query = query.eq('code_value', code);

  const { data, error } = await query;

  if (error) throw new AppError(`Failed to fetch observations: ${error.message}`, 500);

  // Map to FHIR Observation format
  const fhirBundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: data.length,
    entry: data.map((obs) => ({
      resource: {
        resourceType: 'Observation',
        id: obs.id,
        meta: {
          versionId: String(obs.version_id),
          lastUpdated: obs.last_updated,
        },
        status: obs.status,
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: obs.category_code,
                display: obs.category_display,
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: obs.code_system,
              code: obs.code_value,
              display: obs.code_display,
            },
          ],
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: obs.effective_dt,
        issued: obs.issued,
        valueQuantity: obs.value_quantity
          ? {
              value: parseFloat(obs.value_quantity),
              unit: obs.value_unit,
              system: obs.value_system,
              code: obs.value_code,
            }
          : undefined,
      },
    })),
  };

  // Audit
  await recordAudit({
    accessorId: req.auth.providerId,
    action: 'READ',
    resourceType: 'Observation',
    patientId,
    scopeRequested: req.auth.scopes?.join(', '),
    scopeGranted: true,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json(fhirBundle);
}
