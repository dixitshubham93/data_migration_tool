/**
 * error.middleware.js
 * Global error handler — must be registered LAST in App.js.
 * Catches all errors thrown by asyncHandler or next(err).
 */
import ApiError from '../utils/ApiError.utils.js';

// eslint-disable-next-line no-unused-vars
export function errorMiddleware(err, req, res, _next) {
  // Known operational error
  if (err instanceof ApiError) {
    return res.status(err.statusCode || 500).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors ?? [],
    });
  }

  // Unknown error — log full stack, return generic message
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: 'Internal server error',
    errors: [],
  });
}
