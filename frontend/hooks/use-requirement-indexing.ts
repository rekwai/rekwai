import {
  useState,
  useEffect,
  useCallback,
  useTransition,
  useRef,
} from "react";
import {
  RequirementItem,
  Requirement,
  ImplementationStatus,
  ExtractedRequirementDto,
  SuggestedAction,
  SuggestedActionType,
  MergeInfo,
  LinkType,
} from "@/types/requirement-types";
import {
  getDistinctRequirementTypes,
  getSuggestedAction,
  listExtractedRequirementLinks,
  createExtractionLink,
  deleteExtractionLink,
  getRequirement,
  generateMerge,
  updateExtractedRequirement,
  acceptSuggestion,
  undoMerge as undoMergeApi,
} from "@/lib/api/requirements";
import { updateRequirementInList } from "@/lib/utils/requirement-indexing-utils";

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
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const [suggestedAction, setSuggestedAction] =
    useState<SuggestedAction | null>(null);
  /** Extracted requirement id that `suggestedAction` belongs to (avoids list/panel mismatch when selection changes before state catches up). */
  const [suggestedExtractedId, setSuggestedExtractedId] = useState<
    string | null
  >(null);

  // UI state
  const [mergingRequirementId, setMergingRequirementId] = useState<
    string | null
  >(null);
  const [refreshingSuggestionIds, setRefreshingSuggestionIds] = useState<
    Set<string>
  >(new Set());
  const [lastMergeInfo, setLastMergeInfo] = useState<MergeInfo | null>(null);

  const selectedRequirement = requirements[selectedRequirementIndex];
  const combinedLoading = isLoading || typesLoading;

  const selectedExtractionRef = useRef<string | null>(null);
  selectedExtractionRef.current = selectedRequirement?.id?.toString() ?? null;

  // Shared helper to clear all suggestion fields on a requirement
  const withClearedSuggestion = (req: RequirementItem): RequirementItem => ({
    ...req,
    suggestedAction: undefined,
    suggestedTargetRequirementId: undefined,
    suggestionJustification: undefined,
    suggestionSimilarityScore: undefined,
    suggestedTargetRequirement: undefined,
    mergePreview: undefined,
  });

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

  const updateSelectedRequirementLink = useCallback(
    (hasLinks: boolean, linkType?: RequirementItem["linkType"]) => {
      setRequirements((prev) =>
        prev.map((req, idx) =>
          idx === selectedRequirementIndex
            ? { ...req, hasLinks, ...(linkType !== undefined && { linkType }) }
            : req,
        ),
      );
    },
    [selectedRequirementIndex],
  );

  // Fetch AI suggested action for the selected requirement
  const fetchSuggestedAction = useCallback(async () => {
    if (!selectedRequirement?.id) {
      return;
    }

    const extractedId = selectedRequirement.id.toString();

    setIsFetchingSuggestion(true);

    try {
      // Derive exclude IDs from already-loaded linked requirements state
      const excludeIds = linkedRequirements.map((r) => r.id.toString());

      const result = await getSuggestedAction(
        extractedId,
        excludeIds,
      );

      if (selectedExtractionRef.current !== extractedId) {
        return;
      }

      setSuggestedAction(result);
      setSuggestedExtractedId(extractedId);
      setRequirements((prev) =>
        prev.map((req) =>
          req.id.toString() === extractedId
            ? {
                ...req,
                suggestedAction: result.action,
                suggestedTargetRequirementId:
                  result.target_requirement_id ?? undefined,
                suggestionJustification: result.justification ?? undefined,
                suggestionSimilarityScore: result.similarity_score ?? undefined,
                suggestedTargetRequirement:
                  result.target_requirement ?? undefined,
                mergePreview: result.merge_preview ?? undefined,
              }
            : req,
        ),
      );
    } catch (error) {
      console.error("Failed to fetch suggested action:", error);
    } finally {
      setIsFetchingSuggestion(false);
    }
  }, [selectedRequirement, linkedRequirements]);

  // Helper to clear stored suggestion fields from the local requirement
  const clearSelectedRequirementSuggestion = useCallback(() => {
    setRequirements((prev) =>
      prev.map((req, idx) =>
        idx === selectedRequirementIndex
          ? withClearedSuggestion(req)
          : req,
      ),
    );
  }, [selectedRequirementIndex]);

  // Refresh suggestions for a list of extracted requirement IDs (e.g. after merge invalidation)
  const refreshSuggestionsForIds = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      setRefreshingSuggestionIds((prev) => new Set([...prev, ...ids]));

      try {
        const results = await Promise.allSettled(
          ids.map((id) => getSuggestedAction(id)),
        );

        setRequirements((prev) =>
          prev.map((req) => {
            const idx = ids.indexOf(req.id.toString());
            if (idx === -1) return req;

            const result = results[idx];
            if (result.status === "fulfilled") {
              const suggestion = result.value;
              return {
                ...req,
                suggestedAction: suggestion.action as SuggestedActionType,
                suggestedTargetRequirementId:
                  suggestion.target_requirement_id ?? undefined,
                suggestionJustification: suggestion.justification ?? undefined,
                suggestionSimilarityScore:
                  suggestion.similarity_score ?? undefined,
                suggestedTargetRequirement:
                  suggestion.target_requirement ?? undefined,
                mergePreview: suggestion.merge_preview ?? undefined,
              };
            }
            return req;
          }),
        );
      } finally {
        setRefreshingSuggestionIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }
    },
    [],
  );

  // Confirm the AI suggestion
  const confirmSuggestion = useCallback(async (): Promise<{
    action: SuggestedAction["action"];
    requirement?: Requirement;
    invalidated_ids?: string[];
  } | null> => {
    if (!suggestedAction || !selectedRequirement?.id) return null;
    if (
      suggestedExtractedId != null &&
      suggestedExtractedId !== selectedRequirement.id.toString()
    ) {
      return null;
    }

    const { action, target_requirement_id, target_requirement } =
      suggestedAction;

    // Call backend accept endpoint (creates link for attach, clears suggestion)
    let invalidated_ids: string[] = [];
    try {
      const acceptResult = await acceptSuggestion(
        selectedRequirement.id.toString(),
      );
      invalidated_ids = acceptResult.invalidated_ids || [];
    } catch (error) {
      console.error("Failed to accept suggestion:", error);
      return null; // Keep suggestion state intact so user can retry
    }

    // Only update linked requirements state for attach (backend creates link immediately).
    // For merge, the link is created later after the user completes the merge drawer.
    if (action === "attach" && target_requirement_id) {
      await fetchAndSetLinkedRequirements();
      updateSelectedRequirementLink(true, "attach");
    }

    // Clear local suggestion fields for invalidated siblings immediately
    if (invalidated_ids.length > 0) {
      setRequirements((prev) =>
        prev.map((req) =>
          invalidated_ids.includes(req.id.toString())
            ? withClearedSuggestion(req)
            : req,
        ),
      );
    }

    const result = {
      action,
      requirement: target_requirement ?? undefined,
      invalidated_ids,
    };

    setSuggestedAction(null);
    setSuggestedExtractedId(null);
    clearSelectedRequirementSuggestion();
    return result;
  }, [
    suggestedAction,
    suggestedExtractedId,
    selectedRequirement,
    fetchAndSetLinkedRequirements,
    updateSelectedRequirementLink,
    clearSelectedRequirementSuggestion,
  ]);

  // Restore suggestion state locally after undo
  const restoreSuggestionState = useCallback(
    (suggestion: SuggestedAction) => {
      const extractedId =
        requirements[selectedRequirementIndex]?.id?.toString() ?? null;
      setSuggestedAction(suggestion);
      setSuggestedExtractedId(extractedId);
      setRequirements((prev) =>
        prev.map((req, idx) =>
          idx === selectedRequirementIndex
            ? {
                ...req,
                suggestedAction: suggestion.action,
                suggestedTargetRequirementId:
                  suggestion.target_requirement_id ?? undefined,
                suggestionJustification:
                  suggestion.justification ?? undefined,
                suggestionSimilarityScore:
                  suggestion.similarity_score ?? undefined,
                suggestedTargetRequirement:
                  suggestion.target_requirement ?? undefined,
                mergePreview: suggestion.merge_preview ?? undefined,
              }
            : req,
        ),
      );
    },
    [selectedRequirementIndex, requirements],
  );

  // Undo a merge (restore requirement to pre-merge state)
  const undoMerge = useCallback(async (): Promise<string[]> => {
    const info = lastMergeInfo;
    if (!info) return [];

    const suggestionRestore = info.previousSuggestion
      ? {
          suggested_action: info.previousSuggestion.action,
          suggested_target_requirement_id:
            info.previousSuggestion.target_requirement_id,
          suggestion_justification: info.previousSuggestion.justification,
          suggestion_similarity_score:
            info.previousSuggestion.similarity_score,
          merge_preview: info.previousSuggestion.merge_preview ?? null,
        }
      : undefined;

    try {
      const result = await undoMergeApi(
        info.extractedReqId,
        info.targetReqId,
        suggestionRestore,
      );

      setLastMergeInfo(null);
      await fetchAndSetLinkedRequirements();
      const linkedIds = await listExtractedRequirementLinks(
        info.extractedReqId,
      );
      updateSelectedRequirementLink(linkedIds.length > 0);

      if (info.previousSuggestion) {
        restoreSuggestionState(info.previousSuggestion);
      }

      return result.invalidated_ids || [];
    } catch (error) {
      console.error("Failed to undo merge:", error);
      throw error;
    }
  }, [lastMergeInfo, fetchAndSetLinkedRequirements, updateSelectedRequirementLink, restoreSuggestionState]);

  // Auto-populate hook suggestion from the selected row's stored fields (document load or patch)
  useEffect(() => {
    if (
      selectedRequirement?.suggestedAction &&
      selectedRequirement.suggestionJustification
    ) {
      setSuggestedAction({
        action: selectedRequirement.suggestedAction,
        target_requirement_id:
          selectedRequirement.suggestedTargetRequirementId ?? null,
        target_requirement:
          selectedRequirement.suggestedTargetRequirement ?? null,
        justification: selectedRequirement.suggestionJustification,
        similarity_score: selectedRequirement.suggestionSimilarityScore ?? 0,
        merge_preview: selectedRequirement.mergePreview ?? undefined,
      });
      setSuggestedExtractedId(selectedRequirement.id.toString());
    } else {
      setSuggestedAction(null);
      setSuggestedExtractedId(null);
    }
  }, [
    selectedRequirement?.id,
    selectedRequirement?.suggestedAction,
    selectedRequirement?.suggestionJustification,
    selectedRequirement?.suggestedTargetRequirementId,
    selectedRequirement?.suggestionSimilarityScore,
    selectedRequirement?.suggestedTargetRequirement,
    selectedRequirement?.mergePreview,
  ]);

  useEffect(() => {
    setLastMergeInfo(null);
  }, [selectedRequirement?.id]);

  // Default behavior: for unlinked extractions, eagerly fetch a suggestion when
  // nothing is available locally, so the right panel doesn't land in a dead end.
  useEffect(() => {
    if (!open) return;
    if (!selectedRequirement?.id) return;
    if (selectedRequirement.hasLinks) return;
    if (lastMergeInfo) return;
    if (isFetchingSuggestion) return;

    if (selectedRequirement.suggestedAction && selectedRequirement.suggestionJustification) {
      return;
    }
    const hookAlignedWithRow =
      suggestedAction &&
      suggestedExtractedId != null &&
      suggestedExtractedId === selectedRequirement.id.toString();

    if (hookAlignedWithRow) {
      return;
    }
    if (linkedRequirementsLoading) {
      return;
    }
    if (linkedRequirements.length > 0) {
      return;
    }

    void fetchSuggestedAction();
  }, [
    open,
    selectedRequirement?.id,
    selectedRequirement?.suggestedAction,
    selectedRequirement?.suggestionJustification,
    isFetchingSuggestion,
    suggestedAction,
    suggestedExtractedId,
    linkedRequirementsLoading,
    linkedRequirements.length,
    lastMergeInfo,
    fetchSuggestedAction,
  ]);

  // Load linked requirements when selectedRequirement changes
  // Note: loadLinkedRequirements is intentionally excluded from deps to prevent
  // infinite re-renders. We only want to reload when the selected requirement ID
  // or dialog open state changes, not when the callback reference changes.
  useEffect(() => {
    loadLinkedRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequirement?.id, open]);

  // Generic helper to create links and reload (DRY principle)
  const createLinksAndReload = useCallback(
    async (requirementIds: string[], linkType?: LinkType) => {
      if (!selectedRequirement?.id || requirementIds.length === 0) return;

      try {
        await Promise.all(
          requirementIds.map((reqId) =>
            createExtractionLink(reqId, selectedRequirement.id.toString(), linkType),
          ),
        );
        await fetchAndSetLinkedRequirements();
        updateSelectedRequirementLink(true, linkType);
      } catch (error) {
        console.error("Failed to create extraction link(s):", error);
        throw error;
      }
    },
    [
      selectedRequirement,
      fetchAndSetLinkedRequirements,
      updateSelectedRequirementLink,
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
  const linkNewRequirement = async (requirementId: string, linkType?: LinkType) => {
    await createLinksAndReload([requirementId], linkType);
  };

  // Handle linking multiple existing requirements
  const handleLinkExistingRequirements = async (reqs: Requirement[]) => {
    await createLinksAndReload(reqs.map((req) => req.id.toString()), "attach");
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
      updateSelectedRequirementLink(remainingCount > 0);
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
    isFetchingSuggestion,
    suggestedAction,
    suggestedExtractedId,
    lastMergeInfo,
    mergingRequirementId,
    refreshingSuggestionIds,

    // Actions
    handleRequirementSelect,
    updateRequirement,
    persistField,
    persistTypes,
    loadLinkedRequirements,
    fetchSuggestedAction,
    confirmSuggestion,
    undoMerge,
    setLastMergeInfo,
    linkNewRequirement,
    handleLinkExistingRequirements,
    handleUnlinkRequirement,
    handleGenerateMerge,
    refreshSuggestionsForIds,
    goToNext,
  };
}
