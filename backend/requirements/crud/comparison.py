"""Module for comparing requirements using an LLM."""

import logging
import asyncio
from typing import Optional, List

from ai.external_ai import ExternalAIService
from ai_framework.agent import create_agent
from .models import LLMSimilarityResult, SimilarRequirementWithLLM
from .repository import RequirementRepository

logger = logging.getLogger(__name__)

REQUIREMENT_COMPARISON_PROMPT = """
You are an expert requirements analyst helping maintain a clean, comprehensive requirements database.

**Goal:**
Avoid cluttering the database with duplicates or slight variations. Requirements should be linked if they cover the same topic and could benefit from being merged into a single, more comprehensive requirement.

**Input:**
1.  **Document Requirement:** A requirement extracted from a source document.
2.  **Main Requirement:** An existing requirement in the database.

**Decision Criteria:**
Ask yourself: "Should these requirements be kept as separate entries, or do they belong together?"

Mark as similar (is_similar=true) if ANY of these apply:
- They are essentially the same requirement with different wording
- One is a more detailed version of the other
- They cover the same topic and could be merged into a more comprehensive requirement
- One expands on or adds specifics to the other
- The same action/capability needs to be done across multiple documents or procedures (these can be unified into one requirement)

Mark as NOT similar (is_similar=false) if:
- They address fundamentally different topics or concerns
- They would not benefit from being merged (keeping them separate adds value)

**Output Format:**
{
  "is_similar": boolean,
  "similarity_score": float (0.0 to 1.0),
  "justification": "string (1-2 sentences explaining your reasoning)"
}
"""


class RequirementComparisonService:
    def __init__(
        self,
        external_ai_service: ExternalAIService,
        requirement_repository: RequirementRepository,
    ):
        self.external_ai_service = external_ai_service
        self.requirement_repository = requirement_repository

    async def find_similar_requirements_with_llm_comparison(
        self,
        text_to_embed: str,
        doc_req_text: str,
        product_id: str,
        limit: int = 3,
        filter_reqs: List[str] = None,
    ) -> List[SimilarRequirementWithLLM]:
        """
        Common method for finding similar requirements using embeddings and LLM comparison.

        Args:
            text_to_embed: Text to create embeddings from
            doc_req_text: Text to use for LLM comparison
            product_id: Product ID to filter requirements
            limit: Maximum number of similar requirements to return
            filter_reqs: List of requirement IDs to filter out

        Returns:
            List of similar requirements with LLM comparison results
        """
        if not text_to_embed or not text_to_embed.strip():
            return []

        # Create embedding for the text
        embedding = await self.external_ai_service.create_embeddings(
            text_to_embed.strip()
        )

        if not embedding:
            return []

        # Find similar requirements using the repository
        similar_reqs_db = self.requirement_repository.find_similar(
            embedding=embedding,
            product_id=product_id,
            limit=limit,
            filter_reqs=filter_reqs,
        )
        if not similar_reqs_db:
            return []

        logger.debug(
            f"Found {len(similar_reqs_db)} candidate requirements for comparison"
        )

        # Filter requirements with descriptions and compare with LLM
        reqs_with_description = [req for req in similar_reqs_db if req.description]
        tasks = [
            self.compare_requirements_with_llm(
                doc_req_text=doc_req_text,
                main_req_text=similar_req.description,
            )
            for similar_req in reqs_with_description
        ]

        llm_results = await asyncio.gather(*tasks)

        # Build results with LLM comparison
        results_with_llm = []
        for similar_req_db, llm_result in zip(reqs_with_description, llm_results):
            if llm_result and llm_result.is_similar:
                # Convert RequirementDB to RequirementDto first
                similar_req_dto = self.requirement_repository.transform_to_dto(
                    similar_req_db
                )
                results_with_llm.append(
                    SimilarRequirementWithLLM(
                        **similar_req_dto.model_dump(), llm_result=llm_result
                    )
                )

        logger.debug(
            f"Found {len(results_with_llm)} similar requirements after LLM comparison"
        )

        return results_with_llm

    async def compare_requirements_with_llm(
        self, doc_req_text: str, main_req_text: str
    ) -> Optional[LLMSimilarityResult]:
        """
        Uses an LLM to compare a document requirement text with a main requirement text.
        """
        if not doc_req_text or not main_req_text:
            logger.warning("Attempted LLM comparison with empty requirement text.")
            return None

        comparison_input_text = f"""
**Document Requirement:**
{doc_req_text}

**Main Requirement:**
{main_req_text}
"""
        try:
            agent = create_agent(
                "fast",
                system_prompt=REQUIREMENT_COMPARISON_PROMPT,
                output_type=LLMSimilarityResult,
            )
            result = await agent.run(comparison_input_text)
            return result.output
        except Exception as e:
            logger.error(
                f"Error in LLM comparison: {e}",
                exc_info=True,
            )
            return None
