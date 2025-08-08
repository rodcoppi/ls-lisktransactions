import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { 
  SlidingWindowRateLimiter, 
  ApiRateLimiter, 
  AuthRateLimiter, 
  UserRateLimiter, 
  DDoSProtector 
} from '@/lib/security/rate-limiting';
import { SecurityHeaders, securityUtils } from '@/lib/security/headers';
import { AuthService, JWTAccessPayload } from '@/lib/security/auth';
import { AuditLogger, AuditEventType, auditHelpers } from '@/lib/security/audit';
import { XSSProtection, CSRFProtection, InputValidator } from '@/lib/security/validation';

// Redis instance for security middleware
let redis: Redis;

// Security services
let apiRateLimiter: ApiRateLimiter;
let authRateLimiter: AuthRateLimiter;
let userRateLimiter: UserRateLimiter;
let ddosProtector: DDoSProtector;
let securityHeaders: SecurityHeaders;
let authService: AuthService;
let auditLogger: AuditLogger;

// Initialize security services
function initializeSecurityServices() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  if (!apiRateLimiter) {
    apiRateLimiter = new ApiRateLimiter(redis);
    authRateLimiter = new AuthRateLimiter(redis);
    userRateLimiter = new UserRateLimiter(redis);
    ddosProtector = new DDoSProtector(redis);
    securityHeaders = new SecurityHeaders({ isDevelopment: process.env.NODE_ENV === 'development' });
    authService = new AuthService(redis);
    auditLogger = new AuditLogger(redis);
  }
}

// Security middleware configuration
export interface SecurityMiddlewareConfig {
  // Rate limiting
  enableRateLimit?: boolean;
  rateLimitType?: 'api' | 'auth' | 'user';
  customRateLimit?: {
    windowMs: number;
    maxRequests: number;
  };

  // DDoS protection
  enableDDoSProtection?: boolean;

  // Authentication
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requiredRole?: string;

  // Input validation
  validateInput?: boolean;
  maxRequestSize?: number;

  // Security headers
  enableSecurityHeaders?: boolean;

  // CSRF protection
  enableCSRF?: boolean;

  // Audit logging
  enableAuditLogging?: boolean;
  auditEventType?: AuditEventType;

  // Custom validations
  customValidations?: Array<(req: NextRequest) => Promise<boolean | string>>;

  // Whitelist/Blacklist
  allowedIPs?: string[];
  blockedIPs?: string[];
  allowedUserAgents?: string[];
  blockedUserAgents?: string[];
}

// Main security middleware
export function createSecurityMiddleware(config: SecurityMiddlewareConfig = {}) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    initializeSecurityServices();

    const {
      enableRateLimit = true,
      rateLimitType = 'api',
      enableDDoSProtection = true,
      requireAuth = false,
      validateInput = true,
      enableSecurityHeaders = true,
      enableCSRF = false,
      enableAuditLogging = true,
      maxRequestSize = 10 * 1024 * 1024, // 10MB
      customValidations = [],
      allowedIPs = [],
      blockedIPs = [],
      allowedUserAgents = [],
      blockedUserAgents = [],
    } = config;

    try {
      const clientIP = securityUtils.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const correlationId = request.headers.get('x-correlation-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add correlation ID to response headers
      const response = NextResponse.next();
      response.headers.set('X-Correlation-ID', correlationId);

      // IP Whitelist/Blacklist check
      if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        if (enableAuditLogging) {
          await auditLogger.logEvent(
            AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
            auditHelpers.securityViolation(
              'IP_NOT_WHITELISTED',
              clientIP,
              userAgent,
              { ip: clientIP, correlationId }
            )
          );
        }
        return new NextResponse('Access denied', { status: 403 });
      }

      if (blockedIPs.includes(clientIP)) {
        if (enableAuditLogging) {
          await auditLogger.logEvent(
            AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
            auditHelpers.securityViolation(
              'IP_BLACKLISTED',
              clientIP,
              userAgent,
              { ip: clientIP, correlationId }
            )
          );
        }
        return new NextResponse('Access denied', { status: 403 });
      }

      // User Agent validation
      if (blockedUserAgents.some(blocked => userAgent.includes(blocked))) {
        if (enableAuditLogging) {
          await auditLogger.logEvent(
            AuditEventType.SECURITY_VIOLATION,
            auditHelpers.securityViolation(
              'BLOCKED_USER_AGENT',
              clientIP,
              userAgent,
              { userAgent, correlationId }
            )
          );
        }
        return new NextResponse('Access denied', { status: 403 });
      }

      if (allowedUserAgents.length > 0 && !allowedUserAgents.some(allowed => userAgent.includes(allowed))) {
        if (enableAuditLogging) {
          await auditLogger.logEvent(
            AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
            auditHelpers.securityViolation(
              'USER_AGENT_NOT_ALLOWED',
              clientIP,
              userAgent,
              { userAgent, correlationId }
            )
          );
        }
        return new NextResponse('Access denied', { status: 403 });
      }

      // DDoS Protection
      if (enableDDoSProtection) {
        const ddosCheck = await ddosProtector.checkForDDoS(request);
        if (ddosCheck.isBanned) {
          if (enableAuditLogging) {
            await auditLogger.logEvent(
              AuditEventType.IP_BLOCKED,
              auditHelpers.securityViolation(
                'DDOS_BAN',
                clientIP,
                userAgent,
                { 
                  banExpiresAt: ddosCheck.banExpiresAt,
                  correlationId 
                }
              )
            );
          }
          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests - IP temporarily banned',
              banExpiresAt: ddosCheck.banExpiresAt,
            }),
            { 
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // Rate Limiting
      if (enableRateLimit) {
        let rateLimiter: SlidingWindowRateLimiter;
        
        switch (rateLimitType) {
          case 'auth':
            rateLimiter = authRateLimiter;
            break;
          case 'user':
            rateLimiter = userRateLimiter;
            break;
          default:
            rateLimiter = apiRateLimiter;
        }

        const customConfig = config.customRateLimit ? {
          windowMs: config.customRateLimit.windowMs,
          maxRequests: config.customRateLimit.maxRequests,
        } : undefined;

        const rateLimitResult = await rateLimiter.checkLimit(request, customConfig);
        
        if (!rateLimitResult.success) {
          if (enableAuditLogging) {
            await auditLogger.logEvent(
              AuditEventType.RATE_LIMIT_EXCEEDED,
              auditHelpers.securityViolation(
                'RATE_LIMIT',
                clientIP,
                userAgent,
                {
                  limit: rateLimitResult.limit,
                  remaining: rateLimitResult.remaining,
                  resetTime: rateLimitResult.resetTime,
                  correlationId,
                }
              )
            );
          }

          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime.toISOString(),
              retryAfter: rateLimitResult.retryAfter,
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString(),
                'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
              },
            }
          );
        }

        // Add rate limit headers to successful responses
        response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString());
      }

      // Request size validation
      if (validateInput && !securityUtils.isRequestSizeValid(request, maxRequestSize)) {
        if (enableAuditLogging) {
          await auditLogger.logEvent(
            AuditEventType.SECURITY_VIOLATION,
            auditHelpers.securityViolation(
              'REQUEST_TOO_LARGE',
              clientIP,
              userAgent,
              { 
                maxSize: maxRequestSize,
                contentLength: request.headers.get('content-length'),
                correlationId 
              }
            )
          );
        }
        return new NextResponse('Request entity too large', { status: 413 });
      }

      // CSRF Protection for state-changing methods
      if (enableCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const csrfToken = request.headers.get('x-csrf-token');
        const sessionToken = request.headers.get('x-session-token');
        
        if (!csrfToken || !sessionToken) {
          if (enableAuditLogging) {
            await auditLogger.logEvent(
              AuditEventType.CSRF_ATTACK_DETECTED,
              auditHelpers.securityViolation(
                'MISSING_CSRF_TOKEN',
                clientIP,
                userAgent,
                { method: request.method, correlationId }
              )
            );
          }
          return new NextResponse('CSRF token required', { status: 403 });
        }

        // In a real implementation, you would validate the CSRF token against the session
        // For now, we'll just check that both tokens are present
        if (!CSRFProtection.validateToken(csrfToken, sessionToken)) {
          if (enableAuditLogging) {
            await auditLogger.logEvent(
              AuditEventType.CSRF_ATTACK_DETECTED,
              auditHelpers.securityViolation(
                'INVALID_CSRF_TOKEN',
                clientIP,
                userAgent,
                { method: request.method, correlationId }
              )
            );
          }
          return new NextResponse('Invalid CSRF token', { status: 403 });
        }
      }

      // Authentication check
      if (requireAuth) {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          if (enableAuditLogging) {
            await auditLogger.logEvent(
              AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
              auditHelpers.securityViolation(
                'MISSING_AUTH_TOKEN',
                clientIP,
                userAgent,
                { path: request.nextUrl.pathname, correlationId }
              )
            );
          }
          return new NextResponse('Authentication required', { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = await authService.verifyAccessToken(token);
        
        if (!payload) {
          if (enableAuditLogging) {
            await auditLogger.logEvent(
              AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
              auditHelpers.securityViolation(
                'INVALID_AUTH_TOKEN',
                clientIP,
                userAgent,
                { path: request.nextUrl.pathname, correlationId }
              )
            );
          }
          return new NextResponse('Invalid or expired token', { status: 401 });
        }

        // Check permissions if required
        if (config.requiredPermissions && config.requiredPermissions.length > 0) {
          const hasPermission = config.requiredPermissions.every(
            permission => payload.permissions.includes(permission as any)
          );
          
          if (!hasPermission) {
            if (enableAuditLogging) {
              await auditLogger.logEvent(
                AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
                auditHelpers.securityViolation(
                  'INSUFFICIENT_PERMISSIONS',
                  clientIP,
                  userAgent,
                  { 
                    userId: payload.userId,
                    requiredPermissions: config.requiredPermissions,
                    userPermissions: payload.permissions,
                    path: request.nextUrl.pathname,
                    correlationId 
                  }
                )
              );
            }
            return new NextResponse('Insufficient permissions', { status: 403 });
          }
        }

        // Check role if required
        if (config.requiredRole && payload.role !== config.requiredRole) {
          if (enableAuditLogging) {
            await auditLogger.logEvent(
              AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
              auditHelpers.securityViolation(
                'INSUFFICIENT_ROLE',
                clientIP,
                userAgent,
                { 
                  userId: payload.userId,
                  requiredRole: config.requiredRole,
                  userRole: payload.role,
                  path: request.nextUrl.pathname,
                  correlationId 
                }
              )
            );
          }
          return new NextResponse('Insufficient role', { status: 403 });
        }

        // Add user info to request headers for downstream handlers
        response.headers.set('X-User-ID', payload.userId);
        response.headers.set('X-User-Role', payload.role);
        response.headers.set('X-Session-ID', payload.sessionId);
      }

      // Custom validations
      for (const validation of customValidations) {
        const result = await validation(request);
        if (result !== true) {
          const error = typeof result === 'string' ? result : 'Custom validation failed';
          
          if (enableAuditLogging) {
            await auditLogger.logEvent(
              AuditEventType.SECURITY_VIOLATION,
              auditHelpers.securityViolation(
                'CUSTOM_VALIDATION_FAILED',
                clientIP,
                userAgent,
                { error, correlationId }
              )
            );
          }
          
          return new NextResponse(error, { status: 400 });
        }
      }

      // Input validation for POST/PUT requests
      if (validateInput && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const contentType = request.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            const body = await request.text();
            
            // Basic XSS and injection checks
            try {
              XSSProtection.validateAndSanitizeInput(body, false);
            } catch (error) {
              if (enableAuditLogging) {
                await auditLogger.logEvent(
                  AuditEventType.XSS_ATTEMPT_BLOCKED,
                  auditHelpers.securityViolation(
                    'XSS_ATTEMPT',
                    clientIP,
                    userAgent,
                    { 
                      error: error instanceof Error ? error.message : 'XSS detected',
                      correlationId 
                    }
                  )
                );
              }
              return new NextResponse('Malicious content detected', { status: 400 });
            }

            // Validate JSON structure
            try {
              InputValidator.validateJson(body);
            } catch (error) {
              if (enableAuditLogging) {
                await auditLogger.logEvent(
                  AuditEventType.SECURITY_VIOLATION,
                  auditHelpers.securityViolation(
                    'INVALID_JSON',
                    clientIP,
                    userAgent,
                    { 
                      error: error instanceof Error ? error.message : 'Invalid JSON',
                      correlationId 
                    }
                  )
                );
              }
              return new NextResponse('Invalid JSON format', { status: 400 });
            }
          }
        } catch (error) {
          console.error('Input validation error:', error);
        }
      }

      // Apply security headers
      if (enableSecurityHeaders) {
        return securityHeaders.applyHeaders(request, response);
      }

      // Log successful request if audit logging is enabled
      if (enableAuditLogging && config.auditEventType) {
        await auditLogger.logEvent(
          config.auditEventType,
          {
            ipAddress: clientIP,
            userAgent,
            details: { 
              path: request.nextUrl.pathname,
              method: request.method,
              correlationId 
            },
            correlationId,
          }
        );
      }

      return response;

    } catch (error) {
      console.error('Security middleware error:', error);
      
      if (enableAuditLogging) {
        try {
          await auditLogger.logEvent(
            AuditEventType.SYSTEM_ERROR,
            {
              ipAddress: securityUtils.getClientIP(request),
              userAgent: request.headers.get('user-agent') || 'unknown',
              details: { 
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
              },
              result: 'FAILURE',
            }
          );
        } catch (auditError) {
          console.error('Failed to log error to audit system:', auditError);
        }
      }
      
      // Return generic error to avoid leaking information
      return new NextResponse('Internal server error', { status: 500 });
    }
  };
}

// Predefined security middleware configurations
export const securityPresets = {
  // Basic API protection
  api: createSecurityMiddleware({
    enableRateLimit: true,
    rateLimitType: 'api',
    enableDDoSProtection: true,
    validateInput: true,
    enableSecurityHeaders: true,
    enableAuditLogging: true,
  }),

  // Authentication endpoints
  auth: createSecurityMiddleware({
    enableRateLimit: true,
    rateLimitType: 'auth',
    enableDDoSProtection: true,
    validateInput: true,
    enableSecurityHeaders: true,
    enableAuditLogging: true,
    maxRequestSize: 1024 * 1024, // 1MB for auth requests
  }),

  // Protected user endpoints
  protected: createSecurityMiddleware({
    requireAuth: true,
    enableRateLimit: true,
    rateLimitType: 'user',
    enableDDoSProtection: true,
    validateInput: true,
    enableSecurityHeaders: true,
    enableCSRF: true,
    enableAuditLogging: true,
    auditEventType: AuditEventType.DATA_ACCESS,
  }),

  // Admin endpoints
  admin: createSecurityMiddleware({
    requireAuth: true,
    requiredRole: 'admin',
    enableRateLimit: true,
    rateLimitType: 'user',
    enableDDoSProtection: true,
    validateInput: true,
    enableSecurityHeaders: true,
    enableCSRF: true,
    enableAuditLogging: true,
    auditEventType: AuditEventType.SENSITIVE_DATA_ACCESS,
    customRateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // More restrictive for admin endpoints
    },
  }),
};

// Export security utilities for use in API routes
export { securityUtils, XSSProtection, CSRFProtection, InputValidator };