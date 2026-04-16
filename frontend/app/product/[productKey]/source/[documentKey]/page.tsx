"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RequirementHeader } from "@/components/source/requirement-header";
import { RequirementListPanel } from "@/components/source/requirement-list-panel";
import { RequirementDetailsPanel } from "@/components/source/requirement-details-panel";
import { NavigationFooter } from "@/components/common/navigation-footer";
import { CreateRequirementModal } from "@/components/requirement/create-requirement-modal";
import { EditExtractedRequirementModal } from "@/components/source/edit-extracted-requirement-modal";
import {
  getDocumentWithRequirements,
  DocumentWithRequirements,
  createRequirement,
  updateRequirement as updateRequirementApi,
  getRequirement,
} from "@/lib/api/requirements";
import { getProductByKey } from "@/lib/api/products";
import {
  RequirementItem,
  Requirement,
  ExtractedRequirementUpdate,
  SuggestedAction,
} from "@/types/requirement-types";
import {
  PageLoadingState,
  PageErrorState,
  PageNotFoundState,
} from "@/components/common/page-states";
import { useRequirementIndexing } from "@/hooks/use-requirement-indexing";
import { useRequirementModal } from "@/hooks/use-requirement-modal";
import { getFirstNonEmpty } from "@/lib/utils/string-utils";
import {
  transformDocumentRequirementsToItems,
  mergePreviewToUpdatePayload,
} from "@/lib/utils/requirement-transformers";
import { useResolvedParams } from "@/hooks/use-resolved-params";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

export default function DocumentPage({
  params,
}: {
  params: Promise<{ productKey: string; documentKey: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const resolvedParams = useResolvedParams(params);
  const productKey = resolvedParams?.productKey ?? null;
  const documentKey = resolvedParams?.documentKey ?? null;

  const [productName, setProductName] = useState<string>("");
  const [documentData, setDocumentData] =
    useState<DocumentWithRequirements | null>(null);
  const [transformedRequirements, setTransformedRequirements] = useState<
    RequirementItem[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Requirements");
  const [drawerOverrideValues, setDrawerOverrideValues] =
    useState<Partial<Requirement> | null>(null);
  const [pendingMergeLinkId, setPendingMergeLinkId] = useState<string | null>(
    null,
  );

  // Modal state management using custom hook
  const createRequirementModal = useRequirementModal();
  const editExtractedModal = useRequirementModal();
  const mergeDrawerModal = useRequirementModal();
  const editLinkedModal = useRequirementModal();

  useEffect(() => {
    if (!productKey || !documentKey) return;

    const loadDocument = async () => {
      try {
        setLoading(true);

        // Fetch document details and product info in parallel
        const [data, product] = await Promise.all([
          getDocumentWithRequirements(documentKey),
          getProductByKey(productKey),
        ]);

        setDocumentData(data);
        setProductName(product.name);

        // Transform requirements using utility function
        const transformed = transformDocumentRequirementsToItems(data);
        setTransformedRequirements(transformed);
      } catch (err) {
        console.error("Failed to load document:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load document",
        );
      } finally {
        setLoading(false);
      }
    };
    loadDocument();
  }, [productKey, documentKey]);

  // Use the custom hook for all state management
  const hook = useRequirementIndexing({
    open: !loading && !!transformedRequirements,
    initialRequirements: transformedRequirements,
  });

  const {
    requirements,
    selectedRequirement,
    selectedRequirementIndex,
    combinedLoading,
    availableTypes,
    isFetchingSuggestion,
    suggestedAction,
    isSuggestionDismissed,
    handleRequirementSelect,
    updateRequirement,
    persistField,
    persistTypes,
    loadLinkedRequirements,
    fetchSuggestedAction,
    confirmSuggestion,
    dismissSuggestion,
    linkNewRequirement,
    handleLinkExistingRequirements,
    handleGenerateMerge,
    refreshSuggestionsForIds,
    refreshingSuggestionIds,
    lastMergeInfo,
    setLastMergeInfo,
    undoMerge,
  } = hook;

  // Helper to reload document data after merges
  const reloadDocumentData = useCallback(async () => {
    if (!documentKey) return;
    try {
      const data = await getDocumentWithRequirements(documentKey);
      setDocumentData(data);
      setTransformedRequirements(transformDocumentRequirementsToItems(data));
    } catch (error) {
      console.error("Failed to reload document data:", error);
    }
  }, [documentKey]);

  // Compute whether we're on the last requirement
  const isOnLastItem = selectedRequirementIndex === requirements.length - 1;

  // Handler for next button - navigates back to sources on last item
  const handleNext = () => {
    if (hook.goToNext()) {
      // Last item - navigate back to sources
      router.push(`/product/${productKey}/source`);
    }
  };

  // Handler for creating new requirement and linking it
  const handleCreateNewRequirement = async (
    createdRequirement?: Requirement,
  ) => {
    if (createdRequirement) {
      try {
        await linkNewRequirement(createdRequirement.id.toString(), "create");
        createRequirementModal.close();
      } catch (error) {
        console.error(
          "Failed to create extraction link after requirement creation:",
          error,
        );
        createRequirementModal.close();
        // TODO: Show user toast notification:
        // "Requirement created successfully but linking failed. You can manually link it later."
        throw error;
      }
    } else {
      createRequirementModal.close();
    }
  };

  // Handler for saving extracted requirement edits
  const handleSaveExtractedRequirement = async (
    updates: ExtractedRequirementUpdate,
  ) => {
    // Store previous state for rollback on error
    // Note: selectedRequirement is always defined when this function is called
    const previousState = {
      text: selectedRequirement!.text,
      description: selectedRequirement!.description,
      types: selectedRequirement!.types,
      implementation: selectedRequirement!.implementation,
      implementationDescription: selectedRequirement!.implementationDescription,
      requirementVerification: selectedRequirement!.requirementVerification,
    };

    // Update local state immediately (optimistic update)
    updateRequirement({
      text: updates.description,
      description: updates.description,
      types: updates.types,
      implementation: updates.implementation_status,
      implementationDescription: updates.implementation_description,
      requirementVerification: updates.requirement_verification,
    });

    try {
      // Persist changes to backend
      await Promise.all([
        persistField("description", updates.description),
        persistTypes(updates.types),
        persistField("implementation_status", updates.implementation_status),
        persistField(
          "implementation_description",
          updates.implementation_description,
        ),
        persistField(
          "requirement_verification",
          updates.requirement_verification,
        ),
      ]);
    } catch (error) {
      // Rollback to previous state on error
      updateRequirement(previousState);
      console.error("Failed to save extracted requirement:", error);
      // TODO: Show user notification (toast) about the error
      throw error;
    }
  };

  // Fallback: open merge drawer for manual editing
  const openMergeDrawerFallback = async (
    requirement: Requirement,
    overrideValues?: Partial<Requirement>,
  ) => {
    setPendingMergeLinkId(requirement.id.toString());
    if (overrideValues) {
      mergeDrawerModal.open(requirement);
      setDrawerOverrideValues(overrideValues);
    } else {
      try {
        const mergeResult = await handleGenerateMerge(requirement);
        if (mergeResult) {
          mergeDrawerModal.open(mergeResult.requirement);
          setDrawerOverrideValues(mergeResult.overrideValues);
        } else {
          setPendingMergeLinkId(null);
        }
      } catch {
        setPendingMergeLinkId(null);
      }
    }
  };

  // Shared undo handler for both merge status banner and toast action.
  // Wrapped in a ref so the toast action closure always calls the latest version.
  const handleUndoMerge = useCallback(async () => {
    const invalidatedIds = await undoMerge();
    await reloadDocumentData();
    if (invalidatedIds && invalidatedIds.length > 0) {
      refreshSuggestionsForIds(invalidatedIds);
    }
  }, [undoMerge, reloadDocumentData, refreshSuggestionsForIds]);

  const handleUndoMergeRef = useRef(handleUndoMerge);
  handleUndoMergeRef.current = handleUndoMerge;

  // Apply merge preview directly, with fallback to merge drawer on failure
  const handleMergeWithPreview = async (
    requirement: Requirement,
    suggestionSnapshot: SuggestedAction | null,
    invalidatedIds: string[],
  ) => {
    const mergePreviewData = selectedRequirement?.mergePreview;
    if (!mergePreviewData) {
      await openMergeDrawerFallback(requirement);
      return;
    }

    const payload = mergePreviewToUpdatePayload(
      mergePreviewData,
      requirement.product_id,
    );
    try {
      await updateRequirementApi(requirement.id.toString(), payload);
      await linkNewRequirement(requirement.id.toString(), "merge");
      const updatedReq = await getRequirement(requirement.id.toString());
      setLastMergeInfo({
        extractedReqId: selectedRequirement!.id.toString(),
        targetReqId: requirement.id.toString(),
        targetReqKey: requirement.requirement_key,
        mergedRequirement: updatedReq,
        previousSuggestion: suggestionSnapshot ?? undefined,
      });
      toast({
        title: "Requirements successfully merged",
        description: `Merged into ${requirement.requirement_key}`,
        action: (
          <ToastAction altText="Undo" onClick={() => handleUndoMergeRef.current()}>
            Undo
          </ToastAction>
        ),
      });
      await reloadDocumentData();
      if (invalidatedIds.length > 0) {
        refreshSuggestionsForIds(invalidatedIds);
      }
    } catch (error) {
      console.error("Failed to apply merge directly, falling back to merge drawer:", error);
      await openMergeDrawerFallback(requirement, payload);
    }
  };

  // Create a new requirement from the selected extracted requirement
  const handleCreateNewFromSuggestion = async () => {
    if (!selectedRequirement) return;
    const created = await createRequirement({
      description: getFirstNonEmpty(
        selectedRequirement.text,
        selectedRequirement.description,
      ),
      types: selectedRequirement.types || [],
      implementation_status: selectedRequirement.implementation || "To do",
      implementation_description:
        selectedRequirement.implementationDescription || "",
      requirement_verification:
        selectedRequirement.requirementVerification || "",
      product_id: selectedRequirement.product_id,
    });
    await linkNewRequirement(created.id.toString(), "create");
  };

  // Handle AI suggestion confirmation with follow-up actions
  const handleConfirmSuggestion = async () => {
    const suggestionSnapshot = suggestedAction
      ? {
          ...suggestedAction,
          merge_preview: selectedRequirement?.mergePreview ?? null,
        }
      : null;

    const result = await confirmSuggestion();
    if (result?.action === "merge" && result.requirement) {
      await handleMergeWithPreview(
        result.requirement,
        suggestionSnapshot,
        result.invalidated_ids || [],
      );
    } else if (result?.action === "create_new") {
      await handleCreateNewFromSuggestion();
    }
  };

  // Handle edit suggestion - opens merge drawer with pre-filled data
  const handleEditSuggestion = async () => {
    const result = await confirmSuggestion();
    if (result?.action === "merge" && result.requirement) {
      const mergePreviewData = selectedRequirement?.mergePreview;
      const overrideValues = mergePreviewData
        ? mergePreviewToUpdatePayload(
            mergePreviewData,
            result.requirement.product_id,
          )
        : undefined;
      await openMergeDrawerFallback(result.requirement, overrideValues);
    }
  };

  if (loading) {
    return (
      <PageLoadingState
        title="Loading Document..."
        description="Please wait while we fetch the document and its requirements..."
      />
    );
  }

  if (error) {
    return <PageErrorState error={error} />;
  }

  if (!documentData || !transformedRequirements || !productKey) {
    return (
      <PageNotFoundState
        title="No Document Found"
        description="The requested document could not be found."
      />
    );
  }

  // ============================================
  // LAYOUT STRUCTURE
  // ============================================
  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-semantic-bg-elevation-1">
      {/* Header */}
      <div className="flex-none">
        <RequirementHeader
          productKey={productKey}
          productName={productName}
          documentKey={documentData.document_key}
          documentId={documentData.id}
          requirements={requirements}
          productId={documentData.product_id}
          onBulkApproveComplete={reloadDocumentData}
        />
      </div>

      {/* Main Content - split 50/50 horizontally */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - 50% width, scrollable */}
        <div className="w-1/2 overflow-y-auto border-r border-semantic-stroke bg-semantic-bg-elevation-1">
          <RequirementListPanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            requirements={requirements}
            selectedRequirementIndex={selectedRequirementIndex}
            onRequirementSelect={handleRequirementSelect}
            combinedLoading={combinedLoading}
            refreshingSuggestionIds={refreshingSuggestionIds}
            documentMetadata={{
              name: documentData.original_filename,
              type: documentData.type,
              size: `${documentData.content_size_bytes} bytes`,
              uploadDate: documentData.created_at,
              key: documentData.document_key,
            }}
          />
        </div>

        {/* Right Panel - 50% width, scrollable */}
        <div className="w-1/2 overflow-y-auto bg-semantic-bg-elevation-2">
          <RequirementDetailsPanel
            selectedRequirement={selectedRequirement}
            requirements={requirements}
            combinedLoading={combinedLoading}
            productId={documentData.product_id}
            linkedRequirementsProps={{
              isFetchingSuggestion,
              suggestedAction,
              isSuggestionDismissed,
              lastMergeInfo,
              mergePreview: selectedRequirement?.mergePreview,
            }}
            actionHandlers={{
              onEditRequirement: () => editExtractedModal.open(),
              onEditLinkedRequirement: (requirement: Requirement) =>
                editLinkedModal.open(requirement),
              onLinkExistingRequirements: handleLinkExistingRequirements,
              onCreateNewRequirement: () => createRequirementModal.open(),
              onFetchSuggestedAction: fetchSuggestedAction,
              onConfirmSuggestion: handleConfirmSuggestion,
              onDismissSuggestion: dismissSuggestion,
              onEditSuggestion: handleEditSuggestion,
              onUndoMerge: handleUndoMerge,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none">
        {selectedRequirement && (
          <NavigationFooter
            itemCount={requirements.length}
            selectedIndex={selectedRequirementIndex}
            onIndexChange={handleRequirementSelect}
            onNext={handleNext}
            nextButtonLabel={isOnLastItem ? "Close" : "Next"}
          />
        )}
      </div>

      {/* Create Requirement Modal */}
      <CreateRequirementModal
        open={createRequirementModal.isOpen}
        onOpenChange={createRequirementModal.close}
        onComplete={handleCreateNewRequirement}
        productId={selectedRequirement?.product_id || null}
        initialValues={
          selectedRequirement
            ? {
                description: getFirstNonEmpty(
                  selectedRequirement.text,
                  selectedRequirement.description,
                ),
                types: selectedRequirement.types || [],
                implementation_status:
                  selectedRequirement.implementation || "To do",
                implementation_description:
                  selectedRequirement.implementationDescription || "",
                requirement_verification:
                  selectedRequirement.requirementVerification || "",
              }
            : undefined
        }
      />

      {/* Edit Extracted Requirement Modal */}
      <EditExtractedRequirementModal
        open={editExtractedModal.isOpen}
        onOpenChange={editExtractedModal.close}
        requirement={selectedRequirement}
        availableTypes={availableTypes}
        onSave={handleSaveExtractedRequirement}
      />

      {/* Requirement Edit Modal for Updates */}
      <CreateRequirementModal
        open={mergeDrawerModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Drawer was cancelled — clear pending merge link
            mergeDrawerModal.close();
            setPendingMergeLinkId(null);
          }
        }}
        requirement={mergeDrawerModal.data}
        overrideValues={drawerOverrideValues || undefined}
        onComplete={async () => {
          mergeDrawerModal.close();

          // Create the extraction link now that merge is complete
          if (pendingMergeLinkId) {
            await linkNewRequirement(pendingMergeLinkId, "merge");
            setPendingMergeLinkId(null);
          } else {
            await loadLinkedRequirements();
          }
          // Reload document data after merge to refresh hasLinks
          await reloadDocumentData();
        }}
        productId={mergeDrawerModal.data?.product_id || null}
      />

      {/* Edit Linked Requirement Modal */}
      <CreateRequirementModal
        open={editLinkedModal.isOpen}
        onOpenChange={editLinkedModal.close}
        requirement={editLinkedModal.data}
        onComplete={async () => {
          // Close the modal
          editLinkedModal.close();

          // Reload requirements to refresh the linked requirements list
          await loadLinkedRequirements();
        }}
        productId={editLinkedModal.data?.product_id || null}
      />
    </div>
  );
}
