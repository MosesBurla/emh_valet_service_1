const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Handle different types of errors
  let message = err.message;
  let error = err.name || 'ServerError';

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    error = 'ValidationError';
  }

  // Handle mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
    error = 'DuplicateKeyError';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    error = 'AuthError';
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Token expired';
    error = 'AuthError';
  }

  res.status(statusCode).json({
    success: false,
    error: error,
    message: message,
    data: null,
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
