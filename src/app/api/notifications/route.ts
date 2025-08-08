/**
 * Notification Management API Endpoints
 * RESTful API for managing notifications, deliveries, and settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationManager } from '@/lib/notifications/manager';
import { pushService } from '@/lib/notifications/push-service';
import { emailService } from '@/lib/notifications/email-service';
import { webhookService } from '@/lib/notifications/webhook-service';
import { 
  BaseNotification, 
  NotificationChannel, 
  NotificationType,
  NotificationPriority,
  ToastNotification,
  PushNotification,
  EmailNotification,
  WebhookNotification
} from '@/lib/notifications/types';

/**
 * GET /api/notifications
 * Retrieve notification history, stats, and settings
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'history';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const userId = searchParams.get('userId');
  const type = searchParams.get('type');
  const read = searchParams.get('read');

  try {
    switch (action) {
      case 'history':
        // In a real implementation, this would query the database
        const mockHistory = [
          {
            id: '1',
            notificationId: 'notif_1',
            userId: userId || 'user_1',
            title: 'Transaction Volume Alert',
            message: 'Transaction volume exceeded threshold',
            type: NotificationType.WARNING,
            priority: NotificationPriority.HIGH,
            isRead: false,
            createdAt: Date.now() - 300000,
          },
          {
            id: '2',
            notificationId: 'notif_2',
            userId: userId || 'user_1',
            title: 'System Update',
            message: 'Dashboard has been updated successfully',
            type: NotificationType.INFO,
            priority: NotificationPriority.NORMAL,
            isRead: true,
            readAt: Date.now() - 60000,
            createdAt: Date.now() - 600000,
          },
        ];

        return NextResponse.json({
          success: true,
          data: {
            notifications: mockHistory,
            total: mockHistory.length,
            unreadCount: mockHistory.filter(n => !n.isRead).length,
          },
        });

      case 'stats':
        const stats = notificationManager.getDeliveryStats();
        const emailStats = emailService.getEmailStats();
        const webhookStats = webhookService.getWebhookStats();
        
        return NextResponse.json({
          success: true,
          data: {
            overall: stats,
            email: emailStats,
            webhooks: webhookStats,
            pushStatus: pushService.getStatus(),
          },
        });

      case 'queue':
        const queueStatus = notificationManager.getQueueStatus();
        const metrics = notificationManager.getCurrentMetrics();
        
        return NextResponse.json({
          success: true,
          data: {
            queue: queueStatus,
            metrics,
          },
        });

      case 'templates':
        const emailTemplates = emailService.getAllTemplates();
        
        return NextResponse.json({
          success: true,
          data: {
            email: emailTemplates,
          },
        });

      case 'webhooks':
        const webhookConfigs = webhookService.getAllWebhooks();
        
        return NextResponse.json({
          success: true,
          data: webhookConfigs,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Send new notifications or manage notification settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'send':
        const { notification, channels } = body;
        
        if (!notification || !channels || !Array.isArray(channels)) {
          return NextResponse.json(
            { success: false, error: 'Invalid notification data or channels' },
            { status: 400 }
          );
        }

        const baseNotification: BaseNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          channels,
          tags: notification.tags || [],
          ...notification,
        };

        const deliveryIds = await notificationManager.send(baseNotification);

        return NextResponse.json({
          success: true,
          data: {
            notificationId: baseNotification.id,
            deliveryIds,
            message: 'Notification queued successfully',
          },
        });

      case 'send-toast':
        const { toast } = body;
        
        const toastNotification: ToastNotification = {
          id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          channels: [NotificationChannel.TOAST],
          tags: [],
          duration: 5000,
          autoClose: true,
          dismissButton: true,
          ...toast,
        };

        await notificationManager.send(toastNotification);

        return NextResponse.json({
          success: true,
          data: { notificationId: toastNotification.id },
        });

      case 'send-push':
        const { push } = body;
        
        const pushNotification: PushNotification = {
          id: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          channels: [NotificationChannel.PUSH],
          tags: [],
          ...push,
        };

        await notificationManager.send(pushNotification);

        return NextResponse.json({
          success: true,
          data: { notificationId: pushNotification.id },
        });

      case 'send-email':
        const { email } = body;
        
        if (!email.to || !Array.isArray(email.to)) {
          return NextResponse.json(
            { success: false, error: 'Invalid email recipients' },
            { status: 400 }
          );
        }

        const emailNotification: EmailNotification = {
          id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          channels: [NotificationChannel.EMAIL],
          tags: [],
          ...email,
        };

        const emailResult = await emailService.send(emailNotification);

        return NextResponse.json({
          success: true,
          data: {
            notificationId: emailNotification.id,
            messageId: emailResult.messageId,
            delivered: emailResult.success,
          },
        });

      case 'send-webhook':
        const { webhook } = body;
        
        const webhookNotification: WebhookNotification = {
          id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          channels: [NotificationChannel.WEBHOOK],
          tags: [],
          method: 'POST',
          ...webhook,
        };

        const webhookResult = await webhookService.send(webhookNotification);

        return NextResponse.json({
          success: true,
          data: {
            notificationId: webhookNotification.id,
            delivered: webhookResult.success,
            statusCode: webhookResult.statusCode,
            responseTime: webhookResult.responseTime,
          },
        });

      case 'batch':
        const { notifications } = body;
        
        if (!Array.isArray(notifications)) {
          return NextResponse.json(
            { success: false, error: 'Notifications must be an array' },
            { status: 400 }
          );
        }

        const batchResults = await notificationManager.sendBatch(notifications);

        return NextResponse.json({
          success: true,
          data: {
            total: notifications.length,
            results: batchResults,
          },
        });

      case 'schedule':
        const { scheduledNotification, deliveryTime } = body;
        
        if (!scheduledNotification || !deliveryTime) {
          return NextResponse.json(
            { success: false, error: 'Notification and delivery time required' },
            { status: 400 }
          );
        }

        const deliveryDate = new Date(deliveryTime);
        if (deliveryDate <= new Date()) {
          return NextResponse.json(
            { success: false, error: 'Delivery time must be in the future' },
            { status: 400 }
          );
        }

        const scheduledId = await notificationManager.schedule(
          scheduledNotification,
          deliveryDate
        );

        return NextResponse.json({
          success: true,
          data: { scheduledId },
        });

      case 'create-template':
        const { template } = body;
        
        if (!template || !template.name || !template.htmlTemplate) {
          return NextResponse.json(
            { success: false, error: 'Invalid template data' },
            { status: 400 }
          );
        }

        const templateId = emailService.createTemplate(template);

        return NextResponse.json({
          success: true,
          data: { templateId },
        });

      case 'register-webhook':
        const { webhookConfig } = body;
        
        if (!webhookConfig || !webhookConfig.name || !webhookConfig.url) {
          return NextResponse.json(
            { success: false, error: 'Invalid webhook configuration' },
            { status: 400 }
          );
        }

        const webhookId = webhookService.registerWebhook(webhookConfig);

        return NextResponse.json({
          success: true,
          data: { webhookId },
        });

      case 'test-webhook':
        const { webhookTestId } = body;
        
        if (!webhookTestId) {
          return NextResponse.json(
            { success: false, error: 'Webhook ID required' },
            { status: 400 }
          );
        }

        const testResult = await webhookService.testWebhook(webhookTestId);

        return NextResponse.json({
          success: true,
          data: testResult,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to process notification request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications
 * Update notification settings, mark as read, etc.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'mark-read':
        const { notificationIds, userId } = body;
        
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return NextResponse.json(
            { success: false, error: 'Invalid notification IDs' },
            { status: 400 }
          );
        }

        // In a real implementation, this would update the database
        console.log(`Marking notifications as read:`, { notificationIds, userId });

        return NextResponse.json({
          success: true,
          data: { updatedCount: notificationIds.length },
        });

      case 'mark-all-read':
        const { userId: allReadUserId } = body;
        
        // In a real implementation, this would update all unread notifications for the user
        console.log(`Marking all notifications as read for user:`, allReadUserId);

        return NextResponse.json({
          success: true,
          data: { message: 'All notifications marked as read' },
        });

      case 'update-template':
        const { templateId, updates } = body;
        
        if (!templateId || !updates) {
          return NextResponse.json(
            { success: false, error: 'Template ID and updates required' },
            { status: 400 }
          );
        }

        const updateSuccess = emailService.updateTemplate(templateId, updates);

        return NextResponse.json({
          success: updateSuccess,
          data: updateSuccess ? { message: 'Template updated' } : { error: 'Template not found' },
        });

      case 'update-webhook':
        const { webhookId, webhookUpdates } = body;
        
        if (!webhookId || !webhookUpdates) {
          return NextResponse.json(
            { success: false, error: 'Webhook ID and updates required' },
            { status: 400 }
          );
        }

        const webhookUpdateSuccess = webhookService.updateWebhook(webhookId, webhookUpdates);

        return NextResponse.json({
          success: webhookUpdateSuccess,
          data: webhookUpdateSuccess ? { message: 'Webhook updated' } : { error: 'Webhook not found' },
        });

      case 'retry-failed':
        const { deliveryId } = body;
        
        if (!deliveryId) {
          return NextResponse.json(
            { success: false, error: 'Delivery ID required' },
            { status: 400 }
          );
        }

        const retrySuccess = await notificationManager.retry(deliveryId);

        return NextResponse.json({
          success: retrySuccess,
          data: retrySuccess ? { message: 'Retry initiated' } : { error: 'Delivery not found or not retryable' },
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to update notification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notifications, templates, or webhooks
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'delete-notifications':
        const { notificationIds } = body;
        
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return NextResponse.json(
            { success: false, error: 'Invalid notification IDs' },
            { status: 400 }
          );
        }

        // In a real implementation, this would delete from database
        console.log(`Deleting notifications:`, notificationIds);

        return NextResponse.json({
          success: true,
          data: { deletedCount: notificationIds.length },
        });

      case 'cancel-scheduled':
        const { scheduledId } = body;
        
        if (!scheduledId) {
          return NextResponse.json(
            { success: false, error: 'Scheduled notification ID required' },
            { status: 400 }
          );
        }

        const cancelSuccess = notificationManager.cancelScheduled(scheduledId);

        return NextResponse.json({
          success: cancelSuccess,
          data: cancelSuccess ? { message: 'Scheduled notification cancelled' } : { error: 'Scheduled notification not found' },
        });

      case 'delete-template':
        const { templateId } = body;
        
        if (!templateId) {
          return NextResponse.json(
            { success: false, error: 'Template ID required' },
            { status: 400 }
          );
        }

        const templateDeleteSuccess = emailService.deleteTemplate(templateId);

        return NextResponse.json({
          success: templateDeleteSuccess,
          data: templateDeleteSuccess ? { message: 'Template deleted' } : { error: 'Template not found' },
        });

      case 'delete-webhook':
        const { webhookId } = body;
        
        if (!webhookId) {
          return NextResponse.json(
            { success: false, error: 'Webhook ID required' },
            { status: 400 }
          );
        }

        const webhookDeleteSuccess = webhookService.deleteWebhook(webhookId);

        return NextResponse.json({
          success: webhookDeleteSuccess,
          data: webhookDeleteSuccess ? { message: 'Webhook deleted' } : { error: 'Webhook not found' },
        });

      case 'clear-expired':
        notificationManager.clearExpired();

        return NextResponse.json({
          success: true,
          data: { message: 'Expired notifications cleared' },
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to delete notification data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}