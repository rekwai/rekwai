"use client";

import { ReactNode } from "react";
import { Check, X, Minus, Plus, Trash2 } from "lucide-react";
import { Info } from "@phosphor-icons/react";
import * as RadixTabs from "@radix-ui/react-tabs";

export type AnswerTypeIndicator = "yes" | "no" | "n/a" | null;

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
  isItemError?: (item: T) => boolean;
  renderMetadata?: () => ReactNode;
  itemTestIdPrefix?: string;
  onAdd?: () => void;
  onDelete?: (item: T) => void;
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
  isItemError,
  renderMetadata,
  itemTestIdPrefix = "item",
  onAdd,
  onDelete,
}: ItemListPanelProps<T>) {
  const itemsTab = tabs[0] as TabConfig | undefined;
  const metadataTab = tabs[1] as TabConfig | undefined;

  return (
    <div className="bg-[#F6F6F6] dark:bg-[#1a1a1a] h-full flex flex-col">
      <RadixTabs.Root
        value={activeTab}
        onValueChange={onTabChange}
        className="flex flex-col h-full"
      >
        {/* Segmented Control Tabs and Add Button */}
        <div
          className="sticky top-0 z-10 flex flex-row items-center px-3 pt-3 pb-3 gap-2.5 flex-shrink-0 bg-[#F6F6F6] dark:bg-[#1a1a1a]"
          style={{
            borderBottom: "1px solid rgba(230, 230, 230, 1)",
          }}
        >
          <RadixTabs.List
            className="flex-1 flex flex-row justify-center items-center p-0 bg-gradient-to-r from-[rgba(0,0,51,0.06)] to-[rgba(0,0,51,0.06)] rounded-[4px] h-8"
            style={{
              background:
                "linear-gradient(90deg, rgba(0, 0, 51, 0.06) 0%, rgba(0, 0, 51, 0.06) 100%), rgba(255, 255, 255, 0.9)",
            }}
          >
            {tabs.map((tab) => (
              <RadixTabs.Trigger
                key={tab.value}
                value={tab.value}
                className="flex-1 flex flex-row justify-center items-center px-3.5 py-3.5 gap-1 h-8 rounded-[4px] font-inter text-sm leading-4 tracking-[0.04px] data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-[rgba(0,0,45,0.09)] data-[state=active]:font-bold data-[state=active]:text-[rgba(0,5,9,0.89)] data-[state=inactive]:bg-transparent data-[state=inactive]:font-normal data-[state=inactive]:text-[rgba(0,5,9,0.89)]"
                data-testid={`${tab.value.toLowerCase()}-tab`}
              >
                {tab.label}
              </RadixTabs.Trigger>
            ))}
          </RadixTabs.List>

          {onAdd && activeTab === itemsTab?.value && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
              title="Add Item"
              data-testid="add-item-button"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Items Tab Content */}
        {itemsTab && (
          <RadixTabs.Content
            value={itemsTab.value}
            className="flex-1 overflow-y-auto"
          >
            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {loadingMessage}
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 p-8">
                  <div className="text-red-600 dark:text-red-400 mb-2">
                    Error loading items
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-center">
                    {error}
                  </p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 p-8">
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
                    const hasError = isItemError?.(item) ?? false;

                    return (
                      <div
                        key={itemId}
                        data-testid={`${itemTestIdPrefix}-${itemId}`}
                        className={`group flex items-center gap-4 px-4 py-4 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#080705] dark:bg-[#121212] text-white dark:text-[#FAFFFD]"
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
                          className={`text-base leading-[1.5] flex-1 ${
                            isSelected
                              ? "text-white dark:text-[#FAFFFD] font-medium"
                              : "text-black dark:text-[#FAFFFD] font-normal"
                          }`}
                          data-testid={
                            isSelected ? "current-item-text" : undefined
                          }
                        >
                          {getItemText(item)}
                        </span>

                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(item);
                            }}
                            className={`p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                              isSelected
                                ? "text-gray-300 hover:text-red-400 hover:bg-gray-800"
                                : "text-gray-400 hover:text-red-600 hover:bg-gray-200"
                            }`}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <AnswerTypeIcon
                          answerType={answerType}
                          isCompleted={isCompleted}
                        />
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
