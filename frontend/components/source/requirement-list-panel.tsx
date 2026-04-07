"use client";

import { useState, useEffect } from "react";
import {
  RequirementItem,
  DocumentMetadata,
  ImplementationStatus,
} from "@/types/requirement-types";
import { ItemListPanel } from "@/components/common/item-list-panel";
import {
  MetadataRow,
  MetadataSection,
  TimestampRow,
} from "@/components/common/metadata-display";
import { AddExtractedRequirementDialog } from "./add-extracted-requirement-dialog";
import {
  addExtractedRequirement,
  deleteExtractedRequirement,
  getDistinctRequirementTypes,
} from "@/lib/api/requirements";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface RequirementListPanelProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  requirements: RequirementItem[];
  selectedRequirementIndex: number;
  onRequirementSelect: (index: number) => void;
  combinedLoading: boolean;
  documentMetadata: DocumentMetadata & { id: string; productId: string };
  onRequirementsUpdate?: (requirements: RequirementItem[]) => void;
}

export function RequirementListPanel({
  activeTab,
  onTabChange,
  requirements,
  selectedRequirementIndex,
  onRequirementSelect,
  combinedLoading,
  documentMetadata,
  onRequirementsUpdate,
}: RequirementListPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] =
    useState<RequirementItem | null>(null);
  const [existingTypes, setExistingTypes] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load existing types when dialog is opened
    if (isAddDialogOpen) {
      getDistinctRequirementTypes().then(setExistingTypes).catch(console.error);
    }
  }, [isAddDialogOpen]);

  const handleAddRequirement = async (data: {
    description: string;
    types: string[];
  }) => {
    try {
      const newReq = await addExtractedRequirement(documentMetadata.id, {
        description: data.description,
        types: data.types,
        product_id: documentMetadata.productId,
        document_name: documentMetadata.name,
      });

      // Convert ExtractedRequirementDto to RequirementItem
      const newItem: RequirementItem = {
        id: newReq.id,
        text: newReq.description, // List panel uses 'text' for display
        types: newReq.types,
        implementation:
          (newReq.implementation_status as ImplementationStatus) || "To do",
        implementationDescription: newReq.implementation_description || "",
        requirementVerification: newReq.requirement_verification || "",
        hasLinks: false,
        createdAt: newReq.extraction_timestamp,
        updatedAt: newReq.extraction_timestamp,
        description: newReq.description,
        decisionType: "extracted",
        product_id: newReq.product_id,
      };

      if (onRequirementsUpdate) {
        onRequirementsUpdate([...requirements, newItem]);
        onRequirementSelect(requirements.length);
      }

      toast({
        title: "Requirement added",
        description: "The extracted requirement has been added successfully.",
      });
    } catch (error) {
      console.error("Failed to add requirement:", error);
      toast({
        title: "Error",
        description: "Failed to add requirement.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteRequirement = async () => {
    if (!requirementToDelete) return;

    try {
      await deleteExtractedRequirement(requirementToDelete.id);

      const newReqs = requirements.filter(
        (r) => r.id !== requirementToDelete.id,
      );
      if (onRequirementsUpdate) {
        onRequirementsUpdate(newReqs);
        if (selectedRequirementIndex >= newReqs.length && newReqs.length > 0) {
          onRequirementSelect(newReqs.length - 1);
        } else if (newReqs.length === 0) {
          onRequirementSelect(0);
        }
      }

      toast({
        title: "Requirement deleted",
        description: "The extracted requirement has been deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete requirement:", error);
      toast({
        title: "Error",
        description: "Failed to delete requirement.",
        variant: "destructive",
      });
    } finally {
      setRequirementToDelete(null);
    }
  };

  return (
    <>
      <ItemListPanel
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={[
          { value: "Requirements", label: "Requirements" },
          { value: "Metadata", label: "Metadata" },
        ]}
        items={requirements}
        selectedIndex={selectedRequirementIndex}
        onItemSelect={onRequirementSelect}
        isLoading={combinedLoading}
        emptyMessage="No requirements found"
        loadingMessage="Loading requirements..."
        getItemId={(req) => req.id}
        getItemText={(req) => req.text}
        isItemCompleted={(req) => req.hasLinks}
        itemTestIdPrefix="extracted-requirement"
        onAdd={() => setIsAddDialogOpen(true)}
        onDelete={(req) => setRequirementToDelete(req)}
        renderMetadata={() => (
          <div className="p-4 space-y-6">
            <MetadataSection title="Document Information">
              {documentMetadata.key && (
                <MetadataRow label="Key:" value={documentMetadata.key} />
              )}
              <MetadataRow label="Name:" value={documentMetadata.name} />
              <MetadataRow label="Type:" value={documentMetadata.type} />
              <MetadataRow label="Size:" value={documentMetadata.size} />
            </MetadataSection>
            <MetadataSection title="Upload Information">
              <TimestampRow
                label="Uploaded on"
                date={documentMetadata.uploadDate}
              />
            </MetadataSection>
          </div>
        )}
      />

      <AddExtractedRequirementDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddRequirement}
        existingTypes={existingTypes}
      />

      <AlertDialog
        open={!!requirementToDelete}
        onOpenChange={(open) => !open && setRequirementToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              extracted requirement and any links to main requirements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequirement}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
