"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
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
  DataTableActionButton,
  DataTableSearchBar,
  DataTableBulkDeleteButton,
  DataTableEmptyState,
  DataTableErrorState,
  DataTableSelectableRow,
  DataTableActions,
  DataTableBadge,
} from "@/components/common/data-table";
import { Download, Trash2 } from "lucide-react";
import {
  getRequirementDocuments,
  RequirementDocument,
  deleteDocument,
  downloadDocument,
} from "@/lib/api/requirements";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils/date-utils";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface Document {
  id: string;
  key: string;
  name: string;
  dateUploaded: string;
  requirementsCount: number;
  linkedRequirementsCount: number;
}

const transformApiDocument = (apiDoc: RequirementDocument): Document => ({
  id: apiDoc.id,
  key: apiDoc.document_key,
  name: apiDoc.original_filename,
  dateUploaded: apiDoc.created_at,
  requirementsCount: apiDoc.requirements_count,
  linkedRequirementsCount: apiDoc.linked_requirements_count,
});

export function SourcesTab({ productId }: { productId: string | null }) {
  const router = useRouter();
  const params = useParams();
  const productKey = params?.productKey as string | undefined;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(query) ||
        doc.key.toLowerCase().includes(query),
    );
  }, [searchQuery, documents]);

  // Row selection state and handlers
  const {
    selectedRows,
    isAllSelected,
    isIndeterminate,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
  } = useRowSelection(filteredDocuments.length);

  // Reusable function to load documents from API
  const loadDocuments = useCallback(async () => {
    if (!productId) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiDocuments = await getRequirementDocuments(productId);
      const transformedDocuments = apiDocuments.map(transformApiDocument);
      setDocuments(transformedDocuments);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError(err instanceof Error ? err.message : "Failed to load documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Load documents from API when productId changes
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleRowClick = (document: Document) => {
    if (productKey) {
      router.push(`/product/${productKey}/source/${document.key}`);
    }
  };

  const handleDownload = async (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click

    try {
      // Download the file blob from the API
      const blob = await downloadDocument(doc.id);

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download document:", error);
      alert("Failed to download document. Please try again.");
    }
  };

  const handleDelete = (document: Document, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setDeleteLoading(true);
    try {
      await deleteDocument(documentToDelete.id);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);

      // Reload the documents list
      await loadDocuments();
    } catch (err) {
      console.error("Failed to delete document:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete document",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    const documentsToDelete = selectedRows.map(
      (index) => filteredDocuments[index],
    );

    setBulkDeleteLoading(true);
    try {
      // Delete all selected documents
      await Promise.all(documentsToDelete.map((doc) => deleteDocument(doc.id)));

      setBulkDeleteDialogOpen(false);

      // Reload the documents list, then clear selection on success
      await loadDocuments();
      clearSelection();
    } catch (err) {
      console.error("Failed to delete documents:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete documents",
      );
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 p-6 flex flex-col min-h-0 bg-transparent dark:bg-[#080705]">
        <div className="flex flex-col h-full space-y-6">
          {/* Search and Bulk Actions */}
          <div className="flex items-center gap-4">
            <DataTableBulkDeleteButton
              selectedCount={selectedRows.length}
              onDelete={handleBulkDelete}
              itemName="Doc"
            />
            <DataTableSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search"
            />
          </div>

          {/* Documents Table */}
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead className="w-12">
                  <DataTableCheckbox
                    checked={isAllSelected}
                    isIndeterminate={isIndeterminate}
                    onCheckedChange={toggleAllSelection}
                  />
                </DataTableHead>
                <DataTableHead>Key</DataTableHead>
                <DataTableHead>Document Name</DataTableHead>
                <DataTableHead>Requirements</DataTableHead>
                <DataTableHead>Uploaded</DataTableHead>
                <DataTableHead className="w-20">Actions</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {loading ? (
                <DataTableLoading message="Loading documents..." colSpan={6} />
              ) : error ? (
                <DataTableErrorState error={error} colSpan={6} />
              ) : (
                filteredDocuments.map((document, index) => (
                  <DataTableSelectableRow
                    key={document.id}
                    data-testid={`requirement-document-${document.id}`}
                    isSelected={selectedRows.includes(index)}
                    onClick={() => handleRowClick(document)}
                  >
                    <DataTableCell onClick={(e) => e.stopPropagation()}>
                      <DataTableCheckbox
                        checked={selectedRows.includes(index)}
                        onCheckedChange={() => toggleRowSelection(index)}
                      />
                    </DataTableCell>
                    <DataTableCell>{document.key}</DataTableCell>
                    <DataTableCell>{document.name}</DataTableCell>
                    <DataTableCell>
                      <DataTableBadge
                        variant={
                          document.requirementsCount > 0 &&
                          document.linkedRequirementsCount ===
                            document.requirementsCount
                            ? "success"
                            : "info"
                        }
                      >
                        {document.linkedRequirementsCount}/
                        {document.requirementsCount}
                      </DataTableBadge>
                    </DataTableCell>
                    <DataTableCell>
                      {formatDate(document.dateUploaded)}
                    </DataTableCell>
                    <DataTableCell onClick={(e) => e.stopPropagation()}>
                      <DataTableActions>
                        <DataTableActionButton
                          onClick={(e) => handleDownload(document, e)}
                          icon={<Download size={16} />}
                          variant="primary"
                        />
                        <DataTableActionButton
                          onClick={(e) => handleDelete(document, e)}
                          icon={<Trash2 size={16} />}
                          variant="danger"
                        />
                      </DataTableActions>
                    </DataTableCell>
                  </DataTableSelectableRow>
                ))
              )}
              {!loading && !error && filteredDocuments.length === 0 && (
                <DataTableEmptyState
                  searchQuery={searchQuery}
                  emptyMessage='No sources yet. Click the "Upload" dropdown above and select "Upload Source" to get started.'
                  colSpan={6}
                />
              )}
            </DataTableBody>
          </DataTable>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Document"
        description={`Are you sure you want to delete "${documentToDelete?.name}"? This action cannot be undone and will also delete all extracted requirements from this document.`}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title={`Delete ${selectedRows.length} Document${selectedRows.length === 1 ? "" : "s"}`}
        description={`Are you sure you want to delete ${selectedRows.length} document${selectedRows.length === 1 ? "" : "s"}? This action cannot be undone and will also delete all extracted requirements from these documents.`}
        onConfirm={handleConfirmBulkDelete}
        loading={bulkDeleteLoading}
      />
    </div>
  );
}
