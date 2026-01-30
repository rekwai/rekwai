"""
Provides a service for interacting with external AI models, specifically Google Gemini.
"""

import asyncio
import random
import logging
from typing import List

from google import genai
from google.genai import types
from google.genai import errors

log = logging.getLogger(__name__)

GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 1536  # Dimension for embeddings used in database and API calls

MAX_RETRIES = 5
INITIAL_DELAY = 7.0


class ExternalAIService:
    def __init__(self):
        self._genai_client = genai.Client()

    async def create_embeddings(self, text: str) -> List[float]:
        """
        Creates embeddings for a single string using the Google Gemini API.
        """
        retries = 0
        delay = INITIAL_DELAY

        if not text:
            return []

        while retries < MAX_RETRIES:
            try:
                response = await asyncio.to_thread(
                    self._genai_client.models.embed_content,
                    model=GEMINI_EMBEDDING_MODEL,
                    contents=text,
                    config=types.EmbedContentConfig(
                        output_dimensionality=EMBEDDING_DIM
                    ),
                )

                return response.embeddings[0].values
            except errors.APIError as e:
                if ("429" in str(e) or "503" in str(e)) and retries < MAX_RETRIES - 1:
                    retries += 1
                    wait_time = delay * (2**retries) + random.uniform(0, 1)
                    error_type = (
                        "Rate limit" if "429" in str(e) else "Service unavailable"
                    )
                    log.warning(f"{error_type} error. Retrying in {wait_time:.2f}s.")
                    await asyncio.sleep(wait_time)
                else:
                    log.error(f"Google GenAI API error: {e}", exc_info=True)
                    raise
            except Exception as e:
                log.error(f"Unexpected error during embedding: {e}", exc_info=True)
                raise
        raise RuntimeError(f"Failed to create embeddings after {MAX_RETRIES} retries")
