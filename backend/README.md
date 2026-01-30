# Backend

FastAPI Python application for requirements and questionnaire management.

## Setup

```bash
# Install dependencies
make init
```

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://rekwai:rekwai@localhost:5432/rekwai

# Google Gemini API Configuration
GOOGLE_API_KEY=your_google_api_key_here

# Docling Service Configuration (for document processing)
DOCLING_HOST=localhost
DOCLING_PORT=5001

# S3/Garage Configuration (for file storage)
S3_URL=localhost
S3_PORT=3900
S3_ACCESS_KEY=GK1234567890abcdef
S3_SECRET_KEY=changeme123456

# Optional configuration

LOG_LEVEL=INFO                            # Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) (default: INFO)
```

## Run

```bash
# Start the backend server
make start

# Server runs at http://localhost:8000
```

## Project Structure

The backend is organized into the following modules:

- `ai/`: AI-related functionality including external AI API interactions and markdown extraction
- `auth/`: Authentication middlewares
- `organization/`: Organization management
- `product/`: Product-related functionalities
- `questionnaire/`: Questionnaire processing logic with extraction, comparison, and answer generation
- `requirements/`: Requirements management with extraction, validation, and processing capabilities
- `tests/`: Test files and utilities for backend functionality testing
