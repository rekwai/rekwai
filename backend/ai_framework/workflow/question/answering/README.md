# Question Answering Workflow

This workflow answers questionnaire questions by searching requirements, returning structured answers with traceable references.

## What It Does

Takes a question and produces an answer with:
- **answer_type** - "yes", "no", or "n/a"
- **explanation** - Detailed answer text
- **requirements_referenced** - List of relevant requirements with reasons

The agent has access to:
- Semantic requirement search
- Full requirement details

Output: `FullAnswerResult`

## The Workflow

### 1. Search and Discovery
Agent autonomously searches for information:
- **Semantic search** - Vector similarity for conceptual matches
- **Get requirement details** - Full requirement information

### 2. Answer Generation
Agent synthesizes answer from discovered information:
- Classifies answer type based on question structure
- Provides explanation with full context
- Lists all relevant requirements with reasons
- Always provides answer even if no requirements found

### 3. Validation (Optional)
Two validation agents check the answer:
- **Quality** - Complete, focused, concise, no meta information
- **Requirement linkage** - All requirements exist and are relevant

If validation fails, agent retries with feedback (max 2 attempts).

## File Organization

### Dependencies
- **[answering_deps.py](answering_deps.py)** - Database, AI services, question context

### Agents
- **[agents/answer_agent.py](agents/answer_agent.py)** - Main agent with optional validation
- **[agents/validation_agents.py](agents/validation_agents.py)** - Quality and linkage validation agents

### Tools
- **[requirement_tools.py](requirement_tools.py)** - Search requirements (semantic search, get details)

### Models
- **[models.py](models.py)** - Search results, answers, references, validation results
