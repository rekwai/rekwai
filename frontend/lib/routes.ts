/**
 * Route configuration and utilities
 */

/**
 * Check if a pathname matches a full-page route pattern
 */
export function isFullPageRoute(pathname: string): boolean {
  // Question answering: /product/{productKey}/query/{queryId}
  const isQuestionAnswering = /\/product\/[^/]+\/query\/[^/]+$/.test(pathname);

  // Requirement indexing: /product/{productKey}/source/{documentKey}
  const isRequirementIndexing = /\/product\/[^/]+\/source\/[^/]+$/.test(
    pathname,
  );

  return isQuestionAnswering || isRequirementIndexing;
}
