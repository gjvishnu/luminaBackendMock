# User Service API

Base URL:

```text
http://localhost:3000
```

## Start the service

Requirements:

- PostgreSQL must be running on the host and port in `.env`.
- The database user must be allowed to create databases.
- Use a Prisma-supported Node.js version.

From the user service directory:

```bash
cd services/userService
npm install
npm start
```

For development with automatic restart when `server.js`, `src`, `prisma`, or
`.env` changes:

```bash
npm run dev
```

Use `Ctrl+C` to stop Nodemon.

On startup, the service:

1. Loads `.env`.
2. Creates the configured PostgreSQL database if it does not exist.
3. Generates Prisma Client.
4. Synchronizes tables from `prisma/schema.prisma`.
5. Connects Prisma.
6. If the `User` table is empty, creates the initial admin user.
7. Starts Express on port `3000` or the value of `PORT`.

### Initial admin user

On a fresh database, startup creates this user after the `User` table is
created:

```text
Email:    admin@hifi.com
Password: pass123
Role:     ADMIN
```

The password is stored as a hash. The seed runs only when the `User` table is
empty; existing users are never overwritten or deleted.

## Environment variables

Create `services/userService/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=luminaCore
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DATABASE_URL="postgresql://your_postgres_user:your_postgres_password@localhost:5432/luminaCore?schema=public"
AUTH_TOKEN_SECRET=use-a-random-secret-with-at-least-32-characters
```

Generate a token secret with:

```bash
openssl rand -hex 32
```

Do not commit `.env` to source control.

## Folder structure

```text
server.js
prisma/
  schema.prisma
src/
  config/
    env.js
    prisma.js
  controllers/
    authController.js
    studentController.js
    userController.js
  database/
    createDb.js
    migrate.js
    seedAdmin.js
  middleware/
    authMiddleware.js
    errorMiddleware.js
  routes/
    authRoutes.js
    studentRoutes.js
    userRoutes.js
  utils/
    accessToken.js
    password.js
```

## Authentication flow

`POST /login` is public. If the email and password are valid, the service:

- verifies the password hash;
- returns an access token;
- sets the token in an `HttpOnly` `access_token` cookie;
- gives the token a one-hour expiration.

The following endpoints require that cookie and an `ADMIN` role:

- `POST /create-user`
- `GET /users`

`POST /students` and `GET /students/me` require the same cookie and a
`STUDENT` role. `GET /students` and staff access to `GET /students/:id`
require an `ADMIN` or `PLACEMENT_OFFICER` role. A student can use
`GET /students/:id` and `PATCH /students/:id` only for their own record.

Missing or invalid cookie: `401 Unauthorized`.

An authenticated user with the wrong role receives `403 Forbidden`.

## Endpoints

### 1. Login

```http
POST /login
Content-Type: application/json
```

Request:

```json
{
  "email": "admin@hifi.com",
  "password": "pass123"
}
```

Successful response: `200 OK`

```json
{
  "message": "Login successful.",
  "token": "<access-token>",
  "user": {
    "id": 1,
    "email": "admin@hifi.com",
    "role": "ADMIN",
    "regno": null
  }
}
```

The response also includes a `Set-Cookie` header containing `access_token`.

Invalid credentials: `401 Unauthorized`

```json
{
  "message": "Invalid email or password."
}
```

### 2. Create a user

```http
POST /create-user
Content-Type: application/json
Cookie: access_token=<admin-access-token>
```

Request:

```json
{
  "email": "student@example.com",
  "password": "password123",
  "role": "STUDENT",
  "regno": "REG001"
}
```

`regno` is optional. Valid roles:

```text
STUDENT
PLACEMENT_OFFICER
ADMIN
RECRUITER
```

Successful response: `201 Created`

```json
{
  "message": "User created successfully.",
  "user": {
    "id": 2,
    "email": "student@example.com",
    "role": "STUDENT",
    "regno": "REG001",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Passwords are hashed and are never returned by the API.

### 3. Get all users

```http
GET /users
Cookie: access_token=<admin-access-token>
```

Successful response: `200 OK`

```json
{
  "message": "Users fetched successfully.",
  "count": 2,
  "users": [
    {
      "id": 1,
      "email": "admin@hifi.com",
      "role": "ADMIN",
      "regno": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### 4. Create student details

Only an authenticated user with the `STUDENT` role can call this endpoint.
The `user_id` is taken from the authenticated cookie and cannot be supplied
by the request body.

```http
POST /students
Content-Type: application/json
Cookie: access_token=<student-access-token>
```

Request:

```json
{
  "name": "Jane Student",
  "resume": "Resume text or URL",
  "email": "jane@example.com",
  "phone": "+919876543210",
  "date_of_birth": "2004-05-20",
  "location": "Bengaluru",
  "registration_number": "REG001",
  "department": null,
  "program": "B.Tech Computer Science",
  "batch": 2026,
  "semester": 8,
  "cgpa": 8.75,
  "backlogs": 0
}
```

`name`, `email`, and `registration_number` are required. The remaining
fields are optional; `backlogs` defaults to `0`.

Successful response: `201 Created`

```json
{
  "message": "Student details created successfully.",
  "student": {
    "id": "<student-uuid>",
    "userId": 2,
    "name": "Jane Student",
    "registrationNumber": "REG001"
  }
}
```

### 5. Get your own student details

```http
GET /students/me
Cookie: access_token=<student-access-token>
```

Successful response: `200 OK`

```json
{
  "student": {
    "id": "<student-uuid>",
    "userId": 2,
    "name": "Jane Student",
    "registrationNumber": "REG001"
  }
}
```

### 6. Get all students

Only an admin or placement officer can fetch the complete student list.

```http
GET /students
Cookie: access_token=<staff-access-token>
```

Successful response: `200 OK`

```json
{
  "count": 1,
  "students": [
    {
      "id": "<student-uuid>",
      "userId": 2,
      "name": "Jane Student",
      "registrationNumber": "REG001"
    }
  ]
}
```

### 7. Get a particular student

Admins and placement officers can fetch any student. A student can fetch
only their own record.

```http
GET /students/<student-uuid>
Cookie: access_token=<student-or-staff-token>
```

Successful response: `200 OK`

```json
{
  "student": {
    "id": "<student-uuid>",
    "userId": 2,
    "name": "Jane Student",
    "registrationNumber": "REG001"
  }
}
```

### 8. Edit student details

This endpoint supports partial updates. The `id` and `user_id` fields cannot
be changed through the API.

```http
PATCH /students/<student-uuid>
Content-Type: application/json
Cookie: access_token=<student-or-staff-token>
```

Example request:

```json
{
  "phone": "+919876543210",
  "location": "Bengaluru",
  "cgpa": 9.1,
  "backlogs": 0
}
```

Successful response: `200 OK`

```json
{
  "message": "Student details updated successfully.",
  "student": {
    "id": "<student-uuid>",
    "userId": 2,
    "phone": "+919876543210",
    "cgpa": 9.1,
    "backlogs": 0
  }
}
```

## Testing with curl

Save the login cookie in `cookies.txt`:

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hifi.com","password":"password123"}'
```

Use the saved admin cookie to list users:

```bash
curl -i -b cookies.txt \
  http://localhost:3000/users
```

Use the saved admin cookie to create a user:

```bash
curl -i -b cookies.txt \
  -X POST http://localhost:3000/create-user \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"password123","role":"STUDENT"}'
```

After logging in as that student and saving the cookie in `student-cookies.txt`:

```bash
curl -i -b student-cookies.txt \
  -X POST http://localhost:3000/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Student","email":"jane@example.com","registration_number":"REG001","program":"B.Tech Computer Science","cgpa":8.75}'
```

Get the logged-in student's own details:

```bash
curl -i -b student-cookies.txt \
  http://localhost:3000/students/me
```

Get all students with an admin or placement-officer cookie:

```bash
curl -i -b staff-cookies.txt \
  http://localhost:3000/students
```

Get one student by UUID with a permitted cookie:

```bash
curl -i -b staff-cookies.txt \
  http://localhost:3000/students/<student-uuid>
```

Edit a student with a permitted cookie:

```bash
curl -i -b student-cookies.txt \
  -X PATCH http://localhost:3000/students/<student-uuid> \
  -H "Content-Type: application/json" \
  -d '{"location":"Bengaluru","cgpa":9.1}'
```

## Common errors

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON or invalid request fields |
| `401` | Missing, invalid, or expired authentication cookie |
| `403` | Authenticated user does not have the required role |
| `404` | Route or HTTP method does not exist |
| `409` | Email or registration number already exists |
| `500` | Unexpected server error |
