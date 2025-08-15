# Vercel Free Tier Constraints

## Critical Limitations to Respect

### Function Invocations
- **Limit**: 100GB-hrs per month
- **Current Strategy**: Optimized caching to minimize API calls

### Bandwidth
- **Limit**: 100GB per month
- **Optimization**: Efficient asset delivery and caching

### API Calls Budget
- **Current Usage**: 720 API calls/month (well under 1,000 limit)
- **Strategy**: Daily cron job at 00:00 UTC for data updates
- **Cache**: Pre-populated with 24,955+ transactions to reduce API dependency

### Build Time
- **Limit**: 6,000 build minutes per month
- **Consideration**: Efficient builds with `ULTRA_FIX_VERSION=2`

### Serverless Functions
- **Execution Time**: 10 seconds max per invocation
- **Memory**: 1024MB max
- **Current**: Multiple API endpoints optimized for quick execution

## Development Guidelines
- **Always consider**: Impact on function invocations and bandwidth
- **Cache Strategy**: Prefer file-system cache over frequent API calls
- **Efficient Updates**: Incremental data fetching only
- **Build Optimization**: Keep build times minimal
- **Asset Optimization**: Use Next.js image optimization features

## Monitoring
- Watch Vercel dashboard for usage metrics
- Keep API calls well below limits
- Monitor build times and function execution duration