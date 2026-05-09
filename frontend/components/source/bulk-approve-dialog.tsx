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
  BulkApproveBreakdown,
  BulkApproveProgress,
  BulkApproveResult,
} from "@/hooks/use-bulk-approve-suggestions";

interface BulkApproveDialogProps {
  open: boolean;
  onOpenChange: () => void;
  breakdown: BulkApproveBreakdown;
  isApproving: boolean;
  progress: BulkApproveProgress | null;
  result: BulkApproveResult | null;
  onConfirm: () => Promise<void>;
  onDone: () => Promise<void>;
}

export function BulkApproveDialog({
  open,
  onOpenChange,
  breakdown,
  isApproving,
  progress,
  result,
  onConfirm,
  onDone,
}: BulkApproveDialogProps) {
  const renderConfirmationContent = () => (
    <>
      <AlertDialogDescription asChild>
        <div className="space-y-3">
          <p>
            You are about to approve {breakdown.total} Rekwai suggestion
            {breakdown.total !== 1 ? "s" : ""}:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {breakdown.attach > 0 && (
              <li>
                <strong>{breakdown.attach}</strong> will be attached to existing
                requirements
              </li>
            )}
            {breakdown.merge > 0 && (
              <li>
                <strong>{breakdown.merge}</strong> will be merged into existing
                requirements
              </li>
            )}
            {breakdown.create_new > 0 && (
              <li>
                <strong>{breakdown.create_new}</strong> will create new
                requirements
              </li>
            )}
          </ul>
          {breakdown.merge > 0 && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
              Merge actions will modify existing requirements. This cannot be
              undone.
            </div>
          )}
        </div>
      </AlertDialogDescription>
    </>
  );

  const renderProgressContent = () => (
    <AlertDialogDescription>
      Approving suggestion {progress?.current} of {progress?.total}...
    </AlertDialogDescription>
  );

  const renderResultContent = () => {
    if (!result) return null;
    const parts: string[] = [];
    if (result.accepted > 0) parts.push(`${result.accepted} accepted`);
    if (result.failed > 0) parts.push(`${result.failed} failed`);
    if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
    return (
      <AlertDialogDescription asChild>
        <div className="space-y-2">
          <p>{parts.join(", ")}.</p>
          {result.invalidatedDuplicate > 0 && (
            <p className="text-amber-700 dark:text-amber-300">
              {result.invalidatedDuplicate} suggestion
              {result.invalidatedDuplicate !== 1 ? "s were" : " was"} skipped
              because{" "}
              {result.invalidatedDuplicate !== 1
                ? "they targeted"
                : "it targeted"}{" "}
              requirements that were already changed during this bulk approval. {" "}
              {result.invalidatedDuplicate !== 1 ? "Those rows" : "That row"}{" "}
              {result.invalidatedDuplicate !== 1 ? "need" : "needs"}{" "}
              {result.invalidatedDuplicate !== 1 ? "fresh" : "a fresh"} Rekwai
              suggestion and {result.invalidatedDuplicate !== 1 ? "are" : "is"}{" "}
              being refreshed now.
            </p>
          )}
        </div>
      </AlertDialogDescription>
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {result
              ? "Suggestions Approved"
              : "Approve All Rekwai Suggestions"}
          </AlertDialogTitle>
          {result
            ? renderResultContent()
            : progress
              ? renderProgressContent()
              : renderConfirmationContent()}
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
                disabled={isApproving}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirm}
                disabled={isApproving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Approving...
                  </>
                ) : (
                  "Approve All"
                )}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
