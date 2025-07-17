// utils/connectToMongo.js
import { MongoClient } from 'mongodb';

let client;
let db;

export const connectToMongo = async (config) => {
  const {
    username = '',
    password = '',
    host = 'localhost',
    port = 27017,
    database,
  } = config;

  if (!database) throw new Error('Missing database name');

  const resolvedHost = host === 'localhost' ? '127.0.0.1' : host;
  const isAtlas = resolvedHost.includes('.mongodb.net');

  let uri;

  if (isAtlas) {
    uri = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${resolvedHost}/${database}?retryWrites=true&w=majority`;
  } else if (username && password && resolvedHost !== '127.0.0.1') {
    uri = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${resolvedHost}:${port}/?authSource=admin`;
  } else {
    uri = `mongodb://${resolvedHost}:${port}`;
  }

  if (db) return db;

  client = new MongoClient(uri);

  try {
    await client.connect();
    db = client.db(database);
    console.log(`✅ Connected to MongoDB at ${resolvedHost}/${database}`);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};
