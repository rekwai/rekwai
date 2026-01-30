import { useState, useCallback } from "react";
import { Requirement } from "@/types/requirement-types";

interface ModalState<T = Requirement> {
  isOpen: boolean;
  data: T | null;
}

/**
 * Custom hook to manage requirement modal state.
 * Follows DRY principle by extracting common modal state management pattern.
 *
 * @returns Object containing modal state and handlers
 */
export function useRequirementModal<T = Requirement>() {
  const [state, setState] = useState<ModalState<T>>({
    isOpen: false,
    data: null,
  });

  const open = useCallback((data: T | null = null) => {
    setState({ isOpen: true, data });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, data: null });
  }, []);

  return {
    isOpen: state.isOpen,
    data: state.data,
    open,
    close,
  };
}
