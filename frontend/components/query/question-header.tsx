"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuestionnaireExport } from "@/hooks/use-questionnaire-export";
import { useQuestionnaireDelete } from "@/hooks/use-questionnaire-delete";
import { PageHeader } from "@/components/common/page-header";

interface ExportMenuItemProps {
  title: string;
  description: string;
  onSelect: () => void;
}

function ExportMenuItem({ title, description, onSelect }: ExportMenuItemProps) {
  return (
    <DropdownMenuItem
      className="flex flex-col justify-center items-start px-3 py-1 rounded bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#3a3a3a] focus:bg-gray-50 dark:focus:bg-[#3a3a3a]"
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
    >
      <span className="text-[16px] leading-5 text-[#1C2024] dark:text-[#FAFFFD] font-normal w-full">
        {title}
      </span>
      <span className="text-[12px] leading-[130%] text-[#1C2024] dark:text-[#CCCCCC] font-normal w-full">
        {description}
      </span>
    </DropdownMenuItem>
  );
}

interface QuestionHeaderProps {
  productKey: string;
  productName: string;
  questionnaireId: string;
  clientName?: string;
  queryKey?: string;
}

export function QuestionHeader({
  productKey,
  productName,
  questionnaireId,
  clientName,
  queryKey,
}: QuestionHeaderProps) {
  const { isExporting, exportAnswers } =
    useQuestionnaireExport(questionnaireId);
  const { isDeleting, deleteWithConfirmation } = useQuestionnaireDelete(
    questionnaireId,
    productKey,
  );

  const breadcrumbs: Array<{ label: string; path?: string; isBold?: boolean }> =
    [
      {
        label: productName || "Product",
        path: `/product/${productKey}/requirement`,
      },
    ];

  if (clientName) {
    breadcrumbs.push({
      label: clientName,
    });
  }

  if (queryKey) {
    breadcrumbs.push({
      label: queryKey,
      isBold: true,
    });
  }

  return (
    <PageHeader
      backPath={`/product/${productKey}/query`}
      breadcrumbs={breadcrumbs}
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={isExporting}
                className="font-inter flex flex-row justify-center items-center px-2.5 py-1 gap-1.5 h-7 bg-[#00100B] dark:bg-[#FAFFFD] border-none rounded-[12px] text-sm leading-[15px] font-normal text-[#FAFFFD] dark:text-[#080705] hover:bg-[#00100B]/90 dark:hover:bg-[#FAFFFD]/90 hover:text-[#FAFFFD] dark:hover:text-[#080705]"
              >
                {isExporting ? "Exporting..." : "Export"}{" "}
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="font-inter w-[245px] p-2 bg-white dark:bg-[#2a2a2a] border border-[rgba(0,0,51,0.0588235)] dark:border-[#3a3a3a] rounded-lg"
              align="end"
              style={{
                boxShadow:
                  "0px 12px 32px -16px rgba(0, 9, 50, 0.121569), 0px 12px 60px rgba(0, 0, 0, 0.15)",
              }}
            >
              <ExportMenuItem
                title="Export answers"
                description="This will create a PDF of the selections and answers"
                onSelect={() => exportAnswers(false)}
              />
              <ExportMenuItem
                title="Export answers with requirements"
                description="This will create a PDF of the answers and linked requirements"
                onSelect={() => exportAnswers(true)}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={deleteWithConfirmation}
            disabled={isDeleting}
            className="font-inter flex flex-row justify-center items-center px-2.5 py-1 gap-1.5 h-7 bg-[#FBDBDD] dark:bg-[#8B2635] border-none rounded-[12px] text-sm leading-[15px] font-normal text-[#080705] dark:text-[#FAFFFD] hover:bg-[#FBDBDD]/90 dark:hover:bg-[#8B2635]/90"
          >
            {isDeleting ? "Deleting..." : "Delete questionnaire"}
          </Button>
        </>
      }
    />
  );
}
