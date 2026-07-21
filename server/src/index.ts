import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prescriptionsRouter from './routes/prescriptions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Health Check Route (Phase 1.1)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prescriptions API Routes (Phase 2.4)
app.use('/api/prescriptions', prescriptionsRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`[MediFlow Server] Listening on http://localhost:${PORT}`);
});
