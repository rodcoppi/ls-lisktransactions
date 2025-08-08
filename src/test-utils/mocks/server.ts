/**
 * MSW (Mock Service Worker) server for API mocking in tests
 * Provides realistic API responses for comprehensive testing
 */

import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { blockchainHandlers } from './handlers/blockchain'
import { authHandlers } from './handlers/auth'
import { analyticsHandlers } from './handlers/analytics'
import { notificationHandlers } from './handlers/notifications'
import { healthHandlers } from './handlers/health'

// Combine all handlers
const handlers = [
  ...blockchainHandlers,
  ...authHandlers,
  ...analyticsHandlers,
  ...notificationHandlers,
  ...healthHandlers,

  // Default fallback handler for unhandled requests
  rest.all('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`)
    return res(
      ctx.status(404),
      ctx.json({
        error: 'Not Found',
        message: `No handler found for ${req.method} ${req.url}`,
      })
    )
  }),
]

// Create and export the server
export const server = setupServer(...handlers)

// Export individual handler groups for specific test needs
export {
  blockchainHandlers,
  authHandlers,
  analyticsHandlers,
  notificationHandlers,
  healthHandlers,
}