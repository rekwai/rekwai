"use client";

import { useState, useEffect } from "react";
import { ImplementationStatus, Requirement } from "@/types/requirement-types";
import {
  RequirementFormValues,
  resolveFormValues,
} from "@/lib/utils/requirement-form-helpers";

/**
 * Hook to manage requirement form state
 * Handles form field values and validation
 */
export function useRequirementForm(
  isOpen: boolean,
  requirement: Requirement | null | undefined,
  initialValues?: RequirementFormValues,
  overrideValues?: RequirementFormValues,
) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [requirementDescription, setRequirementDescription] = useState("");
  const [implementation, setImplementation] =
    useState<ImplementationStatus>("To do");
  const [implementationDescription, setImplementationDescription] =
    useState("");
  const [requirementVerification, setRequirementVerification] = useState("");

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      const values = resolveFormValues(
        overrideValues,
        initialValues,
        requirement,
      );

      setSelectedTypes(values.types);
      setRequirementDescription(values.description);
      setImplementation(values.implementation_status);
      setImplementationDescription(values.implementation_description);
      setRequirementVerification(values.requirement_verification);
    }
  }, [isOpen, initialValues, requirement, overrideValues]);

  // Validation
  const isValid =
    selectedTypes.length > 0 &&
    requirementDescription.trim() !== "" &&
    implementationDescription.trim() !== "";

  return {
    // Form values
    selectedTypes,
    requirementDescription,
    implementation,
    implementationDescription,
    requirementVerification,
    // Setters
    setSelectedTypes,
    setRequirementDescription,
    setImplementation,
    setImplementationDescription,
    setRequirementVerification,
    // Validation
    isValid,
  };
}
