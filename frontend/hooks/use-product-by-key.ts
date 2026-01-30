import { useState, useEffect } from "react";
import { getProductByKey, type Product } from "@/lib/api/products";

export function useProductByKey(productKey: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productKey) {
      setProduct(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProductByKey(productKey);
        if (!cancelled) {
          setProduct(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error("Failed to load product"),
          );
          setProduct(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productKey]);

  return {
    product,
    productId: product?.id ?? null,
    loading,
    error,
  };
}
