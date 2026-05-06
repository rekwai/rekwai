"use client";

import {
  RequirementItem,
  DocumentMetadata,
  SuggestedAction,
} from "@/types/requirement-types";
import { ItemListPanel } from "@/components/common/item-list-panel";
import {
  MetadataRow,
  MetadataSection,
  TimestampRow,
} from "@/components/common/metadata-display";

interface RequirementListPanelProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  requirements: RequirementItem[];
  selectedRequirementIndex: number;
  onRequirementSelect: (index: number) => void;
  combinedLoading: boolean;
  documentMetadata: DocumentMetadata;
  refreshingSuggestionIds?: Set<string>;
  /** Live suggestion for the selected row (same object as the right panel); only non-null when it applies to the current selection */
  selectedRowSuggestedAction?: SuggestedAction | null;
}

export function RequirementListPanel({
  activeTab,
  onTabChange,
  requirements,
  selectedRequirementIndex,
  onRequirementSelect,
  combinedLoading,
  documentMetadata,
  refreshingSuggestionIds,
  selectedRowSuggestedAction,
}: RequirementListPanelProps) {
  const selectedReq = requirements[selectedRequirementIndex];

  return (
    <ItemListPanel
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabs={[
        { value: "Requirements", label: "Requirements" },
        { value: "Metadata", label: "Metadata" },
      ]}
      items={requirements}
      selectedIndex={selectedRequirementIndex}
      onItemSelect={onRequirementSelect}
      isLoading={combinedLoading}
      emptyMessage="No requirements found"
      loadingMessage="Loading requirements..."
      getItemId={(req) => req.id}
      getItemText={(req) => req.text}
      isItemCompleted={(req) => req.hasLinks}
      getItemLinkType={(req) => req.linkType ?? null}
      getItemSuggestionType={(req) => {
        if (req.hasLinks) {
          return null;
        }
        if (
          selectedRowSuggestedAction &&
          selectedReq &&
          String(req.id) === String(selectedReq.id)
        ) {
          return selectedRowSuggestedAction.action;
        }
        return req.suggestedAction ?? null;
      }}
      isItemRefreshingSuggestion={
        refreshingSuggestionIds
          ? (req) => refreshingSuggestionIds.has(req.id.toString())
          : undefined
      }
      itemTestIdPrefix="extracted-requirement"
      renderMetadata={() => (
        <div className="p-4 space-y-6">
          <MetadataSection title="Document Information">
            {documentMetadata.key && (
              <MetadataRow label="Key:" value={documentMetadata.key} />
            )}
            <MetadataRow label="Name:" value={documentMetadata.name} />
            <MetadataRow label="Type:" value={documentMetadata.type} />
            <MetadataRow label="Size:" value={documentMetadata.size} />
          </MetadataSection>
          <MetadataSection title="Upload Information">
            <TimestampRow
              label="Uploaded on"
              date={documentMetadata.uploadDate}
            />
          </MetadataSection>
        </div>
      )}
    />
  );
}
