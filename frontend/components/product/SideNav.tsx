"use client";

import { Plus } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import Image from "next/image";
import { ProductListItem } from "./ProductListItem";
import { Product } from "@/lib/api/products";

interface SideNavProps {
  products: Pick<Product, "name" | "product_key">[];
  selectedProductKey: string;
  onProductSelect: (key: string) => void;
  onAddProduct: () => void;
  disableProductSelection?: boolean;
}

export function SideNav({
  products,
  selectedProductKey,
  onProductSelect,
  onAddProduct,
  disableProductSelection = false,
}: SideNavProps) {
  return (
    <div className="w-[210px] bg-transparent dark:bg-background flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <Image
          src="/rekwai-logo-light.svg"
          alt="Rekwai Logo"
          width={100}
          height={32}
          className="h-8 w-auto block dark:hidden"
        />
        <Image
          src="/rekwai-logo.svg"
          alt="Rekwai Logo"
          width={100}
          height={32}
          className="h-8 w-auto hidden dark:block"
        />
      </div>

      {/* Product List */}
      <div className="flex-1 p-4 overflow-y-auto">
        {products.map((product) => (
          <ProductListItem
            key={product.product_key}
            product={product}
            isSelected={selectedProductKey === product.product_key}
            isDisabled={disableProductSelection}
            onSelect={onProductSelect}
          />
        ))}

        {/* Add Product Button - Hidden when product selection is disabled */}
        {!disableProductSelection && (
          <button
            data-testid="add-product-button"
            className="w-full mt-3 p-3 border border-dashed border-[#312F2F] dark:border-gray-400 dark:bg-black text-[#312F2F] dark:text-[#FAFFFD] rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-accent hover:text-[#080705] dark:hover:text-accent-foreground transition-colors"
            onClick={onAddProduct}
          >
            <Plus size={16} className="mr-2" />
            <span className="text-sm">Add new</span>
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto">
        <div className="p-4">
          <div className="bg-[#F6F6F6] dark:bg-[#121212] rounded-2xl p-3">
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 flex items-center justify-center">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
