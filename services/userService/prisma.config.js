const path = require('path');
const { defineConfig } = require('prisma/config');
const { configureDatabaseUrl } = require('./src/config/env');

configureDatabaseUrl();

module.exports = defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
