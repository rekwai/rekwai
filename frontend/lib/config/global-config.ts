"use client";

// Global configuration types
interface RuntimeConfig {
  backend_service_url: string;
}

// Global configuration state
let globalConfig: RuntimeConfig | null = null;
let configPromise: Promise<RuntimeConfig> | null = null;

// SessionStorage key for caching configuration
const CONFIG_STORAGE_KEY = "rekwai_runtime_config";

// Try to load config from sessionStorage
const loadCachedConfig = (): RuntimeConfig | null => {
  try {
    if (typeof window === "undefined") return null; // SSR safety
    const cached = sessionStorage.getItem(CONFIG_STORAGE_KEY);
    if (cached) {
      const configData = JSON.parse(cached) as RuntimeConfig;
      // Validate cached config has required fields
      if (configData.backend_service_url) {
        return configData;
      }
    }
  } catch (err) {
    console.warn("Failed to load cached configuration:", err);
  }
  return null;
};

// Save config to sessionStorage
const saveConfigToCache = (configData: RuntimeConfig): void => {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configData));
    }
  } catch (err) {
    console.warn("Failed to cache configuration:", err);
  }
};

// Load configuration from network or cache
const loadConfig = async (): Promise<RuntimeConfig> => {
  try {
    // Try cached config first
    const cachedConfig = loadCachedConfig();
    if (cachedConfig) {
      console.log("Using cached configuration from sessionStorage");
      globalConfig = cachedConfig;
      return cachedConfig;
    }

    // If no cached config, fetch from network
    console.log("Fetching fresh configuration from /frontend-api/config");
    const response = await fetch("/frontend-api/config", {
      cache: "no-cache",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to load configuration: ${response.status} ${response.statusText}`,
      );
    }

    const configData: RuntimeConfig = await response.json();

    // Validate required fields
    if (!configData.backend_service_url) {
      throw new Error(
        "Configuration missing required field: backend_service_url",
      );
    }

    // Cache the successful config
    saveConfigToCache(configData);
    globalConfig = configData;
    return configData;
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Unknown error loading configuration";
    console.error("Failed to load runtime configuration:", errorMessage);
    throw new Error(`Runtime configuration failed to load: ${errorMessage}`);
  }
};

// Initialize global configuration
export const initializeGlobalConfig = async (): Promise<RuntimeConfig> => {
  if (globalConfig) {
    return globalConfig;
  }

  if (configPromise) {
    return await configPromise;
  }

  configPromise = loadConfig();
  const config = await configPromise;
  return config;
};

// Get global configuration (throws if not initialized)
const getGlobalConfig = (): RuntimeConfig => {
  if (!globalConfig) {
    throw new Error(
      "Global configuration not initialized. Call initializeGlobalConfig() first.",
    );
  }
  return globalConfig;
};

// Get API base URL from global config
export const getApiUrl = (): string => {
  return getGlobalConfig().backend_service_url;
};
