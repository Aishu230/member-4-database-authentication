// Central error handler. Controllers call next(error) and end up here.
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[error] ${req.method} ${req.url}:`, err.message || err);
  }

  // Broken JSON in the request body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body is not valid JSON' });
  }

  // Bad ObjectId
  if (err.name === 'CastError') {
    return res.status(404).json({ success: false, message: `Resource not found with id '${err.value}'` });
  }

  // Duplicate key (for example an email that is already used)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return res.status(409).json({
      success: false,
      message: `Duplicate value entered for field '${field}'. Please choose another.`,
    });
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((item) => item.message).join(', ');
    return res.status(400).json({ success: false, message });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid authentication token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Authentication token has expired' });
  }

  const status = err.statusCode || 500;
  const hideDetails = status === 500 && process.env.NODE_ENV === 'production';
  res.status(status).json({
    success: false,
    message: hideDetails ? 'Internal Server Error' : err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
