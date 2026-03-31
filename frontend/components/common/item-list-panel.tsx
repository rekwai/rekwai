"use client";

import { ReactNode } from "react";
import { Check, X, Minus, Link, Merge, Plus, Loader2 } from "lucide-react";
import { Info } from "@phosphor-icons/react";
import * as RadixTabs from "@radix-ui/react-tabs";

export type AnswerTypeIndicator = "yes" | "no" | "n/a" | null;
export type SuggestionType = "attach" | "merge" | "create_new";

interface TabConfig {
  value: string;
  label: string;
}

interface ItemListPanelProps<T> {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: TabConfig[];
  items: T[];
  selectedIndex: number;
  onItemSelect: (index: number) => void;
  isLoading: boolean;
  error?: string | null;
  emptyMessage?: string;
  loadingMessage?: string;
  getItemId: (item: T) => string | number;
  getItemText: (item: T) => string;
  isItemCompleted?: (item: T) => boolean;
  getItemAnswerType?: (item: T) => AnswerTypeIndicator;
  getItemSuggestionType?: (item: T) => SuggestionType | null;
  isItemError?: (item: T) => boolean;
  isItemRefreshingSuggestion?: (item: T) => boolean;
  renderMetadata?: () => ReactNode;
  itemTestIdPrefix?: string;
}

/**
 * Renders the appropriate indicator icon based on answer type.
 * Only shows answer type indicators if the item is completed (has an answer).
 */
function AnswerTypeIcon({
  answerType,
  isCompleted,
}: {
  answerType?: AnswerTypeIndicator;
  isCompleted: boolean;
}) {
  // Only show answer type indicators if the item is completed (has an answer)
  if (isCompleted && answerType !== undefined) {
    switch (answerType) {
      case "yes":
        return (
          <Check
            size={12}
            className="text-[#15786A] flex-shrink-0"
            data-testid="answer-type-yes"
          />
        );
      case "no":
        return (
          <X
            size={12}
            className="text-[#EE3D49] flex-shrink-0"
            data-testid="answer-type-no"
          />
        );
      case "n/a":
        return (
          <Minus
            size={12}
            className="text-gray-400 flex-shrink-0"
            data-testid="answer-type-na"
          />
        );
      case null:
        // null means answered but no requirements found - no icon
        return <div className="w-3 h-3 flex-shrink-0" />;
    }
  }

  // Fall back to completed check indicator (for backward compatibility with items
  // that don't have answer_type set)
  if (isCompleted) {
    return (
      <Check
        size={12}
        className="text-[#15786A] flex-shrink-0"
        data-testid="item-completed-indicator"
      />
    );
  }

  // Empty placeholder to maintain layout
  return <div className="w-3 h-3 flex-shrink-0" />;
}

const SUGGESTION_BADGE_CONFIG: Record<
  SuggestionType,
  { icon: typeof Link; badgeBg: string; iconClass: string; selectedBadgeBg: string; selectedIconClass: string; testId: string }
> = {
  attach: {
    icon: Link,
    badgeBg: "bg-[#E8F2FC]",
    iconClass: "text-[#0E309F]",
    selectedBadgeBg: "bg-[#0C35BB]",
    selectedIconClass: "text-[#FAFFFD]",
    testId: "suggestion-type-attach",
  },
  merge: {
    icon: Merge,
    badgeBg: "bg-[rgba(235,81,16,0.2)]",
    iconClass: "text-[#000000]",
    selectedBadgeBg: "bg-[#F4D5C8]",
    selectedIconClass: "text-[#000000]",
    testId: "suggestion-type-merge",
  },
  create_new: {
    icon: Plus,
    badgeBg: "bg-[#A2CFCA]",
    iconClass: "text-[#000000]",
    selectedBadgeBg: "bg-[#A2CFCA]",
    selectedIconClass: "text-[#000000]",
    testId: "suggestion-type-create-new",
  },
};

function SuggestionTypeBadge({
  suggestionType,
  isSelected,
}: {
  suggestionType?: SuggestionType | null;
  isSelected: boolean;
}) {
  if (!suggestionType) {
    return <div className="w-5 h-5 flex-shrink-0" />;
  }

  const config = SUGGESTION_BADGE_CONFIG[suggestionType];
  const Icon = config.icon;
  const bg = isSelected ? config.selectedBadgeBg : config.badgeBg;
  const iconColor = isSelected ? config.selectedIconClass : config.iconClass;
  return (
    <div
      className={`flex items-center justify-center w-5 h-5 rounded-[3px] flex-shrink-0 ${bg}`}
      data-testid={config.testId}
    >
      <Icon size={16} className={iconColor} />
    </div>
  );
}

export function ItemListPanel<T>({
  activeTab,
  onTabChange,
  tabs,
  items,
  selectedIndex,
  onItemSelect,
  isLoading,
  error,
  emptyMessage = "No items found",
  loadingMessage = "Loading...",
  getItemId,
  getItemText,
  isItemCompleted,
  getItemAnswerType,
  getItemSuggestionType,
  isItemError,
  isItemRefreshingSuggestion,
  renderMetadata,
  itemTestIdPrefix = "item",
}: ItemListPanelProps<T>) {
  const itemsTab = tabs[0] as TabConfig | undefined;
  const metadataTab = tabs[1] as TabConfig | undefined;

  return (
    <div className="bg-[#F6F6F6] dark:bg-[#1a1a1a] h-full">
      <RadixTabs.Root value={activeTab} onValueChange={onTabChange}>
        {/* Segmented Control Tabs */}
        <div 
          className="sticky top-0 z-10 flex flex-col items-start px-3 pt-3 pb-3 gap-2.5 flex-shrink-0 bg-[#F6F6F6] dark:bg-[#1a1a1a]"
          style={{ 
            borderTop: 'none',
            borderRight: 'none',
            borderLeft: 'none',
            borderBottom: '1px solid rgba(230, 230, 230, 1)'
          }}
        >
          <RadixTabs.List
            className="flex flex-row justify-center items-center p-0 bg-gradient-to-r from-[rgba(0,0,51,0.06)] to-[rgba(0,0,51,0.06)] rounded-[4px] h-8"
            style={{
              background:
                "linear-gradient(90deg, rgba(0, 0, 51, 0.06) 0%, rgba(0, 0, 51, 0.06) 100%), rgba(255, 255, 255, 0.9)",
            }}
          >
            {tabs.map((tab) => (
              <RadixTabs.Trigger
                key={tab.value}
                value={tab.value}
                className="flex flex-row justify-center items-center px-3.5 py-3.5 gap-1 h-8 rounded-[4px] font-inter text-sm leading-4 tracking-[0.04px] data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-[rgba(0,0,45,0.09)] data-[state=active]:font-bold data-[state=active]:text-[rgba(0,5,9,0.89)] data-[state=inactive]:bg-transparent data-[state=inactive]:font-normal data-[state=inactive]:text-[rgba(0,5,9,0.89)]"
                data-testid={`${tab.value.toLowerCase()}-tab`}
              >
                {tab.label}
              </RadixTabs.Trigger>
            ))}
          </RadixTabs.List>
        </div>

        {/* Items Tab Content */}
        {itemsTab && (
          <RadixTabs.Content value={itemsTab.value}>
            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {loadingMessage}
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <div className="text-red-600 dark:text-red-400 mb-2">
                    Error loading items
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-center">
                    {error}
                  </p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    {emptyMessage}
                  </p>
                </div>
              ) : (
                <div
                  className="divide-y divide-[#E3DBDB] dark:divide-[#1a1a1a]"
                  data-testid={`${itemTestIdPrefix}-list`}
                >
                  {items.map((item, index) => {
                    const itemId = getItemId(item);
                    const isSelected = index === selectedIndex;
                    const isCompleted = isItemCompleted?.(item) ?? false;
                    const answerType = getItemAnswerType?.(item);
                    const suggestionType = getItemSuggestionType?.(item);
                    const hasError = isItemError?.(item) ?? false;
                    const isRefreshingSuggestion =
                      isItemRefreshingSuggestion?.(item) ?? false;

                    return (
                      <div
                        key={itemId}
                        data-testid={`${itemTestIdPrefix}-${itemId}`}
                        className={`flex items-center gap-4 px-3 py-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#080705] dark:bg-[#121212] text-[#FAFFFD]"
                            : "bg-transparent hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                        }`}
                        onClick={() => onItemSelect(index)}
                      >
                        {isCompleted ? (
                          <Check
                            className="text-[#15786A] flex-shrink-0 w-5 h-[18px]"
                            data-testid={`${itemTestIdPrefix}-completed-indicator`}
                          />
                        ) : hasError ? (
                          <Info
                            size={16}
                            weight="fill"
                            className="text-[#F97316] flex-shrink-0"
                            data-testid={`${itemTestIdPrefix}-error-indicator`}
                          />
                        ) : (
                          <div className="w-4 h-6 flex-shrink-0" />
                        )}
                        <span
                          className={`text-xs leading-[150%] flex-1 ${
                            isSelected
                              ? "text-[#FAFFFD] font-medium"
                              : "text-[#080705] dark:text-[#FAFFFD] font-normal"
                          }`}
                          data-testid={
                            isSelected ? "current-item-text" : undefined
                          }
                        >
                          {getItemText(item)}
                        </span>
                        {getItemAnswerType && (
                          <AnswerTypeIcon
                            answerType={answerType}
                            isCompleted={isCompleted}
                          />
                        )}
                        {getItemSuggestionType &&
                          (isRefreshingSuggestion ? (
                            <Loader2
                              size={12}
                              className="animate-spin text-gray-400 flex-shrink-0"
                              data-testid="suggestion-refreshing-spinner"
                            />
                          ) : (
                            <SuggestionTypeBadge
                              suggestionType={suggestionType}
                              isSelected={isSelected}
                            />
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </RadixTabs.Content>
        )}

        {/* Metadata Tab Content */}
        {metadataTab && (
          <RadixTabs.Content
            value={metadataTab.value}
            className="flex-1 overflow-y-auto"
          >
            {renderMetadata ? renderMetadata() : null}
          </RadixTabs.Content>
        )}
      </RadixTabs.Root>
    </div>
  );
}
