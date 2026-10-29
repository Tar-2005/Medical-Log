// ─── FHIR R4 Schema Validator ───────────────────────────────────────────────
// Validates that data structures conform to HL7 FHIR R4 specifications
// using Zod schemas mapped to FHIR resource definitions.
//
// References:
//   Patient:            https://hl7.org/fhir/R4/patient.html
//   Observation:        https://hl7.org/fhir/R4/observation.html
//   ClinicalImpression: https://hl7.org/fhir/R4/clinicalimpression.html
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ─── FHIR Primitives ────────────────────────────────────────────────────────

const FHIRId = z.string().uuid();
const FHIRInstant = z.string().datetime({ offset: true });
const FHIRCode = z.string().min(1);

// ─── FHIR Complex Types ────────────────────────────────────────────────────

const FHIRCoding = z.object({
  system: z.string().url().optional(),
  code: FHIRCode,
  display: z.string().optional(),
});

const FHIRCodeableConcept = z.object({
  coding: z.array(FHIRCoding).min(1),
  text: z.string().optional(),
});

const FHIRQuantity = z.object({
  value: z.number(),
  unit: z.string().optional(),
  system: z.string().url().optional().default('http://unitsofmeasure.org'),
  code: z.string().optional(),
});

const FHIRHumanName = z.object({
  use: z.enum(['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden']).optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional(),
  text: z.string().optional(),
});

const FHIRContactPoint = z.object({
  system: z.enum(['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other']).optional(),
  value: z.string().optional(),
  use: z.enum(['home', 'work', 'temp', 'old', 'mobile']).optional(),
});

const FHIRAddress = z.object({
  use: z.enum(['home', 'work', 'temp', 'old', 'billing']).optional(),
  type: z.enum(['postal', 'physical', 'both']).optional(),
  text: z.string().optional(),
  line: z.array(z.string()).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

const FHIRReference = z.object({
  reference: z.string().optional(),
  type: z.string().optional(),
  display: z.string().optional(),
});

const FHIRMeta = z.object({
  versionId: z.string().optional(),
  lastUpdated: FHIRInstant.optional(),
});

// ─── FHIR Patient Resource ─────────────────────────────────────────────────

export const FHIRPatientSchema = z.object({
  resourceType: z.literal('Patient'),
  id: FHIRId.optional(),
  meta: FHIRMeta.optional(),
  active: z.boolean().default(true),
  name: z.array(FHIRHumanName).min(1),
  telecom: z.array(FHIRContactPoint).optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).default('unknown'),
  birthDate: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/).optional(),
  address: z.array(FHIRAddress).optional(),
});

// ─── FHIR Observation Resource ──────────────────────────────────────────────

export const FHIRObservationSchema = z.object({
  resourceType: z.literal('Observation'),
  id: FHIRId.optional(),
  meta: FHIRMeta.optional(),
  status: z.enum([
    'registered', 'preliminary', 'final', 'amended',
    'corrected', 'cancelled', 'entered-in-error', 'unknown',
  ]),
  category: z.array(FHIRCodeableConcept).optional(),
  code: FHIRCodeableConcept,
  subject: FHIRReference,
  effectiveDateTime: FHIRInstant.optional(),
  issued: FHIRInstant.optional(),
  valueQuantity: FHIRQuantity.optional(),
  valueString: z.string().optional(),
  interpretation: z.array(FHIRCodeableConcept).optional(),
  note: z.array(z.object({ text: z.string() })).optional(),
});

// ─── FHIR ClinicalImpression Resource ───────────────────────────────────────

export const FHIRClinicalImpressionSchema = z.object({
  resourceType: z.literal('ClinicalImpression'),
  id: FHIRId.optional(),
  meta: FHIRMeta.optional(),
  status: z.enum(['in-progress', 'completed', 'entered-in-error']),
  subject: FHIRReference,
  date: FHIRInstant.optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  finding: z.array(z.object({
    itemCodeableConcept: FHIRCodeableConcept.optional(),
    itemReference: FHIRReference.optional(),
    basis: z.string().optional(),
  })).optional(),
  note: z.array(z.object({ text: z.string() })).optional(),
});

// ─── Validation Helpers ─────────────────────────────────────────────────────

/**
 * Validates data against a FHIR resource schema.
 * @param {z.ZodSchema} schema — The Zod schema to validate against
 * @param {object} data — The data to validate
 * @returns {{ success: boolean, data?: object, errors?: string[] }}
 */
export function validateFHIR(schema, data) {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    ),
  };
}

/**
 * Validates whether a candidate code adheres to official LOINC syntax:
 * 3 to 5 digits, hyphen, 1 check digit (e.g., '8867-4', '1558-6', '718-7').
 * @param {string} code
 * @returns {boolean}
 */
export function isValidLoincFormat(code) {
  return typeof code === 'string' && /^\d{3,5}-\d$/.test(code.trim());
}

/**
 * Pre-built validators for each resource type.
 */
export const validate = {
  Patient: (data) => validateFHIR(FHIRPatientSchema, data),
  Observation: (data) => validateFHIR(FHIRObservationSchema, data),
  ClinicalImpression: (data) => validateFHIR(FHIRClinicalImpressionSchema, data),
  LOINC: isValidLoincFormat,
};
