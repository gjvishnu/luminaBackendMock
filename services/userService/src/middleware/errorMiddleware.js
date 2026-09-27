function notFoundMiddleware(req, res) {
  return res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorMiddleware(error, req, res, next) {
  // Keep the error middleware signature at four arguments so Express treats it
  // as an error handler.
  void next;
  console.error('Request failed:', error.stack || error);

  if (res.headersSent) {
    return;
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      message: 'Invalid JSON request body.',
    });
  }

  return res.status(500).json({
    message: 'Internal server error.',
  });
}

module.exports = { notFoundMiddleware, errorMiddleware };
