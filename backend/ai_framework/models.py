"""Model creation and configuration for AI framework."""

import os
from typing import TypedDict, Type, Any

from httpx import AsyncClient, Timeout
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.providers.anthropic import AnthropicProvider
from pydantic_ai.providers.openrouter import OpenRouterProvider

# Default timeout for HTTP requests to LLM providers.
# read=30s catches hung connections (no data flowing) without affecting streaming responses.
DEFAULT_TIMEOUT = Timeout(connect=10.0, read=30.0, write=30.0, pool=10.0)

# Shared HTTP client for all LLM providers.
# Created eagerly at module load to avoid race conditions.
# Reusing a single client provides connection pooling and avoids resource leaks.
_shared_http_client = AsyncClient(timeout=DEFAULT_TIMEOUT)


def get_shared_http_client() -> AsyncClient:
    """Get the shared HTTP client for LLM providers.

    Returns:
        The shared AsyncClient instance with configured timeout.
    """
    return _shared_http_client


async def close_shared_http_client() -> None:
    """Close the shared HTTP client and release resources.

    Call this during application shutdown to properly close connections.
    """
    await _shared_http_client.aclose()


class ProviderConfig(TypedDict):
    """Configuration for a model provider.

    Attributes:
        model_class: The Model class to instantiate (e.g., OpenAIChatModel)
        provider_class: The Provider class to instantiate (e.g., OpenAIProvider)
        required_params: List of required parameter names ('api_key', 'base_url')
        env_vars: Mapping of parameter names to environment variable names
    """

    model_class: Type[Model]
    provider_class: Type[Any]
    required_params: list[str]
    env_vars: dict[str, str]


PROVIDER_REGISTRY: dict[str, ProviderConfig] = {
    "openai": {
        "model_class": OpenAIChatModel,
        "provider_class": OpenAIProvider,
        "required_params": ["api_key"],
        "env_vars": {"api_key": "OPENAI_API_KEY"},
    },
    "gemini": {
        "model_class": GoogleModel,
        "provider_class": GoogleProvider,
        "required_params": ["api_key"],
        "env_vars": {"api_key": "GOOGLE_API_KEY"},
    },
    "anthropic": {
        "model_class": AnthropicModel,
        "provider_class": AnthropicProvider,
        "required_params": ["api_key"],
        "env_vars": {"api_key": "ANTHROPIC_API_KEY"},
    },
    "custom_openai": {
        "model_class": OpenAIChatModel,
        "provider_class": OpenAIProvider,
        "required_params": ["api_key", "base_url"],
        "env_vars": {
            "api_key": "CUSTOM_OPENAI_API_KEY",
            "base_url": "CUSTOM_OPENAI_BASE_URL",
        },
    },
    "openrouter": {
        "model_class": OpenRouterModel,
        "provider_class": OpenRouterProvider,
        "required_params": ["api_key"],
        "env_vars": {"api_key": "OPENROUTER_API_KEY"},
    },
}


def create_model(
    model_name: str,
    provider: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
) -> Model:
    """
    Create an AI model instance.

    Args:
        model_name: The name of the model to use, or 'smart'/'fast' for environment-based selection
        provider: The model provider (e.g., 'openai', 'gemini', 'anthropic', 'custom_openai', 'openrouter'). If None, reads from SELECTED_PROVIDER
        api_key: API key for authentication (required for openai, gemini, anthropic, and openrouter). If None, reads from environment
        base_url: Base URL for the API (required for custom_openai). If None, reads from environment

    Returns:
        An instance of the requested model

    Raises:
        ValueError: If provider is not supported or required parameters are missing
    """
    # Resolve provider from environment if not provided
    if provider is None:
        provider = os.getenv("SELECTED_PROVIDER")
        if not provider:
            raise ValueError(
                "provider parameter is required or SELECTED_PROVIDER environment variable must be set"
            )

    # Check if provider is supported
    if provider not in PROVIDER_REGISTRY:
        raise ValueError(f"Unsupported provider: {provider}")

    config = PROVIDER_REGISTRY[provider]

    # Resolve model_name if it's "smart" or "fast"
    if model_name in ("smart", "fast"):
        model_type = "SMART_MODEL" if model_name == "smart" else "FAST_MODEL"
        env_var_name = f"{provider.upper()}_{model_type}"
        resolved_model_name = os.getenv(env_var_name)
        if not resolved_model_name:
            raise ValueError(
                f"{env_var_name} environment variable must be set for {model_name} model selection"
            )
        model_name = resolved_model_name

    # Build provider kwargs from parameters and environment variables
    provider_kwargs: dict[str, Any] = {}

    # Add shared HTTP client with timeout to prevent hung connections
    provider_kwargs["http_client"] = get_shared_http_client()

    # Resolve api_key if required
    if "api_key" in config["required_params"]:
        resolved_api_key = api_key or os.getenv(config["env_vars"]["api_key"])
        if not resolved_api_key:
            raise ValueError(
                f"api_key is required for {provider} provider (set {config['env_vars']['api_key']} environment variable)"
            )
        provider_kwargs["api_key"] = resolved_api_key

    # Resolve base_url if required
    if "base_url" in config["required_params"]:
        resolved_base_url = base_url or os.getenv(config["env_vars"]["base_url"])
        if not resolved_base_url:
            raise ValueError(
                f"base_url is required for {provider} provider (set {config['env_vars']['base_url']} environment variable)"
            )
        provider_kwargs["base_url"] = resolved_base_url

    # Create provider and model
    provider_instance = config["provider_class"](**provider_kwargs)
    return config["model_class"](model_name, provider=provider_instance)
