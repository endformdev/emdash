import { defineConfig, devices } from "@playwright/test";

const isEndform = process.env.ENDFORM === "true";

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
	testIgnore: "portable-text-table.spec.ts",
	// Endform limits concurrency around the shared fixture in endform.config.ts.
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
	webServer: isEndform
		? {
				command: "pnpm exec tsx e2e/endform-server.ts",
				url: "http://127.0.0.1:4446/ready",
				reuseExistingServer: false,
				timeout: 240_000,
			}
		: undefined,

	use: {
		baseURL: process.env.BASE_URL || "http://localhost:4444",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
