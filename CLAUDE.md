# CLAUDE.md

Development guidelines for Claude Code when working with this repository.

**ALWAYS follow [CONTRIBUTING.md](CONTRIBUTING.md)** for branching, commits, PRs, and issue management.

## Development Workflow

### Critical: Don't Guess
- **NEVER assume or guess the project structure** - always read files to verify paths and organization
- **NEVER assume or guess Docker configuration** - always read `docker-compose.yml` and Dockerfiles to understand services, ports, and volumes
- **NEVER assume environment variables or configuration** - always check `.env.example` or config files
- When in doubt, read the actual files rather than making assumptions based on conventions

### Testing Policy
- **NEVER run tests unless explicitly asked** - do not proactively run tests after making changes
- Only run tests when the user specifically requests it

## Key Architecture Guidelines

### Backend Package Management
- **ALWAYS use `uv` for all backend Python operations** (NOT direct `.venv/bin/python`)
- Virtual environment is in `.venv/` but managed by `uv`
- Run tests with: `uv run pytest` (NOT `.venv/bin/python -m pytest`)
- Run backend with: `uv run uvicorn main:app`
- **NEVER manually edit `pyproject.toml`** - use `uv add` / `uv remove` for dependencies

### Frontend Package Management
- **NEVER manually edit `package.json`** - use `npm install` / `npm uninstall` for dependencies

### File Operations
- **"File has not been read yet" errors**: If you get this error when using Edit/Write tools, simply re-read the file and retry the operation. Don't fight the errors - just read first.
- **Lost or unsure of location?**: Use `pwd` to check your current directory. The working directory changes as you execute commands - don't panic, just check where you are.

## Development Commands

### Quick Start (Docker Compose - Recommended)
```bash
# Build and start all services (ALWAYS build after code changes)
docker compose up --build

# Detached mode
docker compose up --build -d

# Stop services
docker compose down
```

Services available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Database: localhost:5432
- Docling: http://localhost:5001
- Garage (S3): port 3900 (no web console)

### Frontend Development
```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run lint       # ESLint checks
```

### Backend Development
```bash
cd backend
make init          # Install deps (or: uv sync)
make start         # Start server (or: uv run uvicorn main:app)
make test-integration  # Run tests
```

## Testing

### E2E Testing (Playwright)
```bash
make e2e                              # Run all tests (auto setup)
npx playwright test e2e/product.spec.ts  # Specific test
npx playwright test --ui              # Debug mode
```

**Test Guidelines**:
- Always use `data-testid` attributes (kebab-case)
- Tests run against http://localhost:3001
- Debugging: look at the screenshot of the test failure at test-results/ and Use Playwright MCP tools to interact with the browser directly
- Clean state via helper functions (e.g., `cleanupProducts()`)

### Backend Testing
```bash
cd backend
uv run pytest tests/test_file.py -v  # Run specific test file
uv run pytest tests/ -v              # Run all tests
make test-integration                # Run integration tests via Makefile
```

## Code Best Practices

### Test-Driven Development (TDD)
**Follow the Red-Green-Refactor cycle for all new features:**

1. **RED**: Write a failing test first
   - Write the test that defines the desired behavior
   - Run the test and confirm it fails (red)
   - This ensures the test is actually testing something

2. **GREEN**: Write minimal code to make the test pass
   - Implement just enough code to pass the test
   - Run the test and confirm it passes (green)
   - Don't worry about perfection yet

3. **REFACTOR**: Clean up the code
   - Improve code quality while keeping tests green
   - Remove duplication, improve naming, simplify logic
   - Run tests after each refactor to ensure nothing breaks

**Fail Fast, Fail Hard Philosophy:**
- **NO mocking**: Use real implementations and dependencies
- **NO defaults**: Require explicit values, don't assume (use `.env` files where configuration is needed)
- **NO fallbacks**: If something fails, let it fail loudly
- **Explicit errors**: Raise clear exceptions immediately when assumptions are violated
- This approach surfaces issues early in development, not in production

### Component Development
- Modular components with single responsibility
- TypeScript types for all data structures
- Follow established directory patterns

### API Communication
- Use centralized API modules in `frontend/lib/api/`
- Define TypeScript types for requests/responses
- Consistent error handling

### State Management
- Local state for simple cases
- Custom hooks for reusable logic
- React Context for global state (when necessary)

### Testing Requirements
- E2E tests for critical user flows
- Test edge cases and error handling
- Independent, idempotent tests

### Git Workflow
- **Pre-commit hooks**: If commit fails due to pre-commit hook changes:
  - Add the modified files: `git add <files>`
  - Create a NEW commit (do NOT amend - there's nothing to amend to since the commit failed)
- **Before committing**: Verify if user documentation needs updating:
  - Check `docs/` for affected workflows
  - Update relevant docs if user-facing behavior changed

### GitHub Issues
- **When creating issues**: Describe the problem and provide technical context
- **Do NOT propose solutions**: Focus on facts, current behavior, and goals
- **Investigation first**: Always investigate the codebase before creating an issue
- Include relevant file paths, code references, and performance metrics

