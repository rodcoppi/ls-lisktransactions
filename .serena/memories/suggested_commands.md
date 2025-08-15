# Essential Development Commands

## Development Server
```bash
npm run dev          # Start development server on http://localhost:3000
```

## Build & Production
```bash
npm run build        # Build for production (with ULTRA_FIX_VERSION=2)
npm start            # Start production server
```

## Code Quality & Linting
```bash
npm run lint         # Run ESLint with max-warnings 0
npm run lint:fix     # Auto-fix ESLint issues
npm run type-check   # TypeScript type checking (tsc --noEmit)
```

## Code Formatting
```bash
npm run format       # Format code with Prettier
npm run format:check # Check if code is properly formatted
```

## Testing
```bash
npm test             # Run Jest tests (passWithNoTests)
npm run test:watch   # Run tests in watch mode
```

## Git & System Commands (Linux)
```bash
git status           # Check git status
git add .            # Stage all changes
git commit -m "msg"  # Commit changes
git push             # Push to remote
ls -la               # List files with details
cd <dir>             # Change directory
grep -r "pattern"    # Search for patterns in files
find . -name "*.ts"  # Find TypeScript files
```

## Node.js Requirements
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher