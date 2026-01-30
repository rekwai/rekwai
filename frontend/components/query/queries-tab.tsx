"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { useRowSelection } from "@/hooks/use-row-selection";
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
} from "@/components/common/data-table";
import {
  listQuestionnaires,
  deleteQuestionnaire,
  downloadQuestionnaire,
  QuestionnaireSummary,
} from "@/lib/api/questionnaires";
import { formatDate } from "@/lib/utils/date-utils";
import { toast } from "sonner";

interface QueriesTabProps {
  productId: string | null;
  productKey: string;
}

export function QueriesTab({ productId, productKey }: QueriesTabProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter questionnaires based on search query
  const filteredQueries = useMemo(() => {
    if (!Array.isArray(questionnaires)) return [];
    if (!searchQuery.trim()) return questionnaires;

    const lowerCaseQuery = searchQuery.toLowerCase();
    return questionnaires.filter(
      (query) =>
        query.id.toString().includes(lowerCaseQuery) ||
        query.client_name.toLowerCase().includes(lowerCaseQuery),
    );
  }, [questionnaires, searchQuery]);

  // Row selection state and handlers
  const {
    selectedRows,
    isAllSelected,
    isIndeterminate,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
  } = useRowSelection(filteredQueries.length);

  // Fetch data function (wrapped in useCallback)
  const fetchData = useCallback(async () => {
    if (productId === null) {
      setIsLoading(false);
      setQuestionnaires([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await listQuestionnaires(productId);
      setQuestionnaires(data);
    } catch (err) {
      console.error("Failed to fetch questionnaires:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      toast.error("Failed to load questionnaires.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [productId]); // Include productId in dependency array

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Include fetchData in dependency array

  // Handle row click - navigate to query page
  const handleRowClick = (key: string | null) => {
    if (!key) return; // Don't navigate if key is null
    router.push(`/product/${productKey}/query/${key}`);
  };

  // Handle download
  const handleDownload = async (
    query: QuestionnaireSummary,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    try {
      // Download the file blob from the API
      const blob = await downloadQuestionnaire(query.id);

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = query.file_name;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success("Questionnaire downloaded successfully");
    } catch (err) {
      console.error("Failed to download questionnaire:", err);
      toast.error("Failed to download questionnaire", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Handle individual delete
  const handleDeleteIndividual = async (
    query: QuestionnaireSummary,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (isDeleting) return;

    setIsDeleting(true);
    const toastId = toast.loading(`Deleting questionnaire...`);

    try {
      await deleteQuestionnaire(query.id);
      toast.success("Questionnaire deleted successfully", { id: toastId });
      // Refresh the data
      await fetchData();
    } catch (err) {
      console.error("Failed to delete questionnaire:", err);
      toast.error("Failed to delete questionnaire", {
        id: toastId,
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete selected rows
  const handleDeleteSelected = async () => {
    const selectedIds = selectedRows
      .map((index) => filteredQueries[index]?.id)
      .filter((id): id is string => id !== undefined);
    if (selectedIds.length === 0) {
      toast.warning("No questionnaires selected for deletion.");
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading(
      `Deleting ${selectedIds.length} questionnaire(s)...`,
    );

    try {
      const deletePromises = selectedIds.map((id) => deleteQuestionnaire(id));
      const results = await Promise.allSettled(deletePromises);

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failureCount = results.length - successCount;

      // Log failures to console for debugging
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Failed to delete questionnaire ID ${selectedIds[index]}:`,
            result.reason,
          );
        }
      });

      if (successCount > 0) {
        toast.success(
          `${successCount} questionnaire(s) deleted successfully.`,
          { id: toastId },
        );
        clearSelection();
        await fetchData();
      } else {
        toast.dismiss(toastId);
      }

      if (failureCount > 0) {
        toast.error(`Failed to delete ${failureCount} questionnaire(s).`, {
          description: "Check console for details.",
        });
      }
    } catch (err) {
      // Catch unexpected errors during the Promise.allSettled or setup phase
      console.error("Error during bulk delete operation:", err);
      toast.error("An unexpected error occurred during deletion.", {
        id: toastId,
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate answered percentage
  const calculatePercentage = (answered: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((answered / total) * 100);
  };

  // Remove file extension for display
  const getFileNameWithoutExtension = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex === -1 || lastDotIndex === 0) return fileName;
    return fileName.substring(0, lastDotIndex);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 p-6 flex flex-col min-h-0">
        <div className="flex flex-col h-full space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <DataTableBulkDeleteButton
              selectedCount={selectedRows.length}
              onDelete={handleDeleteSelected}
              disabled={isDeleting}
              isDeleting={isDeleting}
              itemName="Doc"
            />
            <DataTableSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search"
              disabled={isLoading || isDeleting}
            />
          </div>

          {/* Table - Scrollable */}
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead className="w-12">
                  <DataTableCheckbox
                    checked={isAllSelected}
                    isIndeterminate={isIndeterminate}
                    onCheckedChange={toggleAllSelection}
                    disabled={
                      isLoading || isDeleting || filteredQueries.length === 0
                    }
                  />
                </DataTableHead>
                <DataTableHead>Key</DataTableHead>
                <DataTableHead>Client</DataTableHead>
                <DataTableHead>Document Name</DataTableHead>
                <DataTableHead>Questions</DataTableHead>
                <DataTableHead>Uploaded</DataTableHead>
                <DataTableHead className="w-20">Actions</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {isLoading ? (
                <DataTableLoading
                  message="Loading questionnaires..."
                  colSpan={7}
                />
              ) : error ? (
                <DataTableErrorState error={error} colSpan={7} />
              ) : filteredQueries.length > 0 ? (
                filteredQueries.map((query, index) => {
                  const percentage = calculatePercentage(
                    query.answered_questions,
                    query.total_questions,
                  );
                  const isSelected = selectedRows.includes(index);
                  return (
                    <DataTableSelectableRow
                      key={query.id}
                      isSelected={isSelected}
                      disabled={isDeleting}
                      onClick={() => handleRowClick(query.key)}
                      data-testid={`questionnaire-${query.id}`}
                    >
                      <DataTableCell
                        onClick={(e) => {
                          if (!isDeleting) e.stopPropagation();
                        }}
                      >
                        <DataTableCheckbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            !isDeleting && toggleRowSelection(index)
                          }
                          disabled={isDeleting}
                        />
                      </DataTableCell>
                      <DataTableCell>{query.key || "-"}</DataTableCell>
                      <DataTableCell>{query.client_name}</DataTableCell>
                      <DataTableCell>
                        {getFileNameWithoutExtension(query.file_name)}
                      </DataTableCell>
                      <DataTableCell>
                        <DataTableBadge
                          variant={percentage === 100 ? "success" : "info"}
                        >
                          <span data-testid="answered-count">
                            {query.answered_questions}/{query.total_questions}
                          </span>
                        </DataTableBadge>
                      </DataTableCell>
                      <DataTableCell>
                        {formatDate(query.uploaded_at)}
                      </DataTableCell>
                      <DataTableCell onClick={(e) => e.stopPropagation()}>
                        <DataTableActions>
                          <DataTableActionButton
                            onClick={(e) => handleDownload(query, e)}
                            icon={<Download size={16} />}
                            variant="primary"
                            disabled={isDeleting}
                          />
                          <DataTableActionButton
                            onClick={(e) => handleDeleteIndividual(query, e)}
                            icon={<Trash2 size={16} />}
                            variant="danger"
                            disabled={isDeleting}
                          />
                        </DataTableActions>
                      </DataTableCell>
                    </DataTableSelectableRow>
                  );
                })
              ) : (
                <DataTableEmptyState
                  searchQuery={searchQuery}
                  emptyMessage='No query docs yet. Click the "Upload" dropdown above and select "Upload Query" to get started.'
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
