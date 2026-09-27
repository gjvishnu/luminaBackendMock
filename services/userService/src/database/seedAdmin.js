const { hashPassword } = require('../utils/password');

const INITIAL_ADMIN = {
  email: 'admin@hifi.com',
  password: 'pass123',
  role: 'ADMIN',
};

async function seedAdminUser(prisma) {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    console.log('User table is not empty. Initial admin seed skipped.');
    return;
  }

  try {
    await prisma.user.create({
      data: {
        email: INITIAL_ADMIN.email,
        password: await hashPassword(INITIAL_ADMIN.password),
        role: INITIAL_ADMIN.role,
      },
    });

    console.log(`Initial admin user created: ${INITIAL_ADMIN.email}`);
  } catch (error) {
    // This handles two service instances seeding at the same time.
    if (error.code === 'P2002') {
      console.log('Initial admin already exists. Seed skipped.');
      return;
    }

    throw error;
  }
}

module.exports = { seedAdminUser };
