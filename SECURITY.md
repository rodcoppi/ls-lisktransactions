# Security Implementation Guide

This document outlines the comprehensive security infrastructure implemented in
the LiskCounter application.

## 🛡️ Security Features Overview

### 1. Rate Limiting & DDoS Protection

- **Sliding Window Rate Limiting**: Redis-based with configurable windows and
  limits
- **Multiple Rate Limiter Types**: API, Authentication, User-specific
- **DDoS Protection**: Automatic IP banning for suspicious activity
- **Configurable Thresholds**: Per-endpoint customization

### 2. Authentication & Authorization

- **JWT-based Authentication**: Secure access and refresh token system
- **Multi-Factor Authentication (MFA)**: TOTP-based with QR codes and backup
  codes
- **Role-Based Access Control (RBAC)**: Granular permissions system
- **Session Management**: Secure session tracking and invalidation
- **Account Security**: Failed attempt tracking and account locking

### 3. Input Validation & Sanitization

- **XSS Prevention**: HTML sanitization and content filtering
- **SQL Injection Protection**: Pattern detection and input validation
- **File Upload Security**: MIME type validation and magic number checking
- **JSON Validation**: Prototype pollution prevention
- **CSRF Protection**: Token-based validation for state-changing operations

### 4. Security Headers & CORS

- **Content Security Policy (CSP)**: Strict policy with violation reporting
- **HTTP Strict Transport Security (HSTS)**: Force HTTPS connections
- **CORS Configuration**: Strict origin validation
- **Security Headers**: Complete set of security headers
- **Clickjacking Protection**: X-Frame-Options and frame-ancestors

### 5. Audit Logging & Monitoring

- **Comprehensive Event Logging**: All security events tracked
- **Real-time Monitoring**: Automated threat detection
- **Security Alerts**: Configurable alerting system
- **Metrics Dashboard**: Security analytics and reporting
- **Correlation IDs**: Request tracing for incident response

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Secrets (Generate strong secrets in production!)
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Application Configuration
NODE_ENV=development
APP_VERSION=1.0.0
SERVER_ID=server-1

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/liskconter
```

### 2. Install Dependencies

The security system requires the following additional dependencies:

```bash
npm install jose nanoid bcryptjs speakeasy qrcode isomorphic-dompurify validator
npm install --save-dev @types/bcryptjs @types/speakeasy @types/qrcode @types/validator
```

### 3. Initialize Security Services

```typescript
import { getSecurityService } from '@/lib/security';

// Initialize the global security service
const securityService = await getSecurityService({
  redis: { url: process.env.REDIS_URL },
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET,
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
  },
});

// Health check
const health = await securityService.healthCheck();
console.log('Security Service Health:', health);
```

## 🔐 Authentication Implementation

### Login Flow

```typescript
import { LoginForm } from '@/components/auth/LoginForm';

function LoginPage() {
  return (
    <LoginForm
      onSuccess={(user, tokens) => {
        // Handle successful login
        console.log('Login successful:', user);
      }}
      onMfaRequired={(tempToken) => {
        // Handle MFA requirement
        console.log('MFA required:', tempToken);
      }}
      redirectTo="/dashboard"
    />
  );
}
```

### MFA Setup

```typescript
import { MfaSetupForm } from '@/components/auth/MfaSetupForm';

function MfaSetupPage() {
  return (
    <MfaSetupForm
      onSuccess={() => {
        console.log('MFA setup completed');
      }}
      onCancel={() => {
        console.log('MFA setup cancelled');
      }}
    />
  );
}
```

### Protected API Routes

```typescript
// Example protected API route
import { securityPresets } from '@/middleware/security';

export async function GET(request: NextRequest) {
  // Apply security middleware
  const securityResponse = await securityPresets.protected(request);
  if (securityResponse && securityResponse.status !== 200) {
    return securityResponse;
  }

  // Get authenticated user ID
  const userId = request.headers.get('x-user-id');

  // Your API logic here
  return NextResponse.json({ data: 'Protected data', userId });
}
```

## 🛠️ Security Middleware Configuration

The application uses comprehensive middleware to protect all routes:

### Route-based Security

```typescript
// middleware.ts
const routeConfig = {
  // Public routes - basic security
  public: {
    patterns: ['/api/health', '/', '/auth/login'],
    middleware: securityPresets.api,
  },

  // Authentication routes - strict rate limiting
  auth: {
    patterns: ['/api/auth/login', '/api/auth/register'],
    middleware: securityPresets.auth,
  },

  // Protected routes - require authentication
  protected: {
    patterns: ['/api/auth/profile', '/dashboard'],
    middleware: securityPresets.protected,
  },

  // Admin routes - require admin role
  admin: {
    patterns: ['/api/admin', '/admin'],
    middleware: securityPresets.admin,
  },
};
```

### Custom Security Configuration

```typescript
import { createSecurityMiddleware } from '@/middleware/security';

const customSecurityMiddleware = createSecurityMiddleware({
  requireAuth: true,
  requiredRole: 'moderator',
  requiredPermissions: ['read:analytics', 'write:reports'],
  enableRateLimit: true,
  customRateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },
  enableCSRF: true,
  enableAuditLogging: true,
});
```

## 📊 Security Monitoring

### Audit Logging

```typescript
import { AuditLogger, AuditEventType } from '@/lib/security';

const auditLogger = new AuditLogger(redis);

// Log security events
await auditLogger.logEvent(
  AuditEventType.LOGIN_SUCCESS,
  {
    userId: 'user123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    details: { loginMethod: 'password' },
  }
);

// Query audit events
const events = await auditLogger.queryEvents({
  eventTypes: [AuditEventType.LOGIN_FAILURE],
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  limit: 100,
});

// Get security metrics
const metrics = await auditLogger.getSecurityMetrics('week');
console.log('Security metrics:', metrics);
```

### Security Alerts

```typescript
import { SecurityMonitor } from '@/lib/security';

const monitor = new SecurityMonitor(auditLogger);

// Subscribe to security alerts
monitor.subscribe((alert) => {
  console.log('Security Alert:', alert);
  // Send notification to security team
  // Log to external monitoring service
});

await monitor.startMonitoring();
```

## 🔒 Security Best Practices

### 1. Environment Configuration

- Use strong, unique secrets for JWT tokens
- Configure Redis with authentication in production
- Enable TLS for all connections
- Set appropriate CORS origins for your domain

### 2. Rate Limiting

- Adjust rate limits based on your application's usage patterns
- Monitor rate limit violations and adjust thresholds
- Implement progressive rate limiting for repeated violations

### 3. Authentication

- Enforce strong password policies
- Implement MFA for all users in production
- Regular token rotation and session management
- Monitor for suspicious authentication patterns

### 4. Input Validation

- Validate all input on both client and server side
- Use parameterized queries for database operations
- Sanitize all user-generated content
- Implement file upload restrictions

### 5. Monitoring & Alerting

- Set up real-time security monitoring
- Configure alerts for critical security events
- Regular security metric reviews
- Incident response procedures

## 🚨 Security Incident Response

### 1. Immediate Response

- Identify the source and nature of the threat
- Block malicious IPs using the DDoS protection system
- Invalidate compromised sessions
- Enable additional monitoring

### 2. Investigation

- Review audit logs for the incident timeframe
- Analyze security metrics for patterns
- Check for data access or modification
- Document findings

### 3. Recovery

- Apply security patches if needed
- Update security configurations
- Reset affected user credentials
- Communicate with affected users

## 📈 Security Metrics Dashboard

The security system provides comprehensive metrics:

- **Authentication Metrics**: Login success/failure rates, MFA adoption
- **Rate Limiting Metrics**: API usage patterns, blocked requests
- **Security Violations**: XSS attempts, SQL injection attempts
- **User Activity**: Session patterns, IP geolocation
- **System Health**: Service availability, error rates

## 🧪 Testing Security

### 1. Penetration Testing

The security implementation is designed to pass penetration testing:

- Input validation against common attack vectors
- Authentication bypass attempts
- Session management security
- Rate limiting effectiveness
- Security header validation

### 2. Security Testing Checklist

- [ ] SQL injection attempts blocked
- [ ] XSS attacks prevented
- [ ] CSRF protection working
- [ ] Rate limiting functional
- [ ] Authentication required for protected routes
- [ ] MFA working correctly
- [ ] Security headers present
- [ ] Audit logging capturing events
- [ ] DDoS protection active

## 📞 Security Support

For security-related issues or questions:

1. Check the audit logs for relevant events
2. Review security metrics for patterns
3. Consult this documentation for configuration
4. Contact the security team for critical incidents

---

**Note**: This security implementation follows industry best practices and is
designed to provide enterprise-grade protection. Regular security reviews and
updates are recommended to maintain effectiveness against evolving threats.
