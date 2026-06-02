import { Router } from 'express';

// Controllers
import {
  migrate,
  resumeMigration,
  dryRun,
  migrationHistory,
  getMigrationStatus,
  migrationProgress,
  erDiagram,
  foreignKeys,
  applyFK,
} from '../controllers/migrate.controller.js';
import { checkConnection, listDatabases, listCollections } from '../controllers/connection.controller.js';
import { preview } from '../controllers/preview.controller.js';

// Validation middleware
import {
  validateMigrateStart,
  validateCheckConnection,
  validatePreview,
  validateDryRun,
} from '../middlewares/validate.middleware.js';

const router = Router();

// ── Connection & Metadata ─────────────────────────────────────────────────────
router.post('/check',       validateCheckConnection, checkConnection);
router.post('/databases',   listDatabases);
router.post('/collections', listCollections);

// ── Preview (paginated) ───────────────────────────────────────────────────────
router.post('/preview',     validatePreview, preview);

// ── Dry Run (🟢 nice-to-have) ────────────────────────────────────────────────
router.post('/dry-run',     validateDryRun, dryRun);

// ── Migration History (🟢 nice-to-have) ──────────────────────────────────────
router.get('/history',      migrationHistory);

// ── Migration Start / Resume ──────────────────────────────────────────────────
router.post('/start',               validateMigrateStart, migrate);
router.post('/resume/:migrationId', validateMigrateStart, resumeMigration);

// ── Status & Progress ─────────────────────────────────────────────────────────
router.get('/status/:migrationId',  getMigrationStatus);
router.get('/progress/:migrationId',migrationProgress);   // SSE

// ── ER Diagram (🟢 nice-to-have) ─────────────────────────────────────────────
router.get('/:migrationId/er-diagram',   erDiagram);

// ── Relationship Handling (Step 7) ────────────────────────────────────────────
router.get('/:migrationId/foreign-keys', foreignKeys);
router.post('/:migrationId/apply-fk',   applyFK);

export default router;
