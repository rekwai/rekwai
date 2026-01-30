# Question Answering Workflow

This workflow answers questionnaire questions by searching requirements and source documents, returning structured answers with traceable references.

## What It Does

Takes a question and produces an answer with:
- **answer_type** - "yes", "no", or "n/a"
- **explanation** - Detailed answer text
- **requirements_referenced** - List of relevant requirements with reasons
- **sources_referenced** - List of source document sections with reasons

The agent has access to:
- Semantic requirement search
- Full requirement details
- Source documents linked to requirements
- Search within source documents

Output: `FullAnswerResult`

## The Workflow

### 1. Search and Discovery
Agent autonomously searches for information:
- **Semantic search** - Vector similarity for conceptual matches
- **Get requirement details** - Full requirement information
- **Get source documents** - Documents linked to requirements
- **Search source document** - Search within document content

### 2. Answer Generation
Agent synthesizes answer from discovered information:
- Classifies answer type based on question structure
- Provides explanation with full context
- Lists all relevant requirements with reasons
- Lists source sections with reasons
- Always provides answer even if no requirements found

### 3. Validation (Optional)
Three validation agents check the answer:
- **Quality** - Complete, focused, concise, no meta information
- **Requirement linkage** - All requirements exist and are relevant
- **Source references** - All sources exist and are applicable

If validation fails, agent retries with feedback (max 2 attempts).

## File Organization

### Dependencies
- **[answering_deps.py](answering_deps.py)** - Database, S3, AI services, question context

### Agents
- **[agents/answer_agent.py](agents/answer_agent.py)** - Main agent with optional validation
- **[agents/validation_agents.py](agents/validation_agents.py)** - Quality, linkage, and source validation agents

### Tools
- **[requirement_tools.py](requirement_tools.py)** - Search requirements (semantic search, get details)
- **[source_document_tools.py](source_document_tools.py)** - Get and search source documents

### Models
- **[models.py](models.py)** - Search results, answers, references, validation results
