import mysql from 'mysql2/promise';
import ApiError from '../utils/ApiError.utils.js';

/**
 * Creates a single mysql2 connection.
 * Used for: migration (needs transaction control per connection).
 */
export async function createMySQLConnection(config) {
  try {
    const conn = await mysql.createConnection({
      host: config.host,
      user: config.username,
      port: Number(config.port) || 3306,
      password: config.password,
      multipleStatements: false,
    });
    return conn;
  } catch (err) {
    throw new ApiError(`MySQL connection failed: ${err.message}`, 400);
  }
}

/**
 * Verifies MySQL connectivity and closes immediately.
 * Used for: connection-check endpoint only.
 */
export async function pingMySQL(config) {
  const conn = await createMySQLConnection(config);
  try {
    await conn.ping();
  } finally {
    await conn.end().catch(() => {});
  }
}
