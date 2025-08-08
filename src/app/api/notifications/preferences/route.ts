/**
 * Notification Preferences API Endpoints
 * Manage user notification preferences and consent
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  NotificationPreferences, 
  NotificationChannel, 
  NotificationType,
  AlertType,
  AlertFrequency 
} from '@/lib/notifications/types';

// Mock preferences storage - in real implementation, this would use a database
const mockPreferences = new Map<string, NotificationPreferences>();

// Default preferences
const defaultPreferences: NotificationPreferences = {
  userId: '',
  enabledChannels: [
    NotificationChannel.TOAST,
    NotificationChannel.EMAIL,
  ],
  quietHours: {
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
  },
  emailFrequency: AlertFrequency.BATCHED_HOURLY,
  soundEnabled: true,
  pushEnabled: false,
  emailEnabled: true,
  desktopEnabled: false,
  typePreferences: {
    [NotificationType.INFO]: true,
    [NotificationType.SUCCESS]: true,
    [NotificationType.WARNING]: true,
    [NotificationType.ERROR]: true,
    [NotificationType.CRITICAL]: true,
  },
  alertTypePreferences: {
    [AlertType.TRANSACTION_VOLUME]: true,
    [AlertType.NETWORK_ISSUES]: true,
    [AlertType.PRICE_CHANGES]: true,
    [AlertType.SYSTEM_ERROR]: true,
    [AlertType.PERFORMANCE]: true,
    [AlertType.SECURITY]: true,
    [AlertType.CUSTOM]: true,
  },
  updatedAt: Date.now(),
};

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default_user';

  try {
    let preferences = mockPreferences.get(userId);
    
    if (!preferences) {
      // Create default preferences for new user
      preferences = {
        ...defaultPreferences,
        userId,
      };
      mockPreferences.set(userId, preferences);
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/preferences
 * Update user notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'update':
        if (!preferences) {
          return NextResponse.json(
            { success: false, error: 'Preferences data is required' },
            { status: 400 }
          );
        }

        const currentPreferences = mockPreferences.get(userId) || {
          ...defaultPreferences,
          userId,
        };

        const updatedPreferences: NotificationPreferences = {
          ...currentPreferences,
          ...preferences,
          userId,
          updatedAt: Date.now(),
        };

        mockPreferences.set(userId, updatedPreferences);

        return NextResponse.json({
          success: true,
          data: updatedPreferences,
        });

      case 'toggle-channel':
        const { channel } = body;
        
        if (!channel || !Object.values(NotificationChannel).includes(channel)) {
          return NextResponse.json(
            { success: false, error: 'Valid channel is required' },
            { status: 400 }
          );
        }

        const channelPreferences = mockPreferences.get(userId) || {
          ...defaultPreferences,
          userId,
        };

        const channelIndex = channelPreferences.enabledChannels.indexOf(channel);
        if (channelIndex === -1) {
          channelPreferences.enabledChannels.push(channel);
        } else {
          channelPreferences.enabledChannels.splice(channelIndex, 1);
        }

        channelPreferences.updatedAt = Date.now();
        mockPreferences.set(userId, channelPreferences);

        return NextResponse.json({
          success: true,
          data: channelPreferences,
        });

      case 'toggle-notification-type':
        const { notificationType } = body;
        
        if (!notificationType || !Object.values(NotificationType).includes(notificationType)) {
          return NextResponse.json(
            { success: false, error: 'Valid notification type is required' },
            { status: 400 }
          );
        }

        const typePreferences = mockPreferences.get(userId) || {
          ...defaultPreferences,
          userId,
        };

        typePreferences.typePreferences[notificationType] = !typePreferences.typePreferences[notificationType];
        typePreferences.updatedAt = Date.now();
        mockPreferences.set(userId, typePreferences);

        return NextResponse.json({
          success: true,
          data: typePreferences,
        });

      case 'toggle-alert-type':
        const { alertType } = body;
        
        if (!alertType || !Object.values(AlertType).includes(alertType)) {
          return NextResponse.json(
            { success: false, error: 'Valid alert type is required' },
            { status: 400 }
          );
        }

        const alertPreferences = mockPreferences.get(userId) || {
          ...defaultPreferences,
          userId,
        };

        alertPreferences.alertTypePreferences[alertType] = !alertPreferences.alertTypePreferences[alertType];
        alertPreferences.updatedAt = Date.now();
        mockPreferences.set(userId, alertPreferences);

        return NextResponse.json({
          success: true,
          data: alertPreferences,
        });

      case 'set-quiet-hours':
        const { quietHours } = body;
        
        if (!quietHours || !quietHours.start || !quietHours.end) {
          return NextResponse.json(
            { success: false, error: 'Valid quiet hours configuration is required' },
            { status: 400 }
          );
        }

        const quietHoursPreferences = mockPreferences.get(userId) || {
          ...defaultPreferences,
          userId,
        };

        quietHoursPreferences.quietHours = {
          ...quietHours,
          timezone: quietHours.timezone || 'UTC',
        };
        quietHoursPreferences.updatedAt = Date.now();
        mockPreferences.set(userId, quietHoursPreferences);

        return NextResponse.json({
          success: true,
          data: quietHoursPreferences,
        });

      case 'set-email-frequency':
        const { frequency } = body;
        
        if (!frequency || !Object.values(AlertFrequency).includes(frequency)) {
          return NextResponse.json(
            { success: false, error: 'Valid frequency is required' },
            { status: 400 }
          );
        }

        const frequencyPreferences = mockPreferences.get(userId) || {
          ...defaultPreferences,
          userId,
        };

        frequencyPreferences.emailFrequency = frequency;
        frequencyPreferences.updatedAt = Date.now();
        mockPreferences.set(userId, frequencyPreferences);

        return NextResponse.json({
          success: true,
          data: frequencyPreferences,
        });

      case 'reset':
        const resetPreferences = {
          ...defaultPreferences,
          userId,
          updatedAt: Date.now(),
        };

        mockPreferences.set(userId, resetPreferences);

        return NextResponse.json({
          success: true,
          data: resetPreferences,
        });

      case 'consent':
        const { consentType, granted } = body;
        
        if (!consentType || typeof granted !== 'boolean') {
          return NextResponse.json(
            { success: false, error: 'Consent type and granted status are required' },
            { status: 400 }
          );
        }

        const consentPreferences = mockPreferences.get(userId) || {
          ...defaultPreferences,
          userId,
        };

        // Update specific channel preferences based on consent
        switch (consentType) {
          case 'push':
            consentPreferences.pushEnabled = granted;
            if (granted && !consentPreferences.enabledChannels.includes(NotificationChannel.PUSH)) {
              consentPreferences.enabledChannels.push(NotificationChannel.PUSH);
            } else if (!granted) {
              consentPreferences.enabledChannels = consentPreferences.enabledChannels.filter(
                c => c !== NotificationChannel.PUSH
              );
            }
            break;
          case 'email':
            consentPreferences.emailEnabled = granted;
            if (granted && !consentPreferences.enabledChannels.includes(NotificationChannel.EMAIL)) {
              consentPreferences.enabledChannels.push(NotificationChannel.EMAIL);
            } else if (!granted) {
              consentPreferences.enabledChannels = consentPreferences.enabledChannels.filter(
                c => c !== NotificationChannel.EMAIL
              );
            }
            break;
          case 'desktop':
            consentPreferences.desktopEnabled = granted;
            if (granted && !consentPreferences.enabledChannels.includes(NotificationChannel.DESKTOP)) {
              consentPreferences.enabledChannels.push(NotificationChannel.DESKTOP);
            } else if (!granted) {
              consentPreferences.enabledChannels = consentPreferences.enabledChannels.filter(
                c => c !== NotificationChannel.DESKTOP
              );
            }
            break;
          case 'sound':
            consentPreferences.soundEnabled = granted;
            break;
        }

        consentPreferences.updatedAt = Date.now();
        mockPreferences.set(userId, consentPreferences);

        return NextResponse.json({
          success: true,
          data: consentPreferences,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/preferences
 * Delete user notification preferences (GDPR compliance)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const deleted = mockPreferences.delete(userId);

    return NextResponse.json({
      success: true,
      data: {
        deleted,
        message: deleted 
          ? 'User preferences deleted successfully' 
          : 'No preferences found for user',
      },
    });
  } catch (error) {
    console.error('Failed to delete notification preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete preferences' },
      { status: 500 }
    );
  }
}