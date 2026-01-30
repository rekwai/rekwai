"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// API
import { listProducts, createProduct, type Product } from "@/lib/api/products";

// Components
import { SideNav } from "@/components/product/SideNav";
import { AddProductDialog } from "@/components/product/add-product-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function ProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProductsLoading(true);
        const data = await listProducts();
        setProducts(data);

        // Redirect logic
        const productKeyFromUrl = searchParams.get("productKey");

        if (data.length > 0) {
          if (
            productKeyFromUrl &&
            data.find((p) => p.product_key === productKeyFromUrl)
          ) {
            // Redirect to the product from URL by key
            router.replace(`/product/${productKeyFromUrl}/requirement`);
          } else {
            // Redirect to first product
            router.replace(`/product/${data[0].product_key}/requirement`);
          }
        }
      } catch (error) {
        console.error("Failed to load products:", error);
        setProducts([]);
        toast({
          variant: "destructive",
          title: "Failed to load products",
          description: "Could not load products. Please try again.",
        });
      } finally {
        setProductsLoading(false);
      }
    };
    loadProducts();
  }, [searchParams, router, toast]);

  const handleAddProduct = async (productName: string, productKey: string) => {
    try {
      const newProduct = await createProduct({
        name: productName,
        product_key: productKey,
      });

      // After creating, redirect to the new product using product key
      router.push(`/product/${newProduct.product_key}/requirement`);
    } catch (error) {
      console.error("Failed to create product:", error);
      toast({
        variant: "destructive",
        title: "Product creation failed",
        description: "Could not create the product. Please try again.",
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background justify-center">
      <div className="flex h-screen max-w-[1280px] w-full bg-gray-50 dark:bg-background">
        <SideNav
          products={products}
          selectedProductKey=""
          onProductSelect={(key) => router.push(`/product/${key}/requirement`)}
          onAddProduct={() => setAddProductDialogOpen(true)}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0">
          {productsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-lg dark:text-foreground">
                Loading products...
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg mb-4 dark:text-foreground">
                  No products found
                </div>
                <Button onClick={() => setAddProductDialogOpen(true)}>
                  Create Your First Product
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-lg dark:text-foreground">
                Redirecting to product...
              </div>
            </div>
          )}
        </div>

        <AddProductDialog
          open={addProductDialogOpen}
          onOpenChange={setAddProductDialogOpen}
          onAddProduct={handleAddProduct}
        />
      </div>
    </div>
  );
}
