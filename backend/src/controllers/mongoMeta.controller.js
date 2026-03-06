import { MongoClient } from "mongodb";
import asyncHandler from "../utils/asyncHandler.utils.js";
import ApiResponse from "../utils/ApiResponse.utils.js";
import ApiError from "../utils/ApiError.utils.js";

/**
 * Build a MongoDB connection URI from a credential object.
 * Supports localhost, Atlas (mongodb+srv), and generic remote hosts.
 */
function buildMongoUri(data) {
  const { username, password, host, port = 27017 } = data;
  const resolvedHost = host === "localhost" ? "127.0.0.1" : host;
  const isAtlas = resolvedHost.includes(".mongodb.net");

  if (isAtlas) {
    return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${resolvedHost}/?retryWrites=true&w=majority`;
  } else if (resolvedHost === "127.0.0.1") {
    return `mongodb://${resolvedHost}:${port}/`;
  } else {
    return `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${resolvedHost}:${port}/?authSource=admin`;
  }
}

/**
 * POST /migrate/databases
 * Body: { data: { protocol, host, port, username, password } }
 * Returns the list of database names available on the MongoDB server.
 */
export const listDatabases = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (!data || data.protocol !== "mongodb") {
    throw new ApiError("Only MongoDB protocol is supported", 400);
  }

  const uri = buildMongoUri(data);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    const names = databases.map((d) => d.name);
    return res.status(200).json(
      new ApiResponse("success", 200, { databases: names })
    );
  } finally {
    await client.close();
  }
});

/**
 * POST /migrate/collections
 * Body: { data: { protocol, host, port, username, password, database } }
 * Returns the list of collection names for the given database.
 */
export const listCollections = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (!data || data.protocol !== "mongodb") {
    throw new ApiError("Only MongoDB protocol is supported", 400);
  }
  if (!data.database) {
    throw new ApiError("database field is required", 400);
  }

  const uri = buildMongoUri(data);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(data.database);
    const cols = await db.listCollections().toArray();
    const names = cols.map((c) => c.name);
    return res.status(200).json(
      new ApiResponse("success", 200, { collections: names })
    );
  } finally {
    await client.close();
  }
});
