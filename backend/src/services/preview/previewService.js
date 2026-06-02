/**
 * previewService.js
 * Server-side paginated preview of a MongoDB collection.
 * Returns only the requested page — never loads the full collection.
 */

/**
 * @param {Db}     db
 * @param {string} collectionName
 * @param {object} options
 * @param {number} options.page       1-based page number
 * @param {number} options.pageSize   max 100, default 10
 * @param {string} options.sortField  field to sort by (default '_id')
 * @param {string} options.sortOrder  'asc' | 'desc' (default 'asc')
 * @param {object} options.filter     MongoDB filter query (optional)
 * @returns {{ documents, page, pageSize, totalDocuments, totalPages }}
 */
export async function previewCollection(db, collectionName, options = {}) {
  const {
    page = 1,
    pageSize = 10,
    sortField = '_id',
    sortOrder = 'asc',
    filter = {},
  } = options;

  const safePage = Math.max(1, Number(page));
  const safeSize = Math.min(100, Math.max(1, Number(pageSize)));
  const skip = (safePage - 1) * safeSize;
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const collection = db.collection(collectionName);

  // Run count and data fetch in parallel
  const [documents, totalDocuments] = await Promise.all([
    collection.find(filter).sort(sort).skip(skip).limit(safeSize).toArray(),
    // estimatedDocumentCount is O(1) — do NOT use countDocuments({}) here
    collection.estimatedDocumentCount(),
  ]);

  return {
    collection: collectionName,
    page: safePage,
    pageSize: safeSize,
    totalDocuments,
    totalPages: Math.ceil(totalDocuments / safeSize),
    documents,
  };
}
