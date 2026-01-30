import {
  RequirementItem,
  ImplementationStatus,
  ExtractedRequirementDto,
} from "@/types/requirement-types";

interface IgnoredRequirementsStorage {
  saveIgnoredRequirements: (
    extractedRequirementId: string,
    ignoredIds: string[],
  ) => void;
  loadIgnoredRequirements: (extractedRequirementId: string) => string[];
}

export function createIgnoredRequirementsStorage(
  storageKeyPrefix: string = "requirement_indexing_ignored",
): IgnoredRequirementsStorage {
  const getIgnoreStorageKey = (id: string) => `${storageKeyPrefix}_${id}`;

  const saveIgnoredRequirements = (
    extractedRequirementId: string,
    ignoredIds: string[],
  ) => {
    try {
      localStorage.setItem(
        getIgnoreStorageKey(extractedRequirementId),
        JSON.stringify(ignoredIds),
      );
    } catch (error) {
      console.warn(
        "Failed to save ignored requirements to localStorage:",
        error,
      );
    }
  };

  const loadIgnoredRequirements = (
    extractedRequirementId: string,
  ): string[] => {
    try {
      const stored = localStorage.getItem(
        getIgnoreStorageKey(extractedRequirementId),
      );
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn(
        "Failed to load ignored requirements from localStorage:",
        error,
      );
      return [];
    }
  };

  return {
    saveIgnoredRequirements,
    loadIgnoredRequirements,
  };
}

export function updateRequirementInList(
  requirements: RequirementItem[],
  selectedIndex: number,
  updated: ExtractedRequirementDto,
): RequirementItem[] {
  return requirements.map((req, idx) => {
    if (idx !== selectedIndex) return req;
    return {
      ...req,
      text: updated.description,
      description: updated.description,
      types: updated.types || req.types,
      implementationDescription:
        updated.implementation_description !== undefined
          ? updated.implementation_description
          : req.implementationDescription,
      requirementVerification:
        updated.requirement_verification !== undefined
          ? updated.requirement_verification
          : req.requirementVerification,
      implementation:
        (updated.implementation_status as ImplementationStatus) ||
        req.implementation,
      hasLinks: updated.has_links,
      updatedAt: updated.extraction_timestamp || req.updatedAt,
    } as RequirementItem;
  });
}
