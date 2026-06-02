/**
 * dryRun.js  — 🟢 Nice to Have: Dry-run mode
 *
 * Connects to MongoDB source only (READ).
 * Does NOT connect to MySQL or execute any DDL/DML.
 *
 * Returns:
 *  - Discovered schema per collection
 *  - Generated DDL SQL (CREATE TABLE statements) — preview only
 *  - Detected foreign keys
 *  - Estimated row counts
 *  - Type conflicts found during sampling
 */
import { createMongoConnection } from '../../connections/mongo.connection.js';
import { discoverSchema, SCAN_MODE } from './schemaDiscovery.js';

/**
 * @param {object} source        MongoDB config { host, username, password, database, collections }
 * @param {object} options       { scanMode }
 * @returns {Promise<DryRunResult>}
 */
export async function runDryRun(source, options = {}) {
  const { client, db } = await createMongoConnection(source);

  try {
    const allCollections = await db.listCollections().toArray();
    const collectionNames = allCollections.map(c => c.name);

    const selectedNames = source.collections;
    const toAnalyze =
      source.migrateAllCollections || !selectedNames || !selectedNames.length
        ? allCollections
        : allCollections.filter(c => selectedNames.includes(c.name));

    const tables = [];
    const scanMode = options.scanMode ?? SCAN_MODE.SAMPLE; // faster for dry-run

    for (const col of toAnalyze) {
      const collection = db.collection(col.name);
      const result = await discoverSchema(collection, collectionNames, { mode: scanMode });
      const {
        fieldTypeMap, skipAttributes, foreignKeys,
        nestedSchemas, typeConflicts, totalDocs, docsSeen,
      } = result;

      // Generate CREATE TABLE DDL for main table
      const mainDDL = _buildCreateSQL(col.name, fieldTypeMap);

      // Generate DDL for child tables
      const childTables = Object.entries(nestedSchemas).map(([field, typeMap]) => {
        const childName = `${col.name}_${field}`;
        const fullTypeMap = {
          _id: 'VARCHAR(24)',
          [`${col.name}_ref_id`]: 'VARCHAR(24)',
          ...typeMap,
        };
        return {
          name: childName,
          parentField: field,
          columns: fullTypeMap,
          ddl: _buildCreateSQL(childName, fullTypeMap),
        };
      });

      tables.push({
        collection: col.name,
        estimatedRows: totalDocs,
        docsSeen,
        columns: fieldTypeMap,
        nestedFields: [...skipAttributes],
        foreignKeys,
        typeConflicts,
        ddl: mainDDL,
        childTables,
      });
    }

    return {
      database: source.database,
      totalCollections: toAnalyze.length,
      totalTables: tables.reduce((n, t) => n + 1 + t.childTables.length, 0),
      scanMode,
      tables,
    };
  } finally {
    await client.close().catch(() => {});
  }
}

function _buildCreateSQL(tableName, fieldTypeMap) {
  const defs = [
    '`_id` VARCHAR(24) PRIMARY KEY',
    ...Object.entries(fieldTypeMap)
      .filter(([k]) => k !== '_id')
      .map(([k, type]) => `  \`${k}\` ${type ?? 'TEXT'}`),
  ];
  return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n${defs.join(',\n')}\n);`;
}
