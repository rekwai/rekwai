import { useState, useCallback } from "react";
import { cancelTask } from "@/lib/api/task-utils";
import {
  translateUploadError,
  type TranslatedError,
} from "@/lib/utils/error-translator";

export interface UseTaskUploadOptions {
  /** Progress threshold for late-stage (default: 0.7 for questionnaires, 0.85 for requirements) */
  lateStageThreshold?: number;
  /** Callback when dialog should close */
  onClose: () => void;
}

export interface HandleUploadErrorResult {
  /** True if the error was an abort (user cancelled) and should be silently ignored */
  wasAborted: boolean;
  /** True if the error was handled as a late-stage error (dialog shown) */
  wasLateStage: boolean;
  /** The translated error if it wasn't handled (for early-stage errors) */
  translatedError: TranslatedError | null;
}

export interface UseTaskUploadReturn {
  // State
  isLoading: boolean;
  progressValue: number;
  progressMessage: string;
  currentTaskId: string | null;
  abortController: AbortController | null;
  showCloseConfirm: boolean;
  showLateStageConfirm: boolean;
  lateStageError: string | null;

  // State setters
  setIsLoading: (loading: boolean) => void;
  setProgressValue: (value: number) => void;
  setProgressMessage: (message: string) => void;
  setCurrentTaskId: (taskId: string | null) => void;
  setShowCloseConfirm: (show: boolean) => void;
  setShowLateStageConfirm: (show: boolean) => void;
  setLateStageError: (error: string | null) => void;

  // Actions
  startUpload: () => AbortController;
  handleCancelClick: () => void;
  handleCancelUpload: (cleanup: boolean) => Promise<void>;
  /** Handles upload errors consistently - returns info about how the error was handled */
  handleUploadError: (error: unknown) => HandleUploadErrorResult;
  resetState: () => void;
  isLateStage: boolean;
}

export function useTaskUpload({
  lateStageThreshold = 0.7,
  onClose,
}: UseTaskUploadOptions): UseTaskUploadReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showLateStageConfirm, setShowLateStageConfirm] = useState(false);
  const [lateStageError, setLateStageError] = useState<string | null>(null);

  const isLateStage = progressValue >= lateStageThreshold;

  const startUpload = useCallback(() => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);
    setProgressValue(0);
    setProgressMessage("Starting document upload...");
    return controller;
  }, []);

  const resetState = useCallback(() => {
    setIsLoading(false);
    setProgressValue(0);
    setProgressMessage("");
    setCurrentTaskId(null);
    setAbortController(null);
    setShowCloseConfirm(false);
    setShowLateStageConfirm(false);
    setLateStageError(null);
  }, []);

  const handleCancelUpload = useCallback(
    async (cleanup: boolean) => {
      if (currentTaskId) {
        try {
          await cancelTask(currentTaskId, cleanup);
        } catch (error) {
          console.error("Error cancelling task:", error);
        }
      }
      abortController?.abort();
      setShowLateStageConfirm(false);
      setShowCloseConfirm(false);
      setLateStageError(null);
      onClose();
    },
    [currentTaskId, abortController, onClose],
  );

  const handleCancelClick = useCallback(() => {
    if (isLoading && isLateStage) {
      // Late stage - show keep/remove dialog
      setShowLateStageConfirm(true);
    } else if (isLoading) {
      // Early stage - show simple confirm
      setShowCloseConfirm(true);
    } else {
      // Not loading - just close
      onClose();
    }
  }, [isLoading, isLateStage, onClose]);

  const handleUploadError = useCallback(
    (error: unknown): HandleUploadErrorResult => {
      // Check if it's an abort error (user cancelled)
      if (error instanceof DOMException && error.name === "AbortError") {
        return { wasAborted: true, wasLateStage: false, translatedError: null };
      }

      // Check if we're in late stage (data already extracted)
      if (isLateStage) {
        setLateStageError(
          error instanceof Error ? error.message : "An error occurred",
        );
        setShowLateStageConfirm(true);
        return { wasAborted: false, wasLateStage: true, translatedError: null };
      }

      // Early-stage error - translate and return for the caller to display
      const rawError =
        error instanceof Error ? error.message : "An unexpected error occurred";
      const translatedError = translateUploadError(rawError);
      return { wasAborted: false, wasLateStage: false, translatedError };
    },
    [isLateStage],
  );

  return {
    // State
    isLoading,
    progressValue,
    progressMessage,
    currentTaskId,
    abortController,
    showCloseConfirm,
    showLateStageConfirm,
    lateStageError,

    // State setters
    setIsLoading,
    setProgressValue,
    setProgressMessage,
    setCurrentTaskId,
    setShowCloseConfirm,
    setShowLateStageConfirm,
    setLateStageError,

    // Actions
    startUpload,
    handleCancelClick,
    handleCancelUpload,
    handleUploadError,
    resetState,
    isLateStage,
  };
}
