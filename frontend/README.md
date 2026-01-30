# Frontend

Next.js React application for the Rekwai user interface.

## Setup

```bash
# Install dependencies
make install
```

## Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```bash
# Backend Service Configuration (server-side only)
BACKEND_SERVICE_URL=http://localhost:8000

# User Authentication Configuration
USERS=[{"username":"admin","password":"admin"}]
```

**Note**: The backend service configuration is exposed to the browser through the `/frontend-api/config` endpoint. This is a server-side environment variable and not exposed directly to the client. If not set, it defaults to `http://localhost:8000`.

## Run

```bash
# Start development server
npm run dev

# Application runs at http://localhost:3000
```
