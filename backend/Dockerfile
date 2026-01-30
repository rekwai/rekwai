FROM python:3.12

WORKDIR /usr/src/app

# Install system packages required for PDF generation (WeasyPrint and dependencies)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libffi-dev \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libxml2-dev \
    libxslt1-dev \
 && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (frozen lockfile, no dev dependencies)
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Use the virtual environment directly instead of `uv run` to avoid runtime package installation
CMD [".venv/bin/uvicorn", "main:app"]
