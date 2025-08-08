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
    // Apply basic security middleware (no auth required for logout)
    const securityResponse = await securityPresets.api(request);
    if (securityResponse && securityResponse.status !== 200) {
      return securityResponse;
    }

    const clientIP = securityUtils.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const correlationId = request.headers.get('x-correlation-id') || `logout_${Date.now()}`;

    // Try to get session info from headers (if user is authenticated)
    const userId = request.headers.get('x-user-id');
    const sessionId = request.headers.get('x-session-id');

    // Get tokens from various sources
    const authHeader = request.headers.get('authorization');
    const refreshTokenCookie = request.cookies.get('refresh_token')?.value;
    
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const refreshTokenBody = body.refreshToken;

    // Invalidate session if we have session info
    if (sessionId) {
      try {
        await authService.invalidateSession(sessionId);
      } catch (error) {
        console.error('Failed to invalidate session:', error);
      }
    }

    // Log logout event
    if (userId) {
      await auditLogger.logEvent(
        AuditEventType.LOGOUT,
        {
          userId,
          sessionId: sessionId || undefined,
          ipAddress: clientIP,
          userAgent,
          details: { correlationId },
          result: 'SUCCESS',
        }
      );
    } else {
      // Log logout attempt without user context
      await auditLogger.logEvent(
        AuditEventType.LOGOUT,
        {
          ipAddress: clientIP,
          userAgent,
          details: { 
            note: 'Logout attempt without authenticated session',
            correlationId 
          },
          result: 'SUCCESS',
        }
      );
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear all auth-related cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 0,
      path: '/',
    };

    response.cookies.set('refresh_token', '', cookieOptions);
    response.cookies.set('csrf_token', '', {
      ...cookieOptions,
      httpOnly: false, // CSRF token needs to be accessible by client
    });

    response.headers.set('X-Correlation-ID', correlationId);

    // Note: We don't invalidate the access token on the server side since it's stateless JWT
    // The client should discard it, and it will expire naturally

    return response;

  } catch (error) {
    console.error('Logout error:', error);

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      {
        userId: request.headers.get('x-user-id') || undefined,
        ipAddress: securityUtils.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          endpoint: '/api/auth/logout',
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
        result: 'FAILURE',
      }
    );

    // Even if there's an error, we should still clear cookies and return success
    // to ensure the user is logged out on the client side
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 0,
      path: '/',
    };

    response.cookies.set('refresh_token', '', cookieOptions);
    response.cookies.set('csrf_token', '', {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}