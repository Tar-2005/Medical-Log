// ─── Patient Routes ─────────────────────────────────────────────────────────

import { Router } from 'express';
import {
  getPatient,
  createPatient,
  getPatientTimeline,
  uploadPatientDocument
} from '../controllers/patient.controller.js';
import { qrAuthMiddleware } from '../middleware/qrAuthMiddleware.js';

const router = Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Route for patient uploading document from mobile app (no doctor QR token needed)
router.post('/:id/upload-document', asyncHandler(uploadPatientDocument));

// All doctor patient routes require QR authentication
router.use(qrAuthMiddleware);

router.get('/:id', asyncHandler(getPatient));
router.post('/', asyncHandler(createPatient));
router.get('/:id/timeline', asyncHandler(getPatientTimeline));

export default router;
