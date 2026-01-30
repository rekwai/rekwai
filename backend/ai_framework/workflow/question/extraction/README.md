# Question Extraction Workflow

This workflow automatically extracts recipient-directed questions from questionnaires and compliance documents, filtering out document-explanatory content to produce a clean set of questions that require answers from the recipient.

## What It Does

The extraction workflow takes a questionnaire document (like a vendor security questionnaire or compliance checklist) and produces a structured set of questions that the recipient must answer. Each question is:

- **Recipient-directed** - Questions asking the recipient about their organization, practices, or capabilities
- **Self-contained** - Complete question text with necessary context
- **Non-duplicate** - Validated to avoid extracting the same question multiple times
- **Ordered** - Sequenced according to the natural flow of the source document

## The Single-Phase Process

### Phase 1: Extraction with Inline Filtering

Identifies and extracts all recipient-directed questions from the questionnaire, automatically filtering out document-explanatory content.

**What gets extracted:**
- Questions the recipient must answer (e.g., "What is your incident response process?")
- Imperative statements requesting information (e.g., "Please describe your backup policy")
- Conditional questions requiring responses (e.g., "If your company processes credit cards, how do you ensure PCI compliance?")
- Questions asking about practices, policies, procedures, or capabilities

**What gets filtered out:**
- Questions explaining what the document is (e.g., "What does this section explain?")
- Section headers and titles
- FAQ content about the questionnaire itself (e.g., "How do I fill this out?")
- Instructions and definitions (e.g., "What does RTO mean?")
- Response fields and metadata
- Document navigation or structural content

**Quality controls:**
- Inline type filtering during creation - each question is classified before saving (recipient-directed vs document-explanatory)
- Completeness validation - checks that all questions from the document have been captured
- Duplicate detection - identifies and flags semantically similar questions
- Automatic retry with validation feedback if issues are found

**Type Filtering:**
For every question, an inline classification determines: "Is this a question TO the recipient or ABOUT the document?"
- Questions TO the recipient → Saved to database (e.g., "What is your backup policy?")
- Questions ABOUT the document → Filtered out, not saved (e.g., "What is this questionnaire for?")

## Reliability Through Redundancy

The workflow uses multiple validation passes because AI models can be unreliable:

1. **Inline type filtering** - Every question is classified before saving (recipient-directed vs document-explanatory)
2. **Completeness validation** - After extraction, checks that all questions from the questionnaire were captured
3. **Duplicate detection** - Identifies semantically similar questions that should be merged
4. **Retry loops** - If validation finds issues, the agent retries with specific feedback (max 2 attempts)

If validation fails after multiple attempts, the workflow continues anyway to avoid blocking progress on partial failures.

## File Organization

### Orchestration
- **[orchestrator.py](orchestrator.py)** - Coordinates the extraction workflow and validation retry loops

### Extraction Agent
- **[agents/question_extraction_agent.py](agents/question_extraction_agent.py)** - Extracts questions from questionnaires with inline type filtering

### Validation Agents
- **[agents/coverage_validation_agents.py](agents/coverage_validation_agents.py)** - Validates extraction completeness and detects duplicates
- **[agents/question_type_filter_agent.py](agents/question_type_filter_agent.py)** - Classifies questions as recipient-directed or document-explanatory (used inline during creation)

### Supporting Components
- **[extraction_deps.py](extraction_deps.py)** - Provides database, file storage, and questionnaire context to agents
- **[validators.py](validators.py)** - Runs inline type filtering validation
- **[validation_tools.py](validation_tools.py)** - Tools for document-level completeness and duplicate checking
- **[question_crud_tools.py](question_crud_tools.py)** - Tools for creating, reading, updating, and deleting questions with inline filtering
- **[models.py](models.py)** - Data models for tool responses and validation results

## Technical Backbone

The workflow is built on a flexible multi-provider AI infrastructure:

**Agent Framework**: Uses [Pydantic AI](https://ai.pydantic.dev/) for agent orchestration, structured outputs, and tool integration. All agents follow the same pattern: system prompt + tools + structured output validation.

**Model Selection**: Supports multiple AI providers (OpenAI, Anthropic, Google, Ollama, custom endpoints) with environment-based configuration. Each provider has "smart" and "fast" model aliases - the extraction agent uses smart models for quality, while validation agents use fast models for cost efficiency.

**Storage Infrastructure**: Questionnaires are read from Garage (S3-compatible storage) and questions are written to an intermediate PostgreSQL database (`intermediate_questionnaire_question` table). This isolation prevents workflow failures from corrupting verified questions in the production `questionnaire_question` table.

**Dependency Injection**: Agents receive `ExtractionDeps` containing database engine, S3 service, and questionnaire context. Tools create their own database sessions following the session-per-tool pattern to avoid connection leaks.

## Type Filtering Architecture

The workflow uses a two-tier filtering approach:

1. **Inline filtering during creation** - The `create_question` tool calls `validate_question_type_inline()` which runs the filter agent BEFORE saving to database. Document-explanatory questions are filtered out and never saved.

2. **Document-level validation** - After extraction, completeness and duplicate agents verify the overall quality of the extraction, ensuring nothing was missed and no duplicates exist.

This design minimizes database clutter by preventing invalid questions from being saved, rather than saving everything and cleaning up later.
