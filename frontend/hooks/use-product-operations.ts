import { useState } from "react";
import { listProducts, type Product } from "@/lib/api/products";
import { useToast } from "@/components/ui/use-toast";

/**
 * Custom hook for handling product CRUD operations with consistent error handling,
 * state management, and user feedback.
 */
export function useProductOperations() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  /**
   * Shared error handler for product operations.
   */
  function handleOperationError(error: unknown, errorMessage: string): never {
    console.error(error);
    toast({
      variant: "destructive",
      title: errorMessage,
      description: "Please try again.",
    });
    throw error;
  }

  /**
   * Shared success handler - refreshes product list and shows toast.
   */
  async function handleOperationSuccess(
    successMessage: string,
  ): Promise<Product[]> {
    const updatedProducts = await listProducts();
    setProducts(updatedProducts);
    toast({
      title: successMessage,
    });
    return updatedProducts;
  }

  /**
   * Wraps a product operation with consistent error handling and state updates.
   * Automatically refreshes the product list after successful operations.
   *
   * @param operation - The async operation to perform
   * @param successMessage - Message to show on success
   * @param errorMessage - Message to show on error
   * @returns The result of the operation
   * @throws Re-throws the error to allow caller to handle (e.g., prevent dialog close)
   */
  async function withProductOperation<T>(
    operation: () => Promise<T>,
    successMessage: string,
    errorMessage: string,
  ): Promise<T> {
    try {
      const result = await operation();
      await handleOperationSuccess(successMessage);
      return result;
    } catch (error) {
      handleOperationError(error, errorMessage);
    }
  }

  /**
   * Wraps a product operation that requires navigation after success.
   * Includes loading state management and navigation logic.
   */
  async function withProductOperationAndNavigation<T>(
    operation: () => Promise<T>,
    successMessage: string,
    errorMessage: string,
    onNavigate: (products: Product[]) => void,
  ): Promise<T> {
    setProductsLoading(true);
    try {
      const result = await operation();
      const updatedProducts = await handleOperationSuccess(successMessage);
      onNavigate(updatedProducts);
      return result;
    } catch (error) {
      handleOperationError(error, errorMessage);
    } finally {
      setProductsLoading(false);
    }
  }

  return {
    /** Current list of products from the server */
    products,
    /** Update the products list (usually handled automatically by operations) */
    setProducts,
    /** Loading state for product operations */
    productsLoading,
    /** Manually set loading state (usually handled automatically by operations) */
    setProductsLoading,
    /**
     * Execute a product operation with automatic error handling and list refresh.
     * @example
     * await withProductOperation(
     *   () => createProduct({ name: 'New Product', product_key: 'NEW' }),
     *   'Product created successfully',
     *   'Failed to create product'
     * );
     */
    withProductOperation,
    /**
     * Execute a product operation that requires navigation after success.
     * Includes loading state management and navigation callback.
     * @example
     * await withProductOperationAndNavigation(
     *   () => deleteProduct(id),
     *   'Product deleted',
     *   'Failed to delete',
     *   (updatedProducts) => router.push('/product')
     * );
     */
    withProductOperationAndNavigation,
  };
}
