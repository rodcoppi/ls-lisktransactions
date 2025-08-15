# Task Completion Workflow

## Required Commands After Code Changes

### 1. Code Quality Checks (MANDATORY)
```bash
npm run lint         # Must pass with 0 warnings
npm run type-check   # TypeScript compilation check
npm run format:check # Verify code formatting
```

### 2. Fix Issues If Found
```bash
npm run lint:fix     # Auto-fix linting issues
npm run format       # Auto-format code
```

### 3. Testing
```bash
npm test             # Run Jest test suite
```

### 4. Build Verification
```bash
npm run build        # Ensure production build succeeds
```

## Development Workflow
1. Make code changes
2. Run `npm run dev` to test locally
3. Check http://localhost:3000 for functionality
4. Run all quality checks listed above
5. Fix any issues found
6. Commit changes only after all checks pass

## Pre-Commit Checklist
- [ ] ESLint passes with 0 warnings (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Code is properly formatted (`npm run format:check`)
- [ ] Tests pass (`npm test`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Local development server works (`npm run dev`)

## Special Considerations
- **Vercel Deployment**: Build uses `ULTRA_FIX_VERSION=2` environment variable
- **Cache Files**: Located in `src/data/` for development, `/tmp/` for production
- **API Endpoints**: Many debug/admin endpoints exist - be careful with modifications
- **UTC Timezone**: All timestamp handling must maintain UTC consistency
- **Performance**: Optimized for Vercel Free Tier limits (720 API calls/month)