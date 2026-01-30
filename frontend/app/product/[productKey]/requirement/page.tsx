"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

// API
import { listRequirements, deleteRequirement } from "@/lib/api/requirements";
import { useRowSelection } from "@/hooks/use-row-selection";

// UI
import { useToast } from "@/components/ui/use-toast";

// Types
import { Requirement } from "@/types/requirement-types";

// Hooks
import { useProductByKey } from "@/hooks/use-product-by-key";
import { useResolvedParams } from "@/hooks/use-resolved-params";

// Components
import { RequirementsTable } from "@/components/requirement/requirements-table";

export default function RequirementsPage({
  params,
}: {
  params: Promise<{ productKey: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const resolvedParams = useResolvedParams(params);
  const productKey = resolvedParams?.productKey ?? null;

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load product ID from key using custom hook
  const { productId } = useProductByKey(productKey);

  // Filter requirements based on search query
  const filteredRequirements = useMemo(() => {
    return !searchQuery.trim()
      ? requirements
      : requirements.filter(
          (req) =>
            req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.types
              .join(", ")
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            req.id.toString().includes(searchQuery.toLowerCase()) ||
            req.implementation_status
              .toLowerCase()
              .includes(searchQuery.toLowerCase()),
        );
  }, [searchQuery, requirements]);

  // Row selection state and handlers
  const {
    selectedRows,
    isAllSelected,
    isIndeterminate,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
  } = useRowSelection(filteredRequirements.length);

  // Reusable function to load requirements
  const loadRequirements = useCallback(async () => {
    if (!productId) return;
    try {
      const data = await listRequirements(productId);
      setRequirements(data);
    } catch (error) {
      console.error("Failed to load requirements:", error);
      toast({
        title: "Error",
        description: "Failed to load requirements. Please try again.",
        variant: "destructive",
      });
    }
  }, [productId, toast]);

  // Load requirements from API when product is selected
  useEffect(() => {
    if (!productId) {
      setRequirements([]);
      clearSelection();
      return;
    }
    loadRequirements();
  }, [productId, loadRequirements, clearSelection]);

  // Listen for custom refresh event
  useEffect(() => {
    window.addEventListener("refreshRequirements", loadRequirements);
    return () =>
      window.removeEventListener("refreshRequirements", loadRequirements);
  }, [loadRequirements]);

  // Reset selected rows when search query changes
  useEffect(() => {
    clearSelection();
  }, [searchQuery, clearSelection]);

  // Handle delete selected rows
  const handleDeleteSelected = async () => {
    const requirementsToDelete = selectedRows.map(
      (index) => filteredRequirements[index],
    );
    if (requirementsToDelete.length === 0) return;

    const deletePromises = requirementsToDelete.map((req) =>
      deleteRequirement(req.id).catch((error) => ({
        id: req.id,
        error: error,
      })),
    );

    const results = await Promise.allSettled(deletePromises);

    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to process deletion for an unknown ID (Promise rejected):`,
          result.reason,
        );
      } else if (result.status === "fulfilled") {
        const value = result.value as
          | { id: string; error: Error }
          | Requirement;
        if (value && typeof value === "object" && "error" in value) {
          const failedId = value.id;
          const error = value.error;
          console.error(`Failed to delete requirement ID: ${failedId}`, error);
        }
      }
    });

    // Refresh the list after attempting deletions
    if (productId) {
      try {
        const updatedRequirements = await listRequirements(productId);
        setRequirements(updatedRequirements);
        clearSelection();
      } catch (error) {
        console.error("Failed to refresh requirements after deletion:", error);
        toast({
          title: "Error",
          description: "Failed to refresh requirements after deletion.",
          variant: "destructive",
        });
        clearSelection();
      }
    }
  };

  if (!productId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg dark:text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <RequirementsTable
        requirements={filteredRequirements}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRows={selectedRows}
        onRowSelect={toggleRowSelection}
        onSelectAll={toggleAllSelection}
        isAllSelected={isAllSelected}
        isIndeterminate={isIndeterminate}
        onDeleteSelected={handleDeleteSelected}
        onRequirementClick={(requirement) => {
          // Navigate to the requirement detail page using requirement_key
          // This will update the URL and trigger the [requirementId] page
          if (productKey && requirement.requirement_key) {
            router.push(
              `/product/${productKey}/requirement/${requirement.requirement_key}`,
            );
          }
        }}
        onRequirementsUpdate={setRequirements}
        productId={productId}
      />
    </>
  );
}
