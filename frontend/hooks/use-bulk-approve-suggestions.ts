import { useState, useMemo } from "react";
import {
  RequirementItem,
  CreateRequirementPayload,
  SuggestedActionType,
} from "@/types/requirement-types";
import {
  createRequirement,
  createExtractionLink,
  updateRequirement as updateRequirementApi,
  acceptSuggestion,
  getSuggestedAction,
} from "@/lib/api/requirements";
import { getFirstNonEmpty } from "@/lib/utils/string-utils";
import { mergePreviewToUpdatePayload } from "@/lib/utils/requirement-transformers";

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
  succeeded: number;
  failed: number;
  skipped: number;
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
  productId: string,
  onComplete: () => Promise<void>,
): UseBulkApproveSuggestionsReturn {
  const [isApproving, setIsApproving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState<BulkApproveProgress | null>(null);
  const [result, setResult] = useState<BulkApproveResult | null>(null);

  const suggestedRequirements = useMemo(
    () => requirements.filter((req) => req.suggestedAction),
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

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    // Track which target requirements have already been merged into,
    // so we can detect conflicts and re-suggest
    const mergedTargetIds = new Set<string>();

    for (let i = 0; i < suggestedRequirements.length; i++) {
      const req = suggestedRequirements[i];
      setProgress({ current: i + 1, total: breakdown.total });

      try {
        let action: SuggestedActionType | undefined = req.suggestedAction as
          | SuggestedActionType
          | undefined;
        let targetId = req.suggestedTargetRequirementId;
        let mergePreview = req.mergePreview;

        // Detect merge conflict: target was already merged by an earlier item
        if (
          action === "merge" &&
          targetId &&
          mergedTargetIds.has(targetId)
        ) {
          // Re-suggest: get a fresh suggestion from the AI
          try {
            const freshSuggestion = await getSuggestedAction(
              req.id.toString(),
            );
            action = freshSuggestion.action;
            targetId = freshSuggestion.target_requirement_id ?? undefined;
            mergePreview = freshSuggestion.merge_preview ?? undefined;
          } catch (error) {
            console.error(
              `Failed to re-suggest for conflicting merge ${req.id}:`,
              error,
            );
            failed++;
            continue;
          }
        }

        if (action === "attach") {
          await acceptSuggestion(req.id.toString());
          succeeded++;
        } else if (action === "merge") {
          if (!mergePreview || !targetId) {
            skipped++;
            continue;
          }
          const payload = mergePreviewToUpdatePayload(
            mergePreview,
            productId,
          );
          await updateRequirementApi(targetId, payload);
          await createExtractionLink(targetId, req.id.toString());
          await acceptSuggestion(req.id.toString());
          mergedTargetIds.add(targetId);
          succeeded++;
        } else if (action === "create_new") {
          const createPayload: CreateRequirementPayload = {
            description: getFirstNonEmpty(req.description, req.text),
            types: req.types || [],
            product_id: productId,
            requirement_verification: req.requirementVerification || "",
            implementation_description: req.implementationDescription || "",
            implementation_status: req.implementation || "To do",
          };
          const created = await createRequirement(createPayload);
          await createExtractionLink(
            created.id.toString(),
            req.id.toString(),
          );
          await acceptSuggestion(req.id.toString());
          succeeded++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(
          `Failed to approve suggestion for extracted ${req.id}:`,
          error,
        );
        failed++;
      }
    }

    await onComplete();

    setIsApproving(false);
    setProgress(null);
    setResult({ succeeded, failed, skipped });
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
