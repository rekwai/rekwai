"use client";

import { useState, useEffect } from "react";
import { Check, Trash, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAsyncDialogSubmit } from "@/hooks/use-async-dialog-submit";
import { RequiredLabel } from "@/components/ui/required-label";

interface ProductSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    product_key: string;
  };
  onSave: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ProductSettingsDialog({
  open,
  onOpenChange,
  product,
  onSave,
  onDelete,
}: ProductSettingsDialogProps) {
  const { toast } = useToast();
  const [productName, setProductName] = useState(product.name);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);

  const { handleSubmit: submitSave, isSubmitting: isSaving } =
    useAsyncDialogSubmit(
      onSave,
      () => onOpenChange(false),
      (error) => {
        toast({
          variant: "destructive",
          title: "Failed to save product",
          description: error.message,
        });
      },
    );

  const { handleSubmit: submitDelete, isSubmitting: isDeleting } =
    useAsyncDialogSubmit(
      onDelete,
      () => onOpenChange(false),
      (error) => {
        toast({
          variant: "destructive",
          title: "Failed to delete product",
          description: error.message,
        });
      },
    );

  const isSubmitting = isSaving || isDeleting;

  // Update state when product prop changes
  useEffect(() => {
    setProductName(product.name);
    setDeleteConfirmation(false); // Reset delete confirmation when product changes
  }, [product.name]);

  const handleSave = () => {
    if (productName.trim() && !isSubmitting) {
      submitSave(product.id, productName);
    }
  };

  const handleDelete = () => {
    if (deleteConfirmation && !isSubmitting) {
      submitDelete(product.id);
    } else {
      setDeleteConfirmation(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-6">
        <DialogHeader className="pb-4 border-b border-gray-200 dark:border-[#1a1a1a]">
          <DialogTitle className="text-xl">Product Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <label htmlFor="product-name" className="text-sm font-medium">
              <RequiredLabel text="Product Name" />
            </label>
            <input
              id="product-name"
              data-testid="edit-product-name-input"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className={`w-full p-2 border rounded-md ${
                productName.length >= 25
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300"
              }`}
              maxLength={25}
            />
            <div className="flex justify-between items-center">
              <span
                className={`text-xs ${
                  productName.length >= 25 ? "text-red-600" : "text-gray-500"
                }`}
              >
                {productName.length >= 25
                  ? "Maximum character limit reached"
                  : `${productName.length}/25 characters`}
              </span>
            </div>
          </div>

          {/* Non-editable Product Key field */}
          <div className="space-y-2">
            <label htmlFor="product-key" className="text-sm font-medium">
              Product Key
            </label>
            <input
              id="product-key"
              type="text"
              value={product.product_key}
              disabled
              className="w-full p-2 border rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500">
              Product key cannot be changed.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-[#1a1a1a]">
          <div>
            {deleteConfirmation ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Are you sure?</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-500"
                  onClick={() => setDeleteConfirmation(false)}
                >
                  No
                </Button>
                <Button
                  data-testid="confirm-delete-product"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Yes, Delete"
                  )}
                </Button>
              </div>
            ) : (
              <Button
                data-testid="delete-product-button"
                variant="outline"
                className="text-red-600"
                onClick={handleDelete}
              >
                <Trash size={16} className="mr-2" />
                Delete Product
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X size={16} className="mr-2" />
              Cancel
            </Button>
            <Button
              data-testid="save-product-settings"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} className="mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
