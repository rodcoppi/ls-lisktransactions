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
    const correlationId = request.headers.get('x-correlation-id') || `mfa_verify_${Date.now()}`;

    // Parse and validate request body
    const body = await request.json();
    const validation = await validate(body, [
      { field: 'code', schema: authSchemas.mfaVerify.shape.code, required: true },
      { field: 'tempToken', schema: authSchemas.mfaVerify.shape.tempToken, required: true },
    ]);

    if (!validation.isValid) {
      await auditLogger.logEvent(
        AuditEventType.MFA_VERIFICATION_FAILURE,
        {
          ipAddress: clientIP,
          userAgent,
          details: { 
            endpoint: '/api/auth/mfa/verify',
            validationErrors: validation.errors,
            correlationId 
          },
          result: 'FAILURE',
        }
      );

      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { code, tempToken } = validation.sanitizedData;
    const deviceInfo = `${request.headers.get('sec-ch-ua-platform') || 'Unknown'} / ${request.headers.get('sec-ch-ua') || 'Unknown Browser'}`;

    // Verify MFA code
    const mfaResult = await authService.verifyMfa(
      tempToken as string,
      code as string,
      deviceInfo,
      clientIP,
      userAgent
    );

    if (!mfaResult.success) {
      // Log failed MFA verification
      await auditLogger.logEvent(
        AuditEventType.MFA_VERIFICATION_FAILURE,
        {
          ipAddress: clientIP,
          userAgent,
          details: { 
            error: mfaResult.error,
            correlationId 
          },
          result: 'FAILURE',
        }
      );

      return NextResponse.json(
        { error: mfaResult.error },
        { status: 401 }
      );
    }

    // Successful MFA verification
    await auditLogger.logEvent(
      AuditEventType.MFA_VERIFICATION_SUCCESS,
      {
        userId: mfaResult.user!.id,
        ipAddress: clientIP,
        userAgent,
        details: { correlationId },
        result: 'SUCCESS',
      }
    );

    // Also log successful login since MFA verification completes the login process
    await auditLogger.logEvent(
      AuditEventType.LOGIN_SUCCESS,
      auditHelpers.loginSuccess(
        mfaResult.user!.id,
        clientIP,
        userAgent
      )
    );

    const response = NextResponse.json({
      success: true,
      user: mfaResult.user,
      tokens: mfaResult.tokens,
      session: mfaResult.session,
    });

    // Set CSRF token cookie for subsequent requests
    response.cookies.set('csrf_token', mfaResult.session!.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    response.headers.set('X-Correlation-ID', correlationId);

    return response;

  } catch (error) {
    console.error('MFA verification error:', error);

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      {
        ipAddress: securityUtils.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          endpoint: '/api/auth/mfa/verify',
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