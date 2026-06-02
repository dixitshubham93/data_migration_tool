/**
 * ddl.js — DDLManager
 *
 * Owns ALL CREATE TABLE and ALTER TABLE operations for one migration run.
 * Scoped per-migration (instantiated inside orchestrator) — NOT a global singleton.
 *
 * Tracks known columns per table in a Map to avoid redundant ALTER TABLE queries.
 */
import { inferSQLType, finalizeType } from './typeMapper.js';

export class DDLManager {
  /**
   * @param {mysql2.Connection} conn - mysql2 connection
   */
  constructor(conn) {
    this.conn = conn;
    // Map<tableName, Set<columnName>>
    this.tableSchemas = new Map();
  }

  /** Creates the target database and selects it. */
  async ensureDatabase(dbName) {
    await this.conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await this.conn.query(`USE \`${dbName}\``);
  }

  /**
   * Creates a table if it does not exist.
   * @param {string}   tableName
   * @param {object}   fieldTypeMap   { fieldName: sqlType }
   * @param {Array}    foreignKeys    [{ column, refTable }] — applied as deferred constraints
   */
  async createTable(tableName, fieldTypeMap, foreignKeys = []) {
    if (this.tableSchemas.has(tableName)) return; // already created this run

    const defs = [
      '`_id` VARCHAR(24) PRIMARY KEY',
      ...Object.entries(fieldTypeMap)
        .filter(([k]) => k !== '_id')
        .map(([k, type]) => `\`${k}\` ${type ?? 'TEXT'}`),
    ];

    await this.conn.query(
      `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${defs.join(', ')})`
    );

    const knownCols = new Set(['_id', ...Object.keys(fieldTypeMap)]);
    this.tableSchemas.set(tableName, knownCols);
  }

  /**
   * Ensures all keys in flatDoc have a corresponding column in the table.
   * ALTERs the table for any new columns found in this document.
   * Ignores ER_DUP_FIELDNAME (race condition safety).
   *
   * @param {string} tableName
   * @param {object} flatDoc    flattened document key→value
   */
  async ensureColumns(tableName, flatDoc) {
    const knownCols = this.tableSchemas.get(tableName);
    if (!knownCols) return; // table not created yet — skip

    const missingKeys = Object.keys(flatDoc).filter(
      k => k && k.trim() !== '' && !knownCols.has(k)
    );

    for (const k of missingKeys) {
      const type = finalizeType(inferSQLType(flatDoc[k]));
      try {
        await this.conn.query(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`${k}\` ${type}`
        );
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      }
      knownCols.add(k);
    }
  }
}
