import { useState, useEffect, useCallback } from "react";

interface UseRowSelectionReturn {
  selectedRows: number[];
  isAllSelected: boolean;
  isIndeterminate: boolean;
  toggleRowSelection: (index: number) => void;
  toggleAllSelection: () => void;
  clearSelection: () => void;
  setSelectedRows: React.Dispatch<React.SetStateAction<number[]>>;
}

export function useRowSelection(totalItems: number): UseRowSelectionReturn {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isIndeterminate, setIsIndeterminate] = useState(false);

  // Update isAllSelected and isIndeterminate when selectedRows or totalItems change
  useEffect(() => {
    if (totalItems === 0) {
      setIsAllSelected(false);
      setIsIndeterminate(false);
    } else if (selectedRows.length === 0) {
      setIsAllSelected(false);
      setIsIndeterminate(false);
    } else if (selectedRows.length === totalItems) {
      setIsAllSelected(true);
      setIsIndeterminate(false);
    } else {
      setIsAllSelected(false);
      setIsIndeterminate(true);
    }
  }, [selectedRows, totalItems]);

  // Toggle selection of a single row
  const toggleRowSelection = useCallback((index: number) => {
    setSelectedRows((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [...prev, index];
    });
  }, []);

  // Toggle selection of all rows
  const toggleAllSelection = useCallback(() => {
    setSelectedRows((prev) => {
      if (prev.length === totalItems && totalItems > 0) {
        return [];
      }
      return Array.from({ length: totalItems }, (_, i) => i);
    });
  }, [totalItems]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedRows([]);
  }, []);

  return {
    selectedRows,
    isAllSelected,
    isIndeterminate,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
    setSelectedRows,
  };
}
