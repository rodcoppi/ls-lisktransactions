# Code Style & Conventions

## TypeScript Configuration
- **Target**: ES2022 with strict mode enabled
- **Module**: ESNext with bundler resolution
- **JSX**: Preserve mode for Next.js
- **Path Aliases**: `@/*` maps to `./src/*` with component-specific aliases
- **Relaxed Rules**: Some TypeScript strict checks disabled for production builds

## ESLint Rules
- **Base**: Next.js core web vitals configuration
- **Custom Rules**:
  - `prefer-const`: error
  - `no-var`: error  
  - `no-console`: warn
  - `no-debugger`: error
- **Max Warnings**: 0 (strict enforcement)

## Prettier Configuration
- **Line Width**: 100 characters (80 for markdown)
- **Quotes**: Single quotes for JS/TS, double for JSX
- **Semicolons**: Always required
- **Trailing Commas**: All
- **Tab Width**: 2 spaces (no tabs)
- **Arrow Parens**: Avoid when possible
- **Tailwind Plugin**: Enabled for class sorting

## File Structure Conventions
- **Components**: React components in PascalCase (e.g., `DailyTrend.tsx`)
- **API Routes**: Next.js route handlers in `route.ts`
- **Utilities**: Helper functions in `lib/` directory
- **Types**: TypeScript definitions in `types/` directory
- **Hooks**: Custom React hooks in `hooks/` directory

## Import Organization
- Use path aliases (`@/` for src root)
- Group imports: external libraries first, then internal modules
- Prefer named imports over default imports where possible

## Naming Conventions
- **Files**: kebab-case for utilities, PascalCase for components
- **Variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **API Routes**: kebab-case directories

## Code Quality Standards
- TypeScript strict mode (with some relaxed rules for production)
- ESLint with zero warnings policy
- Prettier formatting enforced
- Responsive design patterns required
- Performance optimizations prioritized