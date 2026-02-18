# Rekwai App

<img width="236" height="33" alt="rekwai logo" src="https://github.com/user-attachments/assets/08ae9903-76eb-4323-b54a-3a93dbd3cbb6" />


Rekwai is a smart document processing system that helps organizations manage requirements and answer questionnaires efficiently. Whether you're dealing with business requirements, compliance standards, project specifications, or any type of organizational requirements, the app uses AI to automate these tasks while keeping humans in control of important decisions.

## What Can You Do With Rekwai?

### 📄 Upload and Process Requirements Documents
- Upload documents containing any type of requirements (PDF, Word, Excel files)
- Automatically extract and organize all requirements from your documents
- Build a central database of all your organizational requirements
- Track exactly where each requirement came from for compliance and auditing

### ❓ Process Questionnaires Automatically
- Upload questionnaires that you need to complete (compliance, security assessments, RFPs)
- Automatically generate answers based on your stored requirements
- Review and approve answers before finalizing
- Export completed questionnaires ready for submission

## Key Benefits

- **Save Time**: Automate the tedious work of reading documents and writing responses
- **Stay Consistent**: All answers are based on your actual requirements database
- **Maintain Control**: You review and approve everything before it's final
- **Track Everything**: See what requirements you have and where they came from
- **Reduce Errors**: Automated processing reduces manual mistakes

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

1. **Configure your environment:**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file:
   - Generate storage secrets (see [Installation Guide](docs/installation.md#step-1-download-and-configure))
   - Set `SELECTED_PROVIDER` to your chosen AI provider
   - Add your API key for the selected provider

2. **Start the application:**
   ```bash
   docker compose up -d
   ```

3. **Access the app:**
   Open your browser to `http://localhost:3000`


## How It Works

### Requirements Management Workflow
1. **Upload Your Documents** - Drop in any document containing requirements
2. **Automatic Extraction** - The app identifies all requirements
3. **Review and Organize** - Review what was found and make adjustments
4. **Smart Duplicate Detection** - Identifies if requirements are duplicates or updates
5. **Build Your Database** - All approved requirements are stored for future use

For detailed workflows and advanced features, see **[Requirements Management](docs/requirements.md)**.

### Questionnaire Processing Workflow
1. **Upload a Questionnaire** - Drop in any questionnaire you need to complete
2. **Question Detection** - The app identifies all questions that need answers
3. **Smart Answer Generation** - Finds relevant requirements and suggests answers
4. **Review and Approve** - You review each answer and can modify or approve them
5. **Export Completed Document** - Download your finished questionnaire

For detailed interface guides and best practices, see **[Query Management](docs/queries.md)**.

## Getting Started

1. **Create a Product** - Set up a workspace for your requirements and questionnaires (see **[Product Management](docs/product.md)** for details)
2. **Upload Requirements** - Start by uploading documents containing your requirements (see **[Requirements Management](docs/requirements.md)** for the complete workflow)
3. **Process Questionnaires** - Upload questionnaires and let the AI generate answers using your requirements (see **[Query Management](docs/queries.md)** for step-by-step instructions)

The more complete your requirements database, the better your questionnaire responses will be.

For a comprehensive introduction to all features and workflows, see the **[Overview Guide](docs/overview.md)**.

## Support

For technical documentation, development setup, and contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
