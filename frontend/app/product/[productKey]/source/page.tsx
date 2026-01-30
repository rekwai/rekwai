"use client";

import { SourcesTab } from "@/components/source/sources-tab";
import { useProductByKey } from "@/hooks/use-product-by-key";
import { useResolvedParams } from "@/hooks/use-resolved-params";

export default function SourcesPage({
  params,
}: {
  params: Promise<{ productKey: string }>;
}) {
  const resolvedParams = useResolvedParams(params);
  const productKey = resolvedParams?.productKey ?? null;

  // Load product ID from key using custom hook
  const { productId } = useProductByKey(productKey);

  if (!productId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg dark:text-foreground">Loading...</div>
      </div>
    );
  }

  return <SourcesTab productId={productId} />;
}
