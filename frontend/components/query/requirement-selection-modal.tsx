"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Search } from "lucide-react";
import { Requirement } from "@/types/requirement-types";
import { listRequirements } from "@/lib/api/requirements";
import { EmptyState } from "./empty-state";
import { RequirementSelectionItem } from "./requirement-selection-item";

interface RequirementSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  onSelectRequirements: (requirements: Requirement[]) => void;
  alreadyLinkedIds?: Set<string>;
}

export function RequirementSelectionModal({
  isOpen,
  onClose,
  productId,
  onSelectRequirements,
  alreadyLinkedIds = new Set(),
}: RequirementSelectionModalProps) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequirements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allRequirements = await listRequirements(productId);
      setRequirements(allRequirements);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load requirements",
      );
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  // Load requirements when modal opens
  useEffect(() => {
    if (isOpen && productId) {
      loadRequirements();
    }
  }, [isOpen, productId, loadRequirements]);

  // Filter requirements based on search
  const filteredRequirements = useMemo(() => {
    if (!searchQuery.trim()) {
      return requirements;
    }
    const query = searchQuery.toLowerCase();
    return requirements.filter(
      (req) =>
        req.description.toLowerCase().includes(query) ||
        req.requirement_key.toLowerCase().includes(query) ||
        req.types?.some((type) => type.toLowerCase().includes(query)),
    );
  }, [searchQuery, requirements]);

  const handleToggleRequirement = (requirementId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(requirementId)) {
      newSelectedIds.delete(requirementId);
    } else {
      newSelectedIds.add(requirementId);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleConfirm = () => {
    const selectedRequirements = requirements.filter((req) =>
      selectedIds.has(req.id.toString()),
    );
    onSelectRequirements(selectedRequirements);
    handleClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/10 z-40"
        onClick={handleClose}
        data-testid="requirement-selection-modal-overlay"
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-start p-0 w-[532px] h-[599px] bg-modal-bg rounded-[10px]"
        style={{ boxShadow: "0px 0px 20px 10px rgba(0, 0, 0, 0.1)" }}
        data-testid="requirement-selection-modal"
      >
        {/* Header */}
        <div className="flex flex-row items-center p-0 w-[532px] h-[51px] border-b border-modal-border">
          {/* Title block */}
          <div className="flex flex-row items-center px-4 py-4 gap-2 flex-1 h-[51px]">
            <h2 className="font-inter font-bold text-base leading-[19px] text-black">
              Link Requirement(s)
            </h2>
            <span className="font-inter font-bold text-base leading-[19px] text-black">
              ({selectedIds.size})
            </span>
          </div>
          {/* Close button block */}
          <div className="flex flex-col justify-center items-end p-2 gap-2 w-10 h-10">
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-6 h-6"
              data-testid="close-requirement-selection-modal"
            >
              <X size={24} className="text-black" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col items-start p-8 gap-4 w-[532px] h-[488px] bg-modal-bg">
          {/* Instruction text */}
          <p className="w-full h-[17px] font-inter font-normal text-sm leading-[17px] text-black">
            Select requirements below to link them as a source to the question.
          </p>

          {/* Search input */}
          <div className="box-border flex flex-row items-center px-3 gap-2 w-full h-8 bg-input-white border border-input-dark rounded">
            <input
              type="text"
              placeholder="Search requirements"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[18px] font-inter font-normal text-xs leading-[150%] text-[#080705] bg-transparent outline-none placeholder:text-[#080705] placeholder:opacity-60"
              data-testid="requirement-search-input"
            />
            <Search size={16} className="text-black flex-shrink-0" />
          </div>

          {/* Divider */}
          <div className="w-full h-0 border-t border-modal-divider"></div>

          {/* Requirements table */}
          <div className="flex flex-col items-start py-4 px-0 w-full h-[327px] bg-[#F6F6F6] rounded overflow-y-auto">
            {isLoading ? (
              <EmptyState message="Loading requirements..." />
            ) : error ? (
              <EmptyState message={error} variant="error" />
            ) : filteredRequirements.length === 0 ? (
              <EmptyState
                message={
                  searchQuery
                    ? "No requirements found"
                    : "No requirements available"
                }
              />
            ) : (
              filteredRequirements.map((requirement) => {
                const reqId = requirement.id.toString();
                const isAlreadyLinked = alreadyLinkedIds.has(reqId);
                const isSelected = selectedIds.has(reqId);

                return (
                  <RequirementSelectionItem
                    key={requirement.id}
                    requirement={requirement}
                    isSelected={isSelected}
                    isAlreadyLinked={isAlreadyLinked}
                    onToggle={() => handleToggleRequirement(reqId)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="box-border flex flex-row justify-end items-center p-4 gap-3 w-[532px] h-[60px] bg-modal-bg border-t border-modal-border">
          <button
            onClick={handleClose}
            className="flex flex-row justify-center items-center px-2.5 py-1 gap-1 w-[60px] h-7 bg-cancel-btn rounded-xl font-inter font-normal text-xs leading-[15px] text-[#080705]"
            data-testid="cancel-requirement-selection"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="flex flex-row justify-center items-center px-2.5 py-1 gap-1 h-7 bg-custom-yellow rounded-xl font-inter font-normal text-xs leading-[15px] text-[#080705] disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="confirm-requirement-selection"
          >
            Link ({selectedIds.size})
          </button>
        </div>
      </div>
    </>
  );
}
