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
      className="flex flex-col justify-center items-start px-3 py-4 rounded-[4px] focus:bg-accent"
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
    >
      <span className="text-[14px] leading-5 text-foreground font-normal w-full">
        {title}
      </span>
      <span className="text-[12px] leading-[130%] text-muted-foreground font-normal w-full">
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
                className="font-inter flex flex-row justify-center items-center px-2.5 py-1 gap-1.5 h-7 bg-semantic-bg-elevation-2 border border-semantic-stroke rounded-[4px] text-xs leading-[15px] font-normal text-semantic-text hover:bg-semantic-highlight"
              >
                {isExporting ? "Exporting..." : "Export"}{" "}
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="font-inter w-[245px] p-2 bg-popover text-popover-foreground border border-border rounded-[8px]"
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
            className="font-inter flex flex-row justify-center items-center px-2.5 py-1 gap-1.5 h-7 bg-semantic-error-bg border-none rounded-[4px] text-xs leading-[15px] font-normal text-semantic-black hover:!bg-semantic-error-fg dark:hover:!bg-semantic-error-fg hover:!text-semantic-white dark:hover:!text-semantic-white"
          >
            {isDeleting ? "Deleting..." : "Delete questionnaire"}
          </Button>
        </>
      }
    />
  );
}
