import { MongoClient } from 'mongodb';
import ApiError from '../utils/ApiError.utils.js';

/**
 * Builds a MongoDB connection URI from a config object.
 * Supports: local, Atlas (mongodb+srv), and generic remote.
 */
export function buildMongoUri(config) {
  const { username, password, host, port = 27017 } = config;
  const resolvedHost = host === 'localhost' ? '127.0.0.1' : host;
  const isAtlas = resolvedHost.includes('.mongodb.net');

  if (isAtlas) {
    return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${resolvedHost}/?retryWrites=true&w=majority`;
  }
  if (resolvedHost === '127.0.0.1') {
    return `mongodb://${resolvedHost}:${port}/`;
  }
  return `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${resolvedHost}:${port}/?authSource=admin`;
}

/**
 * Creates a MongoClient and returns { client, db }.
 * config.database is optional — omit for admin-level operations (e.g. listDatabases).
 */
export async function createMongoConnection(config) {
  try {
    const uri = buildMongoUri(config);
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
    await client.connect();
    const db = config.database ? client.db(config.database) : client.db();
    return { client, db };
  } catch (err) {
    throw new ApiError(`MongoDB connection failed: ${err.message}`, 400);
  }
}
