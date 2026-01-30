/**
 * Parses error response from API, extracting the most useful error message.
 * Handles JSON responses with `detail` field, plain text, and fallback to status code.
 */
export async function parseApiError(response: Response): Promise<string> {
  const defaultErrorMessage = `HTTP error! status: ${response.status}`;

  try {
    const errorData = await response.json();
    console.error("API Error Response Body:", errorData);

    if (errorData?.detail) {
      return typeof errorData.detail === "string"
        ? errorData.detail
        : JSON.stringify(errorData.detail);
    }
    if (typeof errorData === "string") {
      return errorData;
    }
    if (errorData) {
      return JSON.stringify(errorData);
    }
  } catch {
    try {
      const textError = await response.text();
      if (textError) {
        console.error("API Error Response Text:", textError);
        return textError;
      }
    } catch {
      // Fall through to default
    }
  }

  return response.statusText || defaultErrorMessage;
}

/**
 * Handles API response: throws on error with parsed detail, returns JSON on success.
 * Handles 204 No Content and non-JSON responses gracefully.
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  // Check content type before parsing JSON
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  // Return empty object for non-JSON responses
  return {} as T;
}

/**
 * Generic fetch wrapper that handles common patterns:
 * - Default JSON content-type (skipped for FormData)
 * - Consistent error handling
 * - Response parsing
 */
export async function fetchApi<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const config: RequestInit = {
    ...options,
    headers: {
      // Don't set Content-Type for FormData (browser sets it with boundary)
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  return handleResponse<T>(response);
}
