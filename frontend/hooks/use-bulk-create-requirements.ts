import { useState, useMemo } from "react";
import {
  RequirementItem,
  CreateRequirementPayload,
} from "@/types/requirement-types";
import {
  createRequirement,
  createExtractionLink,
} from "@/lib/api/requirements";
import { getFirstNonEmpty } from "@/lib/utils/string-utils";

export interface BulkCreateProgress {
  current: number;
  total: number;
}

export interface BulkCreateResult {
  succeeded: number;
  failed: number;
}

interface UseBulkCreateRequirementsReturn {
  isBulkCreating: boolean;
  showConfirmDialog: boolean;
  unlinkedCount: number;
  progress: BulkCreateProgress | null;
  result: BulkCreateResult | null;
  openConfirmDialog: () => void;
  closeConfirmDialog: () => void;
  handleDone: () => Promise<void>;
  confirmBulkCreate: () => Promise<void>;
}

export function useBulkCreateRequirements(
  requirements: RequirementItem[],
  productId: string,
  onComplete: () => Promise<void>,
): UseBulkCreateRequirementsReturn {
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [progress, setProgress] = useState<BulkCreateProgress | null>(null);
  const [result, setResult] = useState<BulkCreateResult | null>(null);

  const unlinkedRequirements = useMemo(
    () => requirements.filter((req) => !req.hasLinks),
    [requirements],
  );

  const unlinkedCount = unlinkedRequirements.length;

  const openConfirmDialog = () => {
    setResult(null);
    setShowConfirmDialog(true);
  };

  const closeConfirmDialog = () => {
    if (isBulkCreating) return;
    setShowConfirmDialog(false);
  };

  const handleDone = async () => {
    // Refresh data first, then close dialog
    // This ensures the parent state is updated before dialog state changes
    await onComplete();
    setShowConfirmDialog(false);
    setResult(null);
  };

  const confirmBulkCreate = async () => {
    if (unlinkedCount === 0) return;

    setIsBulkCreating(true);
    setProgress({ current: 0, total: unlinkedCount });

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < unlinkedRequirements.length; i++) {
      const extractedReq = unlinkedRequirements[i];
      setProgress({ current: i + 1, total: unlinkedCount });

      try {
        const payload: CreateRequirementPayload = {
          description: getFirstNonEmpty(
            extractedReq.description,
            extractedReq.text,
          ),
          types: extractedReq.types || [],
          product_id: productId,
          requirement_verification: extractedReq.requirementVerification || "",
          implementation_description:
            extractedReq.implementationDescription || "",
          implementation_status: extractedReq.implementation || "To do",
        };

        const createdReq = await createRequirement(payload);
        await createExtractionLink(
          createdReq.id.toString(),
          extractedReq.id.toString(),
        );
        succeeded++;
      } catch (error) {
        console.error(
          `Failed to create requirement from extracted ${extractedReq.id}:`,
          error,
        );
        failed++;
      }
    }

    // Refresh data to update hasLinks status
    await onComplete();

    setIsBulkCreating(false);
    setProgress(null);
    setResult({ succeeded, failed });
  };

  return {
    isBulkCreating,
    showConfirmDialog,
    unlinkedCount,
    progress,
    result,
    openConfirmDialog,
    closeConfirmDialog,
    handleDone,
    confirmBulkCreate,
  };
}
