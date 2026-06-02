/**
 * flattener.js
 * Flattens nested MongoDB documents into a single-level key→value map
 * suitable for a SQL row. Also detects FK relationships heuristically.
 */

/**
 * Returns true if val is a plain nested object (not Date, Array, BSON, null).
 */
export function isPlainObject(val) {
  return (
    typeof val === 'object' &&
    val !== null &&
    !(val instanceof Date) &&
    !Array.isArray(val) &&
    !val._bsontype
  );
}

/**
 * Recursively flattens a nested object into a flat key→value map.
 * Nested keys are joined with underscore: { a: { b: 1 } } → { a_b: 1 }
 * Arrays and Date objects are kept as-is (not flattened).
 */
export function flattenObject(obj, prefix = '') {
  const result = {};
  for (const key in obj) {
    const val = obj[key];
    const fullKey = prefix ? `${prefix}_${key}` : key;
    if (isPlainObject(val)) {
      Object.assign(result, flattenObject(val, fullKey));
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

/**
 * Detects foreign-key references in a document using multi-signal heuristics:
 *  Signal 1 — Field name ends with 'id' or 'ref' AND value is a string that looks like an ObjectId
 *  Signal 2 — Matched candidate collection name exists (singular or plural form)
 *
 * Returns: [{ column: 'userId', refTable: 'users' }]
 */
export function detectRelationships(doc, collectionNames) {
  const refs = [];
  const lowerNames = collectionNames.map(n => n.toLowerCase());

  for (const key in doc) {
    const val = doc[key];
    const lower = key.toLowerCase();

    const isRef =
      (lower.endsWith('id') || lower.endsWith('ref') || lower.endsWith('_id')) &&
      val != null &&
      (typeof val === 'string' ? /^[a-f\d]{24}$/i.test(val) : val?._bsontype);

    if (!isRef) continue;

    // Strip suffix and try to match a collection
    const stem = lower.replace(/(ref|id)$/i, '').replace(/_$/, '');
    const matched =
      lowerNames.indexOf(stem) >= 0
        ? collectionNames[lowerNames.indexOf(stem)]
        : lowerNames.indexOf(stem + 's') >= 0
          ? collectionNames[lowerNames.indexOf(stem + 's')]
          : null;

    if (matched && !refs.find(r => r.column === key)) {
      refs.push({ column: key, refTable: matched });
    }
  }
  return refs;
}
