# Contributing to Rekwai App

This document explains how to contribute to the Rekwai Application.

## Getting Started

- For a high-level overview of the system, see [docs/overview.md](docs/overview.md).
- For installation and setup, see [docs/installation.md](docs/installation.md).
- Each component has its own README with detailed commands: [backend](backend/README.md), [frontend](frontend/README.md), [db](db/README.md), [garage](garage/README.md), [docling](docling/README.md), [playwright](playwright/README.md).

Additional development prerequisites (beyond what's in the installation guide):
- Node.js (for frontend development)
- Python 3.11+ (for backend development)

## Contributing Guidelines

### Contributor License Agreement (CLA)

Before contributing to this project, you must sign our Contributor License Agreement. This ensures we can accept your contributions while protecting both the project and contributors.

**How to sign:**
1. Submit your pull request
2. The CLA Assistant will automatically comment asking you to sign
3. Reply to the comment with: `I have read the CLA Document and I hereby sign the CLA`
4. Your signature will be recorded automatically

For full CLA details, see [CLA.md](CLA.md).

### Branching Strategy

We use GitHub Flow with release tags.

- `main` is always the source of truth and should stay deployable
- Create short-lived branches off `main` for all work
- Branch naming: `<issue-number>-<short-description>` (e.g. `42-fix-upload-timeout`)
- Merge back into `main` via pull request
- Releases are tagged from `main` when ready (e.g. `v1.0.0`) using [SemVer](https://semver.org/)
- Hotfixes branch off the release tag, merge into `main`, and get a patch release tag

### Release Process

We follow [SemVer](https://semver.org/) (`MAJOR.MINOR.PATCH`). Version numbers are determined automatically by [semantic-release](https://github.com/semantic-release/semantic-release) based on [Conventional Commits](https://www.conventionalcommits.org/).

Releases are the **only** way Docker images get published to `ghcr.io`.

**Flow:**

1. PRs merge into `main` using conventional commit messages (`feat:`, `fix:`, `BREAKING CHANGE:`)
2. When ready to release, trigger the release workflow manually via GitHub Actions
3. `semantic-release` analyzes commits since the last tag and determines the next version
4. A GitHub Release is created, CI builds and pushes Docker images tagged: `v1.2.3`, `v1.2`, `v1`, `latest`

**Rules:**

- Docker images are only published by CI on release — never pushed manually
- SemVer tags are immutable — never overwrite an existing version tag

### Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) to drive automated versioning. Commit messages must follow the format:

```
<type>(optional scope): <description>

[optional body]

[optional footer(s)]
```

**Types and their SemVer impact:**

| Type | SemVer | Example |
|------|--------|---------|
| `fix:` | PATCH | `fix(api): handle null response from docling` |
| `feat:` | MINOR | `feat(products): add bulk import` |
| `feat!:` / `BREAKING CHANGE:` | MAJOR | `feat!: restructure API response format` |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `style:`, `perf:`, `build:` | none | `docs: update installation guide` |

**Rules:**

- One logical change per commit — don't bundle unrelated changes
- Subject line ≤ 72 characters, imperative mood (e.g. "add" not "added")
- Use the body to explain *why*, not *what* — the diff shows what changed
- Always mark breaking changes explicitly with `!` or a `BREAKING CHANGE:` footer

**Pre-commit hooks** run automatically on every commit via [pre-commit](https://pre-commit.com/):

- **Commit message:** commitlint (enforces Conventional Commits format)
- **Backend:** ruff (lint + fix), ruff-format
- **Frontend:** eslint, prettier, knip (dead code detection)

Setup (run once after cloning):
```bash
pre-commit install
pre-commit install --hook-type commit-msg
```

If a hook modifies files, stage the changes and commit again.

### Branch Protection

The `main` branch is protected with the following rules:

- Pull request required (no direct pushes)
- At least 1 approving review
- All CI status checks must pass: `commitlint`, `backend-lint`, `frontend-lint`
- CLA must be signed (`CLAssistant`)
- Branch must be up-to-date with `main` before merging

### Pull Requests

- Keep PRs focused — one logical change per PR
- Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) (summary + related issue)
- Link the issue with `Closes #N` so it auto-closes on merge

### Issue Management

Use [issue templates](.github/ISSUE_TEMPLATE/) when creating issues: **Bug Report**, **Feature Request**, or **Task**.

**Labels:**

| Label | Purpose |
|-------|---------|
| `good first issue` | Suitable for new contributors |
| `help wanted` | Open for community contributions |
| `duplicate` | Already reported |
| `wontfix` | Intentionally not addressing |

**Workflow:**

1. Check for existing issues before opening a new one
2. Use the appropriate issue template
3. Link PRs to issues with `Closes #N` in the PR description
4. Use milestones to group issues by release when applicable

### Documentation

We maintain two types of documentation:

- **User-facing docs** (`docs/`) — installation, features, workflows. Update when user-facing behavior changes.
- **Component READMEs** (`backend/`, `frontend/`, `db/`, `garage/`) — setup commands, configuration, component-specific details. Update when the development setup changes.

**When to update docs:**

- New feature or changed behavior → update `docs/`
- New or changed dev commands, dependencies, or config → update the relevant component README

### Development Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add appropriate tests
5. Ensure all tests pass
6. Submit a pull request
7. Sign the CLA when prompted (first-time contributors only)
