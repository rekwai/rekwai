# Rekwai App Installation Guide

This guide will help you install and run the Rekwai App on your computer in just a few simple steps using Docker.

## What You'll Need

### Required Software

**Docker**

Install Docker for your operating system:
- [Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- [macOS](https://docs.docker.com/desktop/setup/install/mac-install/)
- [Linux](https://docs.docker.com/engine/install/)

### AI Provider API Key

You'll need an API key from one of the supported AI providers:
- **OpenAI**: Get a key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Google Gemini**: Get a key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Anthropic**: Get a key from [console.anthropic.com](https://console.anthropic.com/)
- **OpenRouter**: Get a key from [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)

## Installation Steps

### Step 1: Download and Configure

1. Download these two files to a folder on your computer:
   - [docker-compose.yml](https://github.com/rekwai/rekwai/raw/main/docker-compose.yml)
   - [.env.example](https://github.com/rekwai/rekwai/raw/main/.env.example)
2. Rename `.env.example` to `.env` and open it in a text editor
3. **Generate storage secrets** by running these commands and copying the output into your `.env` file:
   ```
   openssl rand -hex 12 | sed 's/^/S3_ACCESS_KEY_ID=GK/'
   openssl rand -hex 32 | sed 's/^/S3_SECRET_ACCESS_KEY=/'
   openssl rand -hex 32 | sed 's/^/GARAGE_RPC_SECRET=/'
   openssl rand -base64 32 | sed 's/^/GARAGE_ADMIN_TOKEN=/'
   openssl rand -base64 32 | sed 's/^/GARAGE_METRICS_TOKEN=/'
   ```
4. **Configure your AI provider:**
   - Set `SELECTED_PROVIDER` to your chosen provider (`openai`, `gemini`, `anthropic`, or `openrouter`)
   - Fill in the API key for that provider
   - Configure the model settings (see below)

### Model Selection

Rekwai uses two models:
- **Smart model**: A reasoning model for complex analysis tasks. Choose a model with strong reasoning capabilities.
- **Fast model**: A quick, cost-efficient model for simple tasks. Choose a model optimized for speed and low cost.

**Recommended models by provider:**

| Provider | Smart Model | Fast Model |
|----------|-------------|------------|
| OpenAI | `gpt-5.2` | `gpt-5-mini` |
| Google Gemini | `gemini-3-pro` | `gemini-3-flash` |
| Anthropic | `claude-sonnet-4.5`, `claude-opus-4.5` | `claude-haiku-4.5` |
| OpenRouter | `z-ai/glm-4.6`, `qwen/qwen3-235b-a22b-2507` | `z-ai/glm-4.5-air`, `qwen/qwen3-next-80b-a3b-instruct` |

> **Tip**: OpenRouter gives you access to many open-source models. GLM and Qwen models offer excellent performance at lower cost.

### Step 2: Start the App

1. **Open a terminal and navigate to the app folder:**
   ```bash
   cd path/to/your/rekwai-app
   ```

2. **Start the app:**
   ```bash
   docker compose up -d
   ```

Docker will automatically download and set up everything. The first time may take a few minutes.

## Accessing the App

Once Docker has finished starting all services, open your browser and go to: **http://localhost:3000**

## Stopping and Restarting

**To stop:** Run `docker compose down` to stop all services

**To restart:** Run `docker compose up -d` again from the app folder

**To view logs:** Run `docker compose logs -f` to see real-time logs from all services
