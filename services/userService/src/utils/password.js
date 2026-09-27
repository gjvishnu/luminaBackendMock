const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);

  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedPassword) {
  const [algorithm, salt, storedHash] = String(storedPassword).split(':');

  if (algorithm !== 'scrypt' || !salt || !storedHash || !/^[0-9a-f]+$/i.test(storedHash)) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, Buffer.from(storedHash, 'hex').length);
  const expectedHash = Buffer.from(storedHash, 'hex');

  return expectedHash.length === derivedKey.length
    && crypto.timingSafeEqual(expectedHash, derivedKey);
}

module.exports = { hashPassword, verifyPassword };
