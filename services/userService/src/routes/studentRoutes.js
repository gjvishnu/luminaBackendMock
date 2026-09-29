const express = require('express');
const {
  createStudent,
  getMyStudent,
  getStudents,
  getStudentById,
  updateStudent,
} = require('../controllers/studentController');
const {
  requireCookieAuth,
  requireStudent,
  requireStaff,
  requireStudentOrStaff,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/students', requireCookieAuth, requireStudent, createStudent);
router.get('/students/me', requireCookieAuth, requireStudent, getMyStudent);
router.get('/students', requireCookieAuth, requireStaff, getStudents);
router.get(
  '/students/:id',
  requireCookieAuth,
  requireStudentOrStaff,
  getStudentById,
);
router.patch(
  '/students/:id',
  requireCookieAuth,
  requireStudentOrStaff,
  updateStudent,
);

module.exports = router;
