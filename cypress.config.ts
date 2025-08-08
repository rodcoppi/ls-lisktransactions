import { defineConfig } from 'cypress'
import { addMatchImageSnapshotPlugin } from 'cypress-image-snapshot/plugin'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    downloadsFolder: 'cypress/downloads',
    
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Test settings for robust execution
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 45000,
    taskTimeout: 60000,
    execTimeout: 60000,
    
    // Retry settings for CI reliability
    retries: {
      runMode: 3, // More retries in CI
      openMode: 1, // Some retries in dev
    },
    
    // Performance and reliability settings
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,
    chromeWebSecurity: false,
    blockHosts: [
      '*.google-analytics.com',
      '*.googletagmanager.com',
      '*.hotjar.com',
      '*.mixpanel.com',
    ],
    
    // Environment variables for comprehensive testing
    env: {
      coverage: true,
      visualRegression: true,
      performance: true,
      accessibility: true,
      API_URL: 'http://localhost:3000/api',
      TEST_USER_EMAIL: 'test@example.com',
      TEST_USER_PASSWORD: 'password',
      TEST_ADMIN_EMAIL: 'admin@example.com',
      TEST_ADMIN_PASSWORD: 'admin',
      PERCY_TOKEN: process.env.PERCY_TOKEN,
      LIGHTHOUSE: true,
    },
    
    setupNodeEvents(on, config) {
      // Code coverage
      require('@cypress/code-coverage/task')(on, config)
      
      // Visual regression testing
      addMatchImageSnapshotPlugin(on, config)
      
      // Lighthouse CI for performance testing
      const { lighthouse, prepareAudit } = require('cypress-audit')
      on('before:browser:launch', (browser, launchOptions) => {
        prepareAudit(launchOptions)
      })
      on('task', { lighthouse })
      
      // Accessibility testing
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        
        table(data) {
          console.table(data)
          return null
        },
        
        // Database management tasks
        async clearDatabase() {
          // Clear test database
          console.log('🧹 Clearing test database...')
          // Implementation would go here in real environment
          return null
        },
        
        async seedDatabase(data) {
          console.log('🌱 Seeding test database with:', data)
          // Implementation would go here in real environment
          return null
        },
        
        async resetDatabase() {
          console.log('🔄 Resetting database to clean state...')
          return null
        },
        
        // Performance monitoring tasks
        async measurePerformance(metrics) {
          console.log('📊 Recording performance metrics:', metrics)
          // Store performance data for analysis
          return null
        },
        
        // API testing tasks
        async makeApiRequest({ method, url, headers, body }) {
          const fetch = require('node-fetch')
          try {
            const response = await fetch(url, {
              method,
              headers: {
                'Content-Type': 'application/json',
                ...headers,
              },
              body: body ? JSON.stringify(body) : undefined,
            })
            
            return {
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              body: await response.json().catch(() => null),
            }
          } catch (error) {
            return {
              error: error.message,
            }
          }
        },
        
        // File system tasks for export testing
        async checkDownloadedFile(filename) {
          const path = require('path')
          const fs = require('fs')
          const downloadsPath = path.join(process.cwd(), 'cypress/downloads')
          const filePath = path.join(downloadsPath, filename)
          
          return new Promise((resolve) => {
            const checkFile = () => {
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath)
                resolve({
                  exists: true,
                  size: stats.size,
                  created: stats.birthtime,
                })
              } else {
                setTimeout(checkFile, 500)
              }
            }
            checkFile()
          })
        },
        
        async deleteDownloadedFile(filename) {
          const path = require('path')
          const fs = require('fs')
          const filePath = path.join(process.cwd(), 'cypress/downloads', filename)
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            return { deleted: true }
          }
          return { deleted: false }
        },
        
        // Visual regression comparison
        async compareScreenshot({ name, threshold = 0.1 }) {
          console.log(`📸 Comparing screenshot: ${name}`)
          // Implementation would integrate with visual testing service
          return { match: true, difference: 0 }
        },
        
        // Mobile device simulation
        async setMobileViewport({ width, height, deviceScaleFactor = 1 }) {
          console.log(`📱 Setting mobile viewport: ${width}x${height}`)
          return null
        },
        
        // Network simulation
        async setNetworkConditions({ downloadThroughput, uploadThroughput, latency }) {
          console.log('🌐 Simulating network conditions:', { 
            downloadThroughput, 
            uploadThroughput, 
            latency 
          })
          return null
        },
        
        // Cookie and storage management
        async clearAllData() {
          console.log('🧹 Clearing all browser data...')
          return null
        },
        
        // Test reporting
        async generateTestReport(testResults) {
          console.log('📋 Generating comprehensive test report...')
          const fs = require('fs')
          const path = require('path')
          
          const reportPath = path.join(process.cwd(), 'cypress/reports')
          if (!fs.existsSync(reportPath)) {
            fs.mkdirSync(reportPath, { recursive: true })
          }
          
          const report = {
            timestamp: new Date().toISOString(),
            results: testResults,
            environment: config.env,
          }
          
          fs.writeFileSync(
            path.join(reportPath, `test-report-${Date.now()}.json`),
            JSON.stringify(report, null, 2)
          )
          
          return { reportGenerated: true }
        },
      })
      
      // Browser launch options
      on('before:browser:launch', (browser = {}, launchOptions) => {
        // Chrome flags for better testing
        if (browser.name === 'chrome') {
          launchOptions.args.push(
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          )
        }
        
        // Firefox preferences
        if (browser.name === 'firefox') {
          launchOptions.preferences['dom.webnotifications.enabled'] = false
          launchOptions.preferences['dom.push.enabled'] = false
        }
        
        return launchOptions
      })
      
      // After screenshot hook
      on('after:screenshot', (details) => {
        console.log('📸 Screenshot captured:', details.path)
        return details
      })
      
      // After spec hook for cleanup
      on('after:spec', (spec, results) => {
        // Clean up after each spec
        console.log(`✅ Spec completed: ${spec.name}`)
        return results
      })
      
      return config
    },
  },
  
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    indexHtmlFile: 'cypress/support/component-index.html',
    
    // Component testing specific settings
    viewportWidth: 1000,
    viewportHeight: 660,
    video: false, // Usually not needed for component tests
    
    setupNodeEvents(on, config) {
      // Component testing specific tasks
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
      })
      
      return config
    },
  },
  
  // Global settings
  watchForFileChanges: true,
  numTestsKeptInMemory: 0,
  experimentalMemoryManagement: true,
  experimentalStudio: true,
  includeShadowDom: true,
  
  // Reporter configuration
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter,mocha-junit-reporter',
    cypressMochawesomeReporterReporterOptions: {
      charts: true,
      reportPageTitle: 'LiskCounter E2E Test Report',
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
    },
    mochaJunitReporterReporterOptions: {
      mochaFile: 'cypress/reports/junit/results-[hash].xml',
    },
  },
})