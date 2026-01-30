import { useState, useEffect, useCallback, useTransition } from "react";
import {
  RequirementItem,
  Requirement,
  ImplementationStatus,
  ExtractedRequirementDto,
} from "@/types/requirement-types";
import {
  getDistinctRequirementTypes,
  getSimilarRequirements,
  listExtractedRequirementLinks,
  createExtractionLink,
  deleteExtractionLink,
  getRequirement,
  generateMerge,
  updateExtractedRequirement,
} from "@/lib/api/requirements";
import {
  createIgnoredRequirementsStorage,
  updateRequirementInList,
} from "@/lib/utils/requirement-indexing-utils";
import { autoLinkSimilarRequirements } from "@/lib/utils/auto-link-requirements";

// Module-level singleton for localStorage access
const ignoredRequirementsStorage = createIgnoredRequirementsStorage();

interface UseRequirementIndexingProps {
  open: boolean;
  initialRequirements?: RequirementItem[] | null;
}

export function useRequirementIndexing({
  open,
  initialRequirements,
}: UseRequirementIndexingProps) {
  const [, startTransition] = useTransition();

  // Core state
  const [requirements, setRequirements] = useState<RequirementItem[]>(
    initialRequirements || [],
  );
  const [selectedRequirementIndex, setSelectedRequirementIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(!initialRequirements);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);

  // Related requirements state
  const [linkedRequirements, setLinkedRequirements] = useState<Requirement[]>(
    [],
  );
  const [linkedRequirementsLoading, setLinkedRequirementsLoading] =
    useState(false);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);

  // UI state
  const [mergingRequirementId, setMergingRequirementId] = useState<
    string | null
  >(null);

  const selectedRequirement = requirements[selectedRequirementIndex];
  const combinedLoading = isLoading || typesLoading;

  // Sync requirements when initialRequirements changes
  useEffect(() => {
    if (initialRequirements && initialRequirements.length > 0) {
      setRequirements(initialRequirements);
      setIsLoading(false);
    } else if (initialRequirements) {
      setRequirements([]);
      setIsLoading(false);
    }
  }, [initialRequirements]);

  // Fetch available types when dialog opens
  useEffect(() => {
    if (open) {
      setTypesLoading(true);
      getDistinctRequirementTypes()
        .then((types) => {
          setAvailableTypes(types);
        })
        .catch((error) => {
          console.error("Failed to fetch requirement types:", error);
          setAvailableTypes([]);
        })
        .finally(() => {
          setTypesLoading(false);
        });
    }
  }, [open]);

  // Helper to fetch and set linked requirements from backend
  const fetchAndSetLinkedRequirements = useCallback(async () => {
    if (!selectedRequirement?.id) {
      setLinkedRequirements([]);
      return;
    }

    try {
      const linkedRequirementIds = await listExtractedRequirementLinks(
        selectedRequirement.id.toString(),
      );

      if (linkedRequirementIds.length === 0) {
        setLinkedRequirements([]);
        return;
      }

      const requirementPromises = linkedRequirementIds.map((id) =>
        getRequirement(id),
      );
      const loadedRequirements = await Promise.all(requirementPromises);
      setLinkedRequirements(loadedRequirements);
    } catch (error) {
      console.error("Failed to fetch linked requirements:", error);
      setLinkedRequirements([]);
    }
  }, [selectedRequirement]);

  // Load already linked requirements (no similarity search)
  const loadLinkedRequirements = useCallback(async () => {
    if (!open) {
      setLinkedRequirements([]);
      return;
    }

    setLinkedRequirementsLoading(true);
    await fetchAndSetLinkedRequirements();
    setLinkedRequirementsLoading(false);
  }, [open, fetchAndSetLinkedRequirements]);

  // Search for similar requirements and auto-link (manual refresh)
  const refreshSimilarRequirements = useCallback(async () => {
    if (!selectedRequirement?.id) {
      return;
    }

    setIsSearchingSimilar(true);

    try {
      // Always load ignored requirements fresh from localStorage to avoid race conditions
      const currentIgnored = ignoredRequirementsStorage.loadIgnoredRequirements(
        selectedRequirement.id.toString(),
      );

      // Get currently linked requirement IDs
      const linkedRequirementIds = await listExtractedRequirementLinks(
        selectedRequirement.id.toString(),
      );

      // Get similar requirements (excluding already linked and ignored ones)
      const allExcludeIds = [...linkedRequirementIds, ...currentIgnored];
      const results = await getSimilarRequirements(
        selectedRequirement,
        allExcludeIds,
      );

      // Auto-link requirements with high similarity using shared utility
      await autoLinkSimilarRequirements(results, (requirementId) =>
        createExtractionLink(requirementId, selectedRequirement.id.toString()),
      );

      // Reload linked requirements to show newly auto-linked ones
      await fetchAndSetLinkedRequirements();
    } catch (error) {
      console.error("Failed to refresh similar requirements:", error);
    } finally {
      setIsSearchingSimilar(false);
    }
  }, [selectedRequirement, fetchAndSetLinkedRequirements]);

  // Load linked requirements when selectedRequirement changes
  // Note: loadLinkedRequirements is intentionally excluded from deps to prevent
  // infinite re-renders. We only want to reload when the selected requirement ID
  // or dialog open state changes, not when the callback reference changes.
  useEffect(() => {
    loadLinkedRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequirement?.id, open]);

  // Helper to update hasLinks on the selected requirement
  const updateSelectedRequirementHasLinks = useCallback(
    (hasLinks: boolean) => {
      setRequirements((prev) =>
        prev.map((req, idx) =>
          idx === selectedRequirementIndex ? { ...req, hasLinks } : req,
        ),
      );
    },
    [selectedRequirementIndex],
  );

  // Generic helper to create links and reload (DRY principle)
  const createLinksAndReload = useCallback(
    async (requirementIds: string[]) => {
      if (!selectedRequirement?.id || requirementIds.length === 0) return;

      try {
        await Promise.all(
          requirementIds.map((reqId) =>
            createExtractionLink(reqId, selectedRequirement.id.toString()),
          ),
        );
        await fetchAndSetLinkedRequirements();
        // Update hasLinks since we just created a link
        updateSelectedRequirementHasLinks(true);
      } catch (error) {
        console.error("Failed to create extraction link(s):", error);
        throw error;
      }
    },
    [
      selectedRequirement,
      fetchAndSetLinkedRequirements,
      updateSelectedRequirementHasLinks,
    ],
  );

  // Generic persist function for updating extracted requirements
  const persistUpdate = async (payload: Partial<ExtractedRequirementDto>) => {
    if (!selectedRequirement?.id) return;
    const updated = await updateExtractedRequirement(
      selectedRequirement.id.toString(),
      payload,
    );
    setRequirements((prev) =>
      updateRequirementInList(prev, selectedRequirementIndex, updated),
    );
  };

  // Persist field changes
  const persistField = async (
    field:
      | "description"
      | "implementation_description"
      | "requirement_verification"
      | "implementation_status",
    value: string | ImplementationStatus | undefined,
  ) => {
    const payload: Partial<ExtractedRequirementDto> = {
      [field]:
        field === "implementation_status"
          ? value || null
          : ((value as string) ?? ""),
    };
    await persistUpdate(payload);
  };

  // Persist types changes
  const persistTypes = async (newTypes: string[]) => {
    await persistUpdate({ types: newTypes });
  };

  // Handle requirement selection
  const handleRequirementSelect = (index: number) => {
    startTransition(() => {
      setSelectedRequirementIndex(index);
    });
  };

  // Update requirement in local state
  const updateRequirement = (updates: Partial<RequirementItem>) => {
    if (
      selectedRequirementIndex >= 0 &&
      selectedRequirementIndex < requirements.length
    ) {
      const updatedRequirements = requirements.map((req, index) =>
        index === selectedRequirementIndex ? { ...req, ...updates } : req,
      );
      setRequirements(updatedRequirements);
    }
  };

  // Handle linking a single newly created requirement
  const linkNewRequirement = async (requirementId: string) => {
    await createLinksAndReload([requirementId]);
  };

  // Handle linking multiple existing requirements
  const handleLinkExistingRequirements = async (reqs: Requirement[]) => {
    await createLinksAndReload(reqs.map((req) => req.id.toString()));
  };

  // Handle unlinking requirement
  const handleUnlinkRequirement = async (linkedReq: Requirement) => {
    if (!selectedRequirement?.id) return;

    try {
      await deleteExtractionLink(
        linkedReq.id.toString(),
        selectedRequirement.id.toString(),
      );
      // Fetch remaining links and update state
      await fetchAndSetLinkedRequirements();
      // Update hasLinks based on remaining linked requirements (minus the one we just unlinked)
      const remainingCount = linkedRequirements.length - 1;
      updateSelectedRequirementHasLinks(remainingCount > 0);
    } catch (error) {
      console.error("Failed to delete extraction link:", error);
      throw error;
    }
  };

  // Handle merge generation
  const handleGenerateMerge = async (linkedReq: Requirement) => {
    if (!selectedRequirement?.id) return;

    const currentId = linkedReq.id?.toString();
    try {
      setMergingRequirementId(currentId);
      const mergedData = await generateMerge(
        selectedRequirement.id.toString(),
        currentId,
      );
      return {
        requirement: linkedReq,
        overrideValues: {
          description: mergedData.description,
          types: mergedData.types,
          implementation_status:
            mergedData.implementation_status as ImplementationStatus,
          implementation_description: mergedData.implementation_description,
        },
      };
    } catch (error) {
      console.error("Failed to generate merge:", error);
      throw error;
    } finally {
      setMergingRequirementId(null);
    }
  };

  // Navigate to next requirement
  const goToNext = () => {
    if (selectedRequirementIndex < requirements.length - 1) {
      setSelectedRequirementIndex(selectedRequirementIndex + 1);
      return false; // Continue to next
    } else {
      return true; // Last item reached
    }
  };

  return {
    // State
    requirements,
    selectedRequirement,
    selectedRequirementIndex,
    combinedLoading,
    availableTypes,
    linkedRequirements,
    linkedRequirementsLoading,
    isSearchingSimilar,
    mergingRequirementId,

    // Actions
    handleRequirementSelect,
    updateRequirement,
    persistField,
    persistTypes,
    loadLinkedRequirements,
    refreshSimilarRequirements,
    linkNewRequirement,
    handleLinkExistingRequirements,
    handleUnlinkRequirement,
    handleGenerateMerge,
    goToNext,
  };
}
