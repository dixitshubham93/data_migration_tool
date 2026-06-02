/**
 * checkpointStore.js  (v2 — file-persisted, resume-capable)
 *
 * Storage: ./data/checkpoints/<migrationId>.json
 * Survives server restarts — enables true resume capability.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, '../../../../data/checkpoints');

function _ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function _write(migrationId, state) {
  try {
    _ensureDir();
    writeFileSync(join(DATA_DIR, `${migrationId}.json`), JSON.stringify(state, null, 2));
  } catch { /* non-critical */ }
}

function _read(migrationId) {
  try {
    const file = join(DATA_DIR, `${migrationId}.json`);
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch { return null; }
}

// In-memory cache (avoids disk read on every progress tick)
const cache = new Map();

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialises (or resumes) a migration checkpoint.
 * If an existing checkpoint is found on disk, 'done' collections are preserved
 * so the orchestrator can skip them on resume.
 */
export function initCheckpoint(migrationId, collectionNames) {
  const existing = _read(migrationId);
  const state = {
    migrationId,
    status: 'running',
    startedAt: existing?.startedAt ?? new Date().toISOString(),
    resumedAt: existing ? new Date().toISOString() : undefined,
    completedAt: null,
    collections: Object.fromEntries(
      collectionNames.map(n => {
        const prev = existing?.collections?.[n];
        // Preserve completed collections so orchestrator can skip them
        if (prev?.status === 'done') return [n, prev];
        return [n, { status: 'pending', processedDocs: 0, totalDocs: 0, error: null }];
      })
    ),
    erDiagram: existing?.erDiagram ?? [],
    errors: [],
  };
  cache.set(migrationId, state);
  _write(migrationId, state);
}

/** Returns checkpoint from cache → disk → null. */
export function getCheckpoint(migrationId) {
  if (cache.has(migrationId)) return cache.get(migrationId);
  const fromDisk = _read(migrationId);
  if (fromDisk) cache.set(migrationId, fromDisk);
  return fromDisk;
}

/** Updates fields on a specific collection's state. */
export function updateCollection(migrationId, collectionName, patch) {
  const cp = getCheckpoint(migrationId);
  if (!cp || !cp.collections[collectionName]) return;
  Object.assign(cp.collections[collectionName], patch);
  _write(migrationId, cp);
}

export function markMigrationDone(migrationId) {
  const cp = getCheckpoint(migrationId);
  if (!cp) return;
  cp.status = 'done';
  cp.completedAt = new Date().toISOString();
  _write(migrationId, cp);
}

export function markMigrationFailed(migrationId, errorMessage) {
  const cp = getCheckpoint(migrationId);
  if (!cp) return;
  cp.status = 'failed';
  cp.completedAt = new Date().toISOString();
  cp.errors.push(errorMessage);
  _write(migrationId, cp);
}

/** Stores the final ER diagram inside the checkpoint. */
export function storeErDiagram(migrationId, erDiagram) {
  const cp = getCheckpoint(migrationId);
  if (!cp) return;
  cp.erDiagram = erDiagram;
  _write(migrationId, cp);
}

/** Returns stored ER diagram or null. */
export function getErDiagram(migrationId) {
  return getCheckpoint(migrationId)?.erDiagram ?? null;
}

/**
 * Lists all migrations from disk + memory, sorted newest-first.
 * Survives server restarts.
 */
export function listMigrations() {
  _ensureDir();
  const ids = new Set([
    ...cache.keys(),
    ...readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', '')),
  ]);
  return [...ids]
    .map(id => getCheckpoint(id))
    .filter(Boolean)
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
}
