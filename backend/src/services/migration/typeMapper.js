/**
 * typeMapper.js
 * Converts MongoDB/JS values to MySQL column types.
 * Resolves type conflicts when multiple documents have different types for the same field.
 */

// Widening order: narrower types widen to broader types when conflicts occur.
const TYPE_RANK = {
  BOOLEAN:      1,
  INT:          2,
  DOUBLE:       3,
  DATETIME:     4,
  'VARCHAR(24)':5,
  'VARCHAR(255)':6,
  TEXT:         7,
  JSON:         8,
};

/**
 * Infers the best MySQL type for a given JS/BSON value.
 * Returns null when value is null/undefined — caller must defer until non-null seen.
 */
export function inferSQLType(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (typeof value === 'number') return Number.isInteger(value) ? 'INT' : 'DOUBLE';
  if (value instanceof Date) return 'DATETIME';
  if (Array.isArray(value)) return 'JSON';
  // BSON ObjectId
  if (typeof value === 'object' && value._bsontype) return 'VARCHAR(24)';
  if (typeof value === 'object') return 'JSON';
  if (typeof value === 'string') {
    // ISO date strings
    if (/^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(value)) return 'DATETIME';
    return value.length > 255 ? 'TEXT' : 'VARCHAR(255)';
  }
  return 'TEXT';
}

/**
 * Resolves type conflicts between two observations of the same field.
 * Always widens to the broader type — never narrows.
 */
export function resolveTypeConflict(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;   // incoming is null — keep existing
  const rankA = TYPE_RANK[existing] ?? 7;
  const rankB = TYPE_RANK[incoming] ?? 7;
  return rankB > rankA ? incoming : existing;
}

/**
 * Finalizes a type after all documents have been scanned.
 * If no non-null value was ever seen, defaults to TEXT.
 */
export function finalizeType(type) {
  return type ?? 'TEXT';
}
