"""Shared utilities for agent execution and logging.

This module contains common functions used across orchestrators
for running agents with retry logic and logging agent messages.
"""

import logging
import asyncio
from typing import Callable
from pydantic import ValidationError
from pydantic_ai import PromptedOutput
from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    ToolCallPart,
    ToolReturnPart,
)
from pydantic_ai.exceptions import UnexpectedModelBehavior
from pydantic_graph import End

from ai_framework.agent import (
    create_agent,
    get_agent_creation_params,
    pop_agent_creation_params,
)

logger = logging.getLogger(__name__)

# Retry configuration
# Tool mode gets 1 attempt, then falls back to PromptedOutput with 2 attempts
MAX_TOOL_RETRIES = 1
PROMPTED_OUTPUT_RETRIES = 2
RETRY_DELAY_SECONDS = 2

# Validation model names used by different LLM providers
# Standard OpenAI uses "ChatCompletion", OpenRouter uses "_OpenRouterChatCompletion"
_CHAT_COMPLETION_VALIDATION_MODELS = ["ChatCompletion", "_OpenRouterChatCompletion"]

# Default timeout for fast model agents (seconds).
# Smart/reasoning models automatically get timeout=None for extended thinking time.
DEFAULT_AGENT_TIMEOUT_SECONDS = 30.0


class MalformedAPIResponseError(Exception):
    """Raised when the AI provider returns a malformed response."""

    def __init__(self, provider_hint: str, original_error: Exception):
        self.provider_hint = provider_hint
        self.original_error = original_error
        super().__init__(
            f"AI provider returned malformed response: {provider_hint}. "
            f"This may indicate an unstable API endpoint or incompatible model. "
            f"Original error: {original_error}"
        )


def _is_malformed_api_response_error(error: Exception) -> bool:
    """Check if an error is due to malformed API response from LLM provider.

    This handles various forms of malformed responses:
    - Direct ValidationError and UnexpectedModelBehavior wrappers
    - Null function.arguments in tool calls (common with Qwen/GLM models)
    - Completely null response fields (id, choices, model, object all None)
    """
    error_str = str(error)

    # Pattern 1: Null function.arguments in tool calls
    malformed_tool_call = (
        "function.arguments" in error_str
        and "Input should be a valid string" in error_str
    ) or (
        "ChatCompletionMessageFunctionToolCall" in error_str
        or "ChatCompletionMessageCustomToolCall" in error_str
    )

    # Pattern 2: Completely malformed ChatCompletion response (null id, choices, model, object)
    # This happens when the API returns an entirely null/empty response
    has_chat_completion_validation_error = any(
        f"validation errors for {model}" in error_str
        for model in _CHAT_COMPLETION_VALIDATION_MODELS
    )
    has_null_required_fields = (
        "\nid\n" in error_str and "input_value=None" in error_str
    ) or ("\nchoices\n" in error_str and "input_value=None" in error_str)
    malformed_response = (
        has_chat_completion_validation_error and has_null_required_fields
    )

    return malformed_tool_call or malformed_response


async def _handle_retryable_error(
    error_description: str,
    attempt: int,
    max_retries: int,
    cancellation_check: Callable[[], None] | None = None,
    exhausted_message: str | None = None,
) -> tuple[bool, bool]:
    """Handle retry logic for transient errors that may fall back to PromptedOutput.

    Args:
        error_description: Human-readable description of the error for logging
        attempt: Current attempt number (0-indexed)
        max_retries: Maximum number of retry attempts
        cancellation_check: Optional callback to check for task cancellation
        exhausted_message: Optional custom message when retries exhausted

    Returns:
        Tuple of (should_continue, retries_exhausted):
        - (True, False): Should continue to next retry attempt
        - (False, True): Retries exhausted, caller should try fallback or raise
    """
    if attempt < max_retries - 1:
        logger.warning(
            f"{error_description} (attempt {attempt + 1}/{max_retries}). "
            f"Retrying in {RETRY_DELAY_SECONDS} seconds..."
        )
        if cancellation_check:
            cancellation_check()
        await asyncio.sleep(RETRY_DELAY_SECONDS)
        return (True, False)
    else:
        if exhausted_message:
            logger.warning(exhausted_message)
        return (False, True)


def _is_output_validation_error(error: Exception) -> bool:
    """Check if an error is due to output validation failure after max retries.

    This happens when pydantic-ai's internal retry mechanism gives up trying
    to get the model to return properly structured output.
    """
    error_str = str(error)
    return "Exceeded maximum retries" in error_str and "output validation" in error_str


def _is_token_limit_exceeded_error(error: Exception) -> bool:
    """Check if an error is due to token limit exceeded before response generation.

    This happens when the LLM runs away (generates too much) and hits max_tokens
    before producing valid structured output.
    """
    error_str = str(error)
    return "exceeded before any response was generated" in error_str


async def _run_with_prompted_output_fallback(
    original_agent,
    user_prompt: str,
    deps,
    original_error: Exception,
    timeout_seconds: float | None = DEFAULT_AGENT_TIMEOUT_SECONDS,
    cancellation_check: Callable[[], None] | None = None,
):
    """Retry with PromptedOutput mode when structured output fails.

    PromptedOutput injects the JSON schema into the prompt and parses the
    text response as JSON. It's more forgiving than ToolOutput since the
    model isn't forced to call a tool.

    Uses PROMPTED_OUTPUT_RETRIES (2) attempts in fallback mode.

    Args:
        original_agent: The agent that failed
        user_prompt: The prompt that was used
        deps: Dependencies for the agent
        original_error: The original exception
        timeout_seconds: Maximum wall-clock time for each attempt
        cancellation_check: Optional callback to check for task cancellation

    Returns:
        The agent result from the fallback attempt

    Raises:
        The original_error if fallback also fails or cannot be attempted
    """
    # Get and remove creation params from registry (prevents memory leak)
    params = pop_agent_creation_params(original_agent)
    if not params or not params.output_type:
        logger.warning("Cannot fallback - no creation params or output_type on agent")
        raise original_error

    output_type = params.output_type
    logger.warning(
        f"Structured output validation failed for {output_type.__name__}. "
        f"Retrying with PromptedOutput mode..."
    )

    # Create fallback agent with PromptedOutput
    fallback_agent = create_agent(
        model_name=params.model_name,
        system_prompt=params.system_prompt,
        tools=params.tools,
        output_type=PromptedOutput(output_type),
        retries=params.retries,
        max_tokens=params.max_tokens,
    )

    # Run fallback with retry logic for transient errors, but disable
    # PromptedOutput fallback to prevent infinite recursion
    try:
        result = await run_agent_with_retry(
            fallback_agent,
            user_prompt=user_prompt,
            deps=deps,
            max_retries=PROMPTED_OUTPUT_RETRIES,
            timeout_seconds=timeout_seconds,
            _enable_prompted_output_fallback=False,
            cancellation_check=cancellation_check,
        )
        logger.info(f"PromptedOutput fallback succeeded for {output_type.__name__}")
        return result
    except Exception as fallback_error:
        logger.error(
            f"PromptedOutput fallback also failed for {output_type.__name__}: "
            f"{fallback_error}"
        )
        raise original_error from fallback_error


async def run_agent_with_retry(
    agent,
    user_prompt: str,
    deps,
    max_retries: int = MAX_TOOL_RETRIES,
    timeout_seconds: float | None = DEFAULT_AGENT_TIMEOUT_SECONDS,
    _enable_prompted_output_fallback: bool = True,
    cancellation_check: Callable[[], None] | None = None,
):
    """Run an agent with retry logic for transient API failures.

    Uses agent.iter() for node-by-node execution, enabling cancellation checks
    between each execution node (tool calls, model requests).

    Args:
        agent: The agent to run
        user_prompt: The prompt to send to the agent
        deps: Dependencies for the agent
        max_retries: Maximum number of retry attempts
        timeout_seconds: Maximum wall-clock time for each attempt. Set to None for
            reasoning/smart models that need extended thinking time. Defaults to 30s.
            Note: This is automatically set to None for "smart" models.
        _enable_prompted_output_fallback: Internal flag to enable/disable PromptedOutput
            fallback. Set to False when already in fallback mode to prevent infinite loops.
        cancellation_check: Optional callback that raises TaskCancelledException if
            the task has been cancelled. Called between each execution node.

    Returns:
        The agent result

    Raises:
        UnexpectedModelBehavior: If all retries are exhausted
        MalformedAPIResponseError: If the API returns invalid response structure
        TimeoutError: If the agent call exceeds timeout_seconds
        TaskCancelledException: If cancellation_check raises it
    """
    # Auto-disable timeout for smart/reasoning models that need extended thinking time
    params = get_agent_creation_params(agent)
    if params and params.model_name == "smart":
        timeout_seconds = None

    for attempt in range(max_retries):
        # Check for cancellation before each attempt
        if cancellation_check:
            cancellation_check()

        try:
            # Use agent.iter() for cancellable node-by-node execution
            # asyncio.timeout(None) is a no-op, so no branching needed
            async with asyncio.timeout(timeout_seconds):
                async with agent.iter(user_prompt=user_prompt, deps=deps) as agent_run:
                    async for node in agent_run:
                        if cancellation_check:
                            cancellation_check()
                        if isinstance(node, End):
                            break
                result = agent_run.result
            # Clean up registry entry on success (prevents memory leak)
            pop_agent_creation_params(agent)
            return result
        except ValidationError as e:
            # Handle malformed API responses (e.g., null function.arguments)
            if _is_malformed_api_response_error(e):
                should_continue, exhausted = await _handle_retryable_error(
                    "AI provider returned malformed tool call response",
                    attempt,
                    max_retries,
                    cancellation_check,
                    f"Malformed tool call retries exhausted ({max_retries} attempts). "
                    f"Will attempt PromptedOutput fallback...",
                )
                if should_continue:
                    continue
                elif exhausted and _enable_prompted_output_fallback:
                    # Tool calling is broken, try PromptedOutput fallback
                    return await _run_with_prompted_output_fallback(
                        agent,
                        user_prompt,
                        deps,
                        e,
                        timeout_seconds,
                        cancellation_check,
                    )
                else:
                    # Fallback disabled - raise error
                    raise MalformedAPIResponseError(
                        provider_hint="API returned malformed or null response fields",
                        original_error=e,
                    ) from e
            else:
                # Different validation error, don't retry
                raise
        except UnexpectedModelBehavior as e:
            # pydantic-ai wraps ValidationError in UnexpectedModelBehavior
            # Check for malformed tool call (e.g., null arguments from Qwen models)
            if _is_malformed_api_response_error(e):
                should_continue, exhausted = await _handle_retryable_error(
                    "AI provider returned malformed tool call response",
                    attempt,
                    max_retries,
                    cancellation_check,
                    f"Malformed tool call retries exhausted ({max_retries} attempts). "
                    f"Will attempt PromptedOutput fallback...",
                )
                if should_continue:
                    continue
                elif exhausted and _enable_prompted_output_fallback:
                    # Tool calling is broken, try PromptedOutput fallback
                    return await _run_with_prompted_output_fallback(
                        agent,
                        user_prompt,
                        deps,
                        e,
                        timeout_seconds,
                        cancellation_check,
                    )
                else:
                    # Fallback disabled - raise error
                    raise MalformedAPIResponseError(
                        provider_hint="API returned malformed or null response fields",
                        original_error=e,
                    ) from e
            elif _is_output_validation_error(e) and _enable_prompted_output_fallback:
                # Output validation failed after pydantic-ai's internal retries
                # Try PromptedOutput fallback instead of crashing
                return await _run_with_prompted_output_fallback(
                    agent,
                    user_prompt,
                    deps,
                    e,
                    timeout_seconds,
                    cancellation_check,
                )
            elif _is_token_limit_exceeded_error(e):
                # LLM runaway - hit max_tokens before producing valid output
                # Retry first, then fall back to PromptedOutput if exhausted
                should_continue, exhausted = await _handle_retryable_error(
                    "LLM exceeded token limit before response",
                    attempt,
                    max_retries,
                    cancellation_check,
                    f"Token limit retries exhausted ({max_retries} attempts). "
                    f"Attempting PromptedOutput fallback...",
                )
                if should_continue:
                    continue
                elif exhausted and _enable_prompted_output_fallback:
                    return await _run_with_prompted_output_fallback(
                        agent,
                        user_prompt,
                        deps,
                        e,
                        timeout_seconds,
                        cancellation_check,
                    )
                else:
                    logger.error(
                        f"LLM token limit exceeded after {max_retries} attempts"
                    )
                    raise
            elif "Content field missing" in str(e):
                should_continue, exhausted = await _handle_retryable_error(
                    "AI provider returned empty response",
                    attempt,
                    max_retries,
                    cancellation_check,
                )
                if should_continue:
                    continue
                else:
                    logger.error(f"AI provider failed after {max_retries} attempts")
                    raise
            else:
                # Different error, don't retry
                raise
        except TimeoutError as e:
            should_continue, exhausted = await _handle_retryable_error(
                f"Agent call timed out after {timeout_seconds}s",
                attempt,
                max_retries,
                cancellation_check,
                f"Timeout retries exhausted ({max_retries} attempts). "
                f"Attempting PromptedOutput fallback...",
            )
            if should_continue:
                continue
            elif exhausted and _enable_prompted_output_fallback:
                return await _run_with_prompted_output_fallback(
                    agent,
                    user_prompt,
                    deps,
                    e,
                    timeout_seconds,
                    cancellation_check,
                )
            else:
                logger.error(
                    f"Agent call timed out after {max_retries} attempts "
                    f"(timeout: {timeout_seconds}s each)"
                )
                # Clean up registry entry before raising
                pop_agent_creation_params(agent)
                raise


def log_agent_messages(messages: list, phase_name: str) -> None:
    """Log tool calls and their results from agent messages.

    Args:
        messages: List of ModelRequest and ModelResponse messages from agent run
        phase_name: Name of the phase (for logging context)
    """
    logger.info(f"\n{'=' * 80}")
    logger.info(f"{phase_name} - Tool Calls and Results")
    logger.info(f"{'=' * 80}")

    tool_call_count = 0
    for msg in messages:
        if isinstance(msg, ModelResponse):
            # Log tool calls from model responses
            for part in msg.parts:
                if isinstance(part, ToolCallPart):
                    tool_call_count += 1
                    logger.info(f"\n[Tool Call #{tool_call_count}] {part.tool_name}")
                    logger.info(f"  Args: {part.args}")

        elif isinstance(msg, ModelRequest):
            # Log tool results from model requests
            for part in msg.parts:
                if isinstance(part, ToolReturnPart):
                    logger.info(f"\n[Tool Result] {part.tool_name}")
                    # Truncate long results for readability
                    content_str = str(part.content)
                    if len(content_str) > 500:
                        logger.info(f"  Result: {content_str[:500]}... (truncated)")
                    else:
                        logger.info(f"  Result: {content_str}")

    logger.info(f"\nTotal tool calls: {tool_call_count}")
    logger.info(f"{'=' * 80}\n")
