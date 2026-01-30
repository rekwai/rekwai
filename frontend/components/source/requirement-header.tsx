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
import { useBulkCreateRequirements } from "@/hooks/use-bulk-create-requirements";
import { PageHeader } from "@/components/common/page-header";
import { BulkCreateDialog } from "@/components/source/bulk-create-dialog";
import { RequirementItem } from "@/types/requirement-types";
import { Loader2 } from "lucide-react";

const BASE_BUTTON_STYLES =
  "font-inter flex flex-row justify-center items-center px-2.5 py-1 gap-1.5 h-7 border-none rounded-[12px] text-xs leading-[15px] font-normal";

const DELETE_BUTTON_STYLES = `${BASE_BUTTON_STYLES} bg-[#FBDBDD] dark:bg-[#8B2635] text-[#080705] dark:text-[#FAFFFD] hover:bg-[#FBDBDD]/90 dark:hover:bg-[#8B2635]/90`;

const BULK_CREATE_BUTTON_STYLES = `${BASE_BUTTON_STYLES} bg-primary text-primary-foreground hover:bg-primary/90`;

interface RequirementHeaderProps {
  productKey: string;
  productName: string;
  documentKey?: string;
  documentId: string;
  requirements: RequirementItem[];
  productId: string;
  onBulkCreateComplete: () => Promise<void>;
}

export function RequirementHeader({
  productKey,
  productName,
  documentKey,
  documentId,
  requirements,
  productId,
  onBulkCreateComplete,
}: RequirementHeaderProps) {
  const {
    isDeleting,
    showDeleteDialog,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  } = useDocumentDelete(documentId, productKey);

  const {
    isBulkCreating,
    showConfirmDialog: showBulkCreateDialog,
    unlinkedCount,
    progress,
    result,
    openConfirmDialog: openBulkCreateDialog,
    closeConfirmDialog: closeBulkCreateDialog,
    handleDone: handleBulkCreateDone,
    confirmBulkCreate,
  } = useBulkCreateRequirements(requirements, productId, onBulkCreateComplete);

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
              onClick={openBulkCreateDialog}
              disabled={isBulkCreating || unlinkedCount === 0}
              className={BULK_CREATE_BUTTON_STYLES}
            >
              {isBulkCreating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Creating...
                </>
              ) : (
                `Add ${unlinkedCount} unlinked requirements to Rekwai`
              )}
            </Button>
            <Button
              variant="outline"
              onClick={openDeleteDialog}
              disabled={isDeleting}
              className={DELETE_BUTTON_STYLES}
            >
              {isDeleting ? "Deleting..." : "Delete source"}
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

      {/* Bulk Create Confirmation Dialog */}
      <BulkCreateDialog
        open={showBulkCreateDialog}
        onOpenChange={closeBulkCreateDialog}
        unlinkedCount={unlinkedCount}
        isBulkCreating={isBulkCreating}
        progress={progress}
        result={result}
        onConfirm={confirmBulkCreate}
        onDone={handleBulkCreateDone}
      />
    </>
  );
}
