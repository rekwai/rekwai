"use client";

import { RequirementItem, DocumentMetadata } from "@/types/requirement-types";
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
}: RequirementListPanelProps) {
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
      getItemSuggestionType={(req) => req.suggestedAction ?? null}
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
