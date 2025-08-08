# Load Testing Quick Start Guide

This guide will help you get started with the LiskCounter load testing
infrastructure quickly and efficiently.

## Prerequisites

Before running load tests, ensure you have:

- Node.js 18+ installed
- Docker and Docker Compose
- K6 installed globally: `brew install k6` (macOS) or `sudo apt install k6`
  (Ubuntu)
- Artillery installed globally: `npm install -g artillery`

## Quick Setup

1. **Start the monitoring stack**:

   ```bash
   npm run load-test:monitor
   ```

2. **Run your first load test**:

   ```bash
   npm run load-test:basic
   ```

3. **View results**:
   - Reports: `./load-tests/reports/`
   - Grafana Dashboard: http://localhost:3001 (admin/admin)
   - Prometheus Metrics: http://localhost:9090

## Common Load Test Commands

### Basic Testing

```bash
# Smoke test - verify system is working
npm run load-test:basic

# API stress test - 10k+ concurrent users
npm run load-test:api

# Progressive load - gradual user increase
npm run load-test:progressive
```

### Specialized Testing

```bash
# WebSocket real-time connections
npm run load-test:websocket

# Database performance under load
npm run load-test:database

# Long-running endurance test
npm run load-test:endurance
```

### Comprehensive Testing

```bash
# Run all tests in sequence
npm run load-test:comprehensive

# Docker-based testing with monitoring
npm run load-test:docker
```

## Understanding Test Results

### Key Metrics to Watch

- **Response Time P95**: Should be < 200ms
- **Database P95**: Should be < 50ms
- **Cache Hit Rate**: Should be > 90%
- **Error Rate**: Should be < 1%
- **WebSocket Latency P99**: Should be < 100ms

### Where to Find Results

- **HTML Reports**: `./load-tests/reports/html/`
- **JSON Data**: `./load-tests/reports/json/`
- **Grafana**: Real-time dashboards at http://localhost:3001
- **Logs**: `./load-tests/reports/logs/`

## Troubleshooting Common Issues

### Test Fails to Start

1. Check if application is running: `curl http://localhost:3000/api/health`
2. Verify Docker containers: `docker ps`
3. Check logs: `docker-compose -f docker-compose.loadtest.yml logs`

### High Error Rates

1. Scale down concurrent users in test configuration
2. Check database connection limits
3. Monitor Redis memory usage
4. Review application logs for errors

### Timeouts

1. Increase timeout values in test configs
2. Check network connectivity
3. Verify system resources (CPU, memory)

### Poor Performance

1. Check if monitoring tools are consuming resources
2. Verify test environment matches production specs
3. Review database query performance
4. Check for memory leaks or resource exhaustion

## Next Steps

1. **Review full documentation**: See `./load-tests/docs/OPERATIONAL_GUIDE.md`
2. **Customize tests**: Edit configurations in `./load-tests/k6/config.js`
3. **Set up CI/CD**: Use the GitHub Actions workflow in
   `.github/workflows/load-testing.yml`
4. **Scale testing**: Use Docker Swarm or Kubernetes for distributed testing

## Quick Reference

### Test Types

- `smoke`: Basic functionality test (50 users)
- `api_stress`: API endpoint stress test (10k users)
- `progressive_load`: Gradual load increase (1-15k users)
- `websocket_realtime`: WebSocket connections (10k connections)
- `database_performance`: Database load test
- `endurance_stability`: 24-hour stability test

### Environment Variables

```bash
export LOAD_TEST_TARGET_URL=http://localhost:3000
export LOAD_TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/db
export LOAD_TEST_REDIS_URL=redis://localhost:6379
```

### Support

- Documentation: `./load-tests/docs/`
- Issues: Check logs in `./load-tests/reports/logs/`
- Monitoring: Grafana dashboards for real-time insights
