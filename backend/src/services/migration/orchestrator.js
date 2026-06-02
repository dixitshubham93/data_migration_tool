/**
 * orchestrator.js
 *
 * Top-level migration coordinator.
 * - Streams documents via async cursor (no .toArray())
 * - Uses BatchInserter (500 rows/query)
 * - Emits real-time progress via EventEmitter (consumed by SSE endpoint)
 * - All state is scoped to this run (DDLManager + nestedInserters are local)
 */
import { EventEmitter } from 'events';
import crypto from 'crypto';

import { createMongoConnection } from '../../connections/mongo.connection.js';
import { createMySQLConnection } from '../../connections/mysql.connection.js';
import { discoverSchema, SCAN_MODE } from './schemaDiscovery.js';
import { DDLManager } from './ddl.js';
import { BatchInserter } from './batchInserter.js';
import { flattenObject, isPlainObject } from './flattener.js';
import { inferSQLType, finalizeType } from './typeMapper.js';
import {
  initCheckpoint,
  getCheckpoint,
  updateCollection,
  markMigrationDone,
  markMigrationFailed,
  storeErDiagram,
} from './checkpointStore.js';

// Shared emitter — SSE controllers subscribe to migrationId events
export const migrationEmitter = new EventEmitter();
migrationEmitter.setMaxListeners(200);

/**
 * Runs a full migration in the background.
 * Called by the controller after responding 202.
 *
 * @param {string} migrationId  - UUID for this run
 * @param {object} data         - { source: MongoConfig, target: MySQLConfig }
 */
export async function runMigration(migrationId, data) {
  const { source, target, options: runOptions = {} } = data;
  let mongoClient = null;
  let mysqlConn = null;

  try {
    // ── Connections ───────────────────────────────────────────────
    const { client, db } = await createMongoConnection(source);
    mongoClient = client;
    mysqlConn = await createMySQLConnection(target);

    // ── Determine collections to migrate ─────────────────────────
    const allCollections = await db.listCollections().toArray();
    const collectionNames = allCollections.map(c => c.name);

    const selectedNames = source.collections;
    const toMigrate =
      source.migrateAllCollections || !selectedNames || !selectedNames.length
        ? allCollections
        : allCollections.filter(c => selectedNames.includes(c.name));

    initCheckpoint(migrationId, toMigrate.map(c => c.name));

    // ── DDL setup ─────────────────────────────────────────────────
    const ddl = new DDLManager(mysqlConn);
    await ddl.ensureDatabase(source.database);

    _emit(migrationId, {
      event: 'start',
      totalCollections: toMigrate.length,
      collections: toMigrate.map(c => c.name),
    });

    const erDiagram = [];

    // ── Migrate each collection (per-collection transactions) ────
    for (let i = 0; i < toMigrate.length; i++) {
      const collectionName = toMigrate[i].name;
      const collection = db.collection(collectionName);

      _emit(migrationId, {
        event: 'collection_start',
        collection: collectionName,
        collectionIndex: i + 1,
        totalCollections: toMigrate.length,
      });

      // ── Step 9: Resume — skip already completed collections ──────
      const existingCp = getCheckpoint(migrationId);
      if (existingCp?.collections[collectionName]?.status === 'done') {
        _emit(migrationId, {
          event: 'collection_skipped',
          collection: collectionName,
          reason: 'already completed in previous run',
        });
        continue;
      }

      // Each collection gets its own connection + transaction.
      // This means a failed collection rolls back only ITS data —
      // previously committed collections are unaffected.
      const txConn = await createMySQLConnection(target);
      await txConn.query(`USE \`${source.database}\``);

      try {
        await txConn.beginTransaction();

        await _migrateCollection({
          migrationId, txConn, ddl, collection,
          collectionName, collectionNames,
          index: i, total: toMigrate.length,
          erDiagram, runOptions,
        });

        await txConn.commit();
        _emit(migrationId, {
          event: 'collection_committed',
          collection: collectionName,
        });

      } catch (err) {
        // Roll back this collection's inserts
        await txConn.rollback().catch(() => {});

        updateCollection(migrationId, collectionName, { status: 'failed', error: err.message });
        _emit(migrationId, {
          event: 'collection_error',
          collection: collectionName,
          error: err.message,
          rolledBack: true,
        });

        // stopOnError: true → abort all remaining collections
        if (runOptions.stopOnError) {
          throw new Error(`Aborted after failure in collection '${collectionName}': ${err.message}`);
        }
      } finally {
        await txConn.end().catch(() => {});
      }
    }

    storeErDiagram(migrationId, erDiagram);
    markMigrationDone(migrationId);
    _emit(migrationId, { event: 'complete', erDiagram });

  } catch (err) {
    markMigrationFailed(migrationId, err.message);
    _emit(migrationId, { event: 'error', error: err.message });
  } finally {
    if (mysqlConn) await mysqlConn.end().catch(() => {});
    if (mongoClient) await mongoClient.close().catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: migrate one collection
// ─────────────────────────────────────────────────────────────────────────────
async function _migrateCollection({
  migrationId, txConn, ddl, collection,
  collectionName, collectionNames,
  index, total, erDiagram, runOptions = {},
}) {
  // 1. Schema discovery — hybrid cursor, no .toArray()
  const scanMode = runOptions.scanMode ?? SCAN_MODE.HYBRID;
  const schemaResult = await discoverSchema(collection, collectionNames, { mode: scanMode });
  const { fieldTypeMap, skipAttributes, foreignKeys, nestedSchemas, typeConflicts, totalDocs, docsSeen } = schemaResult;

  // Emit schema summary for UI display
  _emit(migrationId, {
    event: 'schema_discovered',
    collection: collectionName,
    fields: Object.keys(fieldTypeMap).length,
    nestedTables: Object.keys(nestedSchemas).length,
    typeConflicts,
    docsSeen,
    scanMode,
  });

  if (totalDocs === 0) {
    updateCollection(migrationId, collectionName, { status: 'done', totalDocs: 0 });
    _emit(migrationId, { event: 'collection_done', collection: collectionName, skipped: true });
    return;
  }

  updateCollection(migrationId, collectionName, { status: 'running', totalDocs });

  // 2. Create main table
  await ddl.createTable(collectionName, fieldTypeMap, foreignKeys);
  erDiagram.push({ table: collectionName, columns: fieldTypeMap, foreignKeys });

  // 3. Pre-create child tables using discovered nested schemas
  //    (avoids first-doc-only table creation and reduces ALTER TABLE calls)
  for (const [nestedField, nestedTypeMap] of Object.entries(nestedSchemas)) {
    const nestedTable = `${collectionName}_${nestedField}`;
    const fullTypeMap = {
      _id: 'VARCHAR(24)',
      [`${collectionName}_ref_id`]: 'VARCHAR(24)',
      ...nestedTypeMap,
    };
    await ddl.createTable(nestedTable, fullTypeMap);
    erDiagram.push({ table: nestedTable, columns: fullTypeMap, foreignKeys: [] });
  }

  // 4. Per-collection inserters — use txConn so inserts join the transaction
  const mainInserter = new BatchInserter(txConn, collectionName, 500);
  const nestedInserters = new Map(); // nestedTableName → BatchInserter

  // 5. Stream all documents via cursor (O(1) memory — no .toArray())
  let processedDocs = 0;
  const cursor = collection.find({});
  cursor.batchSize(1000); // MongoDB driver fetch batch — bounds memory

  for await (const doc of cursor) {
    const id = doc._id?.toString() ?? crypto.randomUUID();
    const clonedDoc = { ...doc, _id: id };

    // Handle skip attributes (nested objects / arrays of objects)
    for (const key of skipAttributes) {
      const val = doc[key];
      const nestedTable = `${collectionName}_${key}`;

      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        for (const item of val) {
        await _insertNested(txConn, ddl, nestedTable, item, id, collectionName, nestedInserters);
        }
      } else if (isPlainObject(val)) {
        await _insertNested(txConn, ddl, nestedTable, val, id, collectionName, nestedInserters);
      }

      delete clonedDoc[key];
    }

    // Flatten and insert main row
    const flatDoc = flattenObject(clonedDoc);
    await ddl.ensureColumns(collectionName, flatDoc);
    await mainInserter.add(flatDoc);

    processedDocs++;

    // Emit progress every 250 docs
    if (processedDocs % 250 === 0 || processedDocs === totalDocs) {
      updateCollection(migrationId, collectionName, { processedDocs });
      _emit(migrationId, {
        event: 'progress',
        collection: collectionName,
        collectionIndex: index + 1,
        totalCollections: total,
        processedDocs,
        totalDocs,
        percent: Math.round((processedDocs / totalDocs) * 100),
      });
    }
  }

  // 5. Flush remaining rows
  await mainInserter.flush();
  for (const inserter of nestedInserters.values()) {
    await inserter.flush();
  }

  updateCollection(migrationId, collectionName, { status: 'done', processedDocs });
  _emit(migrationId, {
    event: 'collection_done',
    collection: collectionName,
    processedDocs,
    errors: mainInserter.errors,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: flatten and batch-insert a nested object into a child table
// ─────────────────────────────────────────────────────────────────────────────
async function _insertNested(mysqlConn, ddl, nestedTable, obj, parentId, collectionName, nestedInserters) {
  const flat = flattenObject(obj);
  flat._id = crypto.randomUUID();
  flat[`${collectionName}_ref_id`] = parentId;

  if (!nestedInserters.has(nestedTable)) {
    if (!ddl.tableSchemas.has(nestedTable)) {
      const typeMap = Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, finalizeType(inferSQLType(v))])
      );
      await ddl.createTable(nestedTable, typeMap);
    }
    // Nested inserter also uses txConn (passed as mysqlConn here)
    nestedInserters.set(nestedTable, new BatchInserter(mysqlConn, nestedTable, 500));
  }

  await ddl.ensureColumns(nestedTable, flat);
  await nestedInserters.get(nestedTable).add(flat);
}

function _emit(migrationId, payload) {
  migrationEmitter.emit(migrationId, payload);
}
