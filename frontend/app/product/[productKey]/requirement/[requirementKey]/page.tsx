"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreateRequirementModal } from "@/components/requirement/create-requirement-modal";
import { getRequirementByKey } from "@/lib/api/requirements";
import { Requirement } from "@/types/requirement-types";
import { useResolvedParams } from "@/hooks/use-resolved-params";

export default function RequirementPage({
  params,
}: {
  params: Promise<{ productKey: string; requirementKey: string }>;
}) {
  const router = useRouter();
  const resolvedParams = useResolvedParams(params);
  const productKey = resolvedParams?.productKey ?? null;
  const requirementKey = resolvedParams?.requirementKey ?? null;

  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requirementKey) return;

    const loadRequirement = async () => {
      try {
        const data = await getRequirementByKey(requirementKey);
        setRequirement(data);
        setModalOpen(true);
      } catch (err) {
        console.error("Failed to load requirement:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load requirement",
        );
      }
    };
    loadRequirement();
  }, [requirementKey]);

  const handleModalClose = () => {
    setModalOpen(false);
    // Navigate back to the Requirements tab of the same product
    // productKey is always set when requirement loads successfully
    router.push(`/product/${productKey}/requirement`);
  };

  const handleSave = () => {
    // No state update needed - modal closes and navigates away
  };

  // Show nothing while loading
  if (!requirement && !error) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CreateRequirementModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) handleModalClose();
        }}
        requirement={requirement}
        onComplete={handleSave}
        onDelete={handleModalClose}
        productId={requirement?.product_id || null}
      />
    </>
  );
}
