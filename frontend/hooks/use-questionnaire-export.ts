import { useState } from "react";
import { downloadQuestionnairePdf } from "@/lib/api/questionnaires";
import { toast } from "sonner";

interface UseQuestionnaireExportReturn {
  isExporting: boolean;
  exportAnswers: (includeLinkedRequirements: boolean) => Promise<void>;
}

export function useQuestionnaireExport(
  questionnaireId: string | null,
): UseQuestionnaireExportReturn {
  const [isExporting, setIsExporting] = useState(false);

  const exportAnswers = async (includeLinkedRequirements: boolean) => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadQuestionnairePdf(questionnaireId, {
        includeLinkedRequirements,
      });
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error("Failed to export questionnaire PDF:", err);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportAnswers,
  };
}
