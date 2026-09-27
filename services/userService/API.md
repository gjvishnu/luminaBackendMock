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

Missing or invalid cookie: `401 Unauthorized`.

Valid cookie with a non-admin role: `403 Forbidden`.

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

## Common errors

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON or invalid request fields |
| `401` | Missing, invalid, or expired authentication cookie |
| `403` | Authenticated user is not an administrator |
| `404` | Route or HTTP method does not exist |
| `409` | Email or registration number already exists |
| `500` | Unexpected server error |
