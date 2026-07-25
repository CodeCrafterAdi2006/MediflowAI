import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prescriptionsRouter from './routes/prescriptions.js';
import scheduleRouter from './routes/schedule.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',    // Vite dev server
  'http://localhost:4173',    // Vite preview
  'https://mediflow.ai',      // Production domain
];

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) and known origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed.`));
    }
  },
  credentials: true
}));
app.use(express.json());

// Health Check Route (Phase 1.1)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prescriptions API Routes (Phase 2.4)
app.use('/api/prescriptions', prescriptionsRouter);

// Daily Schedule & Adherence Demo Routes (Phase 3)
app.use('/api/schedule', scheduleRouter);

// Global Error Handler (CORS, Multer, etc.)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message && (err.message.includes('not allowed') || err.message.includes('CORS'))) {
    res.status(400).json({ error: err.message });
  } else {
    console.error('[Unhandled Server Error]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[MediFlow Server] Listening on http://localhost:${PORT}`);
});
