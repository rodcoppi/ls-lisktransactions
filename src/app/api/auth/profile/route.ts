import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { AuthService } from '@/lib/security/auth';
import { AuditLogger, AuditEventType } from '@/lib/security/audit';
import { securityPresets, securityUtils } from '@/middleware/security';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const authService = new AuthService(redis);
const auditLogger = new AuditLogger(redis);

export async function GET(request: NextRequest) {
  try {
    // Apply security middleware with authentication required
    const securityResponse = await securityPresets.protected(request);
    if (securityResponse && securityResponse.status !== 200) {
      return securityResponse;
    }

    const userId = request.headers.get('x-user-id');
    const correlationId = request.headers.get('x-correlation-id') || `profile_${Date.now()}`;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile (implement this method in AuthService)
    // For now, we'll simulate getting user data
    const userData = await redis.hget('users', userId);
    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = JSON.parse(userData);
    const { mfaSecret, ...userProfile } = user; // Remove sensitive data

    // Get user sessions
    const sessions = await authService.getUserSessions(userId);

    const response = NextResponse.json({
      success: true,
      user: userProfile,
      sessions: sessions.map(session => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
        isCurrentSession: session.id === request.headers.get('x-session-id'),
      })),
    });

    response.headers.set('X-Correlation-ID', correlationId);

    return response;

  } catch (error) {
    console.error('Profile fetch error:', error);

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      {
        userId: request.headers.get('x-user-id') || 'unknown',
        ipAddress: securityUtils.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          endpoint: '/api/auth/profile',
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
        result: 'FAILURE',
      }
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}