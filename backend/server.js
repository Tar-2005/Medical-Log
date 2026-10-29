// ─── Main Express Application ───────────────────────────────────────────────
// Entry point for the Patient-Centric Longitudinal Health Memory Layer Backend.
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';
import cors from 'cors';
import { env } from './config/environment.js';
import { initSynthesizerAgent } from './services/synthesizerAgent.service.js';
import { standardLimiter, authLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Route Imports
import patientRoutes from './routes/patient.routes.js';
import observationRoutes from './routes/observation.routes.js';
import scribeRoutes from './routes/scribe.routes.js';
import analystRoutes from './routes/analyst.routes.js';
import ocrRoutes from './routes/ocr.routes.js';
import emergencyRoutes from './routes/emergency.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Standard rate limiting for all routes unless overridden
app.use(standardLimiter);

// ─── Initialize Background Agents ───────────────────────────────────────────

// Start the Synthesizer Agent (listens for DATA_ADDED events)
initSynthesizerAgent();

// ─── API Routes ─────────────────────────────────────────────────────────────

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication and QR Handshake Routes
app.use('/api/auth', authRoutes);

// Domain Routes
app.use('/api/patients', patientRoutes);
app.use('/api/observations', observationRoutes);

// AI Agent Routes
app.use('/api/agents/scribe', scribeRoutes);
app.use('/api/agents/analyst', analystRoutes);

// PaddleOCR Route — extracts text from images locally, saves Gemini credits
app.use('/api/ocr', ocrRoutes);

// Emergency Break-Glass Route (bypasses auth)
app.use('/api/emergency', emergencyRoutes);

// ─── Error Handling ─────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Server Startup ─────────────────────────────────────────────────────────

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║  Health Memory Layer API running         ║`);
  console.log(`║  Port: ${env.PORT}                              ║`);
  console.log(`║  Host: 0.0.0.0 (All interfaces)          ║`);
  console.log(`║  Environment: ${env.NODE_ENV.padEnd(26)} ║`);
  console.log('╚══════════════════════════════════════════╝\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.PORT} is already in use. Stop the existing server or set PORT to a different value.`);
    process.exit(1);
  }

  console.error('Failed to start server:', error);
  process.exit(1);
});
