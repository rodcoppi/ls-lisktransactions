import { DashboardPage } from '../support/page-objects';

describe('Dashboard E2E Tests', () => {
  let dashboardPage: DashboardPage;

  beforeEach(() => {
    dashboardPage = new DashboardPage();
    
    // Mock API responses
    cy.intercept('GET', '/api/health', { fixture: 'health.json' }).as('getHealth');
    cy.intercept('GET', '/api/dashboard/stats', { fixture: 'dashboard-stats.json' }).as('getDashboardStats');
    cy.intercept('GET', '/api/analytics/volume*', { 
      body: {
        data: {
          timeframe: '24h',
          dataPoints: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
            volume: Math.floor(Math.random() * 1000000) + 500000,
            transactions: Math.floor(Math.random() * 1000) + 100,
          })),
          summary: {
            totalVolume: 50000000,
            averageVolume: 750000,
            peakVolume: 1200000,
            totalTransactions: 15000,
          },
        },
        success: true,
        timestamp: new Date().toISOString(),
      }
    }).as('getVolumeData');
  });

  describe('Dashboard Loading and Display', () => {
    it('should load dashboard successfully', () => {
      dashboardPage
        .visit()
        .waitForLoad()
        .shouldBeVisible()
        .shouldShowStats();

      // Verify API calls were made
      cy.wait('@getHealth');
      cy.wait('@getDashboardStats');
    });

    it('should display all stats cards with correct data', () => {
      dashboardPage
        .visit()
        .waitForLoad();

      // Verify each stats card
      dashboardPage
        .validateStatsCardContent('transactions')
        .validateStatsCardContent('nodes')
        .validateStatsCardContent('blocks')
        .validateStatsCardContent('health');

      // Check specific values from fixture
      cy.get('[data-testid="stats-card-transactions"]').should('contain', '1,234,567');
      cy.get('[data-testid="stats-card-nodes"]').should('contain', '89');
      cy.get('[data-testid="stats-card-blocks"]').should('contain', '987,654');
      cy.get('[data-testid="stats-card-health"]').should('contain', 'excellent');
    });

    it('should display charts when data is loaded', () => {
      dashboardPage
        .visit()
        .waitForLoad()
        .shouldShowCharts();

      cy.wait('@getVolumeData');

      dashboardPage
        .validateChartData('volume')
        .validateChartData('transaction');
    });
  });

  describe('Interactive Features', () => {
    beforeEach(() => {
      dashboardPage.visit().waitForLoad();
    });

    it('should allow timeframe selection', () => {
      // Mock different timeframe data
      cy.intercept('GET', '/api/analytics/volume?timeframe=7d', {
        body: {
          data: {
            timeframe: '7d',
            dataPoints: Array.from({ length: 7 }, (_, i) => ({
              timestamp: new Date(Date.now() - (6 - i) * 86400000).toISOString(),
              volume: Math.floor(Math.random() * 5000000) + 2000000,
              transactions: Math.floor(Math.random() * 5000) + 1000,
            })),
          },
          success: true,
        }
      }).as('get7dVolumeData');

      dashboardPage.selectTimeframe('7d');

      cy.wait('@get7dVolumeData');
      
      // Verify the chart updates with new data
      dashboardPage.shouldShowCharts();
    });

    it('should handle chart interactions', () => {
      dashboardPage
        .hoverOverChart('volume')
        .shouldShowChartTooltip();

      // Test chart tooltip contains relevant data
      cy.get('[data-testid="chart-tooltip"]').should('be.visible');
      cy.get('[data-testid="chart-tooltip"]').should('contain.text', 'Volume:');
    });

    it('should allow stats card interactions', () => {
      // Mock navigation or modal opening
      cy.window().then((win) => {
        cy.stub(win, 'open').as('windowOpen');
      });

      dashboardPage.clickStatsCard('transactions');
      
      // Verify some interaction occurred (navigation, modal, etc.)
      // This would depend on your actual implementation
    });

    it('should refresh data manually', () => {
      let callCount = 0;
      
      cy.intercept('GET', '/api/dashboard/stats', (req) => {
        callCount++;
        req.reply({ fixture: 'dashboard-stats.json' });
      }).as('getStatsRefresh');

      dashboardPage.clickRefresh();

      cy.wait('@getStatsRefresh').then(() => {
        expect(callCount).to.be.greaterThan(0);
      });
    });

    it('should toggle auto-refresh', () => {
      dashboardPage.toggleAutoRefresh();
      
      // Verify auto-refresh toggle state
      cy.get('[data-testid="auto-refresh-toggle"]').should('be.checked');
      
      dashboardPage.toggleAutoRefresh();
      cy.get('[data-testid="auto-refresh-toggle"]').should('not.be.checked');
    });
  });

  describe('Error Handling', () => {
    it('should display error state when API fails', () => {
      cy.intercept('GET', '/api/dashboard/stats', { 
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('getStatsError');

      dashboardPage
        .visit()
        .shouldShowErrorState('Failed to load dashboard data');

      cy.wait('@getStatsError');
    });

    it('should allow retry after error', () => {
      let attemptCount = 0;
      
      cy.intercept('GET', '/api/dashboard/stats', (req) => {
        attemptCount++;
        if (attemptCount === 1) {
          req.reply({ statusCode: 500, body: { error: 'Server Error' } });
        } else {
          req.reply({ fixture: 'dashboard-stats.json' });
        }
      }).as('getStatsRetry');

      dashboardPage.visit();
      
      // Should show error first
      dashboardPage.shouldShowErrorState();
      
      // Click retry
      dashboardPage.clickRetry();
      
      // Should recover and show data
      cy.wait('@getStatsRetry');
      dashboardPage.waitForLoad().shouldShowStats();
    });

    it('should handle network timeout gracefully', () => {
      cy.intercept('GET', '/api/dashboard/stats', (req) => {
        req.reply({ delay: 30000 }); // 30 second delay to simulate timeout
      }).as('getStatsTimeout');

      dashboardPage.visit();
      
      // Should eventually show timeout error
      cy.get('[data-testid="error-message"]', { timeout: 15000 })
        .should('be.visible')
        .should('contain.text', 'timeout');
    });
  });

  describe('Real-time Updates', () => {
    it('should show live update indicator', () => {
      dashboardPage
        .visit()
        .waitForLoad()
        .shouldShowLiveUpdates();

      cy.get('[data-testid="live-indicator"]').should('have.class', 'animate-pulse');
    });

    it('should update last updated timestamp', () => {
      dashboardPage.visit().waitForLoad();

      cy.get('[data-testid="last-updated"]').should('contain.text', 'ago');
      
      // Trigger a refresh and verify timestamp updates
      dashboardPage.clickRefresh();
      
      cy.get('[data-testid="last-updated"]').should('contain.text', 'seconds ago');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      dashboardPage.testMobileView();
    });

    it('should work on tablet devices', () => {
      dashboardPage.testTabletView();
    });

    it('should work on desktop', () => {
      dashboardPage.testDesktopView();
    });

    it('should adapt chart layout for different screen sizes', () => {
      // Test mobile layout
      cy.viewport(375, 667);
      dashboardPage.visit().waitForLoad();
      
      cy.get('[data-testid="chart-container"]').should('be.visible');
      // Charts should stack vertically on mobile
      cy.get('[data-testid="volume-chart"]').should('be.visible');
      cy.get('[data-testid="transaction-chart"]').should('be.visible');

      // Test desktop layout
      cy.viewport(1280, 720);
      cy.get('[data-testid="chart-container"]').should('be.visible');
      // Charts might be side-by-side on desktop
    });
  });

  describe('Performance', () => {
    it('should load within acceptable time', () => {
      const startTime = Date.now();
      
      dashboardPage.visit().waitForLoad();
      
      cy.then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // 3 seconds max
      });
    });

    it('should not have memory leaks', () => {
      // Visit dashboard multiple times to check for memory leaks
      for (let i = 0; i < 3; i++) {
        dashboardPage.visit().waitForLoad();
        cy.reload();
      }
      
      // Dashboard should still be functional
      dashboardPage.shouldBeVisible().shouldShowStats();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      dashboardPage.visit().waitForLoad();
    });

    it('should be accessible', () => {
      dashboardPage.checkA11y();
    });

    it('should support keyboard navigation', () => {
      // Test tab navigation
      cy.get('body').tab();
      cy.focused().should('be.visible');
      
      // Continue tabbing through interactive elements
      cy.focused().tab();
      cy.focused().should('be.visible');
    });

    it('should have proper heading structure', () => {
      cy.get('h1').should('exist');
      cy.get('h1').should('contain.text', 'Dashboard');
      
      // Check for proper heading hierarchy
      cy.get('h2, h3').should('exist');
    });

    it('should have sufficient color contrast', () => {
      // Check that text is readable against backgrounds
      cy.get('[data-testid="card-title"]').should('have.css', 'color');
      cy.get('[data-testid="card-value"]').should('have.css', 'color');
    });
  });
});