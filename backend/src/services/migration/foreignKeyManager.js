/**
 * foreignKeyManager.js  — Step 7: Relationship Handling
 *
 * Why FK constraints are NOT applied during migration:
 *  - Collections are migrated sequentially; if 'bookings' migrates before 'users',
 *    a FK on bookings.userId → users._id will fail (users table may not exist yet).
 *  - Applying constraints during batch inserts also slows MySQL significantly.
 *
 * Correct approach:
 *  1. Detect relationships during schema discovery (already done in flattener.js)
 *  2. Store detected FKs in the ER diagram
 *  3. User reviews + confirms which FKs to apply in the UI
 *  4. POST /migrate/:id/apply-fk applies them AFTER all collections are migrated
 */
import ApiError from '../../utils/ApiError.utils.js';
import { createMySQLConnection } from '../../connections/mysql.connection.js';
import { getErDiagram } from './checkpointStore.js';

/**
 * Applies FK constraints for a completed migration.
 * Runs per-FK with individual try/catch — one bad FK does not abort the rest.
 *
 * @param {string} migrationId
 * @param {object} targetConfig    MySQL connection config
 * @param {string} dbName          target database name
 * @param {Array}  selectedFKs     [{ table, column, refTable }] — user-confirmed subset
 *                                 If null/empty, applies ALL detected FKs from ER diagram.
 * @returns {{ applied: [], skipped: [], errors: [] }}
 */
export async function applyForeignKeys(migrationId, targetConfig, dbName, selectedFKs) {
  const erDiagram = getErDiagram(migrationId);
  if (!erDiagram || erDiagram.length === 0) {
    throw new ApiError('No ER diagram found for this migration. Run migration first.', 404);
  }

  // Collect all detected FKs from ER diagram
  const allFKs = [];
  for (const table of erDiagram) {
    if (!table.foreignKeys?.length) continue;
    for (const fk of table.foreignKeys) {
      allFKs.push({ table: table.table, column: fk.column, refTable: fk.refTable });
    }
  }

  // Filter to user-selected subset if provided
  const toApply = (selectedFKs && selectedFKs.length > 0)
    ? allFKs.filter(fk =>
        selectedFKs.some(s => s.table === fk.table && s.column === fk.column)
      )
    : allFKs;

  if (toApply.length === 0) {
    return { applied: [], skipped: [], errors: [], message: 'No foreign keys to apply' };
  }

  const conn = await createMySQLConnection(targetConfig);
  await conn.query(`USE \`${dbName}\``);

  const results = { applied: [], skipped: [], errors: [] };

  for (const fk of toApply) {
    const constraintName = `fk_${fk.table}_${fk.column}`.substring(0, 64);
    const sql = `ALTER TABLE \`${fk.table}\` ADD CONSTRAINT \`${constraintName}\`
                 FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.refTable}\`(\`_id\`)
                 ON DELETE SET NULL ON UPDATE CASCADE`;
    try {
      await conn.query(sql);
      results.applied.push({ table: fk.table, column: fk.column, refTable: fk.refTable });
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        results.skipped.push({ ...fk, reason: 'already exists' });
      } else {
        // Common: ER_NO_REFERENCED_ROW_2 — orphan refs in data
        results.errors.push({ ...fk, error: err.message });
      }
    }
  }

  await conn.end().catch(() => {});
  return results;
}

/**
 * Returns detected FKs from the ER diagram for a given migration.
 * Used by the frontend to show a confirmation UI before applying constraints.
 */
export function getDetectedForeignKeys(migrationId) {
  const erDiagram = getErDiagram(migrationId);
  if (!erDiagram) return [];

  return erDiagram
    .filter(t => t.foreignKeys?.length > 0)
    .flatMap(t =>
      t.foreignKeys.map(fk => ({
        table: t.table,
        column: fk.column,
        refTable: fk.refTable,
      }))
    );
}
