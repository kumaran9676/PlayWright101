const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

async function runFixture(status, { screenshotFails = false, reportingFails = false } = {}) {
  let fixture;
  let verdict;
  const events = [];
  const page = {
    on() {},
    async screenshot() {
      if (screenshotFails) throw new Error("Screenshot failed");
    },
    async evaluate(callback, action) {
      events.push("report");
      verdict = JSON.parse(action.replace("lambdatest_action: ", ""));
      if (reportingFails) throw new Error("Reporting failed");
    },
  };
  const context = {
    async newPage() { return page; },
    async close() { events.push("context-close"); },
  };
  const browser = {
    async newContext() { return context; },
    async close() { events.push("browser-close"); },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "tests", "selenium-playground.spec.js"), "utf8"),
    {
      require(name) {
        if (name === "@playwright/test") {
          return { test: { extend(fixtures) { fixture = fixtures.page; return () => {}; } } };
        }
        if (name === "playwright") return { chromium: { async connect() { return browser; } } };
        if (name === "playwright/package.json") return { version: "1.64.1" };
        throw new Error(`Unexpected import: ${name}`);
      },
      process: { env: { LT_USERNAME: "fake", LT_ACCESS_KEY: "fake" } },
      console,
    },
  );
  const run = fixture({}, async () => {}, {
    project: { name: "Chrome - Windows 10" },
    status,
    outputPath: (name) => name,
    async attach() {},
  });
  if (screenshotFails || reportingFails) {
    await assert.rejects(run, /Screenshot failed|Reporting failed/);
  } else {
    await run;
  }
  return { verdict, events };
}

for (const status of ["passed", "failed", "timedOut", "skipped", "interrupted"]) {
  test(`reports ${status} honestly to the cloud`, async () => {
    const { verdict, events } = await runFixture(status);
    assert.equal(verdict?.action, "setTestStatus");
    assert.equal(verdict.arguments.status, status === "passed" ? "passed" : "failed");
    assert.deepEqual(events, ["report", "context-close", "browser-close"]);
  });
}

test("does not report passed when screenshot capture fails", async () => {
  const { verdict, events } = await runFixture("passed", { screenshotFails: true });
  assert.equal(verdict?.arguments.status, "failed");
  assert.deepEqual(events, ["report", "context-close", "browser-close"]);
});

test("surfaces reporting errors and still closes remote resources", async () => {
  const { events } = await runFixture("passed", { reportingFails: true });
  assert.deepEqual(events, ["report", "context-close", "browser-close"]);
});
