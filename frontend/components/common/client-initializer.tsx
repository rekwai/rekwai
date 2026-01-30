"use client";

import { useEffect, useState } from "react";
import { initializeGlobalConfig } from "@/lib/config/global-config";

export function ClientInitializer({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initializeGlobalConfig()
      .then(() => setIsReady(true))
      .catch((err) =>
        setError(err instanceof Error ? err : new Error(String(err))),
      );
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">
            Application Failed to Initialize
          </h1>
          <p className="text-sm text-red-600">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
