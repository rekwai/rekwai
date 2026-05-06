import { useState, useMemo } from "react";
import { RequirementItem, SuggestedActionType } from "@/types/requirement-types";
import {
  bulkAcceptSuggestions,
  BulkAcceptSuggestionsResult,
} from "@/lib/api/requirements";

export interface BulkApproveBreakdown {
  attach: number;
  merge: number;
  create_new: number;
  total: number;
}

export interface BulkApproveProgress {
  current: number;
  total: number;
}

export interface BulkApproveResult {
  accepted: number;
  failed: number;
  skipped: number;
  alreadyLinked: number;
  noSuggestion: number;
  invalidatedDuplicate: number;
  invalidatedDuplicateIds: string[];
}

interface UseBulkApproveSuggestionsReturn {
  isApproving: boolean;
  showDialog: boolean;
  breakdown: BulkApproveBreakdown;
  progress: BulkApproveProgress | null;
  result: BulkApproveResult | null;
  openDialog: () => void;
  closeDialog: () => void;
  handleDone: () => Promise<void>;
  confirmBulkApprove: () => Promise<void>;
}

export function useBulkApproveSuggestions(
  requirements: RequirementItem[],
  documentId: string,
  onComplete: () => Promise<void>,
  onRefreshSkippedSuggestions: (ids: string[]) => Promise<void>,
): UseBulkApproveSuggestionsReturn {
  const [isApproving, setIsApproving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState<BulkApproveProgress | null>(null);
  const [result, setResult] = useState<BulkApproveResult | null>(null);

  const suggestedRequirements = useMemo(
    () => requirements.filter((req) => !req.hasLinks && req.suggestedAction),
    [requirements],
  );

  const breakdown = useMemo<BulkApproveBreakdown>(() => {
    const counts = { attach: 0, merge: 0, create_new: 0 };
    for (const req of suggestedRequirements) {
      const action = req.suggestedAction as SuggestedActionType;
      if (action in counts) {
        counts[action]++;
      }
    }
    return { ...counts, total: suggestedRequirements.length };
  }, [suggestedRequirements]);

  const openDialog = () => {
    setResult(null);
    setShowDialog(true);
  };

  const closeDialog = () => {
    if (isApproving) return;
    setShowDialog(false);
  };

  const handleDone = async () => {
    await onComplete();
    setShowDialog(false);
    setResult(null);
  };

  const confirmBulkApprove = async () => {
    if (breakdown.total === 0) return;

    setIsApproving(true);
    setProgress({ current: 0, total: breakdown.total });

    try {
      const bulkResult: BulkAcceptSuggestionsResult =
        await bulkAcceptSuggestions(documentId);
      setProgress({ current: breakdown.total, total: breakdown.total });

      await onComplete();

      const invalidatedDuplicateIds = bulkResult.items
        .filter(
          (item) =>
            item.status === "skipped" &&
            item.reason === "invalidated_duplicate",
        )
        .map((item) => item.extracted_requirement_id);

      if (invalidatedDuplicateIds.length > 0) {
        await onRefreshSkippedSuggestions(invalidatedDuplicateIds);
      }

      setResult({
        accepted: bulkResult.accepted,
        failed: bulkResult.failed,
        skipped: bulkResult.skipped,
        alreadyLinked: bulkResult.already_linked,
        noSuggestion: bulkResult.no_suggestion,
        invalidatedDuplicate: bulkResult.invalidated_duplicate,
        invalidatedDuplicateIds,
      });
    } finally {
      setIsApproving(false);
      setProgress(null);
    }
  };

  return {
    isApproving,
    showDialog,
    breakdown,
    progress,
    result,
    openDialog,
    closeDialog,
    handleDone,
    confirmBulkApprove,
  };
}
