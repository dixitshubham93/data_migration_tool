/**
 * validate.middleware.js  — Step 10: Production Readiness
 *
 * Validates request bodies before they reach controllers.
 * Fails fast with descriptive errors instead of cryptic crashes deep in services.
 */
import ApiError from '../utils/ApiError.utils.js';

const SUPPORTED_PROTOCOLS = ['mongodb', 'mysql'];

/** Validates a database connection config object. */
function _validateConfig(cfg, label) {
  if (!cfg || typeof cfg !== 'object') {
    throw new ApiError(`${label} config is required`, 400);
  }
  if (!cfg.protocol || !SUPPORTED_PROTOCOLS.includes(cfg.protocol)) {
    throw new ApiError(`${label}.protocol must be one of: ${SUPPORTED_PROTOCOLS.join(', ')}`, 400);
  }
  if (!cfg.host) throw new ApiError(`${label}.host is required`, 400);
}

/**
 * Validates POST /migrate/start body.
 * Expects: { data: { source: MongoConfig, target: MySQLConfig } }
 */
export function validateMigrateStart(req, _res, next) {
  try {
    const { data } = req.body ?? {};
    if (!data) throw new ApiError("Request body must contain 'data'", 400);
    _validateConfig(data.source, 'source');
    _validateConfig(data.target, 'target');
    if (!data.source.database) {
      throw new ApiError('source.database is required', 400);
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Validates POST /migrate/check body.
 * Expects: { data: { protocol, host } }
 */
export function validateCheckConnection(req, _res, next) {
  try {
    const { data } = req.body ?? {};
    _validateConfig(data, 'data');
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Validates POST /migrate/preview body.
 * Expects: { source: { database }, collection }
 */
export function validatePreview(req, _res, next) {
  try {
    const { source, collection } = req.body ?? {};
    if (!source?.database) throw new ApiError('source.database is required', 400);
    if (!collection || typeof collection !== 'string') {
      throw new ApiError('collection (string) is required', 400);
    }
    const { page, pageSize } = req.body;
    if (page !== undefined && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
      throw new ApiError('page must be a positive integer', 400);
    }
    if (pageSize !== undefined && (Number(pageSize) < 1 || Number(pageSize) > 100)) {
      throw new ApiError('pageSize must be between 1 and 100', 400);
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Validates POST /migrate/dry-run body.
 */
export function validateDryRun(req, _res, next) {
  try {
    const { source } = req.body ?? {};
    _validateConfig(source, 'source');
    if (!source.database) throw new ApiError('source.database is required', 400);
    next();
  } catch (err) {
    next(err);
  }
}
