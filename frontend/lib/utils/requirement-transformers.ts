/**
 * Utility functions for transforming requirement data structures.
 * Centralizes data transformation logic for reusability and testability.
 */

import {
  RequirementItem,
  ImplementationStatus,
  SuggestedActionType,
} from "@/types/requirement-types";
import { DocumentWithRequirements } from "@/lib/api/requirements";

/**
 * Transforms extracted requirements from a document into RequirementItem format.
 *
 * @param data - Document data containing requirements and product ID
 * @returns Array of transformed RequirementItem objects
 */
export function transformDocumentRequirementsToItems(
  data: DocumentWithRequirements,
): RequirementItem[] {
  return data.requirements.map((req) => ({
    id: req.id,
    text: req.description,
    description: req.description,
    types: req.types,
    implementation: req.implementation_status as ImplementationStatus,
    implementationDescription: req.implementation_description ?? undefined,
    requirementVerification: req.requirement_verification ?? undefined,
    hasLinks: req.has_links,
    createdAt: req.extraction_timestamp,
    updatedAt: req.extraction_timestamp,
    decisionType: "",
    product_id: data.product_id,
    suggestedAction: req.suggested_action as SuggestedActionType | undefined,
    suggestedTargetRequirementId: req.suggested_target_requirement_id ?? undefined,
    suggestionJustification: req.suggestion_justification ?? undefined,
    suggestionSimilarityScore: req.suggestion_similarity_score ?? undefined,
    suggestedTargetRequirement: req.suggested_target_requirement ?? undefined,
  }));
}
