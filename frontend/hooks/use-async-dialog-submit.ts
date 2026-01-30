import { useState } from "react";

/**
 * Custom hook for handling async form submissions in dialogs.
 * Manages loading state and error handling consistently.
 *
 * @param onSubmit - The async function to execute on submit
 * @param onSuccess - Callback to execute on successful submission (e.g., reset form, close dialog)
 * @param onError - Callback to execute on error (e.g., show toast notification)
 * @returns Object containing handleSubmit function and isSubmitting state
 *
 * @example
 * const { handleSubmit, isSubmitting } = useAsyncDialogSubmit(
 *   async (name: string, key: string) => {
 *     await createProduct({ name, product_key: key });
 *   },
 *   () => {
 *     setProductName("");
 *     setProductKey("");
 *     onOpenChange(false);
 *   },
 *   (error) => {
 *     toast({
 *       variant: "destructive",
 *       title: "Failed to create product",
 *       description: error.message,
 *     });
 *   }
 * );
 */
// Note: Using `any[]` for generic arguments to allow maximum flexibility
// for dialog submit functions with varying parameter signatures.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for variadic generic parameters
export function useAsyncDialogSubmit<T extends any[]>(
  onSubmit: (...args: T) => Promise<void>,
  onSuccess: () => void,
  onError: (error: Error) => void,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (...args: T) => {
    setIsSubmitting(true);
    try {
      await onSubmit(...args);
      setIsSubmitting(false);
      onSuccess();
    } catch (error) {
      setIsSubmitting(false);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return { handleSubmit, isSubmitting };
}
