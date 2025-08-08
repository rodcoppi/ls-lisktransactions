import { NextRequest, NextResponse } from 'next/server';
import { createSecurityMiddleware, securityPresets } from '@/middleware/security';

// Define route patterns and their security requirements
const routeConfig = {
  // Public routes - basic security only
  public: {
    patterns: [
      '/api/health',
      '/api/metrics',
      '/_next/static',
      '/favicon.ico',
      '/manifest.json',
      '/',
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
    ],
    middleware: securityPresets.api,
  },

  // Authentication routes - strict rate limiting
  auth: {
    patterns: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/reset-password',
      '/api/auth/verify-email',
    ],
    middleware: securityPresets.auth,
  },

  // MFA routes - special handling
  mfa: {
    patterns: [
      '/api/auth/mfa/verify',
      '/api/auth/mfa/setup',
    ],
    middleware: createSecurityMiddleware({
      enableRateLimit: true,
      rateLimitType: 'auth',
      customRateLimit: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 10, // More lenient for MFA attempts
      },
      enableDDoSProtection: true,
      validateInput: true,
      enableSecurityHeaders: true,
      enableAuditLogging: true,
    }),
  },

  // Protected routes - require authentication
  protected: {
    patterns: [
      '/api/auth/profile',
      '/api/auth/sessions',
      '/api/auth/change-password',
      '/dashboard',
      '/profile',
      '/settings',
    ],
    middleware: securityPresets.protected,
  },

  // Admin routes - require admin role
  admin: {
    patterns: [
      '/api/admin',
      '/api/users',
      '/api/audit',
      '/admin',
    ],
    middleware: securityPresets.admin,
  },

  // API routes - general API protection
  api: {
    patterns: [
      '/api/data',
      '/api/analytics',
      '/api/export',
      '/api/notifications',
    ],
    middleware: createSecurityMiddleware({
      requireAuth: true,
      enableRateLimit: true,
      rateLimitType: 'user',
      enableDDoSProtection: true,
      validateInput: true,
      enableSecurityHeaders: true,
      enableCSRF: true,
      enableAuditLogging: true,
    }),
  },

  // Security reporting endpoints
  security: {
    patterns: [
      '/api/security/csp-report',
    ],
    middleware: createSecurityMiddleware({
      enableRateLimit: true,
      customRateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 50, // Allow frequent CSP reports
      },
      enableSecurityHeaders: false, // Don't apply headers to reporting endpoints
      enableAuditLogging: false, // Don't log CSP reports to audit system
    }),
  },
};

function getRouteConfig(pathname: string) {
  // Check routes in order of specificity
  const routeTypes = ['security', 'admin', 'mfa', 'auth', 'protected', 'api', 'public'];
  
  for (const routeType of routeTypes) {
    const config = routeConfig[routeType as keyof typeof routeConfig];
    const matches = config.patterns.some(pattern => {
      if (pattern.endsWith('*')) {
        return pathname.startsWith(pattern.slice(0, -1));
      }
      return pathname === pattern || pathname.startsWith(pattern + '/');
    });
    
    if (matches) {
      return { type: routeType, config };
    }
  }
  
  // Default to public routes
  return { type: 'public', config: routeConfig.public };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for Next.js internal routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/_vercel/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }

  try {
    // Get the appropriate security configuration for this route
    const { type, config } = getRouteConfig(pathname);
    
    // Apply the security middleware
    const middlewareResult = await config.middleware(request);
    
    // If middleware returns a response, use it (rate limited, blocked, etc.)
    if (middlewareResult && middlewareResult instanceof Response) {
      return middlewareResult;
    }

    // Add security context headers for debugging (only in development)
    const response = NextResponse.next();
    
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-Security-Route-Type', type);
      response.headers.set('X-Security-Applied', 'true');
    }

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // In case of middleware error, fail securely
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Security middleware error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // For non-API routes, redirect to error page
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};