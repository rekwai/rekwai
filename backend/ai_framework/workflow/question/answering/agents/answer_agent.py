"""Answer agent for question answering workflow.

This module provides the answer agent that autonomously searches requirements
and generates structured answers to questions.
"""

import asyncio
from pydantic_ai import Agent, RunContext, ModelRetry
from pydantic_ai.tools import ToolDefinition

from ai_framework.agent import create_agent
from ai_framework.agent_utils import run_agent_with_retry
from ai_framework.workflow.question.answering.answering_deps import AnsweringDeps
from ai_framework.workflow.question.answering.requirement_tools import (
    create_search_requirements_semantic_tool,
    create_get_requirement_tool,
)
from ai_framework.workflow.question.answering.models import (
    FullAnswerResult,
    ValidationResult,
)
from ai_framework.workflow.question.answering.agents.validation_agents import (
    create_answer_quality_agent,
    create_requirement_linkage_agent,
)


# System prompt for answer agent (requirements only)
FULL_ANSWER_SYSTEM_PROMPT = """You are a specialized AI assistant that answers questions about software requirements.

**CRITICAL - Determine Question Type First**:

1. **Classify the question type**:
   - **Binary/Compliance questions**: Ask if something exists, is supported, or is true/false
     Examples: "Does the system...?", "Is there...?", "Can the system...?", "Is ... supported?"
   - **Informational questions**: Ask for specific facts, values, names, dates, or descriptions
     Examples: "What is...?", "Who is...?", "When...?", "List the...", "Describe...", "Name the..."

2. **Set answer_type based on question type**:
   - For binary/compliance questions: use "yes" or "no" based on the answer
   - For informational questions: use "n/a" (not a yes/no question)
   - If NO requirements found for any question type: return answer_type=null

---

Search Strategy

1. **Use semantic search** to find requirements related to the question
2. **Get full requirement details** when initial results look relevant
3. **Find ALL relevant requirements** - don't stop at the first match
4. **Never hallucinate** - base answers ONLY on explicit text from requirements

**Search Efficiency**:
- Limit searches to 3 attempts maximum
- If searches return no results or low similarity scores (<30%), conclude no relevant requirements exist
- Do not keep trying different query variations

---

Output Format

- **answer_type**:
  - "yes" - for binary questions where the answer is affirmative
  - "no" - for binary questions where the answer is negative
  - "n/a" - for informational questions (not a yes/no question)
  - null - only when no requirements are found
- **explanation**: Natural language answer (2-4 sentences) for end users
  * Describe the SYSTEM, not the requirements/documents (e.g., "The system's OAuth2 tokens expire after 30 minutes")
  * NEVER mention requirement keys, document keys, numbers, or statuses
  * Rephrase meta info naturally ("status: to do" → "not yet implemented")
  * If no requirements found, explain that no relevant requirements were found
- **requirements_referenced**: List with requirement_key and reason (empty list [] if none found)

---

Example: "Does the system support OAuth2 authentication?"

1. Semantic search: "OAuth2 authentication"
2. Get requirement details → finds REQ-AUTH-001 describing OAuth2 with JWT tokens
3. Answer: answer_type="yes", explanation="The system supports OAuth2 authentication with JWT tokens for secure user login.", requirements_referenced=[REQ-AUTH-001]
"""

async def limit_tools(
    ctx: RunContext[AnsweringDeps],
    tool_defs: list[ToolDefinition],
) -> list[ToolDefinition] | None:
    """Dynamically filter tools based on usage limits.

    This callback is passed to the agent's prepare_tools parameter.
    It enforces two limits:
    1. Total tool calls: strips ALL tools to force the agent to conclude
    2. Semantic search calls: removes search_requirements_semantic

    Args:
        ctx: The run context containing AnsweringDeps with counters
        tool_defs: List of available tool definitions

    Returns:
        Filtered list of tool definitions based on current usage limits
    """
    deps = ctx.deps
    if deps.total_tool_call_count >= AnsweringDeps.MAX_TOTAL_TOOL_CALLS:
        return []

    filtered = tool_defs
    if deps.search_count >= AnsweringDeps.MAX_SEARCH_CALLS:
        filtered = [
            tool_def
            for tool_def in filtered
            if tool_def.name != "search_requirements_semantic"
        ]
    return filtered


def create_answer_agent(
    enable_validation: bool = False,
) -> Agent[AnsweringDeps, FullAnswerResult]:
    """Create an answer agent that answers questions using requirements.

    Args:
        enable_validation: If True, adds automatic validation with retry using @output_validator.
                          Agent will automatically retry if validation fails.

    The agent has access to:
    - Semantic requirement search (for conceptual similarity)
    - Get requirement details (for full information)

    When enable_validation=True, the agent will:
    - Automatically validate output using 2 validation agents
    - Retry with feedback if validation fails
    - Keep session open until validation passes or max retries reached

    The agent autonomously decides which tools to use and when to stop searching.

    Returns:
        Agent configured to answer questions using requirements
    """
    tools = [
        create_search_requirements_semantic_tool(),
        create_get_requirement_tool(),
    ]

    agent = create_agent(
        model_name="smart",
        system_prompt=FULL_ANSWER_SYSTEM_PROMPT,
        tools=tools,
        output_type=FullAnswerResult,
        prepare_tools=limit_tools,
    )

    # Add validation if enabled
    if enable_validation:

        @agent.output_validator
        async def validate_answer(
            ctx: RunContext[AnsweringDeps],
            output: FullAnswerResult,
        ) -> FullAnswerResult:
            """Validate answer output and raise ModelRetry if validation fails."""
            # Run all validation agents in parallel
            validation_result = await _validate_answer_inline(output, ctx.deps)

            # If validation fails, raise ModelRetry with feedback
            if not validation_result.overall_valid:
                feedback = _construct_validation_feedback(validation_result)
                raise ModelRetry(feedback)

            # Validation passed - return output as-is
            return output

    return agent


async def _validate_answer_inline(
    answer_result: FullAnswerResult,
    deps: AnsweringDeps,
) -> ValidationResult:
    """Run all validation agents in parallel.

    Args:
        answer_result: The answer to validate
        deps: AnsweringDeps for validation agents

    Returns:
        ValidationResult with aggregated validation results

    Raises:
        ModelRetry: If any validation agent fails after all retries, allowing the
            answer agent to retry instead of crashing the workflow
    """
    quality_agent = create_answer_quality_agent()
    linkage_agent = create_requirement_linkage_agent()

    quality_task = run_agent_with_retry(
        quality_agent,
        f"Question: {deps.question_text}\n\nAnswer: {answer_result.explanation}",
        deps=deps,
    )
    linkage_task = run_agent_with_retry(
        linkage_agent,
        f"Question: {deps.question_text}\n\nAnswer: {answer_result.explanation}\n\nRequirement References: {[ref.model_dump() for ref in answer_result.requirements_referenced]}",
        deps=deps,
    )

    quality_result, linkage_result = await asyncio.gather(
        quality_task, linkage_task
    )

    # Build ValidationResult
    overall_valid = (
        quality_result.output.is_valid
        and linkage_result.output.is_valid
    )

    return ValidationResult(
        answer_quality=quality_result.output,
        requirement_linkage=linkage_result.output,
        overall_valid=overall_valid,
    )


def _construct_validation_feedback(validation_result: ValidationResult) -> str:
    """Construct feedback message from validation failures.

    Args:
        validation_result: The validation result containing issues

    Returns:
        Human-readable feedback string for the agent
    """
    feedback_parts = []

    if not validation_result.answer_quality.is_valid:
        feedback_parts.append("Answer Quality Issues:")
        for issue in validation_result.answer_quality.issues:
            feedback_parts.append(f"  - {issue}")
        if validation_result.answer_quality.suggested_rewording:
            feedback_parts.append(
                f"  Suggested: {validation_result.answer_quality.suggested_rewording}"
            )

    if not validation_result.requirement_linkage.is_valid:
        feedback_parts.append("\nRequirement Linkage Issues:")
        for invalid_req in validation_result.requirement_linkage.invalid_requirements:
            feedback_parts.append(
                f"  - {invalid_req.requirement_key}: {invalid_req.issue}"
            )

    return "\n".join(feedback_parts)
