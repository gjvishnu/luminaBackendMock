const prisma = require('../config/prisma');
const { createAccessToken, TOKEN_TTL_SECONDS } = require('../utils/accessToken');
const { verifyPassword } = require('../utils/password');

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    regno: user.regno,
  };
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || typeof password !== 'string' || !password) {
      return res.status(400).json({
        message: 'email and password are required.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const passwordIsValid = user
      ? await verifyPassword(password, user.password)
      : false;

    if (!user || !passwordIsValid) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const token = createAccessToken(user);
    res.setHeader(
      'Set-Cookie',
      `access_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${TOKEN_TTL_SECONDS}; SameSite=Lax`,
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login };
