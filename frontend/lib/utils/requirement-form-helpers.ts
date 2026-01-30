import { ImplementationStatus, Requirement } from "@/types/requirement-types";

/**
 * Implementation status options for dropdowns
 */
export const IMPLEMENTATION_OPTIONS: ImplementationStatus[] = [
  "Implemented",
  "Planned",
  "To do",
  "Won't do",
];

/**
 * Form values that can be passed to initialize the requirement form
 */
export interface RequirementFormValues {
  description?: string;
  types?: string[];
  implementation_status?: string;
  implementation_description?: string;
  requirement_verification?: string;
}

/**
 * Resolve form values from multiple sources with priority:
 * overrideValues > initialValues > requirement > defaults
 */
export function resolveFormValues(
  overrideValues: RequirementFormValues | undefined,
  initialValues: RequirementFormValues | undefined,
  requirement: Requirement | null | undefined,
) {
  const valuesToUse = overrideValues || initialValues || {};

  return {
    description: valuesToUse.description || requirement?.description || "",
    types: valuesToUse.types || requirement?.types || [],
    implementation_status:
      ((valuesToUse.implementation_status ||
        requirement?.implementation_status) as ImplementationStatus) || "To do",
    implementation_description:
      valuesToUse.implementation_description ||
      requirement?.implementation_description ||
      "",
    requirement_verification:
      valuesToUse.requirement_verification ||
      requirement?.requirement_verification ||
      "",
  };
}

/**
 * Get toast configuration for successful requirement creation
 */
export function getRequirementCreatedToast(requirement: Requirement) {
  return {
    title: "Requirement Created",
    description: `Requirement ${requirement.requirement_key} has been created.`,
  };
}

/**
 * Get toast configuration for successful requirement update
 */
export function getRequirementUpdatedToast(requirement: Requirement) {
  return {
    title: "Requirement Updated",
    description: `Requirement ${requirement.requirement_key} has been updated.`,
  };
}

/**
 * Get toast configuration for successful requirement deletion
 */
export function getRequirementDeletedToast(requirementKey: string) {
  return {
    title: "Requirement Deleted",
    description: `Requirement ${requirementKey} has been deleted.`,
  };
}

/**
 * Get toast configuration for requirement operation error
 */
export function getRequirementErrorToast(error: unknown) {
  return {
    title: "Error Saving Requirement",
    description:
      error instanceof Error ? error.message : "An unexpected error occurred.",
    variant: "destructive" as const,
  };
}
