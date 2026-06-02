/**
 * connection.controller.js
 *
 * Replaces:
 *  - checkconnection.controller.js
 *  - mongoMeta.controller.js
 *
 * Uses the single source of truth: connections/mongo.connection.js
 */
import asyncHandler from '../utils/asyncHandler.utils.js';
import ApiError from '../utils/ApiError.utils.js';
import ApiResponse from '../utils/ApiResponse.utils.js';
import { createMongoConnection } from '../connections/mongo.connection.js';
import { pingMySQL } from '../connections/mysql.connection.js';

/** POST /migrate/check  — verifies connectivity to source or target */
export const checkConnection = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (!data?.protocol) throw new ApiError('protocol is required', 400);

  if (data.protocol === 'mongodb') {
    const { client } = await createMongoConnection(data);
    await client.close();
  } else if (data.protocol === 'mysql') {
    await pingMySQL(data);
  } else {
    throw new ApiError('Unsupported protocol. Supported: mongodb, mysql', 400);
  }

  return res.status(200).json(
    new ApiResponse('success', 200, { message: 'Connection successful' })
  );
});

/** POST /migrate/databases  — lists MongoDB databases */
export const listDatabases = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (!data || data.protocol !== 'mongodb') {
    throw new ApiError('Only MongoDB protocol is supported', 400);
  }

  // Connect without specifying a database (admin-level)
  const { client } = await createMongoConnection({ ...data, database: undefined });
  try {
    const { databases } = await client.db().admin().listDatabases();
    return res.status(200).json(
      new ApiResponse('success', 200, { databases: databases.map(d => d.name) })
    );
  } finally {
    await client.close();
  }
});

/** POST /migrate/collections  — lists collections in a MongoDB database */
export const listCollections = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (!data || data.protocol !== 'mongodb') {
    throw new ApiError('Only MongoDB protocol is supported', 400);
  }
  if (!data.database) throw new ApiError('database field is required', 400);

  const { client, db } = await createMongoConnection(data);
  try {
    const cols = await db.listCollections().toArray();
    return res.status(200).json(
      new ApiResponse('success', 200, { collections: cols.map(c => c.name) })
    );
  } finally {
    await client.close();
  }
});
