// ─── Observation Routes ─────────────────────────────────────────────────────

import { Router } from 'express';
import { createObservation, getObservationsByPatient } from '../controllers/observation.controller.js';
import { qrAuthMiddleware } from '../middleware/qrAuthMiddleware.js';

const router = Router();

// All observation routes require QR authentication
router.use(qrAuthMiddleware);

router.post('/', createObservation);
router.get('/patient/:patientId', getObservationsByPatient);

export default router;
