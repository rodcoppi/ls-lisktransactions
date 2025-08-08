// Import commands
import './commands';

// Import Cypress code coverage plugin
import '@cypress/code-coverage/support';

// Disable uncaught exception handling for cleaner test output
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent Cypress from failing the test on uncaught exceptions
  // This is useful for testing error boundaries and expected errors
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  
  // Allow other errors to fail the test
  return true;
});

// Global configuration
beforeEach(() => {
  // Clear localStorage and sessionStorage before each test
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set up viewport
  cy.viewport(1280, 720);
  
  // Mock API responses by default (can be overridden in individual tests)
  cy.intercept('GET', '/api/health', { fixture: 'health.json' }).as('getHealth');
  cy.intercept('GET', '/api/dashboard/stats', { fixture: 'dashboard-stats.json' }).as('getDashboardStats');
});

// Add custom assertions
chai.use(function (chai, utils) {
  chai.Assertion.addMethod('haveLoadingState', function () {
    const obj = this._obj;
    
    const hasSpinner = obj.find('[data-testid="loading-spinner"]').length > 0;
    const hasLoadingText = obj.text().toLowerCase().includes('loading');
    const hasSkeletonLoader = obj.find('.animate-pulse').length > 0;
    
    const hasLoadingState = hasSpinner || hasLoadingText || hasSkeletonLoader;
    
    this.assert(
      hasLoadingState,
      'expected element to have loading state',
      'expected element not to have loading state'
    );
  });
  
  chai.Assertion.addMethod('haveErrorState', function (expectedMessage?: string) {
    const obj = this._obj;
    
    const hasErrorMessage = obj.find('[data-testid="error-message"]').length > 0;
    const hasErrorClass = obj.hasClass('error') || obj.find('.error').length > 0;
    
    const hasErrorState = hasErrorMessage || hasErrorClass;
    
    this.assert(
      hasErrorState,
      `expected element to have error state${expectedMessage ? ` with message "${expectedMessage}"` : ''}`,
      'expected element not to have error state'
    );
    
    if (expectedMessage && hasErrorMessage) {
      const errorText = obj.find('[data-testid="error-message"]').text();
      this.assert(
        errorText.includes(expectedMessage),
        `expected error message to contain "${expectedMessage}" but got "${errorText}"`,
        `expected error message not to contain "${expectedMessage}"`
      );
    }
  });
});