const { test: base, expect } = require("@playwright/test");
const { chromium } = require("playwright");
const { version: playwrightClientVersion } = require("playwright/package.json");

const BASE_URL = "https://www.testmuai.com/selenium-playground/";

const PROJECT_CAPABILITIES = {
  "Chrome - Windows 10": {
    browserName: "Chrome",
    browserVersion: "155.0",
    platform: "Windows 10",
    name: "PW 101",
  },
  "Edge - Windows 11": {
    browserName: "MicrosoftEdge",
    browserVersion: "latest",
    platform: "Windows 11",
    name: "PW 101 - Edge Windows 11",
  },
};

const test = base.extend({
  page: async ({}, use, testInfo) => {
    const username = process.env.LT_USERNAME;
    const accessKey = process.env.LT_ACCESS_KEY;
    if (!username || !accessKey) {
      throw new Error(
        "Set LT_USERNAME and LT_ACCESS_KEY in the environment before running the cloud tests.",
      );
    }

    const project = PROJECT_CAPABILITIES[testInfo.project.name];
    if (!project) {
      throw new Error(`No TestMu AI capability is configured for "${testInfo.project.name}".`);
    }

    const capabilities = {
      browserName: project.browserName,
      browserVersion: project.browserVersion,
      "LT:Options": {
        username,
        accessKey,
        playwrightClientVersion,
        geoLocation: "IN",
        timezone: "Kolkata",
        video: true,
        platform: project.platform,
        network: true,
        build: "Playwright 101 Assignment",
        name: project.name,
        tunnel: false,
        console: true,
        accessibility: true,
        smartUIProjectName: "Playwright 101",
      },
    };

    const endpoint = `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(
      JSON.stringify(capabilities),
    )}`;
    const browser = await chromium.connect(endpoint);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    page.on("console", (message) => {
      console.log(
        JSON.stringify({
          type: "console",
          level: message.type(),
          text: message.text(),
          test: testInfo.title,
        }),
      );
    });
    page.on("pageerror", (error) => {
      console.error(JSON.stringify({ type: "pageerror", text: error.message, test: testInfo.title }));
    });
    page.on("request", (request) => {
      console.log(
        JSON.stringify({
          type: "network:request",
          method: request.method(),
          url: request.url(),
          test: testInfo.title,
        }),
      );
    });
    page.on("response", (response) => {
      console.log(
        JSON.stringify({
          type: "network:response",
          status: response.status(),
          url: response.url(),
          test: testInfo.title,
        }),
      );
    });
    page.on("requestfailed", (request) => {
      console.error(
        JSON.stringify({
          type: "network:requestfailed",
          method: request.method(),
          url: request.url(),
          error: request.failure()?.errorText,
          test: testInfo.title,
        }),
      );
    });

    try {
      await use(page);
    } finally {
      let screenshotSaved = false;
      try {
        const screenshotPath = testInfo.outputPath("screenshot.png");
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await testInfo.attach("screenshot", {
          path: screenshotPath,
          contentType: "image/png",
        });
        screenshotSaved = true;
      } finally {
        try {
          const passed = testInfo.status === "passed" && screenshotSaved;
          await page.evaluate(
            () => {},
            `lambdatest_action: ${JSON.stringify({
              action: "setTestStatus",
              arguments: {
                status: passed ? "passed" : "failed",
                remark: passed
                  ? "Playwright assertions passed and screenshot saved."
                  : "Playwright test or artifact capture did not pass. See runner output.",
              },
            })}`,
          );
        } finally {
          try {
            await context.close();
          } finally {
            await browser.close();
          }
        }
      }
    }
  },
});

test("Simple Form Demo returns the entered message", async ({ page }) => {
  const message = "Welcome to TestMu AI";

  await page.goto(BASE_URL);
  await page.getByRole("link", { name: "Simple Form Demo" }).click();
  await expect(page).toHaveURL(/simple-form-demo/);

  const checkedValueButton = page.getByRole("button", { name: "Get Checked Value" });
  // The playground binds this handler in a React effect after the button becomes visible.
  await expect
    .poll(
      () =>
        checkedValueButton.evaluate((button) => {
          return Object.keys(button).some(
            (key) => key.startsWith("jQuery") && button[key]?.events?.click?.length > 0,
          );
        }),
      { message: "Simple Form Demo click handler should be ready" },
    )
    .toBe(true);

  await page.getByPlaceholder("Please enter your Message").fill(message);
  await checkedValueButton.click();
  await expect(page.locator("#message")).toHaveText(message);
});

test("Drag & Drop Sliders sets Default value 15 to 95", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.getByRole("link", { name: "Drag & Drop Sliders" }).click();
  await expect(page).toHaveURL(/drag-drop-range-sliders-demo/);

  const slider = page.locator("#slider3 input[type='range']");
  const rangeValue = page.locator("#rangeSuccess");
  await expect(slider).toHaveValue("15");

  const bounds = await slider.boundingBox();
  if (!bounds) {
    throw new Error("Could not determine the slider position.");
  }

  const min = Number(await slider.getAttribute("min"));
  const max = Number(await slider.getAttribute("max"));
  const target = 95;
  const y = bounds.y + bounds.height / 2;
  let lowX = bounds.x + 1;
  let highX = bounds.x + bounds.width - 1;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const targetX = (lowX + highX) / 2;
    await page.mouse.move(bounds.x + 1, y);
    await page.mouse.down();
    await page.mouse.move(targetX, y, { steps: 8 });
    await page.mouse.up();

    const actual = Number(await slider.inputValue());
    if (actual === target) {
      break;
    }
    if (actual < target) {
      lowX = targetX;
    } else {
      highX = targetX;
    }
  }

  expect(min).toBe(1);
  expect(max).toBe(100);
  await expect(slider).toHaveValue(String(target));
  await expect(rangeValue).toHaveText(String(target));
});

test("Input Form Submit validates required fields and submits successfully", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.getByRole("link", { name: "Input Form Submit" }).click();
  await expect(page).toHaveURL(/input-form-demo/);

  const form = page.locator("#seleniumform");
  await form.getByRole("button", { name: "Submit" }).click();
  await expect(form.locator("input:invalid")).toHaveCount(10);
  await expect
    .poll(() => form.locator("input:invalid").first().evaluate((input) => input.validationMessage))
    .toMatch(/Please fill/i);

  await form.getByPlaceholder("Name").fill("Playwright Test User");
  await form.getByPlaceholder("Email").fill("playwright.user@example.com");
  await form.getByPlaceholder("Password").fill("TestPassword123!");
  await form.getByPlaceholder("Company").fill("Playwright 101");
  await form.getByPlaceholder("Website").fill("https://example.com");
  await form.locator("select[name='country']").selectOption({ label: "United States" });
  await form.getByPlaceholder("City").fill("New York");
  await form.getByPlaceholder("Address 1").fill("123 Test Street");
  await form.getByPlaceholder("Address 2").fill("Suite 101");
  await form.getByPlaceholder("State").fill("New York");
  await form.getByPlaceholder("Zip code").fill("10001");

  await expect(form.locator("select[name='country'] option:checked")).toHaveText("United States");
  await form.getByRole("button", { name: "Submit" }).click();
  await expect(
    page.getByText("Thanks for contacting us, we will get back to you shortly.", { exact: true }),
  ).toBeVisible();
});
