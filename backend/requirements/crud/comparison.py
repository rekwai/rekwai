"""Module for comparing requirements using an LLM."""

import logging
import asyncio
from typing import Optional, List

from pydantic_ai import RunContext, ModelRetry

from ai.external_ai import ExternalAIService
from ai_framework.agent import create_agent
from ai_framework.agent_utils import run_agent_with_retry
from .models import (
    LLMSimilarityResult,
    SimilarRequirementWithLLM,
    LLMActionDecision,
    SuggestedAction,
    SuggestedActionType,
    ActionDecisionValidationResult,
)
from .repository import RequirementRepository
from . import tables

logger = logging.getLogger(__name__)

REQUIREMENT_ACTION_DECISION_PROMPT = """
You are an expert requirements analyst. Given an extracted requirement from a source document \
and a list of existing requirements, decide the single best action.

**Goal:** Keep the requirements database lean and consolidated. Avoid bloat — prefer linking \
to or enriching existing requirements over creating new ones.

**Actions:**
- **attach**: An existing requirement *fully covers* the extracted one. Just link the document — \
no content changes needed. The match is a near-duplicate: same goal, same scope, no meaningful \
new information to add.
- **merge**: An existing requirement covers the *same specific concern* and could be enriched. Use when:
  - The extracted requirement adds specifics, context, or nuance to an existing one.
  - Both requirements address the same control mechanism or approach (not just the same broad topic).
  - Implementation and verification would stay similar between the two.
  - The new document provides an implementation status update for an existing requirement \
(e.g., one describes the planned capability, the other confirms it's been implemented — \
merge to update status/details).
  - Do NOT merge just because two requirements fall under the same broad category (e.g., both \
under "access control" or both under "security"). Requirements that use different control \
mechanisms — such as procedural controls (role-based access, least privilege) vs. technology \
controls (MFA, encryption) — should remain separate even if they share a parent topic.
- **create_new**: Only when:
  - The topic is completely new (none of the existing requirements cover it).
  - The requirement addresses a different control mechanism, approach, or perspective than \
all existing requirements — even if it falls under the same broad category.
  - Implementation would be *completely* different from all existing requirements.
  - Verification would be *completely* different from all existing requirements.

**Rules:**
1. Pick exactly ONE action and (for attach/merge) exactly ONE best match.
2. For attach: similarity_score should be >= 0.8. The match must be a near-duplicate.
3. For merge: similarity_score should be >= 0.5. The match covers the same topic but differs in detail.
4. For create_new: set best_match_index to null and similarity_score to the highest score among existing requirements (or 0.0 if none).
5. When in doubt between attach and merge, prefer merge — it's safer to review than to silently link.
6. When deciding between merge and create_new, ask: "Do these requirements use the same control \
mechanism or approach?" If yes, prefer merge. If they address different mechanisms (e.g., procedural \
vs. technical, preventive vs. detective), prefer create_new even if they share a broad topic.
7. Use the provided implementation and verification details to assess merge vs create_new. \
If implementation or verification would be similar, that strongly favors merge. If they would \
require fundamentally different processes, that favors create_new.
"""

ACTION_DECISION_VALIDATION_PROMPT = """
You are a validation agent for requirement action decisions. The goal is to keep the requirements \
database lean — prefer consolidation (attach/merge) over creating new entries.

**Validation checks:**
1. If action is 'attach' or 'merge', best_match_index must be a valid index into the existing requirements list.
2. If action is 'create_new', best_match_index should be null.
3. The justification must be consistent with the chosen action — e.g., if the justification says \
"no existing requirement covers this", the action should be 'create_new', not 'attach'.
4. For 'attach', verify the existing requirement truly FULLY covers the extracted requirement (the justification \
should reflect this). If the existing requirement only partially covers it, the action should be 'merge'.
5. For 'merge', verify the existing requirement addresses the *same control mechanism or approach* — \
not just the same broad topic. Two requirements under "access control" that use different mechanisms \
(e.g., least-privilege vs. MFA) should NOT be merged. If implementation or verification would be \
similar, merge is correct. If they require fundamentally different processes, suggest create_new.
6. similarity_score should be reasonable for the action: attach >= 0.8, merge >= 0.5.
7. For 'create_new', verify the justification explains why the requirement addresses a different \
concern or mechanism than existing requirements. create_new is appropriate when the requirement \
uses a different control type, approach, or mechanism — even if it falls under the same broad category.

Output your validation result.
"""

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

    async def _find_candidates_with_descriptions(
        self,
        text_to_embed: str,
        product_id: str,
        limit: int,
        filter_reqs: List[str] = None,
    ) -> Optional[List[tables.RequirementDB]]:
        """
        Shared helper: validate text, create embedding, and find candidate requirements.

        Returns:
            List of candidate DB objects with descriptions, or None if no candidates found.
        """
        if not text_to_embed or not text_to_embed.strip():
            return None

        embedding = await self.external_ai_service.create_embeddings(
            text_to_embed.strip()
        )
        if not embedding:
            return None

        similar_reqs_db = self.requirement_repository.find_similar(
            embedding=embedding,
            product_id=product_id,
            limit=limit,
            filter_reqs=filter_reqs,
        )

        candidates = [req for req in similar_reqs_db if req.description]
        return candidates if candidates else None

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
        candidates = await self._find_candidates_with_descriptions(
            text_to_embed, product_id, limit, filter_reqs
        )
        if not candidates:
            return []

        logger.debug(
            f"Found {len(candidates)} candidate requirements for comparison"
        )

        tasks = [
            self.compare_requirements_with_llm(
                doc_req_text=doc_req_text,
                main_req_text=candidate.description,
            )
            for candidate in candidates
        ]

        llm_results = await asyncio.gather(*tasks)

        # Build results with LLM comparison
        results_with_llm = []
        for similar_req_db, llm_result in zip(candidates, llm_results):
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

    async def decide_action_for_requirement(
        self,
        text_to_embed: str,
        doc_req_text: str,
        product_id: str,
        limit: int = 5,
        filter_reqs: List[str] = None,
    ) -> SuggestedAction:
        """
        Decide a single action (attach, merge, or create_new) for an extracted requirement.

        Uses vector search to find candidates, then a single LLM call to decide the best action,
        validated by a second LLM agent.

        Returns:
            SuggestedAction with the recommended action and target requirement (if any).
        """
        candidates = await self._find_candidates_with_descriptions(
            text_to_embed, product_id, limit, filter_reqs
        )
        if not candidates:
            return SuggestedAction(
                action=SuggestedActionType.CREATE_NEW,
                justification="No existing requirements found for comparison.",
                similarity_score=0.0,
            )

        # Convert candidates to DTOs for the response
        candidate_dtos = [
            self.requirement_repository.transform_to_dto(req) for req in candidates
        ]

        logger.debug(
            f"Found {len(candidates)} candidate requirements for action decision"
        )

        # Build formatted candidate list for the LLM with full details
        candidates_text = "\n\n".join(
            f"[{i}] (key: {dto.requirement_key})\n"
            f"  Description: {dto.description}\n"
            f"  Types: {', '.join(dto.types)}\n"
            f"  Implementation: {dto.implementation_status} — {dto.implementation_description}\n"
            f"  Verification: {dto.requirement_verification or 'N/A'}"
            for i, dto in enumerate(candidate_dtos)
        )

        user_prompt = f"""**Extracted Requirement (from source document):**
{doc_req_text}

**Existing Requirements:**
{candidates_text}
"""

        try:
            # Create decision agent with output validation
            decision_agent = create_agent(
                "fast",
                system_prompt=REQUIREMENT_ACTION_DECISION_PROMPT,
                output_type=LLMActionDecision,
            )

            # Register output validator that uses a validation agent
            @decision_agent.output_validator
            async def validate_decision(
                ctx: RunContext, output: LLMActionDecision
            ) -> LLMActionDecision:
                validation_result = await self._validate_action_decision(
                    output, doc_req_text, candidates_text
                )
                if not validation_result.is_valid:
                    feedback = (
                        f"Validation failed. Issues: {'; '.join(validation_result.issues)}. "
                    )
                    if validation_result.suggested_action:
                        feedback += (
                            f"Consider changing action to '{validation_result.suggested_action.value}'."
                        )
                    raise ModelRetry(feedback)
                return output

            result = await run_agent_with_retry(
                decision_agent,
                user_prompt=user_prompt,
                deps=None,
            )
            decision: LLMActionDecision = result.output

            # Validate best_match_index bounds
            if decision.action in (
                SuggestedActionType.ATTACH,
                SuggestedActionType.MERGE,
            ):
                if (
                    decision.best_match_index is None
                    or decision.best_match_index < 0
                    or decision.best_match_index >= len(candidate_dtos)
                ):
                    logger.warning(
                        f"Invalid best_match_index {decision.best_match_index} "
                        f"for {len(candidate_dtos)} candidates. Defaulting to create_new."
                    )
                    return SuggestedAction(
                        action=SuggestedActionType.CREATE_NEW,
                        justification="AI returned invalid match index; defaulting to create new.",
                        similarity_score=decision.similarity_score,
                    )

                target_dto = candidate_dtos[decision.best_match_index]
                return SuggestedAction(
                    action=decision.action,
                    target_requirement_id=target_dto.id,
                    target_requirement=target_dto,
                    justification=decision.justification,
                    similarity_score=decision.similarity_score,
                )
            else:
                return SuggestedAction(
                    action=SuggestedActionType.CREATE_NEW,
                    justification=decision.justification,
                    similarity_score=decision.similarity_score,
                )

        except Exception as e:
            logger.error(f"Error in action decision: {e}", exc_info=True)
            return SuggestedAction(
                action=SuggestedActionType.CREATE_NEW,
                justification="Error during AI decision; defaulting to create new.",
                similarity_score=0.0,
            )

    async def _validate_action_decision(
        self,
        decision: LLMActionDecision,
        doc_req_text: str,
        candidates_text: str,
    ) -> ActionDecisionValidationResult:
        """Run a validation agent to check the action decision."""
        validation_prompt = f"""**Decision to validate:**
Action: {decision.action.value}
Best match index: {decision.best_match_index}
Similarity score: {decision.similarity_score}
Justification: {decision.justification}

**Extracted Requirement:**
{doc_req_text}

**Existing Requirements:**
{candidates_text}
"""
        try:
            validation_agent = create_agent(
                "fast",
                system_prompt=ACTION_DECISION_VALIDATION_PROMPT,
                output_type=ActionDecisionValidationResult,
            )
            result = await run_agent_with_retry(
                validation_agent,
                user_prompt=validation_prompt,
                deps=None,
            )
            return result.output
        except Exception as e:
            logger.warning(f"Validation agent failed, accepting decision: {e}")
            return ActionDecisionValidationResult(is_valid=True, issues=[])

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
