"use client";

import { use } from "react";
import { QueriesTab } from "@/components/query/queries-tab";
import { useProductByKey } from "@/hooks/use-product-by-key";
import {
  PageLoadingState,
  PageErrorState,
} from "@/components/common/page-states";

export default function QueriesPage({
  params,
}: {
  params: Promise<{ productKey: string }>;
}) {
  const { productKey } = use(params);

  // Load product ID from key using custom hook
  const { productId, error } = useProductByKey(productKey);

  if (error) {
    return <PageErrorState error={error.message} />;
  }

  if (!productId) {
    return (
      <PageLoadingState
        title="Loading..."
        description="Please wait while we load the product information..."
      />
    );
  }

  return <QueriesTab productId={productId} productKey={productKey} />;
}
