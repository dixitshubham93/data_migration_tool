import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import migrateRouter from './routes/migrateRouter.js';
import { errorMiddleware } from './middlewares/error.middleware.js';

dotenv.config({ path: './.env' });

const app = express();

// ── Structured request logger (no external dep) ───────────────────
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'migration-tool' }));

// ── Routes ────────────────────────────────────────────────────────
app.use('/migrate', migrateRouter);

// ── Global error handler (MUST be last) ──────────────────────────
app.use(errorMiddleware);

export { app };
