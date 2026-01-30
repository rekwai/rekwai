# Next.js application management Makefile

# Variables
NODE_ENV ?= development
PORT ?= 3000

.PHONY: install start dev build clean help

# Install dependencies
install:
	@echo "Installing dependencies..."
	@npm install

# Start the production server
start:
	@echo "Starting Next.js production server..."
	@NODE_ENV=production npm start

# Start the development server
dev:
	@echo "Starting Next.js development server..."
	@NODE_ENV=$(NODE_ENV) PORT=$(PORT) npm run dev

# Build the application
build:
	@echo "Building Next.js application..."
	@NODE_ENV=production npm run build

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf .next
	@rm -rf node_modules
	@rm -rf out

build-docker:
	docker build -t frontend .

# Help target
help:
	@echo "Available targets:"
	@echo "  install - Install dependencies"
	@echo "  start   - Start the production server"
	@echo "  dev     - Start the development server (default port: 3000)"
	@echo "  build   - Build the application for production"
	@echo "  clean   - Remove build artifacts and dependencies"
	@echo "  help    - Show this help message"
	@echo ""
	@echo "Environment variables:"
	@echo "  NODE_ENV - Set to 'development' or 'production' (default: development)"
	@echo "  PORT     - Set the port for the development server (default: 3000)" 