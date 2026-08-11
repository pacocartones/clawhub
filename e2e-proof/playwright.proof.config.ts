import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PROOF_PORT || 4177);

export default defineConfig({
  testDir: "./",
  testMatch: /proof\.spec\.ts/,
  timeout: 60_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
