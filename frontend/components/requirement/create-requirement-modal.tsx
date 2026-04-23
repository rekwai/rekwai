"use client";

import { useState } from "react";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import {
  createRequirement,
  updateRequirement,
  deleteRequirement,
} from "@/lib/api/requirements";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CreateRequirementPayload,
  Requirement,
  RequirementUpdate,
} from "@/types/requirement-types";
import { toast } from "@/components/ui/use-toast";
import {
  IMPLEMENTATION_OPTIONS,
  getRequirementCreatedToast,
  getRequirementUpdatedToast,
  getRequirementDeletedToast,
  getRequirementErrorToast,
  RequirementFormValues,
} from "@/lib/utils/requirement-form-helpers";
import { CloseIcon } from "@/components/ui/icons";
import { Divider } from "@/components/ui/divider";
import { useRequirementForm } from "@/hooks/use-requirement-form";
import { useRequirementTypes } from "@/hooks/use-requirement-types";
import { useRequirementHistory } from "@/hooks/use-requirement-history";
import { FieldCheckmark } from "./field-checkmark";
import { RequirementTypeSelector } from "./requirement-type-selector";
import { RequirementHistoryDisplay } from "./requirement-history-display";

function RequiredLabel({ text }: { text: string }) {
  return (
    <>
      {text}
      <span className="text-semantic-error-fg">*</span>
    </>
  );
}

interface CreateRequirementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (createdRequirement?: Requirement) => void;
  productId: string | null;
  isGeneratingData?: boolean;
  initialValues?: RequirementFormValues;
  requirement?: Requirement | null;
  onDelete?: (requirementId: string | number) => void;
  overrideValues?: RequirementFormValues;
}

export function CreateRequirementModal({
  open,
  onOpenChange,
  onComplete,
  productId,
  isGeneratingData,
  initialValues,
  requirement,
  onDelete,
  overrideValues,
}: CreateRequirementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if we're in edit mode
  const isEditMode = !!requirement?.id && requirement.id !== "-1";

  // Use custom hooks for state management
  const formState = useRequirementForm(
    open,
    requirement,
    initialValues,
    overrideValues,
  );
  const { types: availableTypes } = useRequirementTypes(open);
  const {
    historyEntries,
    isLoading: historyLoading,
    error: historyError,
  } = useRequirementHistory(requirement?.id, open && isEditMode);

  // Handle requirement creation
  const handleCreate = async (): Promise<Requirement> => {
    if (productId === null) {
      throw new Error("No product selected");
    }

    const payload: CreateRequirementPayload = {
      description: formState.requirementDescription,
      types: formState.selectedTypes.map((t) => t.trim()),
      requirement_verification:
        formState.requirementVerification.trim() || undefined,
      implementation_description: formState.implementationDescription,
      implementation_status: formState.implementation,
      product_id: productId,
    };

    return await createRequirement(payload);
  };

  // Handle requirement update
  const handleUpdate = async (): Promise<Requirement> => {
    if (!requirement?.id) {
      throw new Error("No requirement to update");
    }

    const payload: RequirementUpdate = {
      description: formState.requirementDescription || undefined,
      types:
        formState.selectedTypes.length > 0
          ? formState.selectedTypes.map((t) => t.trim())
          : undefined,
      requirement_verification:
        formState.requirementVerification.trim() || undefined,
      implementation_description:
        formState.implementationDescription || undefined,
      implementation_status: formState.implementation || undefined,
      product_id: requirement?.product_id || productId || "",
    };

    return await updateRequirement(requirement.id, payload);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!formState.isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isEditMode ? await handleUpdate() : await handleCreate();

      onOpenChange(false);
      onComplete?.(result);

      // Show success toast
      const toastConfig = isEditMode
        ? getRequirementUpdatedToast(result)
        : getRequirementCreatedToast(result);
      toast(toastConfig);
    } catch (error) {
      console.error("Failed to save requirement:", error);
      toast(getRequirementErrorToast(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle requirement deletion
  const handleDelete = async () => {
    if (!requirement?.id || !onDelete) return;

    try {
      await deleteRequirement(requirement.id);
      onOpenChange(false);
      onDelete(String(requirement.id));
      toast(getRequirementDeletedToast(requirement.requirement_key));
    } catch (err) {
      console.error("Failed to delete requirement:", err);
      toast(getRequirementErrorToast(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[532px] p-0 overflow-hidden bg-modal-bg dark:bg-[#121212] shadow-modal rounded-[10px]"
        data-testid="new-requirement-modal"
        closeButton={false}
      >
        {/* Header */}
        <div className="flex items-center h-[51px] border-b border-modal-border dark:border-[#1a1a1a]">
          <div className="flex-1 px-4">
            <DialogTitle className="text-base font-bold text-black dark:text-[#FAFFFD]">
              {isEditMode ? "Edit Requirement" : "Create Requirement"}
            </DialogTitle>
          </div>
          {isEditMode && requirement?.requirement_key && (
            <div className="px-4">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium">
                {requirement.requirement_key}
              </span>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mr-2 h-7 w-7 rounded-xl bg-cancel-btn dark:bg-[#312F2F] border-none text-black dark:text-[#FAFFFD] hover:bg-semantic-highlight dark:hover:bg-semantic-highlight p-0"
            aria-label="Close"
          >
            <CloseIcon />
          </Button>
        </div>

        <DialogDescription className="sr-only">
          {isEditMode
            ? "Edit requirement form"
            : "Fill in the details below to create a new requirement. Fields marked with * are required."}
        </DialogDescription>

        <div className="px-8 py-8 space-y-4 bg-modal-bg dark:bg-[#121212] max-h-[60vh] overflow-y-auto">
          {isGeneratingData ? (
            // Show skeleton loaders while generating data
            <div className="space-y-4">
              <div className="text-center text-sm text-blue-600 dark:text-blue-400 mb-4">
                Generating requirement from question...
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : (
            <>
              {/* Form description */}
              <p className="text-sm text-black dark:text-[#FAFFFD]">
                Fill in the details below to create a new requirement. Fields
                marked with * are required.
              </p>

              {/* Type Field - Multiple Selection */}
              <RequirementTypeSelector
                selectedTypes={formState.selectedTypes}
                onSelectedTypesChange={formState.setSelectedTypes}
                availableTypes={availableTypes}
              />

              {/* Requirement Description */}
              <div className="space-y-1">
                <label
                  htmlFor="req-description"
                  className="text-sm font-medium text-label-text dark:text-[#FAFFFD]"
                >
                  <RequiredLabel text="Requirement Description" />
                </label>
                <div className="relative">
                  <Textarea
                    id="req-description"
                    value={formState.requirementDescription}
                    onChange={(e) =>
                      formState.setRequirementDescription(e.target.value)
                    }
                    className="text-xs resize-none h-[52px] pr-10 bg-input-white dark:bg-[#312F2F] border-input-light dark:border-[#1a1a1a] shadow-input-inset rounded text-black dark:text-[#FAFFFD] placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="Enter a detailed description of what is required..."
                    required
                    data-testid="requirement-description"
                    autoFocus
                    aria-label="Requirement Description"
                    aria-required="true"
                  />
                  <FieldCheckmark show={!!formState.requirementDescription} />
                </div>
              </div>

              {/* Divider */}
              <Divider />

              {/* Implementation Dropdown */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-label-text dark:text-[#FAFFFD]">
                  <RequiredLabel text="Implementation" />
                </label>
                <div className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between h-8 text-xs bg-input-white dark:bg-[#312F2F] border-input-dark dark:border-[#1a1a1a] rounded text-black dark:text-[#FAFFFD]"
                      >
                        {formState.implementation}
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
                          onSelect={() => formState.setImplementation(option)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${formState.implementation === option ? "opacity-100" : "opacity-0"}`}
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
                  className="text-sm font-medium text-label-text dark:text-[#FAFFFD]"
                >
                  <RequiredLabel text="Implementation Description" />
                </label>
                <div className="relative">
                  <Textarea
                    id="impl-description"
                    value={formState.implementationDescription}
                    onChange={(e) =>
                      formState.setImplementationDescription(e.target.value)
                    }
                    className="text-xs resize-none h-[52px] pr-10 bg-input-white dark:bg-[#312F2F] border-input-light dark:border-[#1a1a1a] shadow-input-inset rounded text-black dark:text-[#FAFFFD] placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="Describe how this requirement will be implemented..."
                    required
                    data-testid="implementation-description"
                    aria-label="Implementation Description"
                    aria-required="true"
                  />
                  <FieldCheckmark
                    show={!!formState.implementationDescription}
                  />
                </div>
              </div>

              {/* Requirement Verification */}
              <div className="space-y-1">
                <label
                  htmlFor="req-verification"
                  className="text-sm font-medium text-label-text dark:text-[#FAFFFD]"
                >
                  Requirement Verification
                </label>
                <div className="relative">
                  <Textarea
                    id="req-verification"
                    value={formState.requirementVerification}
                    onChange={(e) =>
                      formState.setRequirementVerification(e.target.value)
                    }
                    className="text-xs resize-none h-[52px] pr-10 bg-input-white dark:bg-[#312F2F] border-input-light dark:border-[#1a1a1a] shadow-input-inset rounded text-black dark:text-[#FAFFFD] placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="How can this requirement be verified or tested?"
                    data-testid="requirement-verification"
                    aria-label="Requirement Verification"
                  />
                  <FieldCheckmark show={!!formState.requirementVerification} />
                </div>
              </div>

              {/* Divider */}
              <Divider />

              {/* History Section - Only show in edit mode */}
              {isEditMode && (
                <RequirementHistoryDisplay
                  historyEntries={historyEntries}
                  isLoading={historyLoading}
                  error={historyError}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center h-[60px] px-4 gap-3 border-t bg-modal-bg dark:bg-[#121212] border-modal-border dark:border-[#1a1a1a]">
          <div className="flex gap-2 mr-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-7 px-2.5 text-xs rounded-xl bg-cancel-btn dark:bg-[#312F2F] border-none text-black dark:text-[#FAFFFD]"
            >
              Cancel
            </Button>
            {/* Delete button - only show in edit mode */}
            {isEditMode && onDelete && (
              <Button
                variant="outline"
                className="bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border-none h-7 px-2.5"
                onClick={handleDelete}
              >
                <Trash2 size={16} className="text-red-500 dark:text-red-400" />
              </Button>
            )}
          </div>
          {isGeneratingData ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <Button
              className="h-7 px-2.5 text-xs rounded-xl bg-custom-yellow text-custom-yellow-foreground"
              data-testid="create-requirement-submit"
              disabled={!formState.isValid || isSubmitting}
              onClick={handleSubmit}
            >
              {isEditMode ? "Save" : "Create Requirement"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
