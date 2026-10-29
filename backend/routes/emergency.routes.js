// ─── Emergency Routes ───────────────────────────────────────────────────────

import { Router } from 'express';
import { handleEmergencyOverride } from '../controllers/emergency.controller.js';
import { emergencyLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Emergency endpoint explicitly DOES NOT require QR auth.
// It bypasses standard auth but uses a specific rate limiter.
router.post('/override', emergencyLimiter, handleEmergencyOverride);

export default router;
