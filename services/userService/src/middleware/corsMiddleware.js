const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173';

function allowedOrigins() {
  return (process.env.CORS_ORIGIN || DEFAULT_ALLOWED_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsMiddleware(req, res, next) {
  const requestOrigin = req.headers.origin;
  const origins = allowedOrigins();

  // Only reflect configured origins. This is required when credentials are
  // enabled because browsers reject `Access-Control-Allow-Origin: *`.
  if (requestOrigin && origins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    if (!requestOrigin || !origins.includes(requestOrigin)) {
      return res.status(403).json({ message: 'Origin is not allowed.' });
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization',
    );

    return res.sendStatus(204);
  }

  return next();
}

module.exports = { corsMiddleware };
