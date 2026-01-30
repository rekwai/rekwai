
init:
	uv sync

# Start the backend server
# Usage: make start [DATABASE_URL=postgresql://user:pass@host:port/db] [PORT=8000]
# Default PORT is 8000 if not specified
# DATABASE_URL should be set via environment variable if needed
PORT ?= 8000
start:
	uv run uvicorn main:app --host 0.0.0.0 --port $(PORT)

test-integration:
	uv run pytest tests/test_product_api.py tests/test_requirements_crud.py -v -s

build-docker:
	docker build -t backend .