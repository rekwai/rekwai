"use client";

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
import { Loader2 } from "lucide-react";
import {
  BulkCreateProgress,
  BulkCreateResult,
} from "@/hooks/use-bulk-create-requirements";

interface BulkCreateDialogProps {
  open: boolean;
  onOpenChange: () => void;
  unlinkedCount: number;
  isBulkCreating: boolean;
  progress: BulkCreateProgress | null;
  result: BulkCreateResult | null;
  onConfirm: () => Promise<void>;
  onDone: () => Promise<void>;
}

export function BulkCreateDialog({
  open,
  onOpenChange,
  unlinkedCount,
  isBulkCreating,
  progress,
  result,
  onConfirm,
  onDone,
}: BulkCreateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {result ? "Requirements Created" : "Create Main Requirements"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {result
              ? result.failed === 0
                ? `Successfully created ${result.succeeded} main requirements.`
                : result.succeeded === 0
                  ? `Failed to create requirements. Please try again.`
                  : `Created ${result.succeeded} of ${result.succeeded + result.failed} requirements. ${result.failed} failed.`
              : progress
                ? `Creating requirement ${progress.current} of ${progress.total}...`
                : `You are about to create ${unlinkedCount} main requirements from unlinked extracted requirements. Each will be linked to its source extracted requirement.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {result ? (
            <AlertDialogAction
              onClick={onDone}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Done
            </AlertDialogAction>
          ) : (
            <>
              <AlertDialogCancel
                onClick={onOpenChange}
                disabled={isBulkCreating}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirm}
                disabled={isBulkCreating}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isBulkCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create All"
                )}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
