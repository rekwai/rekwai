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

### Step 1: Download and Initial Configuration

1. In a terminal, navigate to the location where you want the `docker-compose.yml` and `.env` file to be.
2. Download these two files:
   - [docker-compose.yml](https://github.com/rekwai/rekwai/raw/main/docker/docker-compose.yml)
   - [.env.example](https://github.com/rekwai/rekwai/raw/main/docker/.env.example)
3. Rename `.env.example` to `.env` and open it in a text editor
4. **Generate storage secrets** by running these commands (this expects you have openssl installed). It will append the
   generated secrets at the end of the `.env` file. **Note: only execute this once, the secrets need to remain the same in
   order for the services to function after restarting.**
   ```
   echo "S3_ACCESS_KEY_ID=GK$(openssl rand -hex 12)" >> .env
   echo "S3_SECRET_ACCESS_KEY=$(openssl rand -hex 32)" >> .env
   echo "GARAGE_RPC_SECRET=$(openssl rand -hex 32)" >> .env
   echo "GARAGE_ADMIN_TOKEN=$(openssl rand -base64 32)" >> .env
   echo "GARAGE_METRICS_TOKEN=$(openssl rand -base64 32)" >> .env
   ```
5. **Configure your AI provider:**
   - Set `SELECTED_PROVIDER` to your chosen provider (`openai`, `gemini`, `anthropic`, or `openrouter`)
   - Fill in the API key for that provider
   - Configure the model settings (see below)

#### Model Selection

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

Note: these instructions assume there are no configuration changes in `.env` besides the Garage related secrets.

1. **In a terminal, navigate to the same location (chosen in step 1) and download all needed docker images:**
   ```bash
   docker compose pull
   ```
   This can take some time, as docling's docker image is quite big.

2. **Start the app (append ` -d` to run in the background)**
   ```bash
   docker compose up
   ```

3. **Watch the logs** which will tell you when the frontend is ready to be accessed.

## Accessing the App

Once Docker has finished starting all services, open your browser and go to: **http://localhost:3000**