"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Settings, Plus, ChevronDown } from "lucide-react";

// API
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct as deleteProductApi,
} from "@/lib/api/products";

// Hooks
import { useProductByKey } from "@/hooks/use-product-by-key";
import { useProductOperations } from "@/hooks/use-product-operations";
import { useResolvedParams } from "@/hooks/use-resolved-params";

// Components - Layout
import { SideNav } from "@/components/product/SideNav";

// Components - Modals
import { UploadModal } from "@/components/requirement/upload-requirement-modal";
import { UploadQueryDialog } from "@/components/query/upload-query-dialog";
import { CreateRequirementModal } from "@/components/requirement/create-requirement-modal";
import { AddProductDialog } from "@/components/product/add-product-dialog";
import { ProductSettingsDialog } from "@/components/product/product-settings-dialog";

// Components - UI
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { isFullPageRoute } from "@/lib/routes";

export default function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ productKey: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const resolvedParams = useResolvedParams(params);
  const productKey = resolvedParams?.productKey ?? null;

  // Use custom hook for product operations with consistent error handling
  const {
    products,
    setProducts,
    productsLoading,
    setProductsLoading,
    withProductOperation,
    withProductOperationAndNavigation,
  } = useProductOperations();

  // Modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadQueryDialogOpen, setUploadQueryDialogOpen] = useState(false);
  const [createRequirementModalOpen, setCreateRequirementModalOpen] =
    useState(false);
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [productSettingsDialogOpen, setProductSettingsDialogOpen] =
    useState(false);

  // Initialize toast
  const { toast } = useToast();

  // Load current product by key using custom hook
  const {
    product: currentProduct,
    productId: currentProductId,
    error: productError,
  } = useProductByKey(productKey);

  // Show error toast and redirect if product not found
  useEffect(() => {
    if (productError && productKey) {
      toast({
        variant: "destructive",
        title: "Product not found",
        description: `Could not find product with key: ${productKey}`,
      });
      router.push("/product");
    }
  }, [productError, productKey, toast, router]);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProductsLoading(true);
        const data = await listProducts();
        setProducts(data);
      } catch (error) {
        console.warn("Backend failed to load products:", error);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };
    loadProducts();
    // setProducts and setProductsLoading are stable state setters from useProductOperations hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use the product from the products list if available (to get latest updates),
  // otherwise fall back to currentProduct
  const selectedProduct =
    products.find((p) => p.product_key === productKey) || currentProduct;

  // Tab configuration mapping tab names to routes
  const tabConfig = useMemo(
    () =>
      ({
        Requirements: `/product/${productKey}/requirement`,
        Queries: `/product/${productKey}/query`,
        Sources: `/product/${productKey}/source`,
      }) as const,
    [productKey],
  );

  // Determine active tab based on pathname
  const activeTab = useMemo(() => {
    if (!productKey) return "Requirements";
    for (const [tab, path] of Object.entries(tabConfig)) {
      if (pathname.startsWith(path)) return tab;
    }
    return "Requirements";
  }, [pathname, productKey, tabConfig]);

  const handleTabChange = useCallback(
    (tab: string) => {
      if (!productKey) return;
      const path = tabConfig[tab as keyof typeof tabConfig];
      if (path) router.push(path);
    },
    [productKey, tabConfig, router],
  );

  const handleAddProduct = async (
    productName: string,
    productKey: string,
  ): Promise<void> => {
    await withProductOperationAndNavigation(
      () => createProduct({ name: productName, product_key: productKey }),
      "Product created successfully",
      "Failed to create product",
      () => {
        // Navigate to the newly created product
        router.push(`/product/${productKey}/requirement`);
      },
    );
  };

  const handleUpdateProduct = async (
    id: string,
    name: string,
  ): Promise<void> => {
    await withProductOperation(
      () => updateProduct(id, { name }),
      "Product updated successfully",
      "Failed to update product",
    );
  };

  const handleProductDelete = async (productId: string): Promise<void> => {
    await withProductOperationAndNavigation(
      () => deleteProductApi(productId),
      "Product deleted successfully",
      "Failed to delete product",
      (updatedProducts) => {
        // Navigate to first product or product list
        if (updatedProducts.length > 0) {
          router.push(`/product/${updatedProducts[0].product_key}/requirement`);
        } else {
          router.push("/product");
        }
      },
    );
  };

  const isFullPage = isFullPageRoute(pathname);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <div className="flex h-screen w-full bg-gray-50 dark:bg-background">
        <Suspense fallback={<div>Loading...</div>}>
          <SideNav
            products={products.map((p) => ({
              name: p.name,
              product_key: p.product_key,
            }))}
            selectedProductKey={productKey || ""}
            onProductSelect={(key) =>
              router.push(`/product/${key}/requirement`)
            }
            onAddProduct={() => setAddProductDialogOpen(true)}
          />
        </Suspense>

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
            <div className="flex-1 flex flex-col min-h-0 dark:bg-[#080705] dark:rounded-[20px]">
              {isFullPage ? (
                // Full-page routes (query/source detail) use the whole width
                <div className="flex-1 flex flex-col min-h-0">{children}</div>
              ) : (
                // Index/table views are width-limited and centered
                <div className="flex-1 flex flex-col min-h-0 mx-auto w-full max-w-[1400px]">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 flex-shrink-0 dark:border-b-0">
                    <div className="flex items-center">
                      <h1
                        data-testid="product-header-title"
                        className="text-2xl font-bold dark:text-foreground"
                      >
                        {selectedProduct?.name || "Product"}
                      </h1>
                      <Button
                        data-testid="product-settings-button"
                        variant="ghost"
                        size="icon"
                        className="ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-accent"
                        onClick={() => {
                          if (selectedProduct) {
                            setProductSettingsDialogOpen(true);
                          }
                        }}
                        disabled={!selectedProduct}
                      >
                        <Settings
                          size={18}
                          className="text-gray-600 dark:text-muted-foreground"
                        />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        data-testid="create-requirement-button"
                        onClick={() => setCreateRequirementModalOpen(true)}
                      >
                        <Plus size={16} className="mr-2" />
                        Create Requirement
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Plus size={16} />
                            Upload
                            <ChevronDown size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => setUploadModalOpen(true)}
                          >
                            Upload Source
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setUploadQueryDialogOpen(true)}
                          >
                            Upload Query
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 dark:border-border flex-shrink-0">
                    <Tabs
                      value={activeTab}
                      className="w-full"
                      onValueChange={handleTabChange}
                    >
                      <div className="px-6">
                        <TabsList className="h-auto bg-transparent p-0 w-auto">
                          {["Requirements", "Queries", "Sources"].map((tab) => (
                            <TabsTrigger
                              key={tab}
                              value={tab}
                              data-testid={`tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
                              className="py-3 px-4 font-medium text-sm relative rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-[#F1D929] data-[state=active]:shadow-none bg-transparent text-gray-600 dark:text-[#FAFFFD] data-[state=active]:text-black dark:data-[state=active]:text-[#FAFFFD]"
                            >
                              {tab}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    </Tabs>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col min-h-0">{children}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <UploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          productId={currentProductId}
          productKey={productKey}
        />

        <UploadQueryDialog
          open={uploadQueryDialogOpen}
          onOpenChange={setUploadQueryDialogOpen}
          productId={currentProductId}
        />

        <CreateRequirementModal
          open={createRequirementModalOpen}
          onOpenChange={setCreateRequirementModalOpen}
          productId={currentProductId}
          onComplete={() => {
            // Close the modal
            setCreateRequirementModalOpen(false);
            // Trigger refresh event for requirements page
            window.dispatchEvent(new Event("refreshRequirements"));
          }}
        />

        <AddProductDialog
          open={addProductDialogOpen}
          onOpenChange={setAddProductDialogOpen}
          onAddProduct={handleAddProduct}
        />

        {selectedProduct && (
          <ProductSettingsDialog
            open={productSettingsDialogOpen}
            onOpenChange={setProductSettingsDialogOpen}
            product={{
              id: selectedProduct.id,
              name: selectedProduct.name,
              product_key: selectedProduct.product_key,
            }}
            onSave={handleUpdateProduct}
            onDelete={handleProductDelete}
          />
        )}
      </div>
    </div>
  );
}
