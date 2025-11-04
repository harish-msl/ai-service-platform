# Authentication Guide

## Overview

The AI Service Platform uses **JWT (JSON Web Token)** based authentication. There is **no registration endpoint** - user management is handled by administrators only.

---

## Default Admin Credentials

For development and initial setup, use these credentials:

```
Email: admin@example.com
Password: Admin@123456
```

⚠️ **IMPORTANT:** Change the admin password in production!

---

## Authentication Flow

### 1. Login

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "Admin@123456"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "ADMIN"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Using Access Token

Include the access token in the `Authorization` header for all protected endpoints:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3001/api/v1/projects
```

### 3. Refresh Token

When the access token expires (7 days by default), use the refresh token to get a new one.

**Endpoint:** `POST /api/v1/auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 4. Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## Token Expiration

- **Access Token:** 7 days (configurable via `JWT_EXPIRATION`)
- **Refresh Token:** 30 days (configurable via `JWT_REFRESH_EXPIRATION`)

---

## User Roles

- **ADMIN** - Full access to all resources
- **USER** - Can manage own projects and API keys
- **VIEWER** - Read-only access

---

## Future: User Management Module

In the future, we will implement a User Management module that includes:

- User CRUD operations (Admin only)
- Role management
- Password reset functionality
- User invitation system
- Activity logs

For now, new users must be created directly in the database or through seed scripts.

---

## Creating New Users (Manual)

### Option 1: Using Prisma Studio

```bash
pnpm --filter backend prisma:studio
```

Navigate to the `User` model and create a new user with a hashed password.

### Option 2: Using Seed Script

Edit `packages/backend/prisma/seed.ts` and add new users:

```typescript
const newUser = await prisma.user.create({
  data: {
    email: 'newuser@example.com',
    password: await bcrypt.hash('SecurePassword123', 10),
    name: 'New User',
    role: 'USER',
    isActive: true,
  },
});
```

Then run:
```bash
pnpm --filter backend seed
```

---

## Security Best Practices

1. **Change default admin password immediately** in production
2. Use **strong passwords** (minimum 8 characters with mixed case, numbers, symbols)
3. Store **JWT secrets securely** (use environment variables, never commit to git)
4. Implement **rate limiting** on login endpoints (already configured)
5. Enable **HTTPS** in production
6. Rotate **JWT secrets periodically**
7. Implement **password complexity requirements** in future user management module

---

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRATION=30d
```

---

## Testing Authentication

### Using cURL

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123456"
  }'

# Access protected endpoint
curl -X GET http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Swagger UI

1. Open http://localhost:3001/api/docs
2. Click "Authorize" button
3. Login via `/auth/login` endpoint to get token
4. Enter token in format: `Bearer YOUR_ACCESS_TOKEN`
5. Click "Authorize"
6. Now all protected endpoints can be tested

---

## Troubleshooting

### "Invalid credentials" error
- Verify email and password are correct
- Check that user exists in database
- Ensure user `isActive` is `true`

### "Token expired" error
- Use refresh token to get a new access token
- Login again if refresh token also expired

### "Unauthorized" error
- Verify token is included in Authorization header
- Check token format: `Bearer YOUR_TOKEN`
- Ensure token hasn't expired

---

## Related Documentation

- [API Endpoints](./DEVELOPMENT.md#api-endpoints)
- [Database Schema](./DEVELOPMENT.md#database-schema)
- [Security Best Practices](./SECURITY.md) _(coming soon)_
