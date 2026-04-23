interface EmptyStateProps {
  message: string;
  variant?: "default" | "error";
}

export function EmptyState({ message, variant = "default" }: EmptyStateProps) {
  const textColor = variant === "error" ? "text-red-500" : "text-semantic-text";

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className={`font-inter text-sm ${textColor}`}>{message}</div>
    </div>
  );
}
