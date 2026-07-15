import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const webServerCommand =
  process.env.PLAYWRIGHT_WEBSERVER_COMMAND ??
  "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: true,
  forbidOnly: isCi,
  retries: 0,
  workers: isCi ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
