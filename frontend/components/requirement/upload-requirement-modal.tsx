"use client";

import type React from "react";

import {
  ArrowRight,
  Upload,
  File,
  Trash2,
  Loader2,
  Check,
  Circle,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  EarlyStageCancelDialog,
  LateStageCancelDialog,
} from "@/components/ui/upload-cancel-dialogs";
import { UploadErrorDisplay } from "@/components/ui/upload-error-display";
import type { TranslatedError } from "@/lib/utils/error-translator";
import {
  uploadRequirementsAsync,
  pollTaskStatus,
  TaskStatus,
} from "@/lib/api/requirements";
import { useTaskUpload } from "@/hooks/use-task-upload";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  productKey: string | null;
}

type StepStatus = "pending" | "in_progress" | "completed";

interface ExtractionStep {
  label: string;
  status: StepStatus;
  detail?: string;
}

/**
 * Parse the progress value and message to determine step statuses.
 * Steps: Extract -> Implementation -> Verification -> Link
 */
function parseExtractionSteps(
  progress: number,
  message: string,
): ExtractionStep[] {
  // Extract requirement count from messages like "Extracted 25 requirements"
  const extractCount = (msg: string): string | undefined => {
    const match = msg.match(/(\d+)\s+requirements?/i);
    return match ? match[1] : undefined;
  };

  const count = extractCount(message);

  // Determine step statuses based on progress thresholds and message patterns
  const isExtractionComplete =
    progress >= 0.45 || message.includes("Extracted");
  const isImplementationComplete =
    progress >= 0.65 || message.includes("Analyzed implementation");
  const isVerificationComplete =
    progress >= 0.8 || message.includes("Generated verification");
  const isLinkingComplete = progress >= 1.0;

  const isImplementationActive =
    isExtractionComplete &&
    !isImplementationComplete &&
    (message.includes("Analyzing implementation") || progress >= 0.45);
  const isVerificationActive =
    isImplementationComplete &&
    !isVerificationComplete &&
    (message.includes("Generating verification") || progress >= 0.7);
  const isLinkingActive =
    isVerificationComplete &&
    !isLinkingComplete &&
    (message.includes("Linking") || progress >= 0.85);

  return [
    {
      label: "Extract requirements",
      status: isExtractionComplete
        ? "completed"
        : progress >= 0.2
          ? "in_progress"
          : "pending",
      detail: isExtractionComplete && count ? `(${count})` : undefined,
    },
    {
      label: "Analyze implementation",
      status: isImplementationComplete
        ? "completed"
        : isImplementationActive
          ? "in_progress"
          : "pending",
    },
    {
      label: "Generate verification",
      status: isVerificationComplete
        ? "completed"
        : isVerificationActive
          ? "in_progress"
          : "pending",
    },
    {
      label: "Link to existing",
      status: isLinkingComplete
        ? "completed"
        : isLinkingActive
          ? "in_progress"
          : "pending",
    },
  ];
}

export function UploadModal({
  open,
  onOpenChange,
  productId,
  productKey,
}: UploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<TranslatedError | null>(null);

  // Use shared hook for task upload state management
  const taskUpload = useTaskUpload({
    lateStageThreshold: 0.85, // After requirements are extracted
    onClose: () => onOpenChange(false),
  });

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Extract resetState to avoid including entire taskUpload object in deps
  const { resetState: resetTaskUploadState } = taskUpload;

  // Effect to reset state when the modal is closed
  useEffect(() => {
    if (!open) {
      // Delay reset slightly to avoid visual glitch if reopening quickly
      const timer = setTimeout(() => {
        setFile(null);
        setError(null);
        resetTaskUploadState();
        resetFileInput();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open, resetTaskUploadState]);
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setError(null);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setFile(e.target.files[0]);
        setError(null);
      }
    },
    [],
  );

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    resetFileInput();
  };

  const handleNext = async () => {
    if (!file || taskUpload.isLoading) {
      console.error("No file selected or already loading");
      return;
    }

    if (productId === null) {
      console.error("No product selected");
      return;
    }

    setError(null);
    const controller = taskUpload.startUpload();

    try {
      // Step 1: Upload file and get task ID
      console.log("Uploading file for async processing...");
      const uploadResponse = await uploadRequirementsAsync(file, productId);
      const taskId = uploadResponse.task_id;
      taskUpload.setCurrentTaskId(taskId);
      console.log("File uploaded, task ID:", taskId);

      // Step 2: Poll task status with progress updates
      console.log("Starting to poll task status...");
      const finalStatus = await pollTaskStatus(
        taskId,
        1000, // Poll every 1 second
        20 * 60 * 1000, // 20 minutes timeout
        (status: TaskStatus) => {
          // Progress callback - update progress bar
          console.log(
            `Task progress: ${Math.round(status.progress * 100)}% - ${status.message}`,
          );
          taskUpload.setProgressValue(status.progress);
          taskUpload.setProgressMessage(status.message || "Processing...");
        },
        controller.signal,
      );

      console.log("Task completed successfully:", finalStatus);

      // Step 3: Navigate to document page using entity_id
      if (!finalStatus.entity_id) {
        throw new Error("Task completed but no document ID returned");
      }

      console.log(
        "Navigating to document page for document ID:",
        finalStatus.entity_id,
      );

      // Close the upload modal and navigate to the document page
      onOpenChange(false);

      if (productKey) {
        router.push(`/product/${productKey}/source/${finalStatus.entity_id}`);
      } else {
        console.error("Product key not available for navigation");
      }
    } catch (error) {
      console.error("Error during async file upload or processing:", error);
      const result = taskUpload.handleUploadError(error);
      if (result.wasAborted) {
        console.log("Upload was cancelled by user");
        return;
      }
      if (result.translatedError) {
        setError(result.translatedError);
      }
    } finally {
      taskUpload.setIsLoading(false);
      setFile(null);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => !taskUpload.isLoading && onOpenChange(isOpen)}
      >
        <DialogContent
          className="sm:max-w-[500px] p-0 overflow-hidden"
          data-testid="upload-requirement-modal"
        >
          <div className="p-6">
            <DialogHeader className="border-b border-gray-200 dark:border-[#1a1a1a] pb-4">
              {/* Removed Step 1 text */}
              <DialogTitle className="text-xl font-bold">
                Upload Source
              </DialogTitle>
              <DialogDescription>
                Upload a document (.pdf, .doc, .docx, .xls, .xlsx, .md, .txt) to
                extract requirements.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Removed Location and Product divs */}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Document name</label>
              <div className="text-sm">
                {file ? file.name : "Select a file"}
              </div>
            </div>

            {/* Drag and drop / File display / Loading area */}
            <div
              className={`border border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-3 transition-colors ${
                isDragging && !taskUpload.isLoading
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300" // Only highlight if not loading
              } relative ${taskUpload.isLoading ? "cursor-not-allowed bg-gray-50" : "cursor-pointer"}`} // Style changes when loading
              onDragEnter={!taskUpload.isLoading ? handleDragEnter : undefined}
              onDragOver={!taskUpload.isLoading ? handleDragOver : undefined}
              onDragLeave={!taskUpload.isLoading ? handleDragLeave : undefined}
              onDrop={!taskUpload.isLoading ? handleDrop : undefined}
              onClick={handleSelectFile}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.md,.txt"
                disabled={taskUpload.isLoading}
              />

              {taskUpload.isLoading ? ( // Show progress bar when loading
                <div
                  className="flex flex-col items-start gap-3 text-sm text-gray-600 dark:text-gray-300 w-full"
                  data-testid="upload-progress-indicator"
                >
                  {/* Progress bar */}
                  <div className="flex gap-3 w-full">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Progress
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(taskUpload.progressValue * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{
                            width: `${taskUpload.progressValue * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-end pb-0.5">
                      <Loader2
                        size={16}
                        className="animate-spin flex-shrink-0"
                      />
                    </div>
                  </div>

                  {/* Step indicators */}
                  <div className="w-full space-y-1.5 mt-1">
                    {parseExtractionSteps(
                      taskUpload.progressValue,
                      taskUpload.progressMessage || "",
                    ).map((step, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs"
                      >
                        {step.status === "completed" ? (
                          <Check
                            size={14}
                            className="text-green-500 flex-shrink-0"
                          />
                        ) : step.status === "in_progress" ? (
                          <Loader2
                            size={14}
                            className="animate-spin text-blue-500 flex-shrink-0"
                          />
                        ) : (
                          <Circle
                            size={14}
                            className="text-gray-300 dark:text-gray-600 flex-shrink-0"
                          />
                        )}
                        <span
                          className={
                            step.status === "completed"
                              ? "text-green-600 dark:text-green-400"
                              : step.status === "in_progress"
                                ? "text-blue-600 dark:text-blue-400 font-medium"
                                : "text-gray-400 dark:text-gray-500"
                          }
                        >
                          {step.label}
                          {step.detail && (
                            <span className="ml-1 text-gray-500 dark:text-gray-400">
                              {step.detail}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : file ? ( // Show file info if file exists and not loading
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <File size={20} className="text-blue-500" />
                    <span>{file.name}</span>
                    <span className="text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 p-1.5 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Remove file"
                    disabled={taskUpload.isLoading} // Disable remove button when loading
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </>
              ) : (
                // Show upload prompt if no file and not loading
                <>
                  <Upload size={24} className="text-gray-400" />
                  <div className="text-sm text-center">
                    <p className="font-medium text-gray-700">
                      Drop your document here
                    </p>
                    <p className="text-gray-500">or click to browse</p>
                  </div>
                </>
              )}
            </div>

            {/* Removed Document Description section */}
          </div>

          {error && (
            <div className="px-6 pb-4">
              <UploadErrorDisplay error={error} />
            </div>
          )}

          <DialogFooter className="flex justify-between p-4 bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-[#1a1a1a]">
            <Button variant="outline" onClick={taskUpload.handleCancelClick}>
              Cancel
            </Button>
            <Button
              variant="yellow"
              className="flex items-center gap-2 px-4 py-2"
              onClick={handleNext}
              disabled={!file || taskUpload.isLoading}
              data-testid="upload-document-button"
            >
              {taskUpload.isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  Upload document <ArrowRight size={16} />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EarlyStageCancelDialog
        open={taskUpload.showCloseConfirm}
        onOpenChange={taskUpload.setShowCloseConfirm}
        onConfirmCancel={() => taskUpload.handleCancelUpload(true)}
      />

      <LateStageCancelDialog
        open={taskUpload.showLateStageConfirm}
        onOpenChange={taskUpload.setShowLateStageConfirm}
        error={taskUpload.lateStageError}
        contentType="requirements"
        onKeepData={() => taskUpload.handleCancelUpload(false)}
        onRemoveData={() => taskUpload.handleCancelUpload(true)}
      />
    </>
  );
}
