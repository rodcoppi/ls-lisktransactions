import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { AuthService } from '@/lib/security/auth';
import { AuditLogger, AuditEventType } from '@/lib/security/audit';
import { securityPresets, securityUtils } from '@/middleware/security';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const authService = new AuthService(redis);
const auditLogger = new AuditLogger(redis);

export async function POST(request: NextRequest) {
  try {
    // Apply basic security middleware (no auth required for refresh)
    const securityResponse = await securityPresets.api(request);
    if (securityResponse && securityResponse.status !== 200) {
      return securityResponse;
    }

    const clientIP = securityUtils.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const correlationId = request.headers.get('x-correlation-id') || `refresh_${Date.now()}`;

    // Get refresh token from cookie or request body
    let refreshToken = request.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      const body = await request.json();
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      await auditLogger.logEvent(
        AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
        {
          ipAddress: clientIP,
          userAgent,
          details: { 
            endpoint: '/api/auth/refresh',
            error: 'Missing refresh token',
            correlationId 
          },
          result: 'FAILURE',
        }
      );

      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 401 }
      );
    }

    // Refresh tokens
    const newTokens = await authService.refreshTokens(refreshToken);

    if (!newTokens) {
      await auditLogger.logEvent(
        AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
        {
          ipAddress: clientIP,
          userAgent,
          details: { 
            endpoint: '/api/auth/refresh',
            error: 'Invalid or expired refresh token',
            correlationId 
          },
          result: 'FAILURE',
        }
      );

      // Clear the invalid refresh token cookie
      const response = NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );

      response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });

      return response;
    }

    // Log successful token refresh
    await auditLogger.logEvent(
      AuditEventType.LOGIN_SUCCESS, // Token refresh extends the session
      {
        ipAddress: clientIP,
        userAgent,
        details: { 
          action: 'TOKEN_REFRESH',
          correlationId 
        },
        result: 'SUCCESS',
      }
    );

    const response = NextResponse.json({
      success: true,
      tokens: newTokens,
    });

    // Update refresh token cookie if it was provided via cookie
    if (request.cookies.get('refresh_token')) {
      response.cookies.set('refresh_token', newTokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
    }

    response.headers.set('X-Correlation-ID', correlationId);

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      {
        ipAddress: securityUtils.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          endpoint: '/api/auth/refresh',
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