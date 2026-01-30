"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useResolvedParams } from "@/hooks/use-resolved-params";

export default function ProductKeyPage({
  params,
}: {
  params: Promise<{ productKey: string }>;
}) {
  const router = useRouter();
  const resolvedParams = useResolvedParams(params);

  useEffect(() => {
    if (resolvedParams?.productKey) {
      // Redirect to requirements tab by default
      router.replace(`/product/${resolvedParams.productKey}/requirement`);
    }
  }, [resolvedParams, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-lg dark:text-foreground">Redirecting...</div>
    </div>
  );
}
