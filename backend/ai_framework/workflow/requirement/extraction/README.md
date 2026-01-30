# Requirements Extraction Workflow

This workflow automatically extracts requirements from policy documents, technical specifications, and compliance documentation, then enriches them with implementation and verification details.

## What It Does

The extraction workflow takes a document (like a security policy or system specification) and produces a structured set of requirements with complete metadata for tracking and auditing. Each requirement includes:

- **Description** - A clear statement of what is required
- **Types** - Categories that classify the requirement (e.g., "Security", "Compliance", "Performance")
- **Implementation Status** - Whether it's currently implemented, planned, to-do, or won't be done
- **Implementation Description** - How the requirement is being fulfilled (or will be fulfilled)
- **Verification Method** - How to verify that the requirement is met (audit procedures or testing approaches)

## The Three-Phase Process

### Phase 1: Extraction
Identifies and extracts all meaningful requirements from the document.

**Quality controls:**
- Automatically corrects vague descriptions (e.g., replaces "this policy" with specific references)
- Validates that requirement types match the content
- Checks that all requirements from the document have been captured
- Detects and removes duplicate requirements

**What gets extracted:**
- Organizational requirements (policies, processes, governance)
- System/product requirements (technical capabilities, features, controls)

**What gets skipped:**
- Document metadata and version information
- Administrative content without verification value

### Phase 2: Implementation Analysis
Determines whether each requirement is already implemented, planned, or needs work.

**Status determination:**
- **Implemented** - Currently operational (based on present-tense evidence in the document)
- **Planned** - Scheduled with timeline (future tense + dates)
- **To do** - Required but not scheduled
- **Won't do** - Explicitly excluded

**Quality controls:**
- Automatically corrects implementation descriptions that lack specific evidence
- Validates that status matches the evidence (e.g., "Planned" requires a timeline)
- Ensures descriptions reference specific methods, tools, or processes from the document

### Phase 3: Verification Planning
Generates verification methods describing how to confirm each requirement is met.

**Verification approach by requirement type:**
- **Organizational requirements** → Audit evidence (review policies, examine records, interview staff, observe processes)
- **System/product requirements** → Testable verification (automated tests, manual tests, configuration checks, code review)

**Quality controls:**
- Automatically transforms vague statements into specific, actionable steps
- Aligns verification methods with implementation status (e.g., planned features get plan reviews, not tests)
- Ensures verification is appropriate for the requirement type (organizational vs. technical)

## Reliability Through Redundancy

The workflow uses multiple validation passes because AI models can be unreliable:

1. **Inline auto-correction** - Every requirement is validated and corrected as it's created/updated
2. **Completeness validation** - After extraction, checks that nothing was missed
3. **Duplicate detection** - Identifies and prompts removal of duplicate requirements
4. **Field validation** - Verifies all required fields are populated before moving to the next phase
5. **Retry loops** - If validation finds issues, the agent retries with specific feedback

If validation fails after multiple attempts, the workflow continues anyway to avoid blocking progress on partial failures.

## File Organization

### Orchestration
- **[orchestrator.py](orchestrator.py)** - Coordinates the three-phase workflow and validation retry loops

### Phase Agents
- **[agents/extraction_agent.py](agents/extraction_agent.py)** - Extracts requirements from documents (Phase 1)
- **[agents/implementation_agent.py](agents/implementation_agent.py)** - Determines implementation status (Phase 2)
- **[agents/verification_agent.py](agents/verification_agent.py)** - Generates verification methods (Phase 3)

### Validation Agents
- **[agents/coverage_validation_agents.py](agents/coverage_validation_agents.py)** - Validates extraction completeness, detects duplicates, validates implementation and verification fields
- **[agents/sub_agents.py](agents/sub_agents.py)** - Validates requirement quality and type consistency

### Supporting Components
- **[extraction_deps.py](extraction_deps.py)** - Provides database, file storage, and document context to agents
- **[validators.py](validators.py)** - Runs validation agents and combines their results
- **[validation_tools.py](validation_tools.py)** - Tools for completeness and duplicate checking
- **[requirement_crud_tools.py](requirement_crud_tools.py)** - Tools for creating, reading, updating, and deleting requirements
- **[models.py](models.py)** - Data models for tool responses and validation results

## Technical Backbone

The workflow is built on a flexible multi-provider AI infrastructure:

**Agent Framework**: Uses [Pydantic AI](https://ai.pydantic.dev/) for agent orchestration, structured outputs, and tool integration. All agents follow the same pattern: system prompt + tools + structured output validation.

**Model Selection**: Supports multiple AI providers (OpenAI, Anthropic, Google, Ollama, custom endpoints) with environment-based configuration. Each provider has "smart" and "fast" model aliases - extraction and implementation agents use smart models for quality, while validation agents use fast models for cost efficiency.

**Storage Infrastructure**: Documents are read from Garage (S3-compatible storage) and requirements are written to an intermediate PostgreSQL database (`intermediate_extracted_requirement` table). This isolation prevents workflow failures from corrupting verified requirements in the production `requirement` table.

**Dependency Injection**: Agents receive `ExtractionDeps` containing database engine, S3 service, and document context. Tools create their own database sessions following the session-per-tool pattern to avoid connection leaks.
