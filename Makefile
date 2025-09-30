# E-commerce Microservices Makefile

.PHONY: help install dev test docker-up docker-down clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install
	npm run frontend:install

dev: ## Start all services in development mode
	npm run dev

docker-up: ## Start all services with Docker Compose
	docker-compose -f docker-compose.dev.yml up -d

docker-down: ## Stop all Docker services
	docker-compose -f docker-compose.dev.yml down

docker-logs: ## View Docker logs
	docker-compose -f docker-compose.dev.yml logs -f

test: ## Run tests
	npm test

test-local: ## Run comprehensive local testing
	./scripts/test-local.sh

lint: ## Run linting
	npm run lint

lint-fix: ## Fix linting issues
	npm run lint:fix

clean: ## Clean up Docker resources
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

health: ## Check service health
	npm run health:check

frontend: ## Start frontend only
	npm run frontend:dev

full: ## Start full stack (backend + frontend)
	npm run dev:full

aws-deploy: ## Deploy to AWS
	./scripts/deploy-aws.sh all

k8s-deploy: ## Deploy to Kubernetes
	npm run k8s:deploy

setup: install docker-up ## Complete setup (install + docker up)
	@echo "Setup complete! Services starting..."
	@sleep 10
	@make health