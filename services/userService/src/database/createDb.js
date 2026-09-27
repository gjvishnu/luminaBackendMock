const { Client } = require('pg');
const { getDatabaseUrl } = require('../config/env');

function databaseNameFromUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  return databaseName;
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function maintenanceDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  // Keep connection options such as sslmode, but the Prisma schema option is
  // specific to the application database and is not needed here.
  url.searchParams.delete('schema');
  url.hash = '';
  return url.toString();
}

async function ensureDatabaseExists() {
  const targetUrl = getDatabaseUrl();
  const databaseName = databaseNameFromUrl(targetUrl);
  const client = new Client({
    connectionString: maintenanceDatabaseUrl(targetUrl),
  });

  await client.connect();

  try {
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );

    if (result.rowCount === 0) {
      try {
        await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
        console.log(`Created PostgreSQL database "${databaseName}".`);
      } catch (error) {
        // Another service instance may have created it between SELECT and CREATE.
        if (error.code !== '42P04') {
          throw error;
        }
      }
    } else {
      console.log(`PostgreSQL database "${databaseName}" already exists.`);
    }
  } finally {
    await client.end();
  }
}

module.exports = { ensureDatabaseExists };
