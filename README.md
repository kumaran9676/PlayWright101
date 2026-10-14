# Playwright 101 Assignment

This project runs the three Selenium Playground scenarios on TestMu AI in parallel on:

- Chrome 155.0 / Windows 10
- Microsoft Edge latest / Windows 11

TestMu AI recording, network logs, console logs, accessibility, video, and the supplied Kolkata/India settings are enabled in each project's capabilities. Videos are recorded by TestMu AI and available in its session dashboard. Playwright saves a screenshot for every test; request, response, failed-request, console, and page-error events are written to the test output.

Edge on Windows 11 replaces the Firefox/macOS project, which failed during remote browser context creation. This preserves two different browser/OS combinations without changing or skipping any scenario. Playwright's separate `recordVideo` recorder is disabled because the remote machines lack its required ffmpeg binary; TestMu AI's `video: true` capability remains enabled.

Each cloud session sends `playwrightClientVersion` from the installed `playwright` package so TestMu AI can select a matching Playwright runtime, avoiding client/server protocol mismatches during browser context creation.

Both projects use TestMu AI's documented `chromium.connect` cloud connection pattern. The `browserName` capability selects the actual remote browser (`Chrome` or `MicrosoftEdge`).

## Setup

Install Node.js, then install the project dependency:

```powershell
npm.cmd install
```

Add your TestMu AI credentials to the root `.env` file once:

```dotenv
LT_USERNAME=your_TestMu_AI_username
LT_ACCESS_KEY=your_TestMu_AI_access_key
```

Replace the placeholder values in `.env` with your credentials. This file is ignored by Git and loaded automatically by Playwright; do not commit or share it. The checked-in `.env.example` is for reference only.

The playground is public, so no tunnel is needed. Tunneling is disabled because TestMu AI does not support combining it with the requested India geolocation.

Run the suite (using `npm.cmd` avoids PowerShell's script execution restriction):

```powershell
npm.cmd test
```

The two browser/OS projects run concurrently with two workers. To list the collected scenarios without connecting to TestMu AI:

```powershell
npm.cmd run test:list
```

## Scenarios

1. Opens Simple Form Demo, checks its URL, enters a reusable message string, and verifies the returned message.
2. Opens Drag & Drop Sliders, drags the slider initially set to 15, and checks both the range input and displayed value are 95.
3. Opens Input Form Submit, checks native required-field validation, fills every required field, selects United States by option text, and verifies the success message.

Simple Form Demo waits for the playground's jQuery click handler to be attached before interacting. The button can be visible before its React effect registers the handler; waiting for handler readiness prevents an ignored early click without fixed sleeps or weakening the message assertion.

The browser-native required-field message differs by browser and locale. The validation scenario checks that the form rejects empty required fields and that the browser reports its standard “Please fill…” message, rather than relying on one browser's exact wording.

Artifacts are written under `test-results/`.

## Cloud test verdict

Before closing each session, the fixture sends LambdaTest's `setTestStatus` action. Passing assertions and successful screenshot capture produce `passed`; failed, timed-out, interrupted, or otherwise non-passing tests produce `failed`. Reporting errors fail the runner rather than silently leaving an assumed success.

This applies to new runs only; it does not modify previously completed sessions. Run `npm.cmd test` again to create sessions with explicit verdicts.

Run the isolated status-reporting regression tests without credentials or cloud access:

```powershell
node --test unit\cloud-status.test.js
```
