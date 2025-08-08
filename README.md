# Lisk Counter Dashboard - Testing Infrastructure

A comprehensive testing infrastructure setup for a Next.js 14 dashboard
application with TypeScript, featuring Jest, React Testing Library, Cypress, and
robust quality gates.

## 🚀 Overview

This project demonstrates a complete Quality Assurance setup with:

- **Unit Testing**: Jest + React Testing Library with 90%+ coverage target
- **E2E Testing**: Cypress with custom commands and page object models
- **Code Quality**: ESLint with strict rules and Prettier formatting
- **Pre-commit Hooks**: Husky + lint-staged for quality gates
- **API Mocking**: Mock Service Worker (MSW) for testing
- **CI/CD**: GitHub Actions workflow with comprehensive testing pipeline

## 📊 Coverage & Quality Targets

- **Test Coverage**: 90%+ (branches, functions, lines, statements)
- **ESLint**: Zero warnings policy
- **TypeScript**: Strict mode with no implicit any
- **Pre-commit**: Auto-fix and quality checks before every commit

## 🛠 Tech Stack

### Core Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript 5.3** - Strict type checking
- **React 18** - Component library

### Testing Framework

- **Jest 29** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **Cypress 13** - End-to-end testing framework
- **Mock Service Worker** - API mocking for tests

### Code Quality

- **ESLint** - Linting with strict rules
- **Prettier** - Code formatting
- **Husky** - Git hooks management
- **lint-staged** - Staged files processing
- **Commitlint** - Conventional commit messages

## 📁 Project Structure

```
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline
├── .husky/                           # Git hooks
├── cypress/                          # E2E tests
│   ├── e2e/                         # Test specifications
│   ├── fixtures/                    # Test data
│   └── support/
│       ├── commands.ts              # Custom commands
│       ├── e2e.ts                   # Global configuration
│       └── page-objects/            # Page object models
├── src/
│   ├── components/                   # React components
│   │   └── __tests__/               # Component tests
│   ├── hooks/                       # Custom hooks
│   │   └── __tests__/               # Hook tests
│   ├── test/                        # Test utilities
│   │   ├── mocks/                   # MSW handlers
│   │   ├── setup.ts                 # Jest setup
│   │   └── test-utils.tsx           # Custom render functions
│   ├── types/                       # TypeScript definitions
│   └── utils/                       # Utility functions
│       └── __tests__/               # Utility tests
├── cypress.config.ts                 # Cypress configuration
├── jest.config.js                    # Jest configuration (in package.json)
├── tsconfig.json                     # TypeScript configuration
├── .eslintrc.json                    # ESLint configuration
├── .prettierrc.json                  # Prettier configuration
├── commitlint.config.js              # Commit message rules
└── package.json                      # Dependencies and scripts
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd lisk-counter-dashboard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup git hooks**
   ```bash
   npx husky install
   ```

## 🧪 Testing Commands

### Unit Tests

```bash
# Run all unit tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode (no watch, with coverage)
npm run test:ci
```

### E2E Tests

```bash
# Run E2E tests headlessly
npm run test:e2e

# Open Cypress test runner
npm run test:e2e:open

# Run with browser visible
npm run test:e2e:headed
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Format code
npm run format

# Type check
npm run type-check

# Run all quality checks
npm run test:all
```

## 📋 Testing Best Practices

### Unit Testing Guidelines

1. **Test Structure** - Follow AAA pattern (Arrange, Act, Assert)
2. **Test Names** - Descriptive and behavior-focused
3. **Mock External Dependencies** - Use MSW for API calls
4. **Test User Interactions** - Use userEvent for realistic interactions
5. **Accessibility Testing** - Include a11y checks in component tests

### E2E Testing Guidelines

1. **Page Object Models** - Encapsulate page interactions
2. **Custom Commands** - Reusable test actions
3. **Data Management** - Use fixtures and factories
4. **Error Scenarios** - Test failure paths and recovery
5. **Performance** - Include basic performance assertions

### Example Test Files

#### Component Test Example

```typescript
// src/components/__tests__/StatsCard.test.tsx
import { render, screen } from '@/test/test-utils';
import StatsCard from '../StatsCard';

describe('StatsCard', () => {
  it('renders with correct data', () => {
    render(<StatsCard title="Users" value={1234} />);

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });
});
```

#### Hook Test Example

```typescript
// src/hooks/__tests__/useApi.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '../useApi';

describe('useApi', () => {
  it('fetches data successfully', async () => {
    const { result } = renderHook(() => useApi('/api/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

#### E2E Test Example

```typescript
// cypress/e2e/dashboard.cy.ts
describe('Dashboard', () => {
  it('displays stats correctly', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="stats-card"]').should('have.length', 4);
    cy.get('[data-testid="total-users"]').should('be.visible');
  });
});
```

## 🔧 Configuration Details

### Jest Configuration

- **Environment**: jsdom for DOM testing
- **Setup Files**: Automatic imports and mocks
- **Coverage**: 90% threshold on all metrics
- **Transform**: SWC for fast compilation

### Cypress Configuration

- **Base URL**: http://localhost:3000
- **Viewport**: 1280x720 default
- **Retries**: 2 attempts in CI, 0 locally
- **Video/Screenshots**: Enabled for debugging

### ESLint Rules

- **TypeScript**: Strict rules with no-implicit-any
- **React**: Hooks rules and best practices
- **Testing**: Specific rules for test files
- **Accessibility**: jsx-a11y plugin enabled

### Pre-commit Hooks

- **Lint**: Auto-fix ESLint issues
- **Format**: Auto-format with Prettier
- **Type Check**: TypeScript validation
- **Test**: Run affected tests (optional)

## 🚀 CI/CD Pipeline

The GitHub Actions workflow includes:

1. **Quality Gates**
   - ESLint checking
   - Prettier validation
   - TypeScript type checking

2. **Unit Tests**
   - Jest test execution
   - Coverage reporting
   - Coverage comments on PRs

3. **Build Verification**
   - Next.js production build
   - Build artifact storage

4. **E2E Tests**
   - Multi-browser testing (Chrome, Firefox, Edge)
   - Parallel execution
   - Visual regression detection

5. **Security Audit**
   - npm audit for vulnerabilities
   - Snyk security scanning

6. **Performance Tests**
   - Lighthouse CI scoring
   - Performance budgets

## 📈 Coverage Reports

Coverage reports are generated in multiple formats:

- **Console**: Summary in terminal
- **HTML**: Detailed interactive report in `coverage/`
- **LCOV**: For CI integration and badges
- **JSON**: Machine-readable format

Access HTML report:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🎯 Quality Gates

### Pre-commit Requirements

- All files must pass ESLint with zero warnings
- All files must be formatted with Prettier
- TypeScript must compile without errors
- Staged files must pass type checking

### CI/CD Requirements

- Unit test coverage must be ≥90%
- All E2E tests must pass
- Build must succeed without warnings
- Security audit must pass with no high vulnerabilities

### Commit Message Format

Following Conventional Commits:

```
type(scope): subject

body

footer
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, etc.

## 🔍 Debugging Tests

### Unit Tests

```bash
# Debug specific test
npm test -- --testNamePattern="StatsCard"

# Run tests in watch mode with coverage
npm run test:watch -- --coverage

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### E2E Tests

```bash
# Open Cypress in debug mode
npm run test:e2e:open

# Run specific test file
npx cypress run --spec "cypress/e2e/dashboard.cy.ts"

# Debug mode with browser visible
npm run test:e2e:headed
```

## 🚨 Troubleshooting

### Common Issues

1. **Pre-commit hooks not running**

   ```bash
   npx husky install
   chmod +x .husky/pre-commit
   ```

2. **Jest can't find modules**
   - Check `moduleNameMapping` in package.json
   - Verify TypeScript paths in tsconfig.json

3. **Cypress tests failing locally**
   - Ensure dev server is running on port 3000
   - Check baseUrl in cypress.config.ts

4. **Coverage threshold failures**
   - Add tests for uncovered code
   - Update exclusion patterns if needed

5. **ESLint errors in tests**
   - Check test-specific overrides in .eslintrc.json
   - Use `eslint-disable` comments sparingly

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)

## 🤝 Contributing

1. Follow the established testing patterns
2. Maintain 90%+ code coverage
3. Write meaningful commit messages
4. Ensure all quality gates pass
5. Add tests for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for
details.
