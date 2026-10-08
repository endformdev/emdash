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
import { warmUpAdmin } from "./warm-up-admin.js";

export { AdminPage } from "./admin";

const SERVER_INFO_PATH = join(tmpdir(), "emdash-pw-server.json");

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
	_endformServerState: void;
}>({
	page: [
		async ({ page }, use) => {
			if (process.env.ENDFORM === "true") {
				await warmUpAdmin(page, process.env.BASE_URL || "http://localhost:4444");
			}
			await use(page);
		},
		{ timeout: 240_000 },
	],
	_endformServerState: [
		// oxlint-disable-next-line no-empty-pattern -- Playwright requires destructured fixture dependencies
		async ({}, use) => {
			if (process.env.ENDFORM === "true") {
				const response = await fetch("http://localhost:4446/server-info");
				if (!response.ok) throw new Error("Unable to load fixture server state");
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
