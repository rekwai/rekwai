"use client";

import React, { useState, useEffect } from "react";
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
} from "@/lib/api/requirements";
import { getProductByKey } from "@/lib/api/products";
import {
  RequirementItem,
  Requirement,
  ExtractedRequirementUpdate,
} from "@/types/requirement-types";
import {
  PageLoadingState,
  PageErrorState,
  PageNotFoundState,
} from "@/components/common/page-states";
import { useRequirementIndexing } from "@/hooks/use-requirement-indexing";
import { useRequirementModal } from "@/hooks/use-requirement-modal";
import { getFirstNonEmpty } from "@/lib/utils/string-utils";
import { transformDocumentRequirementsToItems } from "@/lib/utils/requirement-transformers";
import { useResolvedParams } from "@/hooks/use-resolved-params";

export default function DocumentPage({
  params,
}: {
  params: Promise<{ productKey: string; documentKey: string }>;
}) {
  const router = useRouter();
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
    linkedRequirements,
    linkedRequirementsLoading,
    isSearchingSimilar,
    mergingRequirementId,
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
  } = hook;

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
        await linkNewRequirement(createdRequirement.id.toString());
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

  // Handle merge generation with modal
  const handleGenerateMergeWithModal = async (linkedReq: Requirement) => {
    const result = await handleGenerateMerge(linkedReq);
    if (result) {
      mergeDrawerModal.open(result.requirement);
      setDrawerOverrideValues(result.overrideValues);
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
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none">
        <RequirementHeader
          productKey={productKey}
          productName={productName}
          documentKey={documentData.document_key}
          documentId={documentData.id}
          requirements={requirements}
          productId={documentData.product_id}
          onBulkCreateComplete={async () => {
            // Reload document data to refresh hasLinks status
            const data = await getDocumentWithRequirements(documentKey!);
            setDocumentData(data);
            setTransformedRequirements(
              transformDocumentRequirementsToItems(data),
            );
          }}
        />
      </div>

      {/* Main Content - split 50/50 horizontally */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - 50% width, scrollable */}
        <div className="w-1/2 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <RequirementListPanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            requirements={requirements}
            selectedRequirementIndex={selectedRequirementIndex}
            onRequirementSelect={handleRequirementSelect}
            combinedLoading={combinedLoading}
            documentMetadata={{
              name: documentData.original_filename,
              type: documentData.type,
              size: `${documentData.content_size_bytes} bytes`,
              uploadDate: documentData.created_at,
              key: documentData.document_key,
              id: documentData.id,
              productId: documentData.product_id,
            }}
            onRequirementsUpdate={hook.setRequirementsList}
          />
        </div>

        {/* Right Panel - 50% width, scrollable */}
        <div className="w-1/2 overflow-y-auto bg-[#FAFFFD] dark:bg-[#121212]">
          <RequirementDetailsPanel
            selectedRequirement={selectedRequirement}
            requirements={requirements}
            combinedLoading={combinedLoading}
            productId={documentData.product_id}
            linkedRequirementsProps={{
              linkedRequirements,
              linkedRequirementsLoading,
              isSearchingSimilar,
              mergingRequirementId,
            }}
            actionHandlers={{
              onEditRequirement: () => editExtractedModal.open(),
              onEditLinkedRequirement: (requirement: Requirement) =>
                editLinkedModal.open(requirement),
              onLinkExistingRequirements: handleLinkExistingRequirements,
              onUnlinkRequirement: handleUnlinkRequirement,
              onGenerateMerge: handleGenerateMergeWithModal,
              onCreateNewRequirement: () => createRequirementModal.open(),
              onRefreshSimilarRequirements: refreshSimilarRequirements,
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
        onOpenChange={mergeDrawerModal.close}
        requirement={mergeDrawerModal.data}
        overrideValues={drawerOverrideValues || undefined}
        onComplete={async () => {
          // Close the drawer
          mergeDrawerModal.close();

          // Reload requirements to refresh the linked requirements list
          await loadLinkedRequirements();
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
