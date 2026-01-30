"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAsyncDialogSubmit } from "@/hooks/use-async-dialog-submit";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (productName: string, productKey: string) => Promise<void>;
}

export function AddProductDialog({
  open,
  onOpenChange,
  onAddProduct,
}: AddProductDialogProps) {
  const { toast } = useToast();
  const [productName, setProductName] = useState("");
  const [productKey, setProductKey] = useState("");

  const { handleSubmit: submitAsync, isSubmitting } = useAsyncDialogSubmit(
    (name: string, key: string) => onAddProduct(name, key),
    () => {
      setProductName("");
      setProductKey("");
      onOpenChange(false);
    },
    (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create product",
        description: error.message,
      });
    },
  );

  const isProductKeyValid = /^[A-Z]{3,6}$/.test(productKey);
  const canSubmit =
    productName.trim().length > 0 && isProductKeyValid && !isSubmitting;

  const handleSubmit = () => {
    if (canSubmit) {
      submitAsync(productName.trim(), productKey);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-gray-200 dark:border-[#1a1a1a]">
          <DialogTitle className="text-xl font-bold">
            Add new Product
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="product-name"
              className="text-sm font-medium text-gray-900 dark:text-[#FAFFFD]"
            >
              Product Name
            </label>
            <div className="relative">
              <input
                id="product-name"
                data-testid="product-name-input"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className={`w-full p-2 border rounded-md bg-white dark:bg-[#121212] text-gray-900 dark:text-[#FAFFFD] ${
                  productName.length >= 25
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-gray-300 dark:border-[#1a1a1a]"
                }`}
                placeholder="Enter product name"
                maxLength={25}
              />
              {productName && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600">
                  <Check size={16} />
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span
                className={`text-xs ${
                  productName.length >= 25
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-500 dark:text-[#FAFFFD]"
                }`}
              >
                {productName.length >= 25
                  ? "Maximum character limit reached"
                  : `${productName.length}/25 characters`}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="product-key"
              className="text-sm font-medium text-gray-900 dark:text-[#FAFFFD]"
            >
              Product Key (3–6 letters)
            </label>
            <div className="relative">
              <input
                id="product-key"
                data-testid="product-key-input"
                type="text"
                value={productKey}
                onChange={(e) => {
                  const upper = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "");
                  setProductKey(upper.slice(0, 6));
                }}
                className={`w-full p-2 border rounded-md bg-white dark:bg-[#121212] text-gray-900 dark:text-[#FAFFFD] ${
                  productKey.length > 0 && !isProductKeyValid
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-gray-300 dark:border-[#1a1a1a]"
                }`}
                placeholder="e.g., ABC or MYPRD"
                maxLength={6}
                inputMode="text"
                autoCapitalize="characters"
              />
              {isProductKeyValid && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600">
                  <Check size={16} />
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span
                className={`text-xs ${
                  productKey.length > 0 && !isProductKeyValid
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-500 dark:text-[#FAFFFD]"
                }`}
              >
                {productKey.length === 0
                  ? "Enter 3–6 letters (A–Z)"
                  : isProductKeyValid
                    ? "Looks good"
                    : "Must be 3–6 uppercase letters (A–Z)"}
              </span>
              <span className="text-xs text-gray-500 dark:text-[#FAFFFD]">
                {productKey.length}/6
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between p-4 bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-[#1a1a1a]">
          <Button
            data-testid="cancel-add-product"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            data-testid="create-product-submit"
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Add Product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
