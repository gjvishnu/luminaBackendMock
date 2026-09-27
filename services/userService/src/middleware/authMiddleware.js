const { verifyAccessToken } = require('../utils/accessToken');

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex === -1) {
      return cookies;
    }

    const name = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();

    if (name) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }

    return cookies;
  }, {});
}

function getAccessToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies.access_token || cookies.token;

  if (cookieToken) {
    return cookieToken;
  }

  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme?.toLowerCase() === 'bearer' && token) {
    return token;
  }

  return null;
}

function authenticate(accessToken, req, res, next) {
  if (!accessToken) {
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect('/login');
    }

    return res.status(401).json({
      message: 'Authentication required.',
      redirectTo: '/login',
    });
  }

  try {
    req.auth = verifyAccessToken(accessToken);
    return next();
  } catch (error) {
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect('/login');
    }

    return res.status(401).json({
      message: error.message || 'Invalid or expired token.',
    });
  }
}

function requireAuth(req, res, next) {
  return authenticate(getAccessToken(req), req, res, next);
}

function requireCookieAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const accessToken = cookies.access_token || cookies.token;

  return authenticate(accessToken, req, res, next);
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'ADMIN') {
    return res.status(403).json({
      message: 'Admin access required.',
    });
  }

  return next();
}

module.exports = {
  parseCookies,
  getAccessToken,
  requireAuth,
  requireCookieAuth,
  requireAdmin,
};
