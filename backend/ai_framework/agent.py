"""Agent creation and configuration for AI framework."""

from dataclasses import dataclass
from typing import Any, Callable

from pydantic import BaseModel
from pydantic_ai import Agent

from ai_framework.models import create_model


@dataclass
class AgentCreationParams:
    """Parameters used to create an agent, stored for fallback recreation."""

    model_name: str
    system_prompt: str | list[str]
    tools: list[Callable[..., Any]] | None
    output_type: type[BaseModel] | None
    retries: int
    max_tokens: int | None
    prepare_tools: Callable[..., Any] | None


# Registry to store creation params without modifying Agent instances.
# Uses id(agent) as key since Agent is not hashable.
# Entries must be explicitly removed via pop_agent_creation_params() after use.
_agent_creation_params: dict[int, AgentCreationParams] = {}


def get_agent_creation_params(agent: Agent) -> AgentCreationParams | None:
    """Retrieve creation params for an agent from the registry without removing.

    Use this when you need to inspect agent configuration but the agent
    will continue to be used (e.g., for conditional logic based on model type).

    Args:
        agent: The agent to look up

    Returns:
        AgentCreationParams if found, None otherwise
    """
    return _agent_creation_params.get(id(agent))


def pop_agent_creation_params(agent: Agent) -> AgentCreationParams | None:
    """Retrieve and remove creation params for an agent from the registry.

    This should be called after the agent is no longer needed to prevent
    memory leaks from stale entries.

    Args:
        agent: The agent to look up and remove

    Returns:
        AgentCreationParams if found, None otherwise
    """
    return _agent_creation_params.pop(id(agent), None)


def create_agent(
    model_name: str,
    system_prompt: str | list[str],
    tools: list[Callable[..., Any]] | None = None,
    output_type: type[BaseModel] | None = None,
    retries: int = 3,
    max_tokens: int | None = None,
    prepare_tools: Callable[..., Any] | None = None,
) -> Agent:
    """
    Create an AI agent instance.

    Args:
        model_name: The name of the model to use, or 'smart'/'fast' for environment-based selection
        system_prompt: System prompt(s) to guide the agent's behavior
        tools: Optional list of tool functions that the agent can use
        output_type: Optional Pydantic model for structured output responses
        retries: Number of retries for output validation (default: 3)
        max_tokens: Maximum tokens for response generation. Defaults to 2000 for fast models
            to prevent runaway generation.
        prepare_tools: Optional callback to dynamically filter/modify tools before each model call.
            Signature: async def prepare_tools(ctx: RunContext, tool_defs: list[ToolDefinition]) -> list[ToolDefinition]

    Returns:
        A configured Agent instance with optional structured output
    """
    model = create_model(model_name=model_name)

    # Default max_tokens for fast models to prevent runaway generation
    if max_tokens is None and model_name == "fast":
        max_tokens = 2000

    agent_kwargs = {
        "model": model,
        "system_prompt": system_prompt,
        "tools": tools or [],
        "retries": retries,
    }

    if output_type:
        agent_kwargs["output_type"] = output_type

    if max_tokens is not None:
        agent_kwargs["model_settings"] = {"max_tokens": max_tokens}

    if prepare_tools is not None:
        agent_kwargs["prepare_tools"] = prepare_tools

    agent = Agent(**agent_kwargs)

    # Store creation params in registry for fallback agent creation (used by run_agent_with_retry)
    _agent_creation_params[id(agent)] = AgentCreationParams(
        model_name=model_name,
        system_prompt=system_prompt,
        tools=tools,
        output_type=output_type,
        retries=retries,
        max_tokens=max_tokens,
        prepare_tools=prepare_tools,
    )

    return agent
