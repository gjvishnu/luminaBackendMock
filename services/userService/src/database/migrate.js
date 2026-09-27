const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const serviceRoot = path.resolve(__dirname, '../..');
const prismaCommand = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';

async function runPrisma(...args) {
  let result;

  try {
    result = await execFileAsync(
      path.join(serviceRoot, 'node_modules', '.bin', prismaCommand),
      args,
      {
        cwd: serviceRoot,
        env: process.env,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
  } catch (error) {
    if (error.stdout?.trim()) {
      process.stdout.write(error.stdout);
    }

    if (error.stderr?.trim()) {
      process.stderr.write(error.stderr);
    }

    throw error;
  }

  if (result.stdout.trim()) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr.trim()) {
    process.stderr.write(result.stderr);
  }
}

async function deployMigrations() {
  // Generate the client before it is required by the application. This keeps
  // server.js usable after a schema change without a separate manual command.
  await runPrisma('generate', '--config', 'prisma7.config.ts');

  // There are no migration files in this service yet, so db push is the right
  // operation for creating/updating tables directly from schema.prisma.
  await runPrisma('db', 'push', '--config', 'prisma7.config.ts');
}

module.exports = { deployMigrations };
