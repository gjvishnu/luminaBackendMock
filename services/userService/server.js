require('./src/config/env');

const express = require('express');
const { ensureDatabaseExists } = require('./src/database/createDb');
const { deployMigrations } = require('./src/database/migrate');
const { seedAdminUser } = require('./src/database/seedAdmin');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const {
  notFoundMiddleware,
  errorMiddleware,
} = require('./src/middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', studentRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

async function start() {
  try {
    await ensureDatabaseExists();
    await deployMigrations();

    // Load and connect Prisma only after the application database exists and
    // all migrations have been applied successfully.
    const prisma = require('./src/config/prisma');
    await prisma.$connect();
    console.log('Prisma Client connected to the application database.');
    await seedAdminUser(prisma);

    const server = app.listen(PORT, () => {
      console.log(`userService is running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down userService...`);
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('userService startup failed. Express server was not started.');
    console.error(error.stack || error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
 
