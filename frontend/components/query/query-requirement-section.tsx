"use client";

import React, { useState } from "react";
import { Plus, Link } from "lucide-react";
import { Requirement } from "@/types/requirement-types";
import { CreateRequirementModal } from "@/components/requirement/create-requirement-modal";
import { RequirementSelectionModal } from "./requirement-selection-modal";
import { RequirementHeaderRow } from "./requirement-header-row";
import { RequirementItem } from "./requirement-item";
import { RequirementSkeleton } from "./requirement-skeleton";
import { addIgnoredRequirement } from "@/lib/utils/question-ignored-requirements";
import { withLoadingState } from "@/lib/utils/loading-state";

interface QueryRequirementsSectionProps {
  linkedRequirements: Requirement[];
  isLoadingRequirements: boolean;
  isLinkingRequirement?: boolean;
  isSearchingSimilar?: boolean;
  requirementsError: string | null;
  onUnlinkRequirement: (requirement: Requirement) => Promise<void>;
  onLinkRequirement?: (requirement: Requirement) => Promise<void>;
  onCreateRequirement?: () => void;
  onRefreshSimilarRequirements?: () => Promise<void>;
  productId: string;
  questionId?: string;
}

export function QueryRequirementsSection({
  linkedRequirements,
  isLoadingRequirements,
  isLinkingRequirement = false,
  isSearchingSimilar = false,
  requirementsError,
  onUnlinkRequirement,
  onLinkRequirement,
  onCreateRequirement,
  onRefreshSimilarRequirements,
  productId,
  questionId,
}: QueryRequirementsSectionProps) {
  const [linkingRequirementIds, setLinkingRequirementIds] = useState<
    Set<string>
  >(new Set());
  const [linkingErrors, setLinkingErrors] = useState<string[]>([]);
  const [editingRequirement, setEditingRequirement] =
    useState<Requirement | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  const handleSelectRequirements = async (
    selectedRequirements: Requirement[],
  ) => {
    if (!onLinkRequirement) return;

    // Close the modal immediately
    setIsSelectionModalOpen(false);

    // Clear previous errors
    setLinkingErrors([]);
    const errors: string[] = [];

    // Link all requirements in parallel
    const linkPromises = selectedRequirements.map((requirement) => {
      const reqId = requirement.id.toString();
      return withLoadingState(reqId, setLinkingRequirementIds, async () => {
        try {
          await onLinkRequirement(requirement);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(
            `Failed to link "${requirement.description || reqId}": ${message}`,
          );
        }
      });
    });

    // Wait for all to complete
    await Promise.all(linkPromises);

    // Surface any errors to the UI
    if (errors.length > 0) {
      setLinkingErrors(errors);
    }
  };

  const handleIgnoreRequirement = async (requirement: Requirement) => {
    if (!questionId) return;

    const reqId = requirement.id.toString();
    await withLoadingState(reqId, setLinkingRequirementIds, async () => {
      // Unlink the requirement first
      await onUnlinkRequirement(requirement);

      // Add to ignored list in localStorage
      addIgnoredRequirement(questionId, reqId);
    });
  };

  // Create a Set of linked requirement IDs for the modal
  const linkedIds = new Set(linkedRequirements.map((r) => r.id.toString()));

  const isLoading = isLoadingRequirements || isLinkingRequirement;
  const showEmptyState =
    !isLoading && linkedRequirements.length === 0 && !requirementsError;

  const renderContent = () => {
    if (showEmptyState) {
      return (
        <div className="flex flex-row items-start p-0 gap-4 w-[672px] h-[108px] flex-none order-1 self-stretch flex-grow-0">
          {/* Create requirement button */}
          <button
            onClick={onCreateRequirement}
            className="box-border flex flex-col justify-center items-center py-3 px-3 gap-2 w-[328px] h-[108px] border border-[#E6E6E6] rounded-[10px] hover:bg-gray-50 transition-colors flex-none flex-grow"
          >
            <Plus size={16} className="text-[#080705] flex-none" />
            <span className="font-inter font-medium text-sm leading-[130%] text-[#000000] flex-none">
              Create requirement
            </span>
            <span className="font-inter font-normal text-[12px] leading-[130%] text-center text-[#1C2024] flex-none">
              This will create a new requirement based on the question.
            </span>
          </button>

          {/* Link requirement button */}
          <button
            onClick={() => setIsSelectionModalOpen(true)}
            className="box-border flex flex-col justify-center items-center py-3 px-3 gap-2 w-[328px] h-[108px] border border-[#E6E6E6] rounded-[10px] hover:bg-gray-50 transition-colors flex-none flex-grow"
          >
            <Link size={16} className="text-[#080705] flex-none" />
            <span className="font-inter font-medium text-sm leading-[130%] text-[#000000] flex-none">
              Link requirement(s)
            </span>
            <span className="font-inter font-normal text-[10px] leading-[130%] text-center text-[#1C2024] flex-none">
              This will allow you to select and link associated requirements.
            </span>
          </button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-start p-0 gap-2 flex-none order-1 self-stretch flex-grow-0">
          <RequirementSkeleton count={2} />
        </div>
      );
    }

    if (requirementsError) {
      return (
        <div className="text-sm text-red-500 italic">
          Error: {requirementsError}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-start p-0 gap-2 flex-none order-1 self-stretch flex-grow-0">
        {/* Render existing linked requirements */}
        {linkedRequirements.map((requirement) => {
          const reqId = requirement.id.toString();
          const isToggling = linkingRequirementIds.has(reqId);

          return (
            <RequirementItem
              key={requirement.id}
              requirement={requirement}
              isToggling={isToggling}
              onEdit={(req) => {
                setEditingRequirement(req);
                setIsEditModalOpen(true);
              }}
              onIgnore={handleIgnoreRequirement}
            />
          );
        })}

        {/* Skeleton loader when searching for similar requirements */}
        {isSearchingSimilar && (
          <div data-testid="searching-similar-skeleton">
            <RequirementSkeleton count={1} />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className="flex flex-col items-start p-0 gap-2 flex-none order-2 self-stretch flex-grow-0"
        data-testid="query-requirement-section"
      >
        <RequirementHeaderRow
          onCreateRequirement={onCreateRequirement}
          onLinkRequirement={() => setIsSelectionModalOpen(true)}
          onRefreshSimilarRequirements={onRefreshSimilarRequirements}
          isSearchingSimilar={isSearchingSimilar}
        />

        {linkingErrors.length > 0 && (
          <div className="text-sm text-red-500 space-y-1">
            {linkingErrors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        )}

        {renderContent()}
      </div>

      {/* Edit Requirement Modal */}
      <CreateRequirementModal
        open={isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditModalOpen(false);
            setEditingRequirement(null);
          }
        }}
        requirement={editingRequirement}
        onComplete={() => {
          setIsEditModalOpen(false);
          setEditingRequirement(null);
          // Note: The modal internally handles the API call to update the requirement
          // The parent component will need to refresh requirements if necessary
        }}
        productId={editingRequirement?.product_id || productId}
      />

      {/* Requirement Selection Modal */}
      <RequirementSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        productId={productId}
        onSelectRequirements={handleSelectRequirements}
        alreadyLinkedIds={linkedIds}
      />
    </>
  );
}
