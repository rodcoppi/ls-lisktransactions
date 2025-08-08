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
    // Apply security middleware with authentication required
    const securityResponse = await securityPresets.protected(request);
    if (securityResponse && securityResponse.status !== 200) {
      return securityResponse;
    }

    const clientIP = securityUtils.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const userId = request.headers.get('x-user-id');
    const correlationId = request.headers.get('x-correlation-id') || `mfa_setup_${Date.now()}`;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Setup MFA for the user
    const mfaSetup = await authService.setupMfa(userId);

    // Log MFA setup initiation
    await auditLogger.logEvent(
      AuditEventType.SECURITY_VIOLATION, // Using as a security-related event
      {
        userId,
        ipAddress: clientIP,
        userAgent,
        details: { 
          action: 'MFA_SETUP_INITIATED',
          correlationId 
        },
        result: 'SUCCESS',
      }
    );

    const response = NextResponse.json({
      success: true,
      secret: mfaSetup.secret,
      qrCode: mfaSetup.qrCode,
      backupCodes: mfaSetup.backupCodes,
      message: 'MFA setup initiated. Please scan the QR code and verify with a code to complete setup.',
    });

    response.headers.set('X-Correlation-ID', correlationId);

    return response;

  } catch (error) {
    console.error('MFA setup error:', error);

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      {
        userId: request.headers.get('x-user-id') || 'unknown',
        ipAddress: securityUtils.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          endpoint: '/api/auth/mfa/setup',
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

export async function PUT(request: NextRequest) {
  try {
    // Apply security middleware with authentication required
    const securityResponse = await securityPresets.protected(request);
    if (securityResponse && securityResponse.status !== 200) {
      return securityResponse;
    }

    const clientIP = securityUtils.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const userId = request.headers.get('x-user-id');
    const correlationId = request.headers.get('x-correlation-id') || `mfa_confirm_${Date.now()}`;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { verificationCode } = body;

    if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
      return NextResponse.json(
        { error: 'Valid 6-digit verification code required' },
        { status: 400 }
      );
    }

    // Confirm MFA setup
    const confirmed = await authService.confirmMfaSetup(userId, verificationCode);

    if (!confirmed) {
      // Log failed MFA setup confirmation
      await auditLogger.logEvent(
        AuditEventType.SECURITY_VIOLATION,
        {
          userId,
          ipAddress: clientIP,
          userAgent,
          details: { 
            action: 'MFA_SETUP_CONFIRMATION_FAILED',
            correlationId 
          },
          result: 'FAILURE',
        }
      );

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Log successful MFA enablement
    await auditLogger.logEvent(
      AuditEventType.MFA_ENABLED,
      {
        userId,
        ipAddress: clientIP,
        userAgent,
        details: { correlationId },
        result: 'SUCCESS',
      }
    );

    const response = NextResponse.json({
      success: true,
      message: 'MFA has been successfully enabled for your account.',
    });

    response.headers.set('X-Correlation-ID', correlationId);

    return response;

  } catch (error) {
    console.error('MFA confirmation error:', error);

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      {
        userId: request.headers.get('x-user-id') || 'unknown',
        ipAddress: securityUtils.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          endpoint: '/api/auth/mfa/setup',
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

export async function DELETE(request: NextRequest) {
  try {
    // Apply security middleware with authentication required
    const securityResponse = await securityPresets.protected(request);
    if (securityResponse && securityResponse.status !== 200) {
      return securityResponse;
    }

    const clientIP = securityUtils.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const userId = request.headers.get('x-user-id');
    const correlationId = request.headers.get('x-correlation-id') || `mfa_disable_${Date.now()}`;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { verificationCode } = body;

    if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
      return NextResponse.json(
        { error: 'Valid 6-digit verification code required' },
        { status: 400 }
      );
    }

    // Disable MFA
    const disabled = await authService.disableMfa(userId, verificationCode);

    if (!disabled) {
      // Log failed MFA disable attempt
      await auditLogger.logEvent(
        AuditEventType.SECURITY_VIOLATION,
        {
          userId,
          ipAddress: clientIP,
          userAgent,
          details: { 
            action: 'MFA_DISABLE_FAILED',
            correlationId 
          },
          result: 'FAILURE',
        }
      );

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Log successful MFA disablement
    await auditLogger.logEvent(
      AuditEventType.MFA_DISABLED,
      {
        userId,
        ipAddress: clientIP,
        userAgent,
        details: { correlationId },
        result: 'SUCCESS',
      }
    );

    const response = NextResponse.json({
      success: true,
      message: 'MFA has been disabled for your account.',
    });

    response.headers.set('X-Correlation-ID', correlationId);

    return response;

  } catch (error) {
    console.error('MFA disable error:', error);

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      {
        userId: request.headers.get('x-user-id') || 'unknown',
        ipAddress: securityUtils.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          endpoint: '/api/auth/mfa/setup',
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