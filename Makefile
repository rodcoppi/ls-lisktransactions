# Lisk Counter Dashboard - Development Makefile
# Provides convenient commands for development workflow

.PHONY: help install dev build test clean docker docs

# Colors for output
GREEN=\033[0;32m
BLUE=\033[0;34m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

# Default target
help: ## Show this help message
	@echo "$(BLUE)Lisk Counter Dashboard - Development Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# Installation and Setup
install: ## Install dependencies and setup project
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm ci
	@echo "$(GREEN)Dependencies installed successfully!$(NC)"

setup: install ## Complete project setup including database
	@echo "$(BLUE)Setting up project...$(NC)"
	cp .env.example .env.local
	@echo "$(YELLOW)Please update .env.local with your configuration$(NC)"
	@echo "$(GREEN)Project setup complete!$(NC)"

# Development Commands
dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(NC)"
	npm run dev

dev-docker: ## Start development environment with Docker
	@echo "$(BLUE)Starting development environment with Docker...$(NC)"
	docker-compose -f docker-compose.dev.yml up --build

dev-stop: ## Stop development Docker containers
	@echo "$(BLUE)Stopping development containers...$(NC)"
	docker-compose -f docker-compose.dev.yml down

dev-logs: ## View development container logs
	docker-compose -f docker-compose.dev.yml logs -f

# Testing Commands
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	npm run test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	npm run test:watch

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npm run test:coverage

test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running E2E tests...$(NC)"
	npm run test:e2e

# Code Quality
lint: ## Run linting
	@echo "$(BLUE)Running linter...$(NC)"
	npm run lint

lint-fix: ## Fix linting issues
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	npm run lint:fix

format: ## Format code
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format

format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(NC)"
	npm run format:check

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running type checking...$(NC)"
	npm run type-check

audit: ## Run security audit
	@echo "$(BLUE)Running security audit...$(NC)"
	npm run security:audit

ci: ## Run all CI checks locally
	@echo "$(BLUE)Running CI checks...$(NC)"
	npm run ci:all

# Build Commands
build: ## Build for production
	@echo "$(BLUE)Building for production...$(NC)"
	npm run build

analyze: ## Analyze bundle size
	@echo "$(BLUE)Analyzing bundle size...$(NC)"
	npm run perf:bundle

# Docker Commands
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker build -t lisk-dashboard .

docker-run: ## Run Docker container
	@echo "$(BLUE)Running Docker container...$(NC)"
	docker run -p 3000:3000 lisk-dashboard

docker-prod: ## Start production environment with Docker
	@echo "$(BLUE)Starting production environment...$(NC)"
	docker-compose up -d --build

docker-prod-stop: ## Stop production Docker containers
	@echo "$(BLUE)Stopping production containers...$(NC)"
	docker-compose down

docker-prod-logs: ## View production container logs
	docker-compose logs -f

docker-clean: ## Clean Docker system
	@echo "$(BLUE)Cleaning Docker system...$(NC)"
	docker system prune -f
	docker volume prune -f

# Database Commands
db-setup: ## Setup database with initial schema
	@echo "$(BLUE)Setting up database...$(NC)"
	node scripts/setup-db.js

db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	npm run db:migrate

db-seed: ## Seed database with test data
	@echo "$(BLUE)Seeding database...$(NC)"
	npm run db:seed

db-reset: ## Reset database (destructive!)
	@echo "$(RED)Resetting database...$(NC)"
	@echo "$(YELLOW)This will delete all data! Press Ctrl+C to cancel, Enter to continue$(NC)"
	@read
	npm run db:reset

db-backup: ## Backup database
	@echo "$(BLUE)Backing up database...$(NC)"
	npm run db:backup

# Cache Commands
cache-clear: ## Clear application cache
	@echo "$(BLUE)Clearing cache...$(NC)"
	npm run cache:clear

# Monitoring Commands
health: ## Check application health
	@echo "$(BLUE)Checking application health...$(NC)"
	npm run health

logs: ## View application logs
	@echo "$(BLUE)Viewing logs...$(NC)"
	docker-compose logs -f app

monitoring-up: ## Start monitoring stack (Prometheus + Grafana)
	@echo "$(BLUE)Starting monitoring stack...$(NC)"
	docker-compose --profile monitoring up -d

monitoring-down: ## Stop monitoring stack
	@echo "$(BLUE)Stopping monitoring stack...$(NC)"
	docker-compose --profile monitoring down

# Development Tools
tools-up: ## Start development tools (pgAdmin, Redis Insight, etc.)
	@echo "$(BLUE)Starting development tools...$(NC)"
	docker-compose -f docker-compose.dev.yml --profile tools up -d

tools-down: ## Stop development tools
	@echo "$(BLUE)Stopping development tools...$(NC)"
	docker-compose -f docker-compose.dev.yml --profile tools down

storybook: ## Start Storybook
	@echo "$(BLUE)Starting Storybook...$(NC)"
	npm run storybook

# Utility Commands
clean: ## Clean build artifacts and dependencies
	@echo "$(BLUE)Cleaning project...$(NC)"
	npm run clean
	rm -rf node_modules/.cache
	rm -rf .next

clean-all: ## Clean everything including node_modules
	@echo "$(BLUE)Deep cleaning project...$(NC)"
	npm run clean:all
	rm -rf .env.local

update-deps: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(NC)"
	npm update
	npm audit fix

# Deployment Commands
deploy-staging: ## Deploy to staging
	@echo "$(BLUE)Deploying to staging...$(NC)"
	npm run deploy:staging

deploy-prod: ## Deploy to production
	@echo "$(BLUE)Deploying to production...$(NC)"
	npm run deploy:vercel

# Documentation
docs: ## Generate and serve documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	@echo "$(YELLOW)Documentation available in docs/ directory$(NC)"

# Quick shortcuts
start: dev ## Alias for dev
stop: dev-stop ## Alias for dev-stop
restart: dev-stop dev ## Restart development environment

# Status check
status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(NC)"
	@echo "$(GREEN)Application:$(NC)"
	@curl -f http://localhost:3000/api/health 2>/dev/null && echo "✅ Running" || echo "❌ Not running"
	@echo "$(GREEN)Database:$(NC)"
	@docker-compose ps postgres 2>/dev/null | grep -q "Up" && echo "✅ Running" || echo "❌ Not running"
	@echo "$(GREEN)Redis:$(NC)"
	@docker-compose ps redis 2>/dev/null | grep -q "Up" && echo "✅ Running" || echo "❌ Not running"

# Information
info: ## Show project information
	@echo "$(BLUE)Project Information:$(NC)"
	@echo "$(GREEN)Name:$(NC) Lisk Counter Dashboard"
	@echo "$(GREEN)Version:$(NC) $$(node -p "require('./package.json').version" 2>/dev/null || echo 'unknown')"
	@echo "$(GREEN)Node Version:$(NC) $$(node --version 2>/dev/null || echo 'not installed')"
	@echo "$(GREEN)Docker Version:$(NC) $$(docker --version 2>/dev/null | cut -d' ' -f3 | sed 's/,//' || echo 'not installed')"
	@echo "$(GREEN)URLs:$(NC)"
	@echo "  - Application: http://localhost:3000"
	@echo "  - pgAdmin: http://localhost:8080"
	@echo "  - Redis Insight: http://localhost:8001"
	@echo "  - Grafana: http://localhost:3001"
	@echo "  - Storybook: http://localhost:6006"