export class DashboardPage {
  // Selectors
  private readonly selectors = {
    pageTitle: '[data-testid="dashboard-title"]',
    statsCards: '[data-testid="stats-card"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    errorMessage: '[data-testid="error-message"]',
    retryButton: '[data-testid="retry-button"]',
    refreshButton: '[data-testid="refresh-button"]',
    
    // Specific stat cards
    totalTransactionsCard: '[data-testid="stats-card-transactions"]',
    activeNodesCard: '[data-testid="stats-card-nodes"]',
    blockHeightCard: '[data-testid="stats-card-blocks"]',
    networkHealthCard: '[data-testid="stats-card-health"]',
    
    // Charts
    volumeChart: '[data-testid="volume-chart"]',
    transactionChart: '[data-testid="transaction-chart"]',
    chartContainer: '[data-testid="chart-container"]',
    chartLoading: '[data-testid="chart-loading"]',
    
    // Filters and controls
    timeframeSelector: '[data-testid="timeframe-selector"]',
    dateRangePicker: '[data-testid="date-range-picker"]',
    exportButton: '[data-testid="export-button"]',
    
    // Real-time updates
    liveIndicator: '[data-testid="live-indicator"]',
    lastUpdated: '[data-testid="last-updated"]',
    autoRefreshToggle: '[data-testid="auto-refresh-toggle"]',
  };

  // Navigation
  visit() {
    cy.visit('/dashboard');
    return this;
  }

  waitForLoad() {
    cy.get(this.selectors.loadingSpinner).should('not.exist');
    cy.get(this.selectors.pageTitle).should('be.visible');
    return this;
  }

  // Assertions
  shouldBeVisible() {
    cy.get(this.selectors.pageTitle).should('be.visible');
    cy.get(this.selectors.pageTitle).should('contain.text', 'Dashboard');
    return this;
  }

  shouldShowStats() {
    cy.get(this.selectors.statsCards).should('have.length.gt', 0);
    cy.get(this.selectors.totalTransactionsCard).should('be.visible');
    cy.get(this.selectors.activeNodesCard).should('be.visible');
    cy.get(this.selectors.blockHeightCard).should('be.visible');
    cy.get(this.selectors.networkHealthCard).should('be.visible');
    return this;
  }

  shouldShowCharts() {
    cy.get(this.selectors.volumeChart).should('be.visible');
    cy.get(this.selectors.transactionChart).should('be.visible');
    return this;
  }

  shouldShowLoadingState() {
    cy.get(this.selectors.loadingSpinner).should('be.visible');
    return this;
  }

  shouldShowErrorState(message?: string) {
    cy.get(this.selectors.errorMessage).should('be.visible');
    if (message) {
      cy.get(this.selectors.errorMessage).should('contain.text', message);
    }
    cy.get(this.selectors.retryButton).should('be.visible');
    return this;
  }

  shouldShowLiveUpdates() {
    cy.get(this.selectors.liveIndicator).should('be.visible');
    cy.get(this.selectors.lastUpdated).should('be.visible');
    return this;
  }

  // Actions
  clickRefresh() {
    cy.get(this.selectors.refreshButton).click();
    return this;
  }

  clickRetry() {
    cy.get(this.selectors.retryButton).click();
    return this;
  }

  selectTimeframe(timeframe: '1h' | '24h' | '7d' | '30d') {
    cy.get(this.selectors.timeframeSelector).click();
    cy.get(`[data-value="${timeframe}"]`).click();
    return this;
  }

  toggleAutoRefresh() {
    cy.get(this.selectors.autoRefreshToggle).click();
    return this;
  }

  exportData() {
    cy.get(this.selectors.exportButton).click();
    return this;
  }

  // Interactions with specific cards
  clickStatsCard(cardType: 'transactions' | 'nodes' | 'blocks' | 'health') {
    const cardSelector = this.selectors[`${cardType}Card` as keyof typeof this.selectors] as string;
    cy.get(cardSelector).click();
    return this;
  }

  // Chart interactions
  hoverOverChart(chartType: 'volume' | 'transaction') {
    const chartSelector = this.selectors[`${chartType}Chart` as keyof typeof this.selectors] as string;
    cy.get(chartSelector).trigger('mouseover');
    return this;
  }

  shouldShowChartTooltip() {
    cy.get('[data-testid="chart-tooltip"]').should('be.visible');
    return this;
  }

  // Validation helpers
  validateStatsCardContent(cardType: 'transactions' | 'nodes' | 'blocks' | 'health') {
    const cardSelector = this.selectors[`${cardType}Card` as keyof typeof this.selectors] as string;
    
    cy.get(cardSelector).within(() => {
      cy.get('[data-testid="card-title"]').should('be.visible');
      cy.get('[data-testid="card-value"]').should('be.visible');
      cy.get('[data-testid="card-change"]').should('exist');
    });
    
    return this;
  }

  validateChartData(chartType: 'volume' | 'transaction') {
    const chartSelector = this.selectors[`${chartType}Chart` as keyof typeof this.selectors] as string;
    
    cy.get(chartSelector).within(() => {
      // Check that chart has data points
      cy.get('.recharts-line-curve, .recharts-bar, .recharts-area-curve').should('exist');
      // Check axes are present
      cy.get('.recharts-xaxis, .recharts-yaxis').should('exist');
    });
    
    return this;
  }

  // Responsive testing
  testMobileView() {
    cy.viewport(375, 667);
    this.shouldBeVisible();
    
    // On mobile, stats cards should stack vertically
    cy.get(this.selectors.statsCards).should('be.visible');
    
    // Charts should be responsive
    cy.get(this.selectors.chartContainer).should('be.visible');
    
    return this;
  }

  testTabletView() {
    cy.viewport(768, 1024);
    this.shouldBeVisible();
    this.shouldShowStats();
    this.shouldShowCharts();
    
    return this;
  }

  testDesktopView() {
    cy.viewport(1280, 720);
    this.shouldBeVisible();
    this.shouldShowStats();
    this.shouldShowCharts();
    
    return this;
  }
}