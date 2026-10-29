// ─── Scribe Routes ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { handleScribeSubmission } from '../controllers/scribe.controller.js';
import { qrAuthMiddleware } from '../middleware/qrAuthMiddleware.js';

const router = Router();

// Scribe endpoints require QR authentication
router.use(qrAuthMiddleware);

router.post('/', handleScribeSubmission);

export default router;
