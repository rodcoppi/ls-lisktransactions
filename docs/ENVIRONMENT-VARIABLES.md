# Environment Variables Documentation

This document provides comprehensive documentation for all environment variables
used in the Lisk Counter Dashboard project.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Files](#environment-files)
- [Core Application Settings](#core-application-settings)
- [Database Configuration](#database-configuration)
- [Redis Configuration](#redis-configuration)
- [Lisk Blockchain API](#lisk-blockchain-api)
- [Authentication & Security](#authentication--security)
- [Feature Flags](#feature-flags)
- [External Services](#external-services)
- [Monitoring & Observability](#monitoring--observability)
- [Caching Configuration](#caching-configuration)
- [Multi-Tenant Configuration](#multi-tenant-configuration)
- [Security Configuration](#security-configuration)
- [Development & Testing](#development--testing)
- [Deployment Configuration](#deployment-configuration)
- [Environment-Specific Examples](#environment-specific-examples)
- [Validation & Error Handling](#validation--error-handling)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Update the required variables:

   ```bash
   # Minimum required configuration
   DATABASE_URL=postgresql://user:password@localhost:5432/lisk_dashboard
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-super-secret-32-character-minimum
   SESSION_SECRET=your-session-secret-32-character-minimum
   CSRF_SECRET=your-csrf-secret-32-character-minimum
   LISK_API_KEY=your-lisk-api-key
   BASE_URL=http://localhost:3000
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
   NEXT_PUBLIC_WS_URL=ws://localhost:3000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Files

The project supports multiple environment files for different deployment stages:

| File              | Purpose                               | When to Use                 |
| ----------------- | ------------------------------------- | --------------------------- |
| `.env.example`    | Template with all available variables | Reference and initial setup |
| `.env.local`      | Development environment               | Local development           |
| `.env.staging`    | Staging environment                   | Pre-production testing      |
| `.env.production` | Production environment                | Live deployment             |
| `.env.test`       | Test environment                      | Automated testing           |

**⚠️ Important**: Never commit actual `.env.*` files (except `.env.example`) to
version control.

## Core Application Settings

### Application Identity

```bash
# Application name displayed in UI
NEXT_PUBLIC_APP_NAME="Lisk Counter Dashboard"

# Application version (semantic versioning)
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Current environment identifier
NEXT_PUBLIC_ENVIRONMENT=development

# Node.js environment mode
NODE_ENV=development # development | staging | production | test
```

### Server Configuration

```bash
# Server port (default: 3000)
PORT=3000

# Server host binding (use 0.0.0.0 for Docker)
HOST=localhost

# Base URL for the application
BASE_URL=http://localhost:3000

# Public API base URL (accessible from browser)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# WebSocket URL for real-time features
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

## Database Configuration

### Primary Database (PostgreSQL + TimescaleDB)

```bash
# Primary database connection URL
DATABASE_URL=postgresql://username:password@host:port/database_name
# Example: postgresql://lisk_user:secure_pass@db.example.com:5432/lisk_dashboard

# Read replica URL (optional, for scaling)
DATABASE_READ_URL=postgresql://username:password@read-host:port/database_name

# Connection pool settings
DATABASE_POOL_MAX=20        # Maximum connections in pool
DATABASE_POOL_MIN=2         # Minimum connections in pool
DATABASE_CONNECTION_TIMEOUT=30000  # Connection timeout in milliseconds

# Migration settings
DATABASE_MIGRATION_TABLE="_drizzle_migrations"  # Migration tracking table

# SSL configuration
DATABASE_SSL=true           # Enable SSL for database connections
```

**Connection Pool Recommendations:**

- **Development**: `DATABASE_POOL_MAX=5`, `DATABASE_POOL_MIN=1`
- **Staging**: `DATABASE_POOL_MAX=20`, `DATABASE_POOL_MIN=5`
- **Production**: `DATABASE_POOL_MAX=50`, `DATABASE_POOL_MIN=10`

## Redis Configuration

### Cache & Session Store

```bash
# Redis connection URL
REDIS_URL=redis://username:password@host:port
# Example: redis://default:password@cache.example.com:6379

# Redis password (if not in URL)
REDIS_PASSWORD=your_redis_password

# Redis database number (0-15)
REDIS_DB=0

# Connection retry settings
REDIS_MAX_RETRIES=3         # Maximum retry attempts
REDIS_RETRY_DELAY=100       # Delay between retries (ms)
REDIS_CONNECTION_TIMEOUT=5000  # Connection timeout (ms)

# Redis Cluster (comma-separated nodes)
REDIS_CLUSTER_NODES=node1:7000,node2:7000,node3:7000
```

**Redis Performance Tuning:**

- Use Redis Cluster for high availability in production
- Set appropriate `REDIS_DB` values for different environments
- Monitor connection pool usage and adjust `REDIS_MAX_RETRIES`

## Lisk Blockchain API

### Blockscout API Configuration

```bash
# Primary Lisk API endpoint
LISK_API_BASE_URL=https://blockscout.lisk.com/api/v2

# API key for authenticated requests
LISK_API_KEY=your_blockscout_api_key

# Rate limiting (requests per hour)
LISK_API_RATE_LIMIT=1000    # Requests per hour

# Request timeout
LISK_API_TIMEOUT=30000      # Timeout in milliseconds

# Alternative Lisk Service API
LISK_SERVICE_URL=https://service.lisk.com
LISK_SERVICE_API_KEY=your_lisk_service_key

# WebSocket for real-time blockchain data
LISK_WS_URL=wss://service.lisk.com/blockchain
```

**Rate Limit Guidelines:**

- **Free tier**: 1,000 requests/hour
- **Pro tier**: 10,000 requests/hour
- **Enterprise**: Unlimited

## Authentication & Security

### JWT Configuration

```bash
# JWT signing secret (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# JWT token expiration
JWT_EXPIRES_IN=24h          # 24 hours

# Refresh token expiration
JWT_REFRESH_EXPIRES_IN=7d   # 7 days
```

### Session Management

```bash
# Session signing secret (minimum 32 characters)
SESSION_SECRET=your-session-secret-minimum-32-characters-long

# Session duration (milliseconds)
SESSION_MAX_AGE=86400000    # 24 hours

# Secure session cookies (HTTPS only)
SESSION_SECURE=false        # true for production

# SameSite cookie policy
SESSION_SAME_SITE=lax       # strict | lax | none
```

### CSRF Protection

```bash
# CSRF protection secret (minimum 32 characters)
CSRF_SECRET=your-csrf-secret-minimum-32-characters-long
```

### Password Security

```bash
# bcrypt rounds (higher = more secure but slower)
BCRYPT_ROUNDS=12            # 10-15 recommended range
```

### Rate Limiting

```bash
# Rate limit window (milliseconds)
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes

# Maximum requests per window
RATE_LIMIT_MAX_REQUESTS=100 # Requests per window
```

**Security Recommendations:**

- Use strong, randomly generated secrets (32+ characters)
- Set `SESSION_SECURE=true` in production with HTTPS
- Increase `BCRYPT_ROUNDS` for higher security (12-14 recommended)
- Adjust rate limits based on expected traffic

## Feature Flags

Feature flags enable/disable functionality across environments:

### Core Features

```bash
FEATURE_REAL_TIME_UPDATES=true      # WebSocket real-time updates
FEATURE_ADVANCED_ANALYTICS=true     # Statistical analysis features
FEATURE_USER_MANAGEMENT=true        # User authentication system
FEATURE_API_DOCUMENTATION=true      # Interactive API docs
```

### Experimental Features

```bash
FEATURE_MULTI_TENANT=false          # Multi-tenant support
FEATURE_DARK_MODE=true              # Dark theme option
FEATURE_EXPORT_DATA=true            # Data export functionality
FEATURE_ALERTS_SYSTEM=false         # Real-time alerts
```

### Performance Features

```bash
FEATURE_EDGE_CACHING=true           # CDN edge caching
FEATURE_COMPRESSION=true            # Response compression
FEATURE_SERVICE_WORKER=false        # PWA service worker
```

### Admin Features

```bash
FEATURE_ADMIN_PANEL=true            # Administrative interface
FEATURE_SYSTEM_MONITORING=true      # System health monitoring
FEATURE_AUDIT_LOGGING=true          # Audit trail logging
```

**Feature Flag Strategy:**

- Keep experimental features disabled in production
- Enable performance features in staging/production
- Use progressive rollouts for new features

## External Services

### Error Tracking (Sentry)

```bash
# Sentry DSN for error tracking
SENTRY_DSN=https://key@sentry.io/project

# Public Sentry DSN (browser errors)
NEXT_PUBLIC_SENTRY_DSN=https://public-key@sentry.io/project

# Sentry organization and project
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=lisk-counter-dashboard

# Sentry authentication token
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### Analytics

```bash
# Analytics service ID (Google Analytics, Plausible, etc.)
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id

# Analytics secret key
ANALYTICS_SECRET=your-analytics-secret
```

### Email Service

```bash
# Email service provider
EMAIL_SERVICE=sendgrid              # sendgrid | ses | smtp | console

# Email API key
EMAIL_API_KEY=your-email-api-key

# From address and name
EMAIL_FROM_ADDRESS=noreply@lisk-dashboard.com
EMAIL_FROM_NAME="Lisk Counter Dashboard"
```

### SMS Service (Twilio)

```bash
# Twilio account SID
TWILIO_ACCOUNT_SID=your-twilio-account-sid

# Twilio auth token
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Twilio phone number
TWILIO_FROM_NUMBER=+1234567890
```

### Cloud Storage

```bash
# Cloud storage provider
CLOUD_STORAGE_PROVIDER=aws          # aws | gcp | azure | local

# AWS credentials
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=lisk-dashboard-assets

# CDN configuration
CDN_BASE_URL=https://cdn.lisk-dashboard.com
CDN_API_KEY=your-cdn-api-key
```

## Monitoring & Observability

### Application Performance Monitoring

```bash
# APM service name
APM_SERVICE_NAME=lisk-counter-dashboard

# APM environment
APM_ENVIRONMENT=development

# APM secret token
APM_SECRET_TOKEN=your-apm-token

# APM server URL
APM_SERVER_URL=https://apm.example.com
```

### Metrics Collection

```bash
# Enable Prometheus metrics
METRICS_ENABLED=true

# Metrics endpoint port
METRICS_PORT=9090

# Metrics endpoint path
METRICS_PATH=/metrics
```

### Health Checks

```bash
# Enable health check endpoint
HEALTH_CHECK_ENABLED=true

# Health check endpoint path
HEALTH_CHECK_PATH=/health

# Health check timeout
HEALTH_CHECK_TIMEOUT=5000           # milliseconds
```

### Logging

```bash
# Log level
LOG_LEVEL=info                      # error | warn | info | debug | trace

# Log format
LOG_FORMAT=json                     # json | pretty | simple

# Log rotation
LOG_MAX_FILES=10                    # Maximum log files
LOG_MAX_SIZE=10m                    # Maximum size per file
```

**Monitoring Best Practices:**

- Use `LOG_LEVEL=debug` only in development
- Enable metrics in all environments for observability
- Set up health checks for load balancer integration

## Caching Configuration

### Cache TTL Settings

```bash
# Short-term cache (5 minutes)
CACHE_TTL_SHORT=300

# Medium-term cache (1 hour)
CACHE_TTL_MEDIUM=3600

# Long-term cache (24 hours)
CACHE_TTL_LONG=86400

# Static content cache (7 days)
CACHE_TTL_STATIC=604800
```

### Cache Behavior

```bash
# Warm cache on application start
CACHE_WARM_ON_START=true

# Pre-warm popular endpoints
CACHE_WARM_POPULAR_ENDPOINTS=true

# Browser cache settings
BROWSER_CACHE_MAX_AGE=31536000      # 1 year
BROWSER_CACHE_IMMUTABLE=true
```

**Caching Strategy:**

- Use short TTL for frequently changing data
- Use long TTL for computed analytics
- Enable cache warming in production for better performance

## Multi-Tenant Configuration

```bash
# Enable multi-tenant support
MULTI_TENANT_ENABLED=false

# Tenant isolation mode
TENANT_ISOLATION_MODE=subdomain     # subdomain | path | header

# Default tenant identifier
DEFAULT_TENANT=default

# Database strategy for tenants
TENANT_DATABASE_STRATEGY=shared     # shared | separate

# Enable custom domains for tenants
TENANT_CUSTOM_DOMAINS_ENABLED=false

# Enable custom branding per tenant
TENANT_BRANDING_ENABLED=false
```

**Multi-Tenant Modes:**

- **Subdomain**: `tenant1.app.com`, `tenant2.app.com`
- **Path**: `app.com/tenant1/`, `app.com/tenant2/`
- **Header**: Uses `X-Tenant-ID` header

## Security Configuration

### Content Security Policy

```bash
# CSP violation report URI
CSP_REPORT_URI=https://csp-reports.example.com/report

# CSP report-only mode (for testing)
CSP_REPORT_ONLY=false
```

### CORS Configuration

```bash
# Allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,https://app.example.com

# Allow credentials in CORS
CORS_CREDENTIALS=true
```

### HSTS (HTTP Strict Transport Security)

```bash
# HSTS max age (seconds)
HSTS_MAX_AGE=31536000               # 1 year

# Include subdomains in HSTS
HSTS_INCLUDE_SUBDOMAINS=true

# HSTS preload eligibility
HSTS_PRELOAD=true
```

### IP Whitelisting

```bash
# Allowed IP addresses (comma-separated)
ALLOWED_IPS=127.0.0.1,192.168.1.0/24

# Admin-only IP addresses
ALLOWED_ADMIN_IPS=192.168.1.100,10.0.0.0/8
```

## Development & Testing

### Debug Settings

```bash
# Enable debug mode
DEBUG=false

# Verbose logging
VERBOSE_LOGGING=false

# Enable query logging
ENABLE_QUERY_LOGGING=false

# Performance monitoring
ENABLE_PERFORMANCE_MONITORING=false
```

### Test Configuration

```bash
# Test database URL
TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5434/test_db

# Test Redis URL
TEST_REDIS_URL=redis://localhost:6380
```

### Database Seeding

```bash
# Seed database with sample data
SEED_DATABASE=false

# Admin user for seeding
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=admin123
```

**Development Tips:**

- Use `DEBUG=true` and `VERBOSE_LOGGING=true` in development
- Keep test databases separate from development databases
- Enable query logging to optimize database performance

## Deployment Configuration

### Build Settings

```bash
# Disable Next.js telemetry
NEXT_TELEMETRY_DISABLED=1

# Skip ESLint during build
DISABLE_ESLINT_PLUGIN=false

# Skip TypeScript checking
SKIP_TYPE_CHECK=false
```

### Docker Configuration

```bash
# Docker BuildKit
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1
```

### Kubernetes Settings

```bash
# Kubernetes namespace
K8S_NAMESPACE=lisk-dashboard

# Deployment name
K8S_DEPLOYMENT_NAME=lisk-counter-app
```

## Environment-Specific Examples

### Development (.env.local)

```bash
NODE_ENV=development
DEBUG=true
VERBOSE_LOGGING=true
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/lisk_dev
REDIS_URL=redis://localhost:6379
BASE_URL=http://localhost:3000
SESSION_SECURE=false
FEATURE_ALERTS_SYSTEM=true
LOG_LEVEL=debug
CACHE_TTL_SHORT=60
```

### Staging (.env.staging)

```bash
NODE_ENV=staging
DEBUG=false
VERBOSE_LOGGING=false
DATABASE_URL=postgresql://staging_user:${STAGING_DB_PASS}@staging-db:5432/lisk_staging
REDIS_URL=redis://:${STAGING_REDIS_PASS}@staging-cache:6379
BASE_URL=https://staging.lisk-dashboard.com
SESSION_SECURE=true
SESSION_SAME_SITE=strict
FEATURE_ALERTS_SYSTEM=true
LOG_LEVEL=info
METRICS_ENABLED=true
```

### Production (.env.production)

```bash
NODE_ENV=production
DEBUG=false
VERBOSE_LOGGING=false
DATABASE_URL=postgresql://prod_user:${PROD_DB_PASS}@prod-cluster:5432/lisk_prod
REDIS_URL=redis://:${PROD_REDIS_PASS}@prod-cache:6379
BASE_URL=https://lisk-dashboard.com
SESSION_SECURE=true
SESSION_SAME_SITE=strict
FEATURE_ALERTS_SYSTEM=false
FEATURE_API_DOCUMENTATION=false
LOG_LEVEL=warn
METRICS_ENABLED=true
HSTS_MAX_AGE=63072000
BCRYPT_ROUNDS=14
```

## Validation & Error Handling

The application validates all environment variables on startup using Zod
schemas. Common validation errors and solutions:

### Configuration Validation Errors

#### "Required secret 'JWT_SECRET' is not set"

```bash
# Solution: Set a strong JWT secret
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
```

#### "JWT secret must be at least 32 characters"

```bash
# Solution: Use a longer secret
JWT_SECRET=$(openssl rand -hex 32)
```

#### "DATABASE_URL is not a valid PostgreSQL URL"

```bash
# Solution: Use correct format
DATABASE_URL=postgresql://username:password@host:port/database
```

#### "Base URL is not a valid URL"

```bash
# Solution: Include protocol
BASE_URL=https://your-domain.com  # Not: your-domain.com
```

### Environment-Specific Validation

#### Production Environment Checks

- `SESSION_SECURE` must be `true` with HTTPS
- `DATABASE_SSL` should be `true` for external databases
- Debug flags should be `false`
- Strong `BCRYPT_ROUNDS` (12-14)

#### Development Environment Checks

- Warns about production-like secrets in development
- Validates local service URLs
- Checks for proper localhost configurations

## Security Best Practices

### Secret Management

#### 1. Use Strong Secrets

```bash
# Good: Long, random, unique
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
CSRF_SECRET=$(openssl rand -base64 32)

# Bad: Short, predictable
JWT_SECRET=secret123
```

#### 2. Environment-Specific Secrets

```bash
# Use different secrets for each environment
# Development
JWT_SECRET=dev-jwt-secret-32-chars-minimum...
# Production
JWT_SECRET=prod-jwt-secret-completely-different...
```

#### 3. Secret Rotation

```bash
# Rotate secrets regularly (30-90 days)
# Keep track of rotation dates
JWT_SECRET_LAST_ROTATED=2024-01-15
```

### Database Security

#### 1. Use Connection Pooling

```bash
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5
```

#### 2. Enable SSL in Production

```bash
DATABASE_SSL=true
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

#### 3. Use Read Replicas

```bash
DATABASE_READ_URL=postgresql://readonly:pass@read-host:5432/db
```

### Network Security

#### 1. Configure CORS Properly

```bash
# Specific origins, not wildcards
CORS_ORIGINS=https://app.example.com,https://admin.example.com
CORS_CREDENTIALS=true
```

#### 2. Set Security Headers

```bash
HSTS_MAX_AGE=63072000
HSTS_INCLUDE_SUBDOMAINS=true
HSTS_PRELOAD=true
```

#### 3. IP Whitelisting for Admin

```bash
ALLOWED_ADMIN_IPS=192.168.1.100,10.0.0.0/8
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Configuration Not Loading

```bash
# Check file location and permissions
ls -la .env.local
chmod 600 .env.local

# Verify no syntax errors
cat .env.local | grep -E '^[^#].*='
```

#### 2. Database Connection Issues

```bash
# Test connection URL format
node -e "console.log(new URL('$DATABASE_URL'))"

# Check network connectivity
pg_isready -h hostname -p port -U username
```

#### 3. Redis Connection Issues

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check Redis URL format
node -e "console.log(new URL('$REDIS_URL'))"
```

#### 4. Feature Flags Not Working

```bash
# Verify boolean format
FEATURE_REAL_TIME_UPDATES=true  # Not: TRUE, True, 1
FEATURE_ALERTS_SYSTEM=false     # Not: FALSE, False, 0
```

#### 5. JWT Token Issues

```bash
# Ensure secret is long enough
echo -n "$JWT_SECRET" | wc -c  # Should be >= 32

# Check secret format (no quotes in .env)
JWT_SECRET=your-secret-here     # Not: "your-secret-here"
```

### Debugging Environment Issues

#### 1. Enable Debug Logging

```bash
DEBUG=true
VERBOSE_LOGGING=true
ENABLE_QUERY_LOGGING=true
LOG_LEVEL=debug
```

#### 2. Validate Configuration

```bash
# The app will log validation errors on startup
npm run dev 2>&1 | grep -i error
```

#### 3. Check Environment Loading

```bash
# Add to your startup code:
console.log('Environment loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
  REDIS_URL: process.env.REDIS_URL ? 'SET' : 'MISSING',
});
```

### Performance Optimization

#### 1. Database Performance

```bash
# Optimize connection pool
DATABASE_POOL_MAX=50            # High traffic
DATABASE_POOL_MIN=10            # Always available connections
DATABASE_CONNECTION_TIMEOUT=10000  # Faster timeouts
```

#### 2. Cache Performance

```bash
# Tune TTL values
CACHE_TTL_SHORT=300             # 5 minutes for dynamic data
CACHE_TTL_MEDIUM=3600           # 1 hour for computed data
CACHE_TTL_LONG=86400            # 24 hours for static data
```

#### 3. Redis Optimization

```bash
# Use Redis cluster for high availability
REDIS_CLUSTER_NODES=node1:7000,node2:7000,node3:7000
REDIS_MAX_RETRIES=5
REDIS_CONNECTION_TIMEOUT=10000
```

---

## Additional Resources

- [Zod Schema Validation](https://github.com/colinhacks/zod) - Used for
  environment validation
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Redis Configuration](https://redis.io/topics/config)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

For additional help or questions about environment configuration, please refer
to the project's GitHub repository or contact the development team.
