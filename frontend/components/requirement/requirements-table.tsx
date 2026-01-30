"use client";

import { Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  DataTableCheckbox,
  DataTableLoading,
  DataTableBadge,
  DataTableActionButton,
  DataTableSearchBar,
  DataTableBulkDeleteButton,
  DataTableEmptyState,
  DataTableErrorState,
  DataTableSelectableRow,
  DataTableActions,
  DataTableBadgeContainer,
} from "@/components/common/data-table";
import { Requirement } from "@/types/requirement-types";
import { deleteRequirement, listRequirements } from "@/lib/api/requirements";
import { formatDate } from "@/lib/utils/date-utils";
import { toast } from "@/components/ui/use-toast";

interface RequirementsTableProps {
  requirements: Requirement[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedRows: number[];
  onRowSelect: (index: number) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onDeleteSelected: () => void;
  onRequirementClick: (requirement: Requirement) => void;
  onRequirementsUpdate: (requirements: Requirement[]) => void;
  productId: string;
  isLoading?: boolean;
  error?: string | null;
}

export function RequirementsTable({
  requirements,
  searchQuery,
  onSearchChange,
  selectedRows,
  onRowSelect,
  onSelectAll,
  isAllSelected,
  isIndeterminate,
  onDeleteSelected,
  onRequirementClick,
  onRequirementsUpdate,
  productId,
  isLoading = false,
  error = null,
}: RequirementsTableProps) {
  // Handle individual requirement deletion
  const handleDeleteRequirement = async (
    requirementId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    try {
      await deleteRequirement(requirementId);
      // Refresh requirements list after deletion
      const updatedRequirements = await listRequirements(productId);
      onRequirementsUpdate(updatedRequirements);
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete requirement",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 p-6 flex flex-col min-h-0">
        <div className="flex flex-col h-full space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <DataTableBulkDeleteButton
              selectedCount={selectedRows.length}
              onDelete={onDeleteSelected}
              itemName="Requirements"
            />
            <DataTableSearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search"
            />
          </div>

          {/* Table Container - Takes remaining space and allows scrolling */}
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead className="w-12">
                  <DataTableCheckbox
                    checked={isAllSelected}
                    isIndeterminate={isIndeterminate}
                    onCheckedChange={onSelectAll}
                  />
                </DataTableHead>
                <DataTableHead>Key</DataTableHead>
                <DataTableHead>Description</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead>Type</DataTableHead>
                <DataTableHead>Created</DataTableHead>
                <DataTableHead className="w-20">Actions</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {isLoading ? (
                <DataTableLoading
                  message="Loading requirements..."
                  colSpan={7}
                />
              ) : error ? (
                <DataTableErrorState error={error} colSpan={7} />
              ) : requirements.length > 0 ? (
                requirements.map((req, index) => (
                  <DataTableSelectableRow
                    key={req.id}
                    isSelected={selectedRows.includes(index)}
                    onClick={() => onRequirementClick(req)}
                  >
                    <DataTableCell onClick={(e) => e.stopPropagation()}>
                      <DataTableCheckbox
                        checked={selectedRows.includes(index)}
                        onCheckedChange={() => onRowSelect(index)}
                      />
                    </DataTableCell>
                    <DataTableCell>{req.requirement_key}</DataTableCell>
                    <DataTableCell data-testid="requirement-description-cell">
                      {req.description}
                    </DataTableCell>
                    <DataTableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span onClick={(e) => e.stopPropagation()}>
                            <DataTableBadge
                              variant={
                                req.implementation_status === "Implemented"
                                  ? "success"
                                  : req.implementation_status === "Won't do"
                                    ? "error"
                                    : "warning"
                              }
                            >
                              {req.implementation_status}
                            </DataTableBadge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          {req.implementation_description ||
                            "No implementation details available"}
                        </TooltipContent>
                      </Tooltip>
                    </DataTableCell>
                    <DataTableCell data-testid="requirement-type-cell">
                      <DataTableBadgeContainer>
                        {req.types && req.types.length > 0 ? (
                          req.types.map((type, typeIndex) => (
                            <DataTableBadge
                              key={typeIndex}
                              variant={type === "Business" ? "warning" : "info"}
                            >
                              {type}
                            </DataTableBadge>
                          ))
                        ) : (
                          <DataTableBadge variant="default">
                            No type
                          </DataTableBadge>
                        )}
                      </DataTableBadgeContainer>
                    </DataTableCell>
                    <DataTableCell>{formatDate(req.created_at)}</DataTableCell>
                    <DataTableCell onClick={(e) => e.stopPropagation()}>
                      <DataTableActions>
                        <DataTableActionButton
                          onClick={(e) => handleDeleteRequirement(req.id, e)}
                          icon={<Trash2 size={16} />}
                          variant="danger"
                        />
                      </DataTableActions>
                    </DataTableCell>
                  </DataTableSelectableRow>
                ))
              ) : (
                <DataTableEmptyState
                  searchQuery={searchQuery}
                  emptyMessage='No requirements yet. Click the "Create Requirement" button above to get started.'
                  colSpan={7}
                />
              )}
            </DataTableBody>
          </DataTable>
        </div>
      </div>
    </div>
  );
}
