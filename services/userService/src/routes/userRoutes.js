const express = require('express');
const { createUser, getUsers } = require('../controllers/userController');
const {
  requireCookieAuth,
  requireAdmin,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create-user', requireCookieAuth, requireAdmin, createUser);
router.get('/users', requireCookieAuth, requireAdmin, getUsers);

module.exports = router;
