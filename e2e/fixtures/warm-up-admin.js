/**
 * @param {import("@playwright/test").Page} page
 * @param {string} baseUrl
 */
export async function warmUpAdmin(page, baseUrl) {
	// The second load starts after any optimizer reload from the first, so
	// its hydration means the dependency set has settled.
	for (let load = 0; load < 2; load++) {
		try {
			await page.goto(`${baseUrl}/_emdash/admin/login`, {
				waitUntil: "commit",
				timeout: 120_000,
			});
			await page.waitForSelector("astro-island:not([ssr])", { timeout: 120_000 });
			await page.waitForSelector("h1", { timeout: 120_000 });
			await page.waitForLoadState("networkidle", { timeout: 60_000 });
		} catch (error) {
			// Non-fatal: a cold first admin test can still pass on retry.
			console.warn(`[pw] Admin warm-up load ${load + 1} failed:`, error);
		}
	}
}
