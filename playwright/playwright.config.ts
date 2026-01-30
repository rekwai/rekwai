import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file in the project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Get base URL from environment variables with fallback to defaults
const PLAYWRIGHT_HOST = process.env.PLAYWRIGHT_HOST || "localhost";
const PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT || "3001";
const baseURL = `http://${PLAYWRIGHT_HOST}:${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Tests use serial mode
  workers: 1, // Run test files sequentially (one at a time)
  forbidOnly: !!process.env.CI,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
