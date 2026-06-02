/**
 * schemaDiscovery.js
 * Production-grade hybrid schema discovery — O(1) memory, cursor-based.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Strategy         Accuracy  Memory  Speed   Used When           │
 * │  ─────────────── ──────── ─────── ─────── ──────────────────── │
 * │  SAMPLE (default) Good     O(1)    Fast    totalDocs ≤ 100k     │
 * │  HYBRID           Better   O(1)    Fast    totalDocs > 100k     │
 * │  FULL_SCAN        Perfect  O(1)    Slow    critical accuracy    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Outputs:
 *  fieldTypeMap    — { fieldName: sqlType }  scalar fields for main table
 *  skipAttributes  — Set of field names to normalize into child tables
 *  foreignKeys     — [{ column, refTable }]  detected FK references
 *  nestedSchemas   — { fieldName: { fieldTypeMap } }  child table schemas
 *  typeConflicts   — [{ field, types[] }]  fields that had conflicting types
 *  totalDocs       — estimated document count
 */
import { inferSQLType, resolveTypeConflict, finalizeType } from './typeMapper.js';
import { isPlainObject, flattenObject, detectRelationships } from './flattener.js';

/**
 * Scan modes:
 *  'sample'    — $sample only (fastest, good for dev/medium data)
 *  'hybrid'    — $sample + tail scan (default, recommended for prod)
 *  'full_scan' — full cursor scan (perfect accuracy, slow on huge collections)
 */
export const SCAN_MODE = {
  SAMPLE:    'sample',
  HYBRID:    'hybrid',
  FULL_SCAN: 'full_scan',
};

/**
 * Main entry point — discovers schema for one MongoDB collection.
 *
 * @param {import('mongodb').Collection} collection
 * @param {string[]}  collectionNames  all collection names in this DB (for FK detection)
 * @param {object}    options
 * @param {string}    options.mode         SCAN_MODE value (default: 'hybrid')
 * @param {number}    options.sampleSize   docs for $sample phase (default: 500)
 * @param {number}    options.tailSize     docs for tail scan phase (default: 500)
 * @param {number}    options.maxScanMs    time cap for full/tail scan in ms (default: 10_000)
 * @returns {Promise<SchemaResult>}
 */
export async function discoverSchema(collection, collectionNames, options = {}) {
  const {
    mode       = SCAN_MODE.HYBRID,
    sampleSize = 500,
    tailSize   = 500,
    maxScanMs  = 10_000,
  } = options;

  const state = _newState();
  const totalDocs = await collection.estimatedDocumentCount();

  if (totalDocs === 0) {
    return _buildResult(state, totalDocs);
  }

  if (mode === SCAN_MODE.FULL_SCAN) {
    await _fullScan(collection, collectionNames, state, maxScanMs);
  } else {
    // Phase 1 — $sample aggregate (fast, statistically representative)
    await _sampleScan(collection, collectionNames, state, Math.min(sampleSize, totalDocs));

    // Phase 2 — Tail scan (catches fields added by recent schema changes)
    if (mode === SCAN_MODE.HYBRID) {
      await _tailScan(collection, collectionNames, state, tailSize, maxScanMs);
    }
  }

  return _buildResult(state, totalDocs);
}

/**
 * Discovers the schema of documents inside a nested field (for child tables).
 * Uses the same hybrid approach but operates on the nested subdocuments.
 *
 * @param {import('mongodb').Collection} collection  parent collection
 * @param {string}   nestedField   e.g. 'address' or 'screens'
 * @param {object}   options       same as discoverSchema options
 * @returns {{ fieldTypeMap: object, totalDocs: number }}
 */
export async function discoverNestedSchema(collection, nestedField, options = {}) {
  const { sampleSize = 200, maxScanMs = 5_000 } = options;
  const fieldTypeMap = {};
  const deadline = Date.now() + maxScanMs;
  let scanned = 0;

  // Unwind nested field and project it for inspection
  const pipeline = [
    { $match: { [nestedField]: { $exists: true } } },
    { $sample: { size: sampleSize } },
    { $project: { [nestedField]: 1, _id: 0 } },
  ];

  const cursor = collection.aggregate(pipeline);
  for await (const doc of cursor) {
    if (Date.now() > deadline) break;
    const val = doc[nestedField];

    const items = Array.isArray(val) ? val : [val];
    for (const item of items) {
      if (!isPlainObject(item)) continue;
      const flat = flattenObject(item);
      for (const [k, v] of Object.entries(flat)) {
        if (!k || k.trim() === '') continue;
        const inferred = inferSQLType(v);
        fieldTypeMap[k] = resolveTypeConflict(fieldTypeMap[k], inferred);
      }
    }
    scanned++;
  }

  // Finalize deferred null types
  for (const key in fieldTypeMap) {
    fieldTypeMap[key] = finalizeType(fieldTypeMap[key]);
  }

  return { fieldTypeMap, scanned };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal scan strategies
// ─────────────────────────────────────────────────────────────────────────────

async function _sampleScan(collection, collectionNames, state, size) {
  const cursor = collection.aggregate([{ $sample: { size } }]);
  for await (const doc of cursor) {
    _mergeDoc(doc, collectionNames, state);
  }
}

async function _tailScan(collection, collectionNames, state, size, maxMs) {
  const deadline = Date.now() + maxMs;
  const cursor = collection.find({}).sort({ _id: -1 }).limit(size);
  for await (const doc of cursor) {
    if (Date.now() > deadline) break;
    _mergeDoc(doc, collectionNames, state);
  }
}

async function _fullScan(collection, collectionNames, state, maxMs) {
  const deadline = Date.now() + maxMs;
  const cursor = collection.find({});
  cursor.batchSize(500);
  for await (const doc of cursor) {
    if (Date.now() > deadline) {
      state.scanTruncated = true;
      break;
    }
    _mergeDoc(doc, collectionNames, state);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: merge one document into the running schema state
// ─────────────────────────────────────────────────────────────────────────────

function _mergeDoc(doc, collectionNames, state) {
  state.docsSeen++;

  for (const key in doc) {
    const val = doc[key];

    // Array of objects → child table
    if (Array.isArray(val) && val.length > 0 && isPlainObject(val[0])) {
      state.skipAttributes.add(key);
      // Track nested field names seen inside arrays
      _mergeNestedArray(key, val, state);
      continue;
    }

    // Plain object → child table
    if (isPlainObject(val)) {
      state.skipAttributes.add(key);
      _mergeNestedObject(key, val, state);
      continue;
    }

    // Scalar → main table column
    const inferred = inferSQLType(val);
    const existing = state.fieldTypeMap[key];
    const resolved = resolveTypeConflict(existing, inferred);

    // Track type conflicts for reporting
    if (existing && resolved !== existing) {
      state.typeConflicts.push({ field: key, from: existing, to: resolved });
    }

    state.fieldTypeMap[key] = resolved;
  }

  // FK detection (deduplicated)
  const fks = detectRelationships(doc, collectionNames);
  for (const fk of fks) {
    if (!state.foreignKeys.find(f => f.column === fk.column)) {
      state.foreignKeys.push(fk);
    }
  }
}

function _mergeNestedObject(fieldName, obj, state) {
  if (!state.nestedSchemas[fieldName]) state.nestedSchemas[fieldName] = {};
  const flat = flattenObject(obj);
  for (const [k, v] of Object.entries(flat)) {
    if (!k || k.trim() === '') continue;
    const inferred = inferSQLType(v);
    state.nestedSchemas[fieldName][k] = resolveTypeConflict(
      state.nestedSchemas[fieldName][k], inferred
    );
  }
}

function _mergeNestedArray(fieldName, arr, state) {
  if (!state.nestedSchemas[fieldName]) state.nestedSchemas[fieldName] = {};
  for (const item of arr) {
    if (!isPlainObject(item)) continue;
    const flat = flattenObject(item);
    for (const [k, v] of Object.entries(flat)) {
      if (!k || k.trim() === '') continue;
      const inferred = inferSQLType(v);
      state.nestedSchemas[fieldName][k] = resolveTypeConflict(
        state.nestedSchemas[fieldName][k], inferred
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function _newState() {
  return {
    fieldTypeMap:  {},
    skipAttributes: new Set(),
    foreignKeys:   [],
    nestedSchemas: {},    // { fieldName: { flatKey: sqlType } }
    typeConflicts: [],    // [{ field, from, to }]
    docsSeen:      0,
    scanTruncated: false,
  };
}

function _buildResult(state, totalDocs) {
  // Finalize deferred null types on all maps
  for (const key in state.fieldTypeMap) {
    state.fieldTypeMap[key] = finalizeType(state.fieldTypeMap[key]);
  }
  for (const nested of Object.values(state.nestedSchemas)) {
    for (const key in nested) {
      nested[key] = finalizeType(nested[key]);
    }
  }

  return {
    fieldTypeMap:   state.fieldTypeMap,
    skipAttributes: state.skipAttributes,
    foreignKeys:    state.foreignKeys,
    nestedSchemas:  state.nestedSchemas,
    typeConflicts:  state.typeConflicts,
    totalDocs,
    docsSeen:       state.docsSeen,
    scanTruncated:  state.scanTruncated,
  };
}
