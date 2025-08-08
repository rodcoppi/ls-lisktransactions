/**
 * MSW handlers for authentication endpoints
 */

import { rest } from 'msw'
import { faker } from '@faker-js/faker'

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const authHandlers = [
  // Login endpoint
  rest.post(`${baseUrl}/auth/login`, async (req, res, ctx) => {
    const { email, password } = await req.json()

    // Simulate different login scenarios
    if (email === 'test@example.com' && password === 'password') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          user: {
            id: faker.string.uuid(),
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
            permissions: ['read'],
            lastLogin: new Date().toISOString(),
          },
          token: faker.string.alphanumeric(32),
          refreshToken: faker.string.alphanumeric(32),
          expiresIn: 3600, // 1 hour
        })
      )
    }

    if (email === 'admin@example.com' && password === 'admin') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          user: {
            id: faker.string.uuid(),
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'admin',
            permissions: ['read', 'write', 'admin'],
            lastLogin: new Date().toISOString(),
          },
          token: faker.string.alphanumeric(32),
          refreshToken: faker.string.alphanumeric(32),
          expiresIn: 3600,
        })
      )
    }

    if (email === 'mfa@example.com' && password === 'password') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          requiresMfa: true,
          mfaToken: faker.string.alphanumeric(16),
          user: {
            id: faker.string.uuid(),
            email: 'mfa@example.com',
            name: 'MFA User',
          },
        })
      )
    }

    // Invalid credentials
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      })
    )
  }),

  // MFA verification
  rest.post(`${baseUrl}/auth/mfa/verify`, async (req, res, ctx) => {
    const { mfaToken, code } = await req.json()

    if (code === '123456') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          user: {
            id: faker.string.uuid(),
            email: 'mfa@example.com',
            name: 'MFA User',
            role: 'user',
            permissions: ['read'],
            mfaEnabled: true,
          },
          token: faker.string.alphanumeric(32),
          refreshToken: faker.string.alphanumeric(32),
          expiresIn: 3600,
        })
      )
    }

    return res(
      ctx.status(400),
      ctx.json({
        success: false,
        error: 'Invalid MFA code',
        message: 'The provided MFA code is incorrect',
      })
    )
  }),

  // MFA setup
  rest.post(`${baseUrl}/auth/mfa/setup`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        secret: faker.string.alphanumeric(32),
        qrCode: `data:image/png;base64,${faker.string.alphanumeric(200)}`,
        backupCodes: Array.from({ length: 8 }, () => faker.string.alphanumeric(8)),
      })
    )
  }),

  // Register endpoint
  rest.post(`${baseUrl}/auth/register`, async (req, res, ctx) => {
    const { email, password, name } = await req.json()

    if (email === 'existing@example.com') {
      return res(
        ctx.status(409),
        ctx.json({
          success: false,
          error: 'User already exists',
          message: 'A user with this email already exists',
        })
      )
    }

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        user: {
          id: faker.string.uuid(),
          email,
          name,
          role: 'user',
          permissions: ['read'],
          createdAt: new Date().toISOString(),
        },
        token: faker.string.alphanumeric(32),
        refreshToken: faker.string.alphanumeric(32),
        expiresIn: 3600,
      })
    )
  }),

  // Refresh token
  rest.post(`${baseUrl}/auth/refresh`, async (req, res, ctx) => {
    const { refreshToken } = await req.json()

    if (refreshToken === 'invalid-token') {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: 'Invalid refresh token',
          message: 'The refresh token is invalid or expired',
        })
      )
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        token: faker.string.alphanumeric(32),
        expiresIn: 3600,
      })
    )
  }),

  // Logout
  rest.post(`${baseUrl}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Successfully logged out',
      })
    )
  }),

  // Profile endpoint
  rest.get(`${baseUrl}/auth/profile`, (req, res, ctx) => {
    const authHeader = req.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: 'Unauthorized',
          message: 'No valid authentication token provided',
        })
      )
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        user: {
          id: faker.string.uuid(),
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          permissions: ['read'],
          lastLogin: faker.date.recent().toISOString(),
          createdAt: faker.date.past().toISOString(),
          settings: {
            theme: 'light',
            notifications: true,
            language: 'en',
          },
        },
      })
    )
  }),

  // Password reset request
  rest.post(`${baseUrl}/auth/reset-password`, async (req, res, ctx) => {
    const { email } = await req.json()

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Password reset instructions sent to your email',
      })
    )
  }),

  // Password reset confirmation
  rest.post(`${baseUrl}/auth/reset-password/confirm`, async (req, res, ctx) => {
    const { token, password } = await req.json()

    if (token === 'invalid-token') {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: 'Invalid reset token',
          message: 'The password reset token is invalid or expired',
        })
      )
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Password successfully reset',
      })
    )
  }),

  // Change password
  rest.post(`${baseUrl}/auth/change-password`, async (req, res, ctx) => {
    const { currentPassword, newPassword } = await req.json()
    const authHeader = req.headers.get('authorization')

    if (!authHeader) {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: 'Unauthorized',
        })
      )
    }

    if (currentPassword === 'wrong-password') {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: 'Current password is incorrect',
        })
      )
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Password successfully changed',
      })
    )
  }),
]