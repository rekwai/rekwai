"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RequirementItem,
  ExtractedRequirementUpdate,
  ImplementationStatus,
} from "@/types/requirement-types";
import { CloseIcon } from "@/components/ui/icons";
import { toast } from "@/components/ui/use-toast";
import {
  IMPLEMENTATION_OPTIONS,
  getRequirementErrorToast,
} from "@/lib/utils/requirement-form-helpers";
import { Divider } from "@/components/ui/divider";
import { FieldCheckmark } from "@/components/requirement/field-checkmark";
import { RequirementTypeSelector } from "@/components/requirement/requirement-type-selector";

interface EditExtractedRequirementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirement: RequirementItem | null;
  availableTypes: string[];
  onSave: (updates: ExtractedRequirementUpdate) => Promise<void>;
}

export function EditExtractedRequirementModal({
  open,
  onOpenChange,
  requirement,
  availableTypes,
  onSave,
}: EditExtractedRequirementModalProps) {
  const [description, setDescription] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [implementationStatus, setImplementationStatus] =
    useState<ImplementationStatus>("To do");
  const [implementationDescription, setImplementationDescription] =
    useState("");
  const [requirementVerification, setRequirementVerification] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when requirement changes or modal opens
  useEffect(() => {
    if (requirement && open) {
      setDescription(requirement.description || requirement.text || "");
      setSelectedTypes(requirement.types || []);
      setImplementationStatus(requirement.implementation || "To do");
      setImplementationDescription(requirement.implementationDescription || "");
      setRequirementVerification(requirement.requirementVerification || "");
    }
  }, [requirement, open]);

  const handleSave = async () => {
    if (!requirement) return;

    setIsSaving(true);
    try {
      await onSave({
        description,
        types: selectedTypes,
        implementation_status: implementationStatus,
        implementation_description: implementationDescription,
        requirement_verification: requirementVerification,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save extracted requirement:", error);
      toast(getRequirementErrorToast(error));
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = description.trim() !== "";

  if (!requirement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[532px] p-0 overflow-hidden bg-modal-bg shadow-modal rounded-[10px]"
        data-testid="edit-extracted-requirement-modal"
        closeButton={false}
      >
        {/* Custom Header */}
        <div className="flex items-center h-[51px] border-b border-modal-border">
          <div className="flex-1 px-4">
            <DialogTitle className="text-base font-bold text-black">
              Edit Extracted Requirement
            </DialogTitle>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <DialogDescription className="sr-only">
          Edit extracted requirement form. Fields marked with * are required.
        </DialogDescription>

        {/* Form Content */}
        <div className="px-8 py-8 space-y-4 bg-modal-bg max-h-[60vh] overflow-y-auto">
          {/* Form description */}
          <p className="text-sm text-black">
            Edit the extracted requirement details below. Fields marked with *
            are required.
          </p>

          {/* Type Field - Multiple Selection */}
          <RequirementTypeSelector
            selectedTypes={selectedTypes}
            onSelectedTypesChange={setSelectedTypes}
            availableTypes={availableTypes}
          />

          {/* Requirement Description */}
          <div className="space-y-1">
            <label
              htmlFor="req-description"
              className="text-sm font-medium text-label-text"
            >
              Requirement Description*
            </label>
            <div className="relative">
              <Textarea
                id="req-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs resize-none h-[52px] bg-input-white border-input-light shadow-input-inset rounded"
                placeholder="Enter a detailed description of what is required..."
                required
                data-testid="requirement-description"
                autoFocus
                aria-label="Requirement Description"
                aria-required="true"
              />
              <FieldCheckmark show={!!description} />
            </div>
          </div>

          {/* Divider */}
          <Divider />

          {/* Implementation Dropdown */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-label-text">
              Implementation*
            </label>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-8 text-xs bg-input-white border-input-dark rounded"
                  >
                    {implementationStatus}
                    <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[--radix-dropdown-menu-trigger-width]"
                >
                  {IMPLEMENTATION_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onSelect={() => setImplementationStatus(option)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${implementationStatus === option ? "opacity-100" : "opacity-0"}`}
                      />
                      {option}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Implementation Description */}
          <div className="space-y-1">
            <label
              htmlFor="impl-description"
              className="text-sm font-medium text-label-text"
            >
              Implementation Description
            </label>
            <div className="relative">
              <Textarea
                id="impl-description"
                value={implementationDescription}
                onChange={(e) => setImplementationDescription(e.target.value)}
                className="text-xs resize-none h-[52px] bg-input-white border-input-light shadow-input-inset rounded"
                placeholder="Describe how this requirement will be implemented..."
                data-testid="implementation-description"
                aria-label="Implementation Description"
              />
              <FieldCheckmark show={!!implementationDescription} />
            </div>
          </div>

          {/* Requirement Verification */}
          <div className="space-y-1">
            <label
              htmlFor="req-verification"
              className="text-sm font-medium text-label-text"
            >
              Requirement Verification
            </label>
            <div className="relative">
              <Textarea
                id="req-verification"
                value={requirementVerification}
                onChange={(e) => setRequirementVerification(e.target.value)}
                className="text-xs resize-none h-[52px] bg-input-white border-input-light shadow-input-inset rounded"
                placeholder="How can this requirement be verified or tested?"
                data-testid="requirement-verification"
                aria-label="Requirement Verification"
              />
              <FieldCheckmark show={!!requirementVerification} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center h-[60px] px-4 gap-3 border-t bg-modal-bg border-modal-border">
          <div className="flex gap-2 mr-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-7 px-2.5 text-xs rounded-xl bg-cancel-btn border-none"
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
          <Button
            className="h-7 px-2.5 text-xs rounded-xl bg-custom-yellow text-custom-yellow-foreground"
            data-testid="save-extracted-requirement"
            disabled={!isValid || isSaving}
            onClick={handleSave}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
