const path = require('node:path');
const dotenv = require('dotenv');

// Load the user service's .env regardless of the directory used to start Node.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnvironment(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(requireEnvironment('DB_USER'));
  const password = encodeURIComponent(requireEnvironment('DB_PASSWORD'));
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = encodeURIComponent(requireEnvironment('DB_NAME'));

  return `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;
}

process.env.DATABASE_URL = getDatabaseUrl();

module.exports = {
  getDatabaseUrl,
  requireEnvironment,
};
