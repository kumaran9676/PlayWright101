require("dotenv").config();

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  reporter: "list",
  outputDir: "test-results",
  projects: [
    {
      name: "Chrome - Windows 10",
      metadata: {
        browserName: "Chrome",
        browserVersion: "155.0",
        platform: "Windows 10",
      },
    },
    {
      name: "Edge - Windows 11",
      metadata: {
        browserName: "MicrosoftEdge",
        browserVersion: "latest",
        platform: "Windows 11",
      },
    },
  ],
});
