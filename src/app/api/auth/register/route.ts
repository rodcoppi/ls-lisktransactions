import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { AuthService, UserRole } from '@/lib/security/auth';
import { AuditLogger, AuditEventType } from '@/lib/security/audit';
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
    const correlationId = request.headers.get('x-correlation-id') || `register_${Date.now()}`;

    // Parse and validate request body
    const body = await request.json();
    const validation = await validate(body, [
      { field: 'email', schema: authSchemas.register.shape.email, required: true },
      { field: 'username', schema: authSchemas.register.shape.username, required: true },
      { field: 'password', schema: authSchemas.register.shape.password, required: true },
      { field: 'confirmPassword', schema: authSchemas.register.shape.confirmPassword, required: true },
    ]);

    if (!validation.isValid) {
      // Log failed validation attempt
      await auditLogger.logEvent(
        AuditEventType.SECURITY_VIOLATION,
        {
          ipAddress: clientIP,
          userAgent,
          details: { 
            endpoint: '/api/auth/register',
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

    const { email, username, password, confirmPassword } = validation.sanitizedData;

    // Additional password confirmation check
    if (password !== confirmPassword) {
      await auditLogger.logEvent(
        AuditEventType.SECURITY_VIOLATION,
        {
          ipAddress: clientIP,
          userAgent,
          details: { 
            endpoint: '/api/auth/register',
            error: 'Password confirmation mismatch',
            email,
            correlationId 
          },
          result: 'FAILURE',
        }
      );

      return NextResponse.json(
        { error: "Passwords don't match" },
        { status: 400 }
      );
    }

    // Attempt registration
    const registrationResult = await authService.register({
      email: email as string,
      username: username as string,
      password: password as string,
      role: UserRole.USER, // Default role for new users
    });

    if (!registrationResult.success) {
      // Log failed registration attempt
      await auditLogger.logEvent(
        AuditEventType.SECURITY_VIOLATION,
        {
          ipAddress: clientIP,
          userAgent,
          details: { 
            endpoint: '/api/auth/register',
            error: registrationResult.error,
            email,
            correlationId 
          },
          result: 'FAILURE',
        }
      );

      return NextResponse.json(
        { error: registrationResult.error },
        { status: 400 }
      );
    }

    // Successful registration
    await auditLogger.logEvent(
      AuditEventType.USER_CREATED,
      {
        userId: registrationResult.user!.id,
        ipAddress: clientIP,
        userAgent,
        details: { 
          email: registrationResult.user!.email,
          username: registrationResult.user!.username,
          role: registrationResult.user!.role,
          correlationId 
        },
        result: 'SUCCESS',
      }
    );

    const response = NextResponse.json({
      success: true,
      user: registrationResult.user,
      message: 'Registration successful',
    });

    response.headers.set('X-Correlation-ID', correlationId);

    return response;

  } catch (error) {
    console.error('Registration error:', error);

    // Log system error
    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      {
        ipAddress: securityUtils.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          endpoint: '/api/auth/register',
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