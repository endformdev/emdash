/**
 * E2E Test Fixtures
 *
 * Extends Playwright's test with custom fixtures for EmDash admin testing.
 * The server is started by global-setup.ts — these fixtures just provide
 * the AdminPage helper and server context to each test.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { test as base } from "@playwright/test";

import { AdminPage } from "./admin";

export { AdminPage } from "./admin";

const SERVER_INFO_PATH = join(tmpdir(), "emdash-pw-server.json");
export const ENDFORM_SERVER_INFO_URL = "http://127.0.0.1:4446/server-info";

export interface ServerInfo {
	pid: number;
	workDir: string;
	baseUrl: string;
	marketplaceUrl: string;
	token: string;
	sessionCookie: string;
	collections: string[];
	contentIds: Record<string, string[]>;
	mediaIds: Record<string, string>;
}

function getServerInfo(): ServerInfo {
	return JSON.parse(readFileSync(SERVER_INFO_PATH, "utf-8"));
}

/**
 * Extended test with admin page fixture and server context
 */
export const test = base.extend<{
	admin: AdminPage;
	serverInfo: ServerInfo;
	endformServerInfo: void;
}>({
	// On Endform the server runs on the CLI machine (see e2e/endform-server.ts);
	// copy its server info into this runner's temp file before each test.
	endformServerInfo: [
		// oxlint-disable-next-line no-empty-pattern -- Playwright requires destructured fixture dependencies
		async ({}, use) => {
			if (process.env.ENDFORM === "true") {
				const response = await fetch(ENDFORM_SERVER_INFO_URL);
				if (!response.ok) throw new Error(`Server info unavailable (${response.status})`);
				writeFileSync(SERVER_INFO_PATH, await response.text());
			}
			await use();
		},
		{ auto: true },
	],
	// eslint-disable-next-line no-empty-pattern
	serverInfo: async ({}, use) => {
		await use(getServerInfo());
	},
	admin: async ({ page }, use) => {
		const admin = new AdminPage(page);
		await use(admin);
	},
});

export { expect } from "@playwright/test";
