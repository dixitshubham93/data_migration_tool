/**
 * preview.controller.js
 * Replaces PreviewData.controller.js
 *
 * Old: fetched 100 docs from every collection in one request
 * New: paginated, single collection, server-side skip/limit
 */
import asyncHandler from '../utils/asyncHandler.utils.js';
import ApiError from '../utils/ApiError.utils.js';
import ApiResponse from '../utils/ApiResponse.utils.js';
import { createMongoConnection } from '../connections/mongo.connection.js';
import { previewCollection } from '../services/preview/previewService.js';

/**
 * POST /migrate/preview
 * Body: { source: MongoConfig, collection, page, pageSize, sortField, sortOrder, filter }
 */
export const preview = asyncHandler(async (req, res) => {
  const { source, collection, page, pageSize, sortField, sortOrder, filter } = req.body;

  if (!source?.database) throw new ApiError('source.database is required', 400);
  if (!collection) throw new ApiError('collection is required', 400);

  const { client, db } = await createMongoConnection(source);
  try {
    const result = await previewCollection(db, collection, {
      page, pageSize, sortField, sortOrder, filter,
    });
    return res.status(200).json(new ApiResponse('success', 200, result));
  } finally {
    await client.close();
  }
});
