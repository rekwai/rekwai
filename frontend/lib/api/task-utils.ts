// frontend/lib/api/task-utils.ts

import { getApiUrl } from "@/lib/config/global-config";

/**
 * Task status response interface (matches backend TaskResponse)
 */
export interface TaskStatus {
  id: string;
  name: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  message: string;
  error: string;
  created_at: string;
  updated_at: string;
  entity_id: string;
}

/**
 * Gets the current status of an async task
 * @param taskId - The task ID to check
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise resolving to task status
 */
async function getTaskStatus(
  taskId: string,
  signal?: AbortSignal,
): Promise<TaskStatus> {
  const response = await fetch(`${getApiUrl()}/async-tasks/${taskId}`, {
    signal,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

/**
 * Cancels an async task
 * @param taskId - The task ID to cancel
 * @param cleanup - Whether to cleanup partial data (default: true)
 * @returns Promise resolving to updated task status
 */
export async function cancelTask(
  taskId: string,
  cleanup: boolean = true,
): Promise<TaskStatus> {
  const response = await fetch(
    `${getApiUrl()}/async-tasks/${taskId}/cancel?cleanup=${cleanup}`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

/**
 * Polls task status with configurable interval and timeout
 * @param taskId - The task ID to poll
 * @param intervalMs - Polling interval in milliseconds (default: 1000)
 * @param timeoutMs - Timeout in milliseconds (default: 20 minutes)
 * @param onProgress - Callback for progress updates
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise resolving to final task status
 */
export async function pollTaskStatus(
  taskId: string,
  intervalMs: number = 1000,
  timeoutMs: number = 20 * 60 * 1000, // 20 minutes
  onProgress?: (status: TaskStatus) => void,
  signal?: AbortSignal,
): Promise<TaskStatus> {
  const startTime = Date.now();

  while (true) {
    // Check if cancelled before making request
    if (signal?.aborted) {
      throw new DOMException("Polling aborted", "AbortError");
    }

    const status = await getTaskStatus(taskId, signal);

    if (onProgress) {
      onProgress(status);
    }

    if (status.status === "completed") {
      return status;
    }

    if (status.status === "failed") {
      throw new Error(status.error);
    }

    if (status.status === "cancelled") {
      throw new DOMException("Task was cancelled", "AbortError");
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error("Task polling timeout");
    }

    // Check if cancelled before waiting
    if (signal?.aborted) {
      throw new DOMException("Polling aborted", "AbortError");
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
