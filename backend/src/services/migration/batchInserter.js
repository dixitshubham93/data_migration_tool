/**
 * batchInserter.js — BatchInserter
 *
 * Buffers rows and flushes as multi-row INSERT IGNORE statements.
 * Reduces MySQL round trips from N (one per doc) to N/batchSize.
 *
 * Default batchSize = 500 rows  →  ~2000 round trips per 1M docs
 * vs current: 1,000,000 round trips per 1M docs
 *
 * On batch failure → falls back to per-row inserts to isolate bad documents.
 */
export class BatchInserter {
  /**
   * @param {mysql2.Connection} conn
   * @param {string}            tableName
   * @param {number}            batchSize  rows per INSERT (default 500)
   */
  constructor(conn, tableName, batchSize = 500) {
    this.conn = conn;
    this.tableName = tableName;
    this.batchSize = batchSize;
    this.buffer = [];
    this.inserted = 0;
    this.errors = [];
  }

  /** Adds a row to the buffer. Flushes automatically when buffer is full. */
  async add(row) {
    this.buffer.push(row);
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /** Flushes all buffered rows to MySQL. Call after cursor exhaustion. */
  async flush() {
    if (!this.buffer.length) return;
    const rows = this.buffer.splice(0); // drain buffer atomically

    // Build column superset across all rows in this batch
    const allKeys = [
      ...new Set(rows.flatMap(r => Object.keys(r).filter(k => k && k.trim() !== ''))),
    ];
    if (!allKeys.length) return;

    const placeholders = rows
      .map(() => `(${allKeys.map(() => '?').join(', ')})`)
      .join(', ');

    const values = rows.flatMap(row =>
      allKeys.map(k => {
        const v = row[k] ?? null;
        if (v === null) return null;
        if (typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
        return v;
      })
    );

    const query =
      `INSERT IGNORE INTO \`${this.tableName}\` (\`${allKeys.join('`, `')}\`) VALUES ${placeholders}`;

    try {
      await this.conn.query(query, values);
      this.inserted += rows.length;
    } catch (_batchErr) {
      // Batch failed — isolate the bad row(s) with individual inserts
      for (const row of rows) {
        await this._insertRow(row);
      }
    }
  }

  async _insertRow(row) {
    const keys = Object.keys(row).filter(k => k && k.trim() !== '');
    if (!keys.length) return;

    const values = keys.map(k => {
      const v = row[k] ?? null;
      if (v === null) return null;
      if (typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
      return v;
    });

    const query =
      `INSERT IGNORE INTO \`${this.tableName}\` (\`${keys.join('`, `')}\`) VALUES (${keys.map(() => '?').join(', ')})`;

    try {
      await this.conn.query(query, values);
      this.inserted++;
    } catch (err) {
      this.errors.push({ _id: row._id ?? 'unknown', error: err.message });
    }
  }
}
