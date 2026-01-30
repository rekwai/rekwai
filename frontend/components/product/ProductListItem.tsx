import React from "react";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import { Product } from "@/lib/api/products";

interface ProductListItemProps {
  product: Pick<Product, "name" | "product_key">;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (productKey: string) => void;
}

/**
 * Optimized product list item component with React.memo to prevent
 * unnecessary re-renders when parent state changes.
 */
export const ProductListItem = React.memo(function ProductListItem({
  product,
  isSelected,
  isDisabled,
  onSelect,
}: ProductListItemProps) {
  return (
    <div
      data-testid="product-list-item"
      className={clsx(
        "p-4 flex items-center justify-between rounded-lg mb-3 transition-colors",
        // Selected/unselected styles
        isSelected
          ? "bg-[#121212] text-[#FAFFFD] dark:bg-[#121212] dark:text-[#FAFFFD]"
          : "bg-transparent text-[#080705] dark:bg-transparent dark:text-[#FAFFFD]",
        // Interaction styles
        isDisabled ? "cursor-default opacity-75" : "cursor-pointer",
        // Hover styles (only for non-selected, non-disabled items)
        !isDisabled &&
          !isSelected &&
          "hover:bg-gray-100 dark:hover:bg-accent hover:text-[#080705] dark:hover:text-accent-foreground",
      )}
      onClick={isDisabled ? undefined : () => onSelect(product.product_key)}
    >
      <div className="flex items-center">
        <span
          className={clsx(
            "text-sm",
            isSelected ? "font-medium" : "font-normal",
          )}
        >
          {product.name}
        </span>
      </div>
      {isSelected && (
        <ArrowRight size={16} className="text-black dark:text-[#FAFFFD]" />
      )}
    </div>
  );
});
