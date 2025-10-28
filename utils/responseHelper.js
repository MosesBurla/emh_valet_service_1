/**
 * Standardized API Response Helper
 * Provides consistent response format across all API endpoints
 */

class ApiResponse {
  constructor(success = true, data = null, message = '', error = null, statusCode = 200) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  static success(data = null, message = 'Success', statusCode = 200) {
    return new ApiResponse(true, data, message, null, statusCode);
  }

  static error(error = 'ServerError', message = 'An error occurred', data = null, statusCode = 500) {
    return new ApiResponse(false, data, message, error, statusCode);
  }

  static created(data = null, message = 'Resource created successfully') {
    return new ApiResponse(true, data, message, null, 201);
  }

  static updated(data = null, message = 'Resource updated successfully') {
    return new ApiResponse(true, data, message, null, 200);
  }

  static deleted(message = 'Resource deleted successfully') {
    return new ApiResponse(true, null, message, null, 200);
  }

  static notFound(message = 'Resource not found') {
    return new ApiResponse(false, null, message, 'NotFoundError', 404);
  }

  static badRequest(message = 'Bad request', error = 'BadRequestError') {
    return new ApiResponse(false, null, message, error, 400);
  }

  static unauthorized(message = 'Unauthorized access', error = 'AuthError') {
    return new ApiResponse(false, null, message, error, 401);
  }

  static forbidden(message = 'Access forbidden', error = 'ForbiddenError') {
    return new ApiResponse(false, null, message, error, 403);
  }

  static conflict(message = 'Resource conflict', error = 'ConflictError') {
    return new ApiResponse(false, null, message, error, 409);
  }

  static validationError(message = 'Validation failed', error = 'ValidationError') {
    return new ApiResponse(false, null, message, error, 422);
  }

  // Method to send response using Express response object
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      data: this.data,
      message: this.message,
      error: this.error,
      timestamp: this.timestamp
    });
  }
}

module.exports = ApiResponse;
