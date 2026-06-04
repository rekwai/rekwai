<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/rekwai-banner.svg">
    <img alt="Rekwai" src=".github/assets/rekwai-banner-light.svg" width="280">
  </picture>
</p>

# Rekwai

**Actionable knowledge, not paperwork.**

Rekwai is an open-source requirements management platform that turns your scattered documents into a living knowledge base, then uses it to answer compliance questionnaires, security reviews, and RFPs automatically.

Every organization keeps requirements everywhere: standards and regulations, internal policies, architecture docs, release notes, project plans. When someone asks a question, the answer is buried across documents, wikis, and people's memories. Rekwai extracts structured requirements from any document, remembers exactly where each one came from, and keeps that knowledge accurate and accessible no matter which project or sprint it belongs to. Rekwai does the heavy lifting while you stay in control of every decision.

## What Can You Do With Rekwai?

### Build a Requirements Knowledge Base
- Upload any document, such as regulations, standards, policies, architecture docs, release notes, or project plans (PDF, Word, Excel)
- Automatically extract and organize structured requirements
- Capture not just what needs to be done, but whether it's implemented or planned, how it's handled, and how to verify it
- Keep complete source traceability for every requirement, so nothing is lost when projects end

### Answer Questionnaires Automatically
- Upload compliance assessments, security reviews, or RFPs
- Generate draft answers backed by your own requirements
- Review and approve every answer before it's final
- Export with full source citations for audits, or clean answers for client delivery

## Why Rekwai?

- **A single source of truth**: every answer is grounded in your actual requirements database
- **Stay in control**: Rekwai proposes, you review and approve before anything is final
- **Full traceability**: see what you have, where it came from, and how it evolved over time
- **Save time**: stop answering the same questionnaire from scratch, over and over
- **Yours to run**: 100% open source, self-hosted on your own infrastructure, with your own AI provider API keys

## Quick Start

For complete installation instructions, see the **[Installation Guide](docs/installation.md)**.

### Prerequisites
- **Docker**: Download from [https://docs.docker.com/engine/install/](https://docs.docker.com/engine/install)
- **AI Provider API Key**: Get an API key from one of the supported providers:
  - [OpenAI](https://platform.openai.com/api-keys)
  - [Google Gemini](https://aistudio.google.com/apikey)
  - [Anthropic](https://console.anthropic.com/)
  - [OpenRouter](https://openrouter.ai/settings/keys)

### Installation Steps

1. **Download** [docker-compose.yml](https://github.com/rekwai/rekwai/raw/main/docker/docker-compose.yml) and [.env.example](https://github.com/rekwai/rekwai/raw/main/docker/.env.example) into the same directory
2. **Rename** `.env.example` to `.env` and configure it:
   - Generate storage secrets (see [Installation Guide](docs/installation.md#step-1-download-and-configure))
   - Set `SELECTED_PROVIDER` to your chosen AI provider
   - Add your API key for the selected provider
3. **Start the application:**
   ```bash
   docker compose up -d
   ```
4. **Access the app** at `http://localhost:3000`


## Getting Started

1. **Create a Product** - Set up a workspace for your requirements and questionnaires (see **[Product Management](docs/product.md)** for details)
2. **Upload Requirements** - Start by uploading documents containing your requirements (see **[Requirements Management](docs/requirements.md)** for the complete workflow)
3. **Process Questionnaires** - Upload questionnaires and let Rekwai generate answers using your requirements (see **[Query Management](docs/queries.md)** for step-by-step instructions)

The more complete your requirements database, the better your questionnaire responses will be.

For a comprehensive introduction to all features and workflows, see the **[Overview Guide](docs/overview.md)**.

## Support

For technical documentation, development setup, and contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
