import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { AuthService } from '@/lib/security/auth';
import { AuditLogger, AuditEventType, auditHelpers } from '@/lib/security/audit';
import { validate, authSchemas } from '@/lib/security/validation';
import { securityPresets, securityUtils } from '@/middleware/security';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const authService = new AuthService(redis);
const auditLogger = new AuditLogger(redis);

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await securityPresets.auth(request);
    if (securityResponse && securityResponse.status !== 200) {
      return securityResponse;
    }

    const clientIP = securityUtils.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const correlationId = request.headers.get('x-correlation-id') || `login_${Date.now()}`;

    // Parse and validate request body
    const body = await request.json();
    const validation = await validate(body, [
      { field: 'email', schema: authSchemas.login.shape.email, required: true },
      { field: 'password', schema: authSchemas.login.shape.password, required: true },
      { field: 'rememberMe', schema: authSchemas.login.shape.rememberMe, required: false },
    ]);

    if (!validation.isValid) {
      // Log failed validation attempt
      await auditLogger.logEvent(
        AuditEventType.LOGIN_FAILURE,
        auditHelpers.loginFailure(
          body.email || 'unknown',
          clientIP,
          userAgent,
          'Invalid input validation'
        )
      );

      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = validation.sanitizedData;
    const deviceInfo = `${request.headers.get('sec-ch-ua-platform') || 'Unknown'} / ${request.headers.get('sec-ch-ua') || 'Unknown Browser'}`;

    // Attempt login
    const loginResult = await authService.login(
      email as string,
      password as string,
      deviceInfo,
      clientIP,
      userAgent
    );

    if (!loginResult.success) {
      // Log failed login attempt
      await auditLogger.logEvent(
        AuditEventType.LOGIN_FAILURE,
        auditHelpers.loginFailure(
          email as string,
          clientIP,
          userAgent,
          loginResult.error || 'Login failed'
        )
      );

      return NextResponse.json(
        { error: loginResult.error },
        { status: 401 }
      );
    }

    // Check if MFA is required
    if (loginResult.requiresMfa) {
      return NextResponse.json({
        success: false,
        requiresMfa: true,
        mfaTempToken: loginResult.mfaTempToken,
        message: 'MFA verification required',
      });
    }

    // Successful login
    await auditLogger.logEvent(
      AuditEventType.LOGIN_SUCCESS,
      auditHelpers.loginSuccess(
        loginResult.user!.id,
        clientIP,
        userAgent
      )
    );

    // Set secure cookies for tokens if rememberMe is true
    const response = NextResponse.json({
      success: true,
      user: loginResult.user,
      tokens: loginResult.tokens,
      session: loginResult.session,
    });

    if (rememberMe) {
      // Set refresh token as secure HTTP-only cookie
      response.cookies.set('refresh_token', loginResult.tokens!.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
    }

    // Set CSRF token cookie for subsequent requests
    response.cookies.set('csrf_token', loginResult.session!.id, {
      httpOnly: false, // Needs to be accessible by client
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    response.headers.set('X-Correlation-ID', correlationId);

    return response;

  } catch (error) {
    console.error('Login error:', error);

    // Log system error
    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      {
        ipAddress: securityUtils.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          endpoint: '/api/auth/login',
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