"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EarlyStageCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmCancel: () => void;
}

/**
 * Dialog shown when user tries to cancel an upload in early stages.
 * No data has been saved yet, so a simple confirmation is shown.
 */
export function EarlyStageCancelDialog({
  open,
  onOpenChange,
  onConfirmCancel,
}: EarlyStageCancelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Upload?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to cancel the upload?
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            No data will be saved and you will need to start over.
          </div>
        </div>
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go Back
          </Button>
          <Button variant="destructive" onClick={onConfirmCancel}>
            Cancel Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface LateStageCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: string | null;
  /** Label for the extracted content (e.g., "questions" or "requirements") */
  contentType: "questions" | "requirements";
  onKeepData: () => void;
  onRemoveData: () => void;
}

/**
 * Dialog shown when user tries to cancel an upload in late stages,
 * or when an error occurs after data has been extracted.
 * Offers options to keep or remove the extracted data.
 */
export function LateStageCancelDialog({
  open,
  onOpenChange,
  error,
  contentType,
  onKeepData,
  onRemoveData,
}: LateStageCancelDialogProps) {
  const contentLabel =
    contentType === "questions" ? "Questions" : "Requirements";
  const contentLabelLower =
    contentType === "questions" ? "questions" : "requirements";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {error ? "Processing Failed" : "Cancel Upload?"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              Error: {error}
            </div>
          )}
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {contentLabel} have been extracted from your document.
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Do you want to keep the extracted {contentLabelLower} or remove
            everything?
          </div>
        </div>
        <div className="flex justify-between pt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go Back
          </Button>
          <div className="flex gap-2">
            <Button variant="default" onClick={onKeepData}>
              Keep {contentLabel}
            </Button>
            <Button variant="destructive" onClick={onRemoveData}>
              Remove Everything
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
