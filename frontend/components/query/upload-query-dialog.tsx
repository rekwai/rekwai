"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { Check, Upload, Loader2, Plus, X, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  EarlyStageCancelDialog,
  LateStageCancelDialog,
} from "@/components/ui/upload-cancel-dialogs";
import { UploadErrorDisplay } from "@/components/ui/upload-error-display";
import {
  type TranslatedError,
  createValidationError,
} from "@/lib/utils/error-translator";
import {
  uploadQuestionnaireDocumentAsync,
  pollTaskStatus,
  TaskStatus,
} from "@/lib/api/questionnaires";
import { useTaskUpload } from "@/hooks/use-task-upload";

import { useRouter } from "next/navigation";
import { listProducts as apiListProducts } from "@/lib/api/products";
import { listClients, createClient, Client } from "@/lib/api/clients";

interface ProductOption {
  id: string;
  name: string;
  key: string;
}

interface UploadQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products?: ProductOption[];
  selectedProductId?: string | null;
  productId?: string | null;
}

export function UploadQueryDialog({
  open,
  onOpenChange,
  products: propProducts,
  selectedProductId,
  productId,
}: UploadQueryDialogProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<TranslatedError | null>(null);

  // Use shared hook for task upload state management
  const taskUpload = useTaskUpload({
    lateStageThreshold: 0.7, // After questions are extracted
    onClose: () => onOpenChange(false),
  });

  // Local list of products for the combobox; default to provided prop but fetch if empty
  const [productsList, setProductsList] = useState<ProductOption[]>(
    propProducts || [],
  );

  // Compute initial selected id from either selectedProductId or productId props
  const initialSelectedId = selectedProductId ?? productId ?? null;

  // Selected product state for this dialog
  const [chosenProductId, setChosenProductId] = useState<string | null>(
    initialSelectedId,
  );

  // Client management states
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isCreatingClientLoading, setIsCreatingClientLoading] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  // Keep local products list in sync with prop
  useEffect(() => {
    if (propProducts && propProducts.length > 0) {
      setProductsList(propProducts);
    }
  }, [propProducts]);

  // Fetch products if not provided (only when dialog is open and list is empty)
  useEffect(() => {
    if (
      open &&
      (!propProducts || propProducts.length === 0) &&
      productsList.length === 0
    ) {
      apiListProducts()
        .then((data) =>
          setProductsList(
            data.map((p) => ({ id: p.id, name: p.name, key: p.product_key })),
          ),
        )
        .catch((err) => {
          console.error("Failed to load products for upload dialog:", err);
          // Do not surface error here; the select will show empty state
        });
    }
  }, [open, propProducts, productsList.length]);

  // Ensure a valid selection based on available products and initial selection
  useEffect(() => {
    if (productsList && productsList.length > 0) {
      const found =
        initialSelectedId !== null
          ? productsList.find((p) => p.id === initialSelectedId)
          : undefined;
      setChosenProductId(found ? found.id : productsList[0].id);
    } else {
      setChosenProductId(null);
    }
  }, [productsList, initialSelectedId]);

  // Fetch clients when dialog is open
  useEffect(() => {
    if (open && clientsList.length === 0) {
      listClients()
        .then((data) => {
          setClientsList(data);
          // Auto-select first client if available
          if (data.length > 0) {
            setSelectedClientId(data[0].id);
          }
        })
        .catch((err) => {
          console.error("Failed to load clients for upload dialog:", err);
        });
    }
  }, [open, clientsList.length]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null); // Clear error on new file selection
    }
  };

  const handleSelectFile = () => {
    if (!taskUpload.isLoading) {
      document.getElementById("query-file-upload")?.click();
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      setError(createValidationError("Please enter a client name."));
      return;
    }
    setIsCreatingClientLoading(true);
    try {
      const newClient = await createClient({
        name: newClientName.trim(),
      });
      setClientsList([...clientsList, newClient]);
      setSelectedClientId(newClient.id);
      setNewClientName("");
      setIsCreatingClient(false);
      setError(null);
    } catch (err) {
      setError(
        createValidationError(
          err instanceof Error ? err.message : "Failed to create client.",
        ),
      );
    } finally {
      setIsCreatingClientLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError(createValidationError("Please select a document to upload."));
      return;
    }
    if (!selectedClientId) {
      setError(createValidationError("Please select a client."));
      return;
    }
    if (!chosenProductId) {
      setError(
        createValidationError(
          "No product selected. Please select a product first.",
        ),
      );
      return;
    }

    setError(null);
    const controller = taskUpload.startUpload();

    try {
      const uploadResponse = await uploadQuestionnaireDocumentAsync(
        selectedFile,
        selectedClientId,
        chosenProductId,
      );
      const taskId = uploadResponse.task_id;
      taskUpload.setCurrentTaskId(taskId);

      const finalStatus = await pollTaskStatus(
        taskId,
        1000,
        20 * 60 * 1000,
        (status: TaskStatus) => {
          taskUpload.setProgressValue(status.progress);
          taskUpload.setProgressMessage(status.message || "Processing...");
        },
        controller.signal,
      );

      if (!finalStatus.entity_id) {
        throw new Error("Task completed but no questionnaire ID returned");
      }

      onOpenChange(false);

      const selectedProduct = productsList.find(
        (p) => p.id === chosenProductId,
      );
      if (!selectedProduct) {
        throw new Error("Could not find product for navigation");
      }
      router.push(
        `/product/${selectedProduct.key}/query/${finalStatus.entity_id}`,
      );
    } catch (err) {
      console.error("Error during async questionnaire upload:", err);
      const result = taskUpload.handleUploadError(err);
      if (result.wasAborted) {
        console.log("Upload was cancelled by user");
        return;
      }
      if (result.translatedError) {
        setError(result.translatedError);
      }
    } finally {
      taskUpload.setIsLoading(false);
    }
  };

  // Extract resetState to avoid including entire taskUpload object in deps
  const { resetState: resetTaskUploadState } = taskUpload;

  // Reset state when the modal is closed
  useEffect(() => {
    if (!open) {
      // Delay reset slightly to avoid visual glitch if reopening quickly
      const timer = setTimeout(() => {
        setSelectedFile(null);
        setSelectedClientId(clientsList.length > 0 ? clientsList[0].id : null);
        setIsCreatingClient(false);
        setIsCreatingClientLoading(false);
        setNewClientName("");
        setError(null);
        setChosenProductId(initialSelectedId);
        resetTaskUploadState();
        // Reset the file input value so the same file can be selected again
        const fileInput = document.getElementById(
          "query-file-upload",
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open, initialSelectedId, clientsList, resetTaskUploadState]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !taskUpload.isLoading && onOpenChange(isOpen)}
    >
      <DialogContent
        className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col bg-white dark:bg-[#121212]"
        data-testid="upload-questionnaire-modal"
      >
        <DialogHeader className="p-6 border-b border-gray-200 dark:border-[#1a1a1a] flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-black dark:text-[#FAFFFD]">
            Upload query document
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-[#121212]">
          {/* Product Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="product"
              className="text-sm font-medium text-black dark:text-[#FAFFFD]"
            >
              Product
            </label>
            <div className="relative">
              <select
                id="product"
                value={chosenProductId || ""}
                onChange={(e) => setChosenProductId(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-[#1a1a1a] rounded-md appearance-none bg-white dark:bg-[#312F2F] text-black dark:text-[#FAFFFD]"
              >
                <option value="" disabled>
                  Select a product
                </option>
                {productsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {chosenProductId && !taskUpload.isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 dark:text-green-400">
                  <Check size={16} />
                </div>
              )}
            </div>
          </div>
          {/* File upload area */}
          <div
            className={`border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center transition-colors ${
              taskUpload.isLoading
                ? "cursor-not-allowed bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#1a1a1a]"
                : "cursor-pointer border-gray-300 dark:border-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
            }`}
            onClick={handleSelectFile}
          >
            <input
              id="query-file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
              disabled={taskUpload.isLoading}
            />
            {taskUpload.isLoading ? (
              <div className="flex flex-col items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <div
                  className="flex gap-3 w-full max-w-xs"
                  data-testid="upload-progress-indicator"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Progress
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(taskUpload.progressValue * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-[#1a1a1a] rounded-full h-2">
                      <div
                        className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${taskUpload.progressValue * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-end pb-0.5">
                    <Loader2
                      size={16}
                      className="animate-spin flex-shrink-0 text-gray-600 dark:text-gray-300"
                    />
                  </div>
                </div>
                <span
                  className="text-center text-gray-600 dark:text-gray-300"
                  data-testid="progress-message"
                >
                  {taskUpload.progressMessage || "Processing document..."}
                </span>
              </div>
            ) : selectedFile ? (
              <div className="flex flex-col items-center gap-2 text-sm">
                <Check
                  size={24}
                  className="text-green-500 dark:text-green-400"
                />
                <span className="text-gray-700 dark:text-[#FAFFFD]">
                  {selectedFile.name}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mb-3 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-500 dark:text-gray-400 mb-2">
                  Select Document
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  Click to browse files
                </span>
              </>
            )}
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="client"
                className="text-sm font-medium text-black dark:text-[#FAFFFD]"
              >
                Client
              </label>
              {!isCreatingClient && (
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(true)}
                  disabled={taskUpload.isLoading}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus size={12} />
                  New client
                </button>
              )}
            </div>
            {isCreatingClient ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Enter client name"
                    className="flex-1 p-2 border border-gray-300 dark:border-[#1a1a1a] rounded-md bg-white dark:bg-[#312F2F] text-black dark:text-[#FAFFFD] placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    disabled={taskUpload.isLoading || isCreatingClientLoading}
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={
                      taskUpload.isLoading ||
                      !newClientName.trim() ||
                      isCreatingClientLoading
                    }
                    className="px-3"
                  >
                    {isCreatingClientLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingClient(false);
                      setNewClientName("");
                      setError(null);
                    }}
                    disabled={taskUpload.isLoading || isCreatingClientLoading}
                    className="px-3"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="client"
                  data-testid="client-name-input"
                  value={selectedClientId || ""}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full p-2 pr-10 border border-gray-300 dark:border-[#1a1a1a] rounded-md appearance-none bg-white dark:bg-[#312F2F] text-black dark:text-[#FAFFFD] cursor-pointer"
                  disabled={taskUpload.isLoading}
                >
                  <option value="" disabled>
                    Select a client
                  </option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center gap-1.5">
                  {selectedClientId && !taskUpload.isLoading && (
                    <Check
                      size={16}
                      className="text-green-600 dark:text-green-400"
                    />
                  )}
                  <ChevronDown
                    size={16}
                    className="text-gray-400 dark:text-[#fff]"
                  />
                </div>
              </div>
            )}
          </div>

          {error && <UploadErrorDisplay error={error} />}
        </div>
        <div className="flex justify-between p-6 bg-gray-50 dark:bg-[#121212] border-t border-gray-200 dark:border-[#1a1a1a] flex-shrink-0">
          <Button variant="outline" onClick={taskUpload.handleCancelClick}>
            Cancel
          </Button>
          <Button
            variant="yellow"
            className="flex items-center gap-2"
            onClick={handleUpload}
            disabled={
              !selectedFile ||
              !selectedClientId ||
              !chosenProductId ||
              taskUpload.isLoading ||
              productsList.length === 0
            }
            data-testid="upload-questionnaire-button"
          >
            {taskUpload.isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      <EarlyStageCancelDialog
        open={taskUpload.showCloseConfirm}
        onOpenChange={taskUpload.setShowCloseConfirm}
        onConfirmCancel={() => taskUpload.handleCancelUpload(true)}
      />

      <LateStageCancelDialog
        open={taskUpload.showLateStageConfirm}
        onOpenChange={taskUpload.setShowLateStageConfirm}
        error={taskUpload.lateStageError}
        contentType="questions"
        onKeepData={() => taskUpload.handleCancelUpload(false)}
        onRemoveData={() => taskUpload.handleCancelUpload(true)}
      />
    </Dialog>
  );
}
