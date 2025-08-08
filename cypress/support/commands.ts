/// <reference types="cypress" />

// Custom commands for common testing scenarios

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login a user
       * @example cy.login('user@example.com', 'password')
       */
      login(email: string, password: string): Chainable<void>;
      
      /**
       * Custom command to wait for page to load completely
       * @example cy.waitForPageLoad()
       */
      waitForPageLoad(): Chainable<void>;
      
      /**
       * Custom command to check loading states
       * @example cy.checkLoadingState()
       */
      checkLoadingState(): Chainable<void>;
      
      /**
       * Custom command to wait for API call completion
       * @example cy.waitForApi('@getDashboardStats')
       */
      waitForApi(alias: string): Chainable<void>;
      
      /**
       * Custom command to test responsive behavior
       * @example cy.testResponsive(['mobile', 'tablet', 'desktop'])
       */
      testResponsive(viewports: string[]): Chainable<void>;
      
      /**
       * Custom command to check accessibility
       * @example cy.checkA11y()
       */
      checkA11y(): Chainable<void>;
      
      /**
       * Custom command to mock API responses
       * @example cy.mockApiResponse('GET', '/api/stats', { fixture: 'stats.json' })
       */
      mockApiResponse(method: string, url: string, response: any): Chainable<void>;
      
      /**
       * Custom command to test error states
       * @example cy.testErrorState('/api/stats', 'Failed to load statistics')
       */
      testErrorState(apiEndpoint: string, expectedErrorMessage: string): Chainable<void>;
      
      /**
       * Custom command to seed test data
       * @example cy.seedTestData({ users: 5, transactions: 100 })
       */
      seedTestData(data: Record<string, any>): Chainable<void>;
      
      /**
       * Custom command to clear test data
       * @example cy.clearTestData()
       */
      clearTestData(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for successful login redirect
    cy.url().should('not.include', '/login');
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });
});

Cypress.Commands.add('waitForPageLoad', () => {
  // Wait for Next.js router to be ready
  cy.window().should('have.property', 'next');
  
  // Wait for any loading spinners to disappear
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist');
  
  // Ensure no skeleton loaders are present
  cy.get('.animate-pulse', { timeout: 10000 }).should('not.exist');
});

Cypress.Commands.add('checkLoadingState', () => {
  // Check that loading indicator appears
  cy.get('[data-testid="loading-spinner"]').should('be.visible');
  
  // Then check that it disappears
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist');
});

Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.wait(alias).then((interception) => {
    expect(interception.response?.statusCode).to.be.oneOf([200, 201, 204]);
  });
});

Cypress.Commands.add('testResponsive', (viewports: string[]) => {
  const viewportSizes: Record<string, [number, number]> = {
    mobile: [375, 667],
    tablet: [768, 1024],
    desktop: [1280, 720],
    large: [1920, 1080],
  };

  viewports.forEach((viewport) => {
    const [width, height] = viewportSizes[viewport] || [1280, 720];
    
    cy.viewport(width, height);
    cy.get('[data-testid="main-content"]').should('be.visible');
    
    // Check that navigation is accessible
    if (viewport === 'mobile') {
      cy.get('[data-testid="mobile-menu-toggle"]').should('be.visible');
    } else {
      cy.get('[data-testid="desktop-navigation"]').should('be.visible');
    }
  });
});

Cypress.Commands.add('checkA11y', () => {
  // Basic accessibility checks
  cy.get('main').should('exist');
  cy.get('h1, h2, h3, h4, h5, h6').should('have.length.gt', 0);
  
  // Check for alt attributes on images
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt');
  });
  
  // Check for form labels
  cy.get('input, select, textarea').each(($input) => {
    const id = $input.attr('id');
    if (id) {
      cy.get(`label[for="${id}"]`).should('exist');
    }
  });
  
  // Check focus management
  cy.get('button, a, input, select, textarea').first().focus();
  cy.focused().should('be.visible');
});

Cypress.Commands.add('mockApiResponse', (method: string, url: string, response: any) => {
  cy.intercept(method, url, response).as(`mock${method}${url.replace(/[^a-zA-Z0-9]/g, '')}`);
});

Cypress.Commands.add('testErrorState', (apiEndpoint: string, expectedErrorMessage: string) => {
  // Mock API to return error
  cy.intercept('GET', apiEndpoint, { statusCode: 500, body: { error: 'Internal Server Error' } }).as('apiError');
  
  // Reload page to trigger API call
  cy.reload();
  
  // Check error state
  cy.get('[data-testid="error-message"]').should('be.visible');
  cy.get('[data-testid="error-message"]').should('contain.text', expectedErrorMessage);
  
  // Check retry button if it exists
  cy.get('[data-testid="retry-button"]').should('be.visible');
});

Cypress.Commands.add('seedTestData', (data: Record<string, any>) => {
  cy.task('seedDatabase', data);
});

Cypress.Commands.add('clearTestData', () => {
  cy.task('clearDatabase');
});