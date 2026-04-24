"use client";

import { Button } from "@/components/ui/button";
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
import { useDocumentDelete } from "@/hooks/use-document-delete";
import { useBulkApproveSuggestions } from "@/hooks/use-bulk-approve-suggestions";
import { PageHeader } from "@/components/common/page-header";
import { BulkApproveDialog } from "@/components/source/bulk-approve-dialog";
import { RequirementItem } from "@/types/requirement-types";
import { Loader2, Check } from "lucide-react";
import { Trash } from "@phosphor-icons/react";

const BASE_BUTTON_STYLES =
  "font-inter flex flex-row justify-center items-center px-2.5 py-1 gap-1.5 h-7 border-none rounded-[12px] text-xs leading-[15px] font-normal";

const DELETE_BUTTON_STYLES = `${BASE_BUTTON_STYLES} group bg-semantic-error-bg text-semantic-black hover:!bg-semantic-error-fg dark:hover:!bg-semantic-error-fg hover:!text-semantic-white dark:hover:!text-semantic-white`;

const BULK_CREATE_BUTTON_STYLES = `${BASE_BUTTON_STYLES} bg-semantic-success-fg !text-semantic-white hover:bg-semantic-indicator-4 hover:!text-semantic-white`;

interface RequirementHeaderProps {
  productKey: string;
  productName: string;
  documentKey?: string;
  documentId: string;
  requirements: RequirementItem[];
  productId: string;
  onBulkApproveComplete: () => Promise<void>;
}

export function RequirementHeader({
  productKey,
  productName,
  documentKey,
  documentId,
  requirements,
  productId,
  onBulkApproveComplete,
}: RequirementHeaderProps) {
  const {
    isDeleting,
    showDeleteDialog,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  } = useDocumentDelete(documentId, productKey);

  const {
    isApproving,
    showDialog: showBulkApproveDialog,
    breakdown,
    progress,
    result,
    openDialog: openBulkApproveDialog,
    closeDialog: closeBulkApproveDialog,
    handleDone: handleBulkApproveDone,
    confirmBulkApprove,
  } = useBulkApproveSuggestions(requirements, productId, onBulkApproveComplete);

  const breadcrumbs: Array<{ label: string; path?: string; isBold?: boolean }> =
    [
      {
        label: productName || "Product",
        path: `/product/${productKey}/requirement`,
      },
    ];

  if (documentKey) {
    breadcrumbs.push({
      label: documentKey,
      isBold: true,
    });
  }

  return (
    <>
      <PageHeader
        backPath={`/product/${productKey}/source`}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={openBulkApproveDialog}
              disabled={isApproving || breakdown.total === 0}
              className={BULK_CREATE_BUTTON_STYLES}
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  {`Approve ${breakdown.total} Rekwai suggestions`}
                  <Check className="h-3 w-3" />
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={openDeleteDialog}
              disabled={isDeleting}
              className={DELETE_BUTTON_STYLES}
            >
              {isDeleting ? (
                "Deleting..."
              ) : (
                <>
                  <Trash
                    size={14}
                    weight="bold"
                    className="text-semantic-black group-hover:text-semantic-white"
                  />
                  Delete source
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{documentKey}&quot;? This
              action cannot be undone and will also delete all extracted
              requirements from this document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Approve Confirmation Dialog */}
      <BulkApproveDialog
        open={showBulkApproveDialog}
        onOpenChange={closeBulkApproveDialog}
        breakdown={breakdown}
        isApproving={isApproving}
        progress={progress}
        result={result}
        onConfirm={confirmBulkApprove}
        onDone={handleBulkApproveDone}
      />
    </>
  );
}
