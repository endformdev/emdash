import { defineConfig, devices } from "@playwright/test";

const isEndform = process.env.ENDFORM === "true";

// Specs that reset the whole site. On Endform they run in their own suite run,
// one test at a time, after everything else. Tests that only wipe one kind of
// content are tagged instead and limited in endform.config.ts.
const EXCLUSIVE_SPECS = ["passkey-full-setup-virtual-auth.spec.ts", "setup-wizard.spec.ts"];
const IGNORED_SPECS = ["portable-text-table.spec.ts"];

/**
 * Playwright E2E test configuration for EmDash CMS
 *
 * Tests run against an isolated fixture (not a demo app).
 * Global setup creates a temp directory, starts a fresh dev server,
 * runs setup via dev-bypass, and seeds collections with test data.
 * Port 4444 is used to avoid conflicts with development servers.
 */
export default defineConfig({
	testDir: "./e2e/tests",
	testIgnore: IGNORED_SPECS,
	// Local runs share one database and run in order. On Endform every test
	// runs on its own machine against the production build.
	fullyParallel: isEndform,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// GitHub ignores `::error` commands that don't start a line, and before
	// Playwright 1.62 the `dot` reporter leaves its line open ahead of them.
	reporter: process.env.CI ? [["line"], ["github"], ["html"]] : "html",
	// The Cloudflare (workerd) dev runner compiles each admin route slowly on
	// first hit; give it headroom so cold compilation doesn't time out specs.
	timeout: process.env.EMDASH_E2E_TARGET === "cloudflare" ? 90_000 : 30000,

	globalSetup: isEndform ? undefined : "./e2e/global-setup.ts",
	globalTeardown: isEndform ? undefined : "./e2e/global-teardown.ts",
	// Endform runs the webServer on the CLI machine and proxies loopback
	// traffic to it from the remote runners.
	webServer: isEndform
		? {
				command: "pnpm exec tsx e2e/endform-server.ts",
				url: "http://127.0.0.1:4446/ready",
				env: { EMDASH_E2E_BUILD: "production" },
				reuseExistingServer: false,
				timeout: 240_000,
			}
		: undefined,

	use: {
		baseURL: "http://localhost:4444",
		trace: isEndform ? "retain-on-failure" : "on-first-retry",
		screenshot: "only-on-failure",
	},

	projects: isEndform
		? [
				{
					name: "chromium",
					testIgnore: [...IGNORED_SPECS, ...EXCLUSIVE_SPECS],
					use: { ...devices["Desktop Chrome"] },
				},
				{
					name: "exclusive",
					testMatch: EXCLUSIVE_SPECS,
					fullyParallel: false,
					use: { ...devices["Desktop Chrome"] },
				},
			]
		: [
				{
					name: "chromium",
					use: { ...devices["Desktop Chrome"] },
				},
			],
});
