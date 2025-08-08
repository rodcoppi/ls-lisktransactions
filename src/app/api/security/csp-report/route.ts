import { NextRequest, NextResponse } from 'next/server';
import { SecurityHeaders } from '@/lib/security/headers';
import { AuditLogger, AuditEventType } from '@/lib/security/audit';
import { securityUtils } from '@/middleware/security';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const auditLogger = new AuditLogger(redis);

export async function POST(request: NextRequest) {
  try {
    const clientIP = securityUtils.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const correlationId = request.headers.get('x-correlation-id') || `csp_report_${Date.now()}`;

    // Parse CSP violation report
    const body = await request.json();
    const report = body['csp-report'];

    if (report) {
      // Handle CSP violation
      SecurityHeaders.handleCSPReport(report);

      // Log CSP violation
      await auditLogger.logEvent(
        AuditEventType.SECURITY_VIOLATION,
        {
          ipAddress: clientIP,
          userAgent,
          details: {
            type: 'CSP_VIOLATION',
            'blocked-uri': report['blocked-uri'],
            'document-uri': report['document-uri'],
            'effective-directive': report['effective-directive'],
            'violated-directive': report['violated-directive'],
            'script-sample': report['script-sample'],
            correlationId,
          },
          result: 'WARNING',
        }
      );
    }

    // Always return 204 No Content for CSP reports
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('CSP report handling error:', error);
    return new NextResponse(null, { status: 204 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}