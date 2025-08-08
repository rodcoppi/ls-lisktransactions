/**
 * Enhanced Cypress custom commands for comprehensive E2E testing
 * Provides reusable commands for authentication, API testing, performance, and more
 */

/// <reference types="cypress" />

import 'cypress-image-snapshot/command'
import '@cypress/code-coverage/support'
import 'cypress-axe'

// Authentication commands
Cypress.Commands.add('loginEnhanced', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login')
    
    cy.get('[data-testid="email-input"]').type(email)
    cy.get('[data-testid="password-input"]').type(password)
    cy.get('[data-testid="login-button"]').click()
    
    // Wait for successful login redirect
    cy.url().should('not.include', '/login')
    cy.window().its('localStorage').invoke('getItem', 'authToken').should('exist')
  })
})

Cypress.Commands.add('loginWithMFA', (email: string, password: string, mfaCode: string) => {
  cy.session([email, password, mfaCode], () => {
    cy.visit('/login')
    
    cy.get('[data-testid="email-input"]').type(email)
    cy.get('[data-testid="password-input"]').type(password)
    cy.get('[data-testid="login-button"]').click()
    
    // Handle MFA step
    cy.get('[data-testid="mfa-code-input"]').should('be.visible')
    cy.get('[data-testid="mfa-code-input"]').type(mfaCode)
    cy.get('[data-testid="verify-mfa-button"]').click()
    
    cy.url().should('not.include', '/login')
    cy.window().its('localStorage').invoke('getItem', 'authToken').should('exist')
  })
})

Cypress.Commands.add('logoutEnhanced', () => {
  cy.get('[data-testid="user-menu"]').click()
  cy.get('[data-testid="logout-button"]').click()
  cy.url().should('include', '/login')
})

// API testing commands
Cypress.Commands.add('apiRequest', (method: string, url: string, options = {}) => {
  const { body, headers = {}, failOnStatusCode = true } = options as any
  
  return cy.request({
    method,
    url: `${Cypress.env('API_URL')}${url}`,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    failOnStatusCode,
  })
})

Cypress.Commands.add('authenticatedRequest', (method: string, url: string, options = {}) => {
  return cy.window()
    .its('localStorage')
    .invoke('getItem', 'authToken')
    .then((token) => {
      const { headers = {}, ...restOptions } = options as any
      
      return cy.apiRequest(method, url, {
        ...restOptions,
        headers: {
          Authorization: `Bearer ${token}`,
          ...headers,
        },
      })
    })
})

// Dashboard and UI commands
Cypress.Commands.add('waitForDashboardLoad', () => {
  // Wait for main dashboard components to load
  cy.get('[data-testid="dashboard-container"]').should('be.visible')
  cy.get('[data-testid="loading-indicator"]').should('not.exist')
  
  // Wait for stats cards to load
  cy.get('[data-testid="stats-card"]').should('have.length.greaterThan', 0)
  
  // Wait for charts to render
  cy.get('[data-testid="chart-container"]').should('be.visible')
})

Cypress.Commands.add('selectTimeframe', (timeframe: string) => {
  cy.get('[data-testid="timeframe-selector"]').click()
  cy.get(`[data-testid="timeframe-option-${timeframe}"]`).click()
  
  // Wait for data to reload
  cy.get('[data-testid="loading-indicator"]').should('appear')
  cy.get('[data-testid="loading-indicator"]').should('not.exist')
})

Cypress.Commands.add('interactWithChart', (chartType: string, action: string) => {
  const chart = cy.get(`[data-testid="${chartType}-chart"]`)
  
  switch (action) {
    case 'hover':
      chart.trigger('mouseover', { x: 100, y: 100 })
      cy.get('[data-testid="chart-tooltip"]').should('be.visible')
      break
    
    case 'zoom':
      chart.trigger('wheel', { deltaY: -100 })
      break
    
    case 'pan':
      chart.trigger('mousedown', { x: 50, y: 50 })
      chart.trigger('mousemove', { x: 150, y: 50 })
      chart.trigger('mouseup')
      break
    
    case 'select':
      chart.trigger('mousedown', { x: 50, y: 50 })
      chart.trigger('mousemove', { x: 150, y: 100 })
      chart.trigger('mouseup')
      break
  }
})

// Performance testing commands
Cypress.Commands.add('measurePageLoad', () => {
  cy.window().then((win) => {
    const perfData = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    const metrics = {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      firstPaint: 0,
      firstContentfulPaint: 0,
    }
    
    // Get paint timings if available
    const paintEntries = win.performance.getEntriesByType('paint')
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-paint') {
        metrics.firstPaint = entry.startTime
      } else if (entry.name === 'first-contentful-paint') {
        metrics.firstContentfulPaint = entry.startTime
      }
    })
    
    cy.task('measurePerformance', metrics)
    
    return cy.wrap(metrics)
  })
})

Cypress.Commands.add('auditPerformance', (thresholds = {}) => {
  const defaultThresholds = {
    performance: 80,
    accessibility: 95,
    'best-practices': 80,
    seo: 80,
    ...thresholds,
  }
  
  cy.lighthouse(defaultThresholds)
})

// Visual regression testing commands
Cypress.Commands.add('visualSnapshot', (name: string, options = {}) => {
  const defaultOptions = {
    threshold: 0.1,
    thresholdType: 'percent',
    customDiffConfig: {
      threshold: 0.1,
    },
    capture: 'viewport',
    ...options,
  }
  
  cy.matchImageSnapshot(name, defaultOptions)
})

// Export testing commands
Cypress.Commands.add('downloadFile', (buttonSelector: string, filename: string) => {
  cy.get(buttonSelector).click()
  
  // Wait for download to complete
  cy.task('checkDownloadedFile', filename).then((result: any) => {
    expect(result.exists).to.be.true
    expect(result.size).to.be.greaterThan(0)
  })
  
  return cy.wrap(filename)
})

Cypress.Commands.add('verifyDownloadedFile', (filename: string, expectedContent?: any) => {
  cy.task('checkDownloadedFile', filename).then((result: any) => {
    expect(result.exists).to.be.true
    expect(result.size).to.be.greaterThan(0)
    
    if (expectedContent) {
      cy.readFile(`cypress/downloads/${filename}`).should('deep.equal', expectedContent)
    }
  })
})

// Cleanup commands
Cypress.Commands.add('cleanupTestData', () => {
  // Clear browser data
  cy.clearLocalStorage()
  cy.clearCookies()
  cy.task('clearAllData')
  
  // Clear downloaded files
  cy.task('deleteDownloadedFile', '*')
  
  // Reset database state
  cy.task('resetDatabase')
})

// Type definitions for enhanced custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      // Enhanced authentication
      loginEnhanced(email: string, password: string): Chainable<void>
      loginWithMFA(email: string, password: string, mfaCode: string): Chainable<void>
      logoutEnhanced(): Chainable<void>
      
      // API testing
      apiRequest(method: string, url: string, options?: any): Chainable<Response>
      authenticatedRequest(method: string, url: string, options?: any): Chainable<Response>
      
      // Dashboard and UI
      waitForDashboardLoad(): Chainable<void>
      selectTimeframe(timeframe: string): Chainable<void>
      interactWithChart(chartType: string, action: string): Chainable<void>
      
      // Performance
      measurePageLoad(): Chainable<any>
      auditPerformance(thresholds?: any): Chainable<void>
      
      // Visual regression
      visualSnapshot(name: string, options?: any): Chainable<void>
      
      // Export
      downloadFile(buttonSelector: string, filename: string): Chainable<string>
      verifyDownloadedFile(filename: string, expectedContent?: any): Chainable<void>
      
      // Cleanup
      cleanupTestData(): Chainable<void>
    }
  }
}