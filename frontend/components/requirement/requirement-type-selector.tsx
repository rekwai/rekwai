"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmallCloseIcon } from "@/components/ui/icons";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RequirementTypeSelectorProps {
  selectedTypes: string[];
  onSelectedTypesChange: (types: string[]) => void;
  availableTypes: string[];
}

/**
 * Multi-select type selector with search and chip display
 * Allows users to select from existing types or create new ones
 */
export function RequirementTypeSelector({
  selectedTypes,
  onSelectedTypesChange,
  availableTypes,
}: RequirementTypeSelectorProps) {
  const [typeInput, setTypeInput] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleRemoveType = (index: number) => {
    onSelectedTypesChange(selectedTypes.filter((_, i) => i !== index));
  };

  const handleAddType = (type: string) => {
    if (!selectedTypes.includes(type)) {
      onSelectedTypesChange([...selectedTypes, type]);
    }
    setTypeInput("");
    setIsPopoverOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && typeInput.trim()) {
      e.preventDefault();
      handleAddType(typeInput.trim());
    }
  };

  // Filter available types based on input and exclude already selected
  const filteredTypes = availableTypes.filter(
    (option) =>
      option.toLowerCase().includes(typeInput.toLowerCase()) &&
      !selectedTypes.includes(option),
  );

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-label-text dark:text-[#FAFFFD]">
        Requirement type*
      </label>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isPopoverOpen}
            className="w-full justify-between px-3 h-8 text-xs bg-input-white dark:bg-[#312F2F] border-input-dark dark:border-[#1a1a1a] rounded text-black dark:text-[#FAFFFD]"
            data-testid="type-selector"
          >
            <div className="flex flex-wrap gap-1 flex-1 items-center">
              {selectedTypes.length > 0 ? (
                selectedTypes.map((selectedType, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-medium bg-type-chip-bg dark:bg-blue-900/30 text-type-chip-text dark:text-blue-200 rounded-[3px]"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {selectedType}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveType(index);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveType(index);
                        }
                      }}
                      className="hover:opacity-70 cursor-pointer w-3 h-3 flex items-center justify-center"
                      aria-label={`Remove ${selectedType}`}
                    >
                      <SmallCloseIcon />
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-gray-500 dark:text-gray-400">
                  Select or create types...
                </span>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command>
            <CommandInput
              placeholder="Search existing or type new..."
              value={typeInput}
              onValueChange={(value) => setTypeInput(value)}
              data-testid="type-search-input"
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              <CommandEmpty>Type to search or create new type</CommandEmpty>
              <CommandGroup>
                {filteredTypes.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleAddType(option)}
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    {option}
                  </CommandItem>
                ))}
                {typeInput &&
                  !availableTypes.some(
                    (t) => t.toLowerCase() === typeInput.toLowerCase(),
                  ) && (
                    <CommandItem
                      value={typeInput}
                      onSelect={() => handleAddType(typeInput)}
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      Create &quot;{typeInput}&quot;
                    </CommandItem>
                  )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
