const crypto = require('node:crypto');

const TOKEN_TTL_SECONDS = 60 * 60;

function getTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_TOKEN_SECRET must be set and contain at least 32 characters.',
    );
  }

  return secret;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function sign(value) {
  return crypto
    .createHmac('sha256', getTokenSecret())
    .update(value)
    .digest('base64url');
}

function createAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(user.id),
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = encode(payload);

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifyAccessToken(token) {
  const [encodedPayload, encodedSignature] = String(token).split('.');

  if (!encodedPayload || !encodedSignature) {
    throw new Error('Invalid access token.');
  }

  const expectedSignature = sign(encodedPayload);
  const received = Buffer.from(encodedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length
    || !crypto.timingSafeEqual(received, expected)
  ) {
    throw new Error('Invalid access token.');
  }

  let payload;

  try {
    payload = decode(encodedPayload);
  } catch {
    throw new Error('Invalid access token.');
  }

  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Access token has expired.');
  }

  return payload;
}

module.exports = {
  TOKEN_TTL_SECONDS,
  createAccessToken,
  verifyAccessToken,
};
