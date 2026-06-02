/**
 * migrate.controller.js
 *
 * Endpoints:
 *  POST  /migrate/start              — Start migration (202 + background)
 *  POST  /migrate/resume/:id         — Resume a failed/partial migration
 *  POST  /migrate/dry-run            — Schema preview (no MySQL writes)
 *  GET   /migrate/history            — List all migrations
 *  GET   /migrate/status/:id         — Polling status
 *  GET   /migrate/progress/:id       — SSE real-time stream
 *  GET   /migrate/:id/er-diagram     — Stored ER diagram
 *  GET   /migrate/:id/foreign-keys   — Detected FKs (for UI confirmation)
 *  POST  /migrate/:id/apply-fk       — Apply confirmed FK constraints
 */
import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.utils.js';
import ApiError from '../utils/ApiError.utils.js';
import ApiResponse from '../utils/ApiResponse.utils.js';
import { runMigration, migrationEmitter } from '../services/migration/orchestrator.js';
import {
  getCheckpoint,
  listMigrations,
  getErDiagram,
} from '../services/migration/checkpointStore.js';
import { runDryRun } from '../services/migration/dryRun.js';
import { applyForeignKeys, getDetectedForeignKeys } from '../services/migration/foreignKeyManager.js';

// ── Start ─────────────────────────────────────────────────────────────────────

export const migrate = asyncHandler(async (req, res) => {
  const { data } = req.body;
  const migrationId = crypto.randomUUID();

  res.status(202).json(
    new ApiResponse('accepted', 202, {
      migrationId,
      message: 'Migration started. Stream progress at GET /migrate/progress/' + migrationId,
    })
  );

  runMigration(migrationId, data).catch(err => {
    console.error(`[Migration ${migrationId}] crash:`, err.message);
  });
});

// ── Resume ────────────────────────────────────────────────────────────────────

/**
 * POST /migrate/resume/:migrationId
 * Body: { data: { source, target, options? } }
 * Resumes a failed/partial migration — skips already-done collections.
 */
export const resumeMigration = asyncHandler(async (req, res) => {
  const { migrationId } = req.params;
  const { data } = req.body;

  if (!data?.source || !data?.target) {
    throw new ApiError('Both source and target config are required', 400);
  }

  const existing = getCheckpoint(migrationId);
  if (!existing) throw new ApiError('Migration not found. Cannot resume.', 404);
  if (existing.status === 'done') {
    throw new ApiError('Migration already completed successfully. No resume needed.', 409);
  }

  // Count how many collections are pending/failed
  const remaining = Object.values(existing.collections)
    .filter(c => c.status !== 'done').length;

  res.status(202).json(
    new ApiResponse('accepted', 202, {
      migrationId,
      resuming: true,
      remainingCollections: remaining,
      message: `Resuming migration. ${remaining} collection(s) remaining.`,
    })
  );

  // Pass the SAME migrationId — initCheckpoint will preserve 'done' collections
  runMigration(migrationId, data).catch(err => {
    console.error(`[Resume ${migrationId}] crash:`, err.message);
  });
});

// ── Dry Run ───────────────────────────────────────────────────────────────────

/**
 * POST /migrate/dry-run
 * Body: { source: MongoConfig, options?: { scanMode } }
 * Returns full schema analysis + DDL preview — no MySQL connection.
 */
export const dryRun = asyncHandler(async (req, res) => {
  const { source, options } = req.body;
  const result = await runDryRun(source, options ?? {});
  return res.status(200).json(new ApiResponse('success', 200, result));
});

// ── History ───────────────────────────────────────────────────────────────────

/**
 * GET /migrate/history
 * Returns all migrations (from disk — survives restarts).
 */
export const migrationHistory = asyncHandler(async (_req, res) => {
  const migrations = listMigrations().map(m => ({
    migrationId: m.migrationId,
    status: m.status,
    startedAt: m.startedAt,
    resumedAt: m.resumedAt,
    completedAt: m.completedAt,
    totalCollections: Object.keys(m.collections ?? {}).length,
    doneCollections: Object.values(m.collections ?? {}).filter(c => c.status === 'done').length,
    errors: m.errors,
  }));
  return res.status(200).json(new ApiResponse('success', 200, { migrations }));
});

// ── Status / SSE ──────────────────────────────────────────────────────────────

export const getMigrationStatus = asyncHandler(async (req, res) => {
  const { migrationId } = req.params;
  const checkpoint = getCheckpoint(migrationId);
  if (!checkpoint) throw new ApiError('Migration not found', 404);
  return res.status(200).json(new ApiResponse('success', 200, checkpoint));
});

export const migrationProgress = (req, res) => {
  const { migrationId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const checkpoint = getCheckpoint(migrationId);
  if (checkpoint) {
    res.write(`data: ${JSON.stringify({ event: 'state', ...checkpoint })}\n\n`);
    if (checkpoint.status === 'done' || checkpoint.status === 'failed') {
      res.end();
      return;
    }
  }

  const send = (payload) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  migrationEmitter.on(migrationId, send);

  const cleanup = (payload) => {
    if (payload.event === 'complete' || payload.event === 'error') {
      migrationEmitter.off(migrationId, send);
      migrationEmitter.off(migrationId, cleanup);
      if (!res.writableEnded) res.end();
    }
  };
  migrationEmitter.on(migrationId, cleanup);
  req.on('close', () => {
    migrationEmitter.off(migrationId, send);
    migrationEmitter.off(migrationId, cleanup);
  });
};

// ── ER Diagram ────────────────────────────────────────────────────────────────

/**
 * GET /migrate/:migrationId/er-diagram
 * Returns the stored ER diagram for a completed migration.
 */
export const erDiagram = asyncHandler(async (req, res) => {
  const { migrationId } = req.params;
  const diagram = getErDiagram(migrationId);
  if (!diagram) throw new ApiError('ER diagram not found for this migration', 404);
  return res.status(200).json(new ApiResponse('success', 200, { erDiagram: diagram }));
});

// ── Foreign Keys ──────────────────────────────────────────────────────────────

/**
 * GET /migrate/:migrationId/foreign-keys
 * Returns detected FK relationships for user confirmation in the UI.
 */
export const foreignKeys = asyncHandler(async (req, res) => {
  const { migrationId } = req.params;
  const fks = getDetectedForeignKeys(migrationId);
  return res.status(200).json(
    new ApiResponse('success', 200, {
      foreignKeys: fks,
      message: fks.length
        ? 'Review these detected relationships and POST to /apply-fk to apply them.'
        : 'No foreign key relationships detected.',
    })
  );
});

/**
 * POST /migrate/:migrationId/apply-fk
 * Body: { target: MySQLConfig, dbName: string, selectedFKs?: [...] }
 * Applies confirmed FK constraints after migration is complete.
 */
export const applyFK = asyncHandler(async (req, res) => {
  const { migrationId } = req.params;
  const { target, dbName, selectedFKs } = req.body;

  if (!target || !dbName) {
    throw new ApiError('target (MySQL config) and dbName are required', 400);
  }

  const checkpoint = getCheckpoint(migrationId);
  if (!checkpoint) throw new ApiError('Migration not found', 404);
  if (checkpoint.status !== 'done') {
    throw new ApiError('Migration must be completed before applying foreign keys', 409);
  }

  const results = await applyForeignKeys(migrationId, target, dbName, selectedFKs);
  return res.status(200).json(new ApiResponse('success', 200, results));
});
