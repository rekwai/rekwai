/**
 * Utility functions for auto-linking requirements based on similarity.
 * Follows DRY principle by centralizing the auto-linking logic.
 */

/**
 * Generic type for requirements with LLM similarity results
 */
interface SimilarRequirement {
  id: string;
  llm_result: { is_similar: boolean } | null;
}

/**
 * Filters and auto-links requirements with high similarity.
 * Only links requirements where the LLM determined they are similar.
 *
 * @param similarRequirements - Array of requirements with similarity scores
 * @param linkFunction - Function to create the link (receives requirement ID and target ID)
 * @returns Promise that resolves when all links are created
 */
export async function autoLinkSimilarRequirements(
  similarRequirements: SimilarRequirement[],
  linkFunction: (requirementId: string) => Promise<void>,
): Promise<void> {
  const requirementsToLink = similarRequirements.filter(
    (req) => req.llm_result?.is_similar === true,
  );

  if (requirementsToLink.length > 0) {
    await Promise.all(
      requirementsToLink.map((req) => linkFunction(req.id.toString())),
    );
  }
}
