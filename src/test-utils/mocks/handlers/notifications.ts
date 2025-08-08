/**
 * MSW handlers for notification endpoints
 */

import { rest } from 'msw'
import { faker } from '@faker-js/faker'

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const notificationHandlers = [
  // Get notifications
  rest.get(`${baseUrl}/notifications`, (req, res, ctx) => {
    const limit = parseInt(req.url.searchParams.get('limit') || '10')
    const offset = parseInt(req.url.searchParams.get('offset') || '0')
    const unreadOnly = req.url.searchParams.get('unread') === 'true'

    const notifications = Array.from({ length: limit }, (_, index) => ({
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['info', 'warning', 'error', 'success']),
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      message: faker.lorem.paragraph({ min: 1, max: 3 }),
      read: unreadOnly ? false : faker.datatype.boolean(),
      createdAt: faker.date.recent({ days: 7 }).toISOString(),
      updatedAt: faker.date.recent({ days: 1 }).toISOString(),
      data: {
        action: faker.helpers.arrayElement(['view', 'dismiss', 'retry']),
        url: faker.helpers.maybe(() => faker.internet.url()),
        metadata: {
          source: faker.helpers.arrayElement(['system', 'user', 'external']),
          priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
        },
      },
    }))

    return res(
      ctx.status(200),
      ctx.json({
        data: {
          items: notifications,
          total: 1000,
          unread: faker.number.int({ min: 5, max: 50 }),
          limit,
          offset,
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Mark notification as read
  rest.patch(`${baseUrl}/notifications/:id/read`, (req, res, ctx) => {
    const { id } = req.params

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id,
          read: true,
          readAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Mark all notifications as read
  rest.patch(`${baseUrl}/notifications/read-all`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          markedAsRead: faker.number.int({ min: 5, max: 50 }),
        },
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Delete notification
  rest.delete(`${baseUrl}/notifications/:id`, (req, res, ctx) => {
    const { id } = req.params

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id,
          deleted: true,
        },
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Get notification preferences
  rest.get(`${baseUrl}/notifications/preferences`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          email: {
            enabled: true,
            frequency: 'immediate',
            types: ['error', 'warning', 'success'],
          },
          push: {
            enabled: true,
            frequency: 'immediate',
            types: ['error', 'warning'],
          },
          sms: {
            enabled: false,
            frequency: 'urgent',
            types: ['error'],
          },
          webhook: {
            enabled: true,
            url: 'https://example.com/webhook',
            types: ['error', 'warning', 'success', 'info'],
          },
          preferences: {
            quietHours: {
              enabled: true,
              start: '22:00',
              end: '08:00',
              timezone: 'UTC',
            },
            grouping: {
              enabled: true,
              interval: 300, // 5 minutes
            },
            sounds: {
              enabled: true,
              volume: 0.8,
            },
          },
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Update notification preferences
  rest.put(`${baseUrl}/notifications/preferences`, async (req, res, ctx) => {
    const preferences = await req.json()

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: preferences,
        message: 'Notification preferences updated successfully',
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Create notification (for testing alerts)
  rest.post(`${baseUrl}/notifications`, async (req, res, ctx) => {
    const notification = await req.json()

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: faker.string.uuid(),
          ...notification,
          createdAt: new Date().toISOString(),
          read: false,
        },
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Push notification subscription
  rest.post(`${baseUrl}/notifications/push/subscribe`, async (req, res, ctx) => {
    const { subscription } = await req.json()

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          subscriptionId: faker.string.uuid(),
          subscription,
          createdAt: new Date().toISOString(),
        },
        message: 'Push notification subscription successful',
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Push notification unsubscribe
  rest.post(`${baseUrl}/notifications/push/unsubscribe`, async (req, res, ctx) => {
    const { subscriptionId } = await req.json()

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          subscriptionId,
          unsubscribedAt: new Date().toISOString(),
        },
        message: 'Push notification unsubscribe successful',
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Test notification delivery
  rest.post(`${baseUrl}/notifications/test`, async (req, res, ctx) => {
    const { type, channel } = await req.json()

    // Simulate delivery delay
    return res(
      ctx.delay(1000),
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          testId: faker.string.uuid(),
          type,
          channel,
          delivered: true,
          deliveryTime: new Date().toISOString(),
        },
        message: `Test ${type} notification sent via ${channel}`,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Get notification statistics
  rest.get(`${baseUrl}/notifications/stats`, (req, res, ctx) => {
    const period = req.url.searchParams.get('period') || '7d'

    return res(
      ctx.status(200),
      ctx.json({
        data: {
          period,
          total: faker.number.int({ min: 1000, max: 10000 }),
          byType: {
            info: faker.number.int({ min: 100, max: 3000 }),
            success: faker.number.int({ min: 200, max: 2000 }),
            warning: faker.number.int({ min: 50, max: 500 }),
            error: faker.number.int({ min: 10, max: 100 }),
          },
          byChannel: {
            email: faker.number.int({ min: 500, max: 5000 }),
            push: faker.number.int({ min: 300, max: 3000 }),
            sms: faker.number.int({ min: 10, max: 100 }),
            webhook: faker.number.int({ min: 100, max: 1000 }),
          },
          deliveryRate: faker.number.float({ min: 0.95, max: 1.0, precision: 3 }),
          averageDeliveryTime: faker.number.int({ min: 100, max: 5000 }), // ms
          readRate: faker.number.float({ min: 0.6, max: 0.9, precision: 2 }),
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),
]