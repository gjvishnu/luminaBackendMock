const prisma = require('../config/prisma');
const { hashPassword } = require('../utils/password');

const USER_ROLES = new Set([
  'STUDENT',
  'PLACEMENT_OFFICER',
  'ADMIN',
  'RECRUITER',
]);

function cleanOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const cleanedValue = String(value).trim();
  return cleanedValue || null;
}

async function createUser(req, res, next) {
  try {
    const { email, password, role, regno } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedRole = typeof role === 'string' ? role.trim().toUpperCase() : '';
    const normalizedRegno = cleanOptionalString(regno);

    if (!normalizedEmail || !password || !normalizedRole) {
      return res.status(400).json({
        message: 'email, password, and role are required.',
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (!USER_ROLES.has(normalizedRole)) {
      return res.status(400).json({
        message: `role must be one of: ${[...USER_ROLES].join(', ')}.`,
      });
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: await hashPassword(password),
        role: normalizedRole,
        regno: normalizedRegno,
      },
      select: {
        id: true,
        email: true,
        role: true,
        regno: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      message: 'User created successfully.',
      user,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'A user with this email or registration number already exists.',
      });
    }

    return next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        role: true,
        regno: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: 'Users fetched successfully.',
      count: users.length,
      users,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createUser, getUsers };
