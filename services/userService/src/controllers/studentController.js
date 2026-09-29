const prisma = require('../config/prisma');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authenticatedUserId(req) {
  const userId = Number(req.auth?.sub);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
}

function cleanRequiredString(value, fieldName, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    return `${fieldName} is required.`;
  }

  if (value.trim().length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters long.`;
  }

  return null;
}

function cleanOptionalString(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string.` };
  }

  if (value.trim().length > maxLength) {
    return { error: `${fieldName} must be at most ${maxLength} characters long.` };
  }

  return { value: value.trim() || null };
}

function parseDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'date_of_birth must use YYYY-MM-DD format.';
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  const isValidDate = !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value;

  return isValidDate ? date : 'date_of_birth must be a valid date.';
}

function parseOptionalInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (!Number.isInteger(value)) {
    return `${fieldName} must be an integer.`;
  }

  return value;
}

function parseCgpa(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = typeof value === 'number' ? value : Number(value);
  const decimalPlaces = String(value).split('.')[1]?.length || 0;

  if (!Number.isFinite(number) || number < 0 || number > 10 || decimalPlaces > 2) {
    return 'cgpa must be a number from 0 to 10 with at most 2 decimal places.';
  }

  return number;
}

async function createStudent(req, res, next) {
  try {
    const body = req.body || {};
    const errors = {};
    const userId = authenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: 'The authenticated user ID is invalid.',
      });
    }

    const requiredFields = [
      ['name', 'name', 150],
      ['email', 'email', 255],
      ['registration_number', 'registration_number', 50],
    ];

    for (const [field, label, maxLength] of requiredFields) {
      const error = cleanRequiredString(body[field], label, maxLength);
      if (error) {
        errors[field] = error;
      }
    }

    const email = typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : '';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'email must be valid.';
    }

    const optionalStringFields = [
      ['resume', 100000],
      ['phone', 20],
      ['location', 150],
      ['program', 150],
    ];
    const optionalStrings = {};

    for (const [field, maxLength] of optionalStringFields) {
      const result = cleanOptionalString(body[field], field, maxLength);
      if (result.error) {
        errors[field] = result.error;
      } else {
        optionalStrings[field] = result.value;
      }
    }

    const dateOfBirth = parseDate(body.date_of_birth);
    if (typeof dateOfBirth === 'string') {
      errors.date_of_birth = dateOfBirth;
    }

    let department = body.department;
    if (department !== undefined && department !== null && department !== '') {
      if (typeof department !== 'string' || !UUID_PATTERN.test(department)) {
        errors.department = 'department must be a valid UUID.';
      }
    } else {
      department = null;
    }

    const batch = parseOptionalInteger(body.batch, 'batch');
    if (typeof batch === 'string') {
      errors.batch = batch;
    }

    const semester = parseOptionalInteger(body.semester, 'semester');
    if (typeof semester === 'string') {
      errors.semester = semester;
    }

    const backlogs = body.backlogs === undefined || body.backlogs === null || body.backlogs === ''
      ? 0
      : parseOptionalInteger(body.backlogs, 'backlogs');
    if (typeof backlogs === 'string') {
      errors.backlogs = backlogs;
    }

    const cgpa = parseCgpa(body.cgpa);
    if (typeof cgpa === 'string') {
      errors.cgpa = cgpa;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Invalid student details.',
        errors,
      });
    }

    const student = await prisma.student.create({
      data: {
        name: body.name.trim(),
        resume: optionalStrings.resume,
        email,
        phone: optionalStrings.phone,
        dateOfBirth,
        location: optionalStrings.location,
        registrationNumber: body.registration_number.trim(),
        department,
        program: optionalStrings.program,
        batch,
        semester,
        cgpa,
        backlogs,
        user: {
          connect: { id: userId },
        },
      },
    });

    return res.status(201).json({
      message: 'Student details created successfully.',
      student,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyStudent(req, res, next) {
  try {
    const userId = authenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: 'The authenticated user ID is invalid.',
      });
    }

    const student = await prisma.student.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!student) {
      return res.status(404).json({
        message: 'Student details not found.',
      });
    }

    return res.status(200).json({ student });
  } catch (error) {
    return next(error);
  }
}

async function getStudents(req, res, next) {
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      count: students.length,
      students,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentById(req, res, next) {
  try {
    const { id } = req.params;

    if (!UUID_PATTERN.test(id)) {
      return res.status(400).json({
        message: 'Student ID must be a valid UUID.',
      });
    }

    const where = { id };
    if (req.auth.role === 'STUDENT') {
      const userId = authenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          message: 'The authenticated user ID is invalid.',
        });
      }

      where.userId = userId;
    }

    const student = await prisma.student.findFirst({ where });

    if (!student) {
      return res.status(404).json({
        message: 'Student not found or not accessible.',
      });
    }

    return res.status(200).json({ student });
  } catch (error) {
    return next(error);
  }
}

async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;

    if (!UUID_PATTERN.test(id)) {
      return res.status(400).json({
        message: 'Student ID must be a valid UUID.',
      });
    }

    const where = { id };
    if (req.auth.role === 'STUDENT') {
      const userId = authenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          message: 'The authenticated user ID is invalid.',
        });
      }

      where.userId = userId;
    }

    const existingStudent = await prisma.student.findFirst({ where });

    if (!existingStudent) {
      return res.status(404).json({
        message: 'Student not found or not accessible.',
      });
    }

    const body = req.body || {};
    const data = {};
    const errors = {};
    const hasField = (field) => Object.prototype.hasOwnProperty.call(body, field);

    if (hasField('name')) {
      const error = cleanRequiredString(body.name, 'name', 150);
      if (error) {
        errors.name = error;
      } else {
        data.name = body.name.trim();
      }
    }

    if (hasField('email')) {
      const error = cleanRequiredString(body.email, 'email', 255);
      const email = typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

      if (error) {
        errors.email = error;
      } else if (!/^\S+@\S+\.\S+$/.test(email)) {
        errors.email = 'email must be valid.';
      } else {
        data.email = email;
      }
    }

    if (hasField('registration_number')) {
      const error = cleanRequiredString(
        body.registration_number,
        'registration_number',
        50,
      );

      if (error) {
        errors.registration_number = error;
      } else {
        data.registrationNumber = body.registration_number.trim();
      }
    }

    const optionalStringFields = [
      ['resume', 'resume', 100000],
      ['phone', 'phone', 20],
      ['location', 'location', 150],
      ['program', 'program', 150],
    ];

    for (const [requestField, databaseField, maxLength] of optionalStringFields) {
      if (!hasField(requestField)) {
        continue;
      }

      const result = cleanOptionalString(body[requestField], requestField, maxLength);
      if (result.error) {
        errors[requestField] = result.error;
      } else {
        data[databaseField] = result.value;
      }
    }

    if (hasField('date_of_birth')) {
      const dateOfBirth = parseDate(body.date_of_birth);
      if (typeof dateOfBirth === 'string') {
        errors.date_of_birth = dateOfBirth;
      } else {
        data.dateOfBirth = dateOfBirth;
      }
    }

    if (hasField('department')) {
      if (body.department === null || body.department === '') {
        data.department = null;
      } else if (
        typeof body.department !== 'string'
        || !UUID_PATTERN.test(body.department)
      ) {
        errors.department = 'department must be a valid UUID.';
      } else {
        data.department = body.department;
      }
    }

    for (const field of ['batch', 'semester', 'backlogs']) {
      if (!hasField(field)) {
        continue;
      }

      const value = parseOptionalInteger(body[field], field);
      if (typeof value === 'string') {
        errors[field] = value;
      } else {
        data[field] = value;
      }
    }

    if (hasField('cgpa')) {
      const cgpa = parseCgpa(body.cgpa);
      if (typeof cgpa === 'string') {
        errors.cgpa = cgpa;
      } else {
        data.cgpa = cgpa;
      }
    }

    if (Object.keys(data).length === 0 && Object.keys(errors).length === 0) {
      return res.status(400).json({
        message: 'At least one student field is required to update.',
      });
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Invalid student details.',
        errors,
      });
    }

    const student = await prisma.student.update({
      where: { id: existingStudent.id },
      data,
    });

    return res.status(200).json({
      message: 'Student details updated successfully.',
      student,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createStudent,
  getMyStudent,
  getStudents,
  getStudentById,
  updateStudent,
};
