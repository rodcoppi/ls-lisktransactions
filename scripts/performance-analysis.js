#!/usr/bin/env node

// Performance analysis and bundle optimization script
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance budgets (in bytes)
const PERFORMANCE_BUDGETS = {
  TOTAL_JS: 200 * 1024, // 200KB
  TOTAL_CSS: 50 * 1024,  // 50KB
  FIRST_PARTY_JS: 150 * 1024, // 150KB
  THIRD_PARTY_JS: 50 * 1024,  // 50KB
  IMAGES: 500 * 1024, // 500KB per page
  TOTAL_PAGE_SIZE: 2 * 1024 * 1024, // 2MB
  LIGHTHOUSE_PERFORMANCE: 90, // Lighthouse score
  LIGHTHOUSE_ACCESSIBILITY: 95,
  LIGHTHOUSE_BEST_PRACTICES: 90,
  LIGHTHOUSE_SEO: 95,
};

class PerformanceAnalyzer {
  constructor() {
    this.buildDir = path.join(process.cwd(), '.next');
    this.outputDir = path.join(process.cwd(), 'performance');
    this.reportFile = path.join(this.outputDir, 'performance-report.json');
    this.budgetViolations = [];
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Analyze bundle sizes
  async analyzeBundleSize() {
    console.log('🔍 Analyzing bundle sizes...');
    
    const staticDir = path.join(this.buildDir, 'static');
    const chunkDir = path.join(staticDir, 'chunks');
    const cssDir = path.join(staticDir, 'css');
    
    const analysis = {
      timestamp: new Date().toISOString(),
      javascript: {
        chunks: [],
        totalSize: 0,
        firstPartySize: 0,
        thirdPartySize: 0,
      },
      css: {
        files: [],
        totalSize: 0,
      },
      pages: {},
      violations: [],
    };

    // Analyze JavaScript chunks
    if (fs.existsSync(chunkDir)) {
      const chunkFiles = fs.readdirSync(chunkDir)
        .filter(file => file.endsWith('.js'))
        .map(file => {
          const filePath = path.join(chunkDir, file);
          const stats = fs.statSync(filePath);
          const isThirdParty = this.isThirdPartyChunk(file);
          
          return {
            name: file,
            size: stats.size,
            sizeHuman: this.formatBytes(stats.size),
            isThirdParty,
            type: this.getChunkType(file),
          };
        });

      analysis.javascript.chunks = chunkFiles.sort((a, b) => b.size - a.size);
      analysis.javascript.totalSize = chunkFiles.reduce((sum, chunk) => sum + chunk.size, 0);
      analysis.javascript.firstPartySize = chunkFiles
        .filter(chunk => !chunk.isThirdParty)
        .reduce((sum, chunk) => sum + chunk.size, 0);
      analysis.javascript.thirdPartySize = chunkFiles
        .filter(chunk => chunk.isThirdParty)
        .reduce((sum, chunk) => sum + chunk.size, 0);
    }

    // Analyze CSS files
    if (fs.existsSync(cssDir)) {
      const cssFiles = fs.readdirSync(cssDir)
        .filter(file => file.endsWith('.css'))
        .map(file => {
          const filePath = path.join(cssDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            name: file,
            size: stats.size,
            sizeHuman: this.formatBytes(stats.size),
          };
        });

      analysis.css.files = cssFiles.sort((a, b) => b.size - a.size);
      analysis.css.totalSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
    }

    // Check budget violations
    this.checkBudgetViolations(analysis);
    
    return analysis;
  }

  // Analyze page-specific bundles
  async analyzePages() {
    console.log('📄 Analyzing page-specific bundles...');
    
    const pagesManifest = path.join(this.buildDir, 'server', 'pages-manifest.json');
    const buildManifest = path.join(this.buildDir, 'build-manifest.json');
    
    const pageAnalysis = {};
    
    if (fs.existsSync(buildManifest)) {
      const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
      
      for (const [route, files] of Object.entries(manifest.pages)) {
        const jsFiles = files.filter(file => file.endsWith('.js'));
        const cssFiles = files.filter(file => file.endsWith('.css'));
        
        let totalSize = 0;
        let jsSize = 0;
        let cssSize = 0;
        
        // Calculate file sizes
        jsFiles.forEach(file => {
          const filePath = path.join(this.buildDir, 'static', file.replace('/_next/static/', ''));
          if (fs.existsSync(filePath)) {
            const size = fs.statSync(filePath).size;
            jsSize += size;
            totalSize += size;
          }
        });
        
        cssFiles.forEach(file => {
          const filePath = path.join(this.buildDir, 'static', file.replace('/_next/static/', ''));
          if (fs.existsSync(filePath)) {
            const size = fs.statSync(filePath).size;
            cssSize += size;
            totalSize += size;
          }
        });
        
        pageAnalysis[route] = {
          jsFiles,
          cssFiles,
          jsSize,
          cssSize,
          totalSize,
          jsSizeHuman: this.formatBytes(jsSize),
          cssSizeHuman: this.formatBytes(cssSize),
          totalSizeHuman: this.formatBytes(totalSize),
        };
      }
    }
    
    return pageAnalysis;
  }

  // Run Lighthouse analysis
  async runLighthouseAnalysis() {
    console.log('🚦 Running Lighthouse analysis...');
    
    try {
      // Check if lighthouse is installed
      execSync('lighthouse --version', { stdio: 'ignore' });
    } catch (error) {
      console.warn('⚠️  Lighthouse not installed. Install with: npm install -g lighthouse');
      return null;
    }

    const urls = [
      'http://localhost:3000',
      'http://localhost:3000/dashboard',
      // Add more URLs as needed
    ];

    const lighthouseResults = {};

    for (const url of urls) {
      try {
        console.log(`Running Lighthouse for ${url}...`);
        
        const outputFile = path.join(this.outputDir, `lighthouse-${url.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
        
        execSync(
          `lighthouse ${url} --output=json --output-path=${outputFile} --chrome-flags="--headless" --quiet`,
          { stdio: 'ignore' }
        );

        if (fs.existsSync(outputFile)) {
          const result = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
          
          lighthouseResults[url] = {
            performance: Math.round(result.lhr.categories.performance.score * 100),
            accessibility: Math.round(result.lhr.categories.accessibility.score * 100),
            bestPractices: Math.round(result.lhr.categories['best-practices'].score * 100),
            seo: Math.round(result.lhr.categories.seo.score * 100),
            metrics: {
              fcp: result.lhr.audits['first-contentful-paint'].numericValue,
              lcp: result.lhr.audits['largest-contentful-paint'].numericValue,
              cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
              fid: result.lhr.audits['max-potential-fid'] ? result.lhr.audits['max-potential-fid'].numericValue : null,
              ttfb: result.lhr.audits['server-response-time'] ? result.lhr.audits['server-response-time'].numericValue : null,
            },
          };

          // Check Lighthouse budget violations
          this.checkLighthouseBudgetViolations(url, lighthouseResults[url]);
        }
      } catch (error) {
        console.warn(`Failed to run Lighthouse for ${url}:`, error.message);
      }
    }

    return lighthouseResults;
  }

  // Analyze duplicate dependencies
  analyzeDuplicates() {
    console.log('🔍 Analyzing duplicate dependencies...');
    
    const packageLock = path.join(process.cwd(), 'package-lock.json');
    
    if (!fs.existsSync(packageLock)) {
      console.warn('package-lock.json not found');
      return {};
    }
    
    const lockData = JSON.parse(fs.readFileSync(packageLock, 'utf8'));
    const duplicates = {};
    
    function findDuplicates(dependencies, currentPath = '') {
      for (const [name, info] of Object.entries(dependencies || {})) {
        const version = info.version;
        const fullPath = currentPath ? `${currentPath} > ${name}` : name;
        
        if (!duplicates[name]) {
          duplicates[name] = {};
        }
        
        if (!duplicates[name][version]) {
          duplicates[name][version] = [];
        }
        
        duplicates[name][version].push(fullPath);
        
        if (info.dependencies) {
          findDuplicates(info.dependencies, fullPath);
        }
      }
    }
    
    findDuplicates(lockData.dependencies);
    
    // Filter to only show actual duplicates
    const actualDuplicates = {};
    for (const [name, versions] of Object.entries(duplicates)) {
      const versionCount = Object.keys(versions).length;
      if (versionCount > 1) {
        actualDuplicates[name] = versions;
      }
    }
    
    return actualDuplicates;
  }

  // Check budget violations
  checkBudgetViolations(analysis) {
    const violations = [];
    
    if (analysis.javascript.totalSize > PERFORMANCE_BUDGETS.TOTAL_JS) {
      violations.push({
        type: 'javascript',
        metric: 'Total JavaScript size',
        actual: analysis.javascript.totalSize,
        actualHuman: this.formatBytes(analysis.javascript.totalSize),
        budget: PERFORMANCE_BUDGETS.TOTAL_JS,
        budgetHuman: this.formatBytes(PERFORMANCE_BUDGETS.TOTAL_JS),
        severity: 'error',
      });
    }
    
    if (analysis.javascript.firstPartySize > PERFORMANCE_BUDGETS.FIRST_PARTY_JS) {
      violations.push({
        type: 'javascript',
        metric: 'First-party JavaScript size',
        actual: analysis.javascript.firstPartySize,
        actualHuman: this.formatBytes(analysis.javascript.firstPartySize),
        budget: PERFORMANCE_BUDGETS.FIRST_PARTY_JS,
        budgetHuman: this.formatBytes(PERFORMANCE_BUDGETS.FIRST_PARTY_JS),
        severity: 'warning',
      });
    }
    
    if (analysis.css.totalSize > PERFORMANCE_BUDGETS.TOTAL_CSS) {
      violations.push({
        type: 'css',
        metric: 'Total CSS size',
        actual: analysis.css.totalSize,
        actualHuman: this.formatBytes(analysis.css.totalSize),
        budget: PERFORMANCE_BUDGETS.TOTAL_CSS,
        budgetHuman: this.formatBytes(PERFORMANCE_BUDGETS.TOTAL_CSS),
        severity: 'warning',
      });
    }
    
    analysis.violations = violations;
    this.budgetViolations.push(...violations);
  }

  // Check Lighthouse budget violations
  checkLighthouseBudgetViolations(url, results) {
    const violations = [];
    
    if (results.performance < PERFORMANCE_BUDGETS.LIGHTHOUSE_PERFORMANCE) {
      violations.push({
        type: 'lighthouse',
        url,
        metric: 'Performance score',
        actual: results.performance,
        budget: PERFORMANCE_BUDGETS.LIGHTHOUSE_PERFORMANCE,
        severity: 'error',
      });
    }
    
    if (results.accessibility < PERFORMANCE_BUDGETS.LIGHTHOUSE_ACCESSIBILITY) {
      violations.push({
        type: 'lighthouse',
        url,
        metric: 'Accessibility score',
        actual: results.accessibility,
        budget: PERFORMANCE_BUDGETS.LIGHTHOUSE_ACCESSIBILITY,
        severity: 'warning',
      });
    }
    
    this.budgetViolations.push(...violations);
  }

  // Generate optimization recommendations
  generateRecommendations(bundleAnalysis, pageAnalysis, duplicates) {
    const recommendations = [];
    
    // Large bundle recommendations
    const largeChunks = bundleAnalysis.javascript.chunks
      .filter(chunk => chunk.size > 50 * 1024) // > 50KB
      .slice(0, 5);
    
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'bundle-optimization',
        priority: 'high',
        title: 'Large JavaScript chunks detected',
        description: `Found ${largeChunks.length} chunks larger than 50KB`,
        chunks: largeChunks.map(chunk => `${chunk.name} (${chunk.sizeHuman})`),
        actions: [
          'Consider code splitting these chunks',
          'Use dynamic imports for non-critical code',
          'Implement route-based splitting',
        ],
      });
    }
    
    // Duplicate dependency recommendations
    const duplicateCount = Object.keys(duplicates).length;
    if (duplicateCount > 0) {
      recommendations.push({
        type: 'dependency-optimization',
        priority: 'medium',
        title: 'Duplicate dependencies detected',
        description: `Found ${duplicateCount} packages with multiple versions`,
        duplicates: Object.keys(duplicates).slice(0, 10),
        actions: [
          'Update dependencies to use consistent versions',
          'Use resolutions in package.json to force single versions',
          'Consider using pnpm for better deduplication',
        ],
      });
    }
    
    // Page-specific recommendations
    const largePagesEntries = Object.entries(pageAnalysis)
      .filter(([_, analysis]) => analysis.totalSize > 100 * 1024) // > 100KB
      .slice(0, 3);
    
    if (largePagesEntries.length > 0) {
      recommendations.push({
        type: 'page-optimization',
        priority: 'medium',
        title: 'Large page bundles detected',
        description: `Found ${largePagesEntries.length} pages with bundles larger than 100KB`,
        pages: largePagesEntries.map(([route, analysis]) => `${route} (${analysis.totalSizeHuman})`),
        actions: [
          'Implement lazy loading for non-critical components',
          'Split page components into smaller chunks',
          'Use dynamic imports for heavy features',
        ],
      });
    }
    
    // CSS recommendations
    if (bundleAnalysis.css.totalSize > PERFORMANCE_BUDGETS.TOTAL_CSS * 0.8) {
      recommendations.push({
        type: 'css-optimization',
        priority: 'low',
        title: 'CSS bundle approaching size limit',
        description: `Total CSS size is ${this.formatBytes(bundleAnalysis.css.totalSize)}`,
        actions: [
          'Remove unused CSS with PurgeCSS',
          'Implement critical CSS inlining',
          'Consider CSS-in-JS for component-specific styles',
        ],
      });
    }
    
    return recommendations;
  }

  // Generate comprehensive report
  async generateReport() {
    console.log('📊 Generating performance report...');
    
    const bundleAnalysis = await this.analyzeBundleSize();
    const pageAnalysis = await this.analyzePages();
    const duplicates = this.analyzeDuplicates();
    const lighthouseResults = await this.runLighthouseAnalysis();
    const recommendations = this.generateRecommendations(bundleAnalysis, pageAnalysis, duplicates);
    
    const report = {
      generated: new Date().toISOString(),
      summary: {
        totalJavaScriptSize: this.formatBytes(bundleAnalysis.javascript.totalSize),
        totalCSSSize: this.formatBytes(bundleAnalysis.css.totalSize),
        budgetViolations: this.budgetViolations.length,
        duplicateDependencies: Object.keys(duplicates).length,
        recommendations: recommendations.length,
      },
      bundleAnalysis,
      pageAnalysis,
      duplicateDependencies: duplicates,
      lighthouseResults,
      recommendations,
      budgetViolations: this.budgetViolations,
      budgets: PERFORMANCE_BUDGETS,
    };
    
    // Save report
    fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
    console.log(`📝 Performance report saved to: ${this.reportFile}`);
    
    // Generate summary
    this.printSummary(report);
    
    return report;
  }

  // Print summary to console
  printSummary(report) {
    console.log('\n🏆 Performance Analysis Summary');
    console.log('=' .repeat(50));
    
    console.log(`\n📦 Bundle Sizes:`);
    console.log(`  JavaScript: ${report.summary.totalJavaScriptSize}`);
    console.log(`  CSS: ${report.summary.totalCSSSize}`);
    
    if (report.lighthouseResults) {
      console.log(`\n🚦 Lighthouse Scores:`);
      for (const [url, results] of Object.entries(report.lighthouseResults)) {
        console.log(`  ${url}:`);
        console.log(`    Performance: ${results.performance}/100`);
        console.log(`    Accessibility: ${results.accessibility}/100`);
        console.log(`    Best Practices: ${results.bestPractices}/100`);
        console.log(`    SEO: ${results.seo}/100`);
      }
    }
    
    if (this.budgetViolations.length > 0) {
      console.log(`\n❌ Budget Violations (${this.budgetViolations.length}):`);
      this.budgetViolations.forEach(violation => {
        const severity = violation.severity === 'error' ? '🔴' : '⚠️ ';
        console.log(`  ${severity} ${violation.metric}: ${violation.actualHuman || violation.actual} (budget: ${violation.budgetHuman || violation.budget})`);
      });
    } else {
      console.log(`\n✅ All performance budgets passed!`);
    }
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Top Recommendations:`);
      report.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.title}`);
        console.log(`     ${rec.description}`);
      });
    }
    
    console.log(`\nFull report: ${this.reportFile}`);
  }

  // Helper methods
  isThirdPartyChunk(filename) {
    // Detect third-party chunks based on common patterns
    return filename.includes('vendor') || 
           filename.includes('node_modules') ||
           /^[0-9]+\./.test(filename); // Numbered chunks are usually third-party
  }

  getChunkType(filename) {
    if (filename.includes('framework')) return 'framework';
    if (filename.includes('main')) return 'main';
    if (filename.includes('runtime')) return 'runtime';
    if (filename.includes('vendor')) return 'vendor';
    if (/^pages\//.test(filename)) return 'page';
    if (/^[0-9]+\./.test(filename)) return 'async';
    return 'unknown';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface
async function main() {
  const analyzer = new PerformanceAnalyzer();
  
  try {
    await analyzer.generateReport();
    
    // Exit with error code if there are budget violations
    if (analyzer.budgetViolations.some(v => v.severity === 'error')) {
      console.log('\n❌ Performance analysis failed due to budget violations');
      process.exit(1);
    }
    
    console.log('\n✅ Performance analysis completed successfully');
  } catch (error) {
    console.error('❌ Performance analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceAnalyzer;