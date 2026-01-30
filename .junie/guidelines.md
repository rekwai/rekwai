# Rekwai App Developer Guidelines

**ALWAYS follow [CONTRIBUTING.md](../CONTRIBUTING.md)** for branching, commits, PRs, and issue management.

## Project Overview
Rekwai is a Requirements Management System that leverages AI for intelligent data extraction, processing, and answer generation. The system handles two primary workflows:
1. Requirements Extraction: Upload documents, extract requirements, and integrate them into a database
2. Questionnaire Processing: Process questionnaires, generate answers using RAG, and export completed questionnaires

## Project Structure
The project is organized into six main components:

### Frontend (Next.js)
- `frontend/`: Next.js application with TypeScript and React
  - `app/`: Next.js App Router structure
  - `components/`: React components (ui, layout, shared, feature-specific)
  - `lib/`: Utility functions and API interaction logic
  - `types/`: TypeScript type definitions

### Backend (FastAPI)
- `backend/`: Python application with FastAPI
  - `api/`: FastAPI routes and endpoints
  - `ai/`: AI modules for data extraction and embeddings
  - `requirements/`: Requirements management logic
  - `questionnaire/`: Questionnaire processing logic
  - `uploads/`: Storage for uploaded files

### Database (PostgreSQL)
- `db/`: Database configuration and migrations
  - `migrations/`: Flyway SQL migration files

### Garage (Object Storage)
- `garage/`: S3-compatible object storage service for file management
  - `data/`: Local storage directory for Garage data
  - No web console (CLI access only)

### Docling (Document Processing)
- `docling/`: Document processing service for AI-powered document analysis
  - Runs on port 5001
  - Handles document parsing and content extraction

### Additional folders
- `scripts/`: Automation scripts including E2E test runner
- `docs/`: Comprehensive user guides and documentation
- `cypress/`: End-to-end testing framework and tests

## Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- React
- Tailwind CSS

### Backend
- Python
- FastAPI
- SQLAlchemy ORM
- Google Gemini API for AI capabilities
- Pytest for testing

### Database
- PostgreSQL
- pgvector extension for embeddings
- Flyway for database migrations

## Running the Application

### Docker Compose (Recommended)
The entire application stack can be run using Docker Compose for easy deployment:

```bash
# Start all services (backend, frontend, database, Garage, Docling)
docker compose up

# Start services in detached mode
docker compose up -d

# Stop all services
docker compose down
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Garage S3: port 3900 (S3-compatible object storage, no web console)
- Database: localhost:5432
- Docling Service: http://localhost:5001

### Manual Setup (Development)

#### Backend
```bash
# Navigate to backend directory
cd backend

# Install dependencies (uv will automatically manage the virtual environment)
make init  # runs: uv sync

# Start the backend server
make start  # runs: uv run uvicorn main:app
# Server runs at http://localhost:8000
```

Note: The backend uses `uv` for dependency management. All commands are prefixed with `uv run` to execute within the managed environment.

### Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
# Application runs at http://localhost:3000
```

### Database
```bash
# Navigate to db directory
cd db

# Create Docker network
make create-network

# Create PostgreSQL container
make create

# Start PostgreSQL container
make start

# Run database migrations
make migrate
```

## Running Tests

### Backend Tests
Backend uses Pytest for testing. Tests can be run using:
```bash
cd backend
make test-integration
```

### Frontend Tests
Frontend uses Playwright for E2E testing:
```bash
cd frontend
npx playwright test
```

### E2E Tests
End-to-end tests using Cypress can be run from the project root:
```bash
make e2e
```

## Best Practices

### Code Organization
- Keep components modular and focused on a single responsibility
- Use TypeScript types for all frontend data structures
- Follow the established directory structure for new features

### API Communication
- Use the centralized API modules in `frontend/lib/api/`
- Define TypeScript types for API request payloads and responses
- Handle errors consistently using the provided error handling mechanisms

### State Management
- Use local component state for simple state
- Use custom hooks for reusable state logic
- Use React Context for global state when necessary

### Testing
- Write E2E tests for critical user flows
- Test edge cases and error handling
- Keep tests independent and idempotent

### Git Workflow
- Create feature branches for new features
- Write descriptive commit messages
- Keep pull requests focused on a single feature or fix

## Documentation
For more detailed information, refer to:
- Root README.md: Overview of the entire project
- frontend/README.md: Detailed frontend documentation
- backend/README.md: Detailed backend documentation
- docs/: Comprehensive user guides and documentation
  - installation.md: Installation and setup instructions
  - overview.md: System overview and features
  - product.md: Product documentation
  - queries.md: Query system documentation
  - requirements.md: Requirements management documentation

