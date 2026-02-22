# Makefile for Rekwai application

DOCKER_COMPOSE = docker compose -f docker/docker-compose.dev.yml

init-e2e:
	npm install

e2e:
	./scripts/e2e_runner.sh

# Create Docker network
create-network:
	docker network create rekwai-network

# Docling Document Processing
.PHONY: docling-start docling-stop docling-remove docling-logs docling-status docling-reset

docling-start:
	$(DOCKER_COMPOSE) up -d docling-serve

docling-stop:
	$(DOCKER_COMPOSE) down docling-serve

docling-remove:
	$(DOCKER_COMPOSE) down -v docling-serve

docling-logs:
	$(DOCKER_COMPOSE) logs docling-serve --since 1h

docling-status:
	$(DOCKER_COMPOSE) ps -a docling-serve

docling-reset: docling-remove docling-start

# Garage Object Storage
.PHONY: garage-start garage-stop garage-remove garage-logs garage-status garage-reset

garage-start:
	$(DOCKER_COMPOSE) up -d garage garage-init

garage-stop:
	$(DOCKER_COMPOSE) down garage garage-init

garage-remove:
	$(DOCKER_COMPOSE) down -v garage garage-init
	@echo "Command to execute: \"sudo rm -Rf ${PWD}/garage/data/data/ ${PWD}/garage/data/meta/\" ..."
	@echo "Continuing will execute the above command. Are you sure? [y/N]" && read ans && [ $${ans:-N} = y ]
	@sudo rm -Rf ${PWD}/garage/data/data/ ${PWD}/garage/data/meta/

garage-logs:
	$(DOCKER_COMPOSE) logs garage garage-init --since 1h

garage-status:
	$(DOCKER_COMPOSE) ps -a garage garage-init

garage-reset: garage-remove garage-start

# Common commands
status:
	$(DOCKER_COMPOSE) ps -a

logs:
	$(DOCKER_COMPOSE) logs --since 1h

# Help target
help:
	@echo "This Makefile relies on docker/docker-compose.dev.yml and a .env file."
	@echo
	@echo "Available targets:"
	@echo "  init-e2e       - Install Playwright library and its dependencies"
	@echo "  e2e            - Run E2E tests with automated setup and cleanup"
	@echo "  create-network - Create Docker network"
	@echo "  garage-start   - Start Garage"
	@echo "  garage-stop    - Stop Garage"
	@echo "  garage-remove  - Stop & remove Garage"
	@echo "  garage-logs    - Show Garage related logs (last 1h)"
	@echo "  garage-status  - Show Garage docker container status"
	@echo "  garage-reset   - Stop, remove & restart Garage"
	@echo "  docling-start  - Start Docling"
	@echo "  docling-stop   - Stop Docling"
	@echo "  docling-remove - Stop & remove Docling"
	@echo "  docling-logs   - Show Docling related logs (last 1h)"
	@echo "  docling-status - Show Docling docker container status"
	@echo "  docling-reset  - Stop, remove & restart Docling"
	@echo "  status         - Status of all services managed in this Makefile"
	@echo "  logs           - Logs of all services managed in this Makefile"
	@echo "  help           - Display this help message"

.PHONY: init-e2e e2e create-network help
