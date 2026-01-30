import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteQuestionnaire } from "@/lib/api/questionnaires";
import { toast } from "sonner";

interface UseQuestionnaireDeleteReturn {
  isDeleting: boolean;
  deleteWithConfirmation: () => Promise<void>;
}

export function useQuestionnaireDelete(
  questionnaireId: string,
  productKey: string,
): UseQuestionnaireDeleteReturn {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteWithConfirmation = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this questionnaire? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteQuestionnaire(questionnaireId);
      toast.success("Questionnaire deleted successfully");
      router.push(`/product/${productKey}/query`);
    } catch (error) {
      console.error("Failed to delete questionnaire:", error);
      toast.error("Failed to delete questionnaire");
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    deleteWithConfirmation,
  };
}
