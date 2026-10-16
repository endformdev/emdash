/**
 * Redirects E2E Tests
 *
 * Tests creating, editing, and deleting URL redirects,
 * plus the 404 tracking tab.
 */

import type { Page } from "@playwright/test";

import { test, expect } from "../fixtures";

const REDIRECTS_LIST_URL = /\/_emdash\/api\/redirects(\?.*)?$/;
const NOT_FOUND_SUMMARY_URL = /\/_emdash\/api\/redirects\/404s\/summary(\?.*)?$/;

function uniqueSuffix(): string {
	return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** The create/edit form. Toasts also have the dialog role, so pick it by its field. */
function redirectForm(page: Page) {
	return page.getByRole("dialog").filter({ has: page.locator('input[placeholder*="old-page"]') });
}

async function createRedirect(page: Page, source: string, destination: string) {
	await page.getByRole("button", { name: "New Redirect" }).click();
	const dialog = redirectForm(page);
	await expect(dialog).toBeVisible();
	await dialog.locator('input[placeholder*="old-page"]').fill(source);
	await dialog.locator('input[placeholder*="new-page"]').fill(destination);
	await dialog.getByRole("button", { name: "Create" }).click();
	await expect(dialog).toBeHidden({ timeout: 10000 });
}

test.describe("Redirects", () => {
	test.beforeEach(async ({ admin }) => {
		await admin.devBypassAuth();
	});

	test.describe("Empty state", () => {
		test("displays redirects page with empty state", async ({ admin, page }) => {
			// Other tests create redirects at the same time, so serve an empty list.
			await page.route(REDIRECTS_LIST_URL, (route) =>
				route.request().method() === "GET"
					? route.fulfill({ json: { data: { items: [] } } })
					: route.continue(),
			);
			await admin.goto("/redirects");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Should show the page heading
			await admin.expectPageTitle("Redirects");

			// Should have the "New Redirect" button
			await expect(page.getByRole("button", { name: "New Redirect" })).toBeVisible();

			// Should show empty state text
			await expect(page.locator("text=No redirects yet")).toBeVisible();
		});
	});

	test.describe("CRUD", () => {
		test("creates a redirect", async ({ admin, page }) => {
			const source = `/old-page-${uniqueSuffix()}`;
			const destination = `/new-page-${uniqueSuffix()}`;
			await admin.goto("/redirects");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Status code defaults to 301 -- leave it
			await createRedirect(page, source, destination);

			// Redirect should appear in the list
			await expect(page.getByText(source, { exact: true })).toBeVisible();
			await expect(page.getByText(destination, { exact: true })).toBeVisible();
		});

		test("edits a redirect", async ({ admin, page }) => {
			const source = `/edit-source-${uniqueSuffix()}`;
			const original = `/edit-dest-original-${uniqueSuffix()}`;
			const updated = `/edit-dest-updated-${uniqueSuffix()}`;
			await admin.goto("/redirects");
			await admin.waitForShell();
			await admin.waitForLoading();

			await createRedirect(page, source, original);
			await expect(page.getByText(source, { exact: true })).toBeVisible();

			// Kumo 2.x renders <Button title> as a Tooltip popup rather than a DOM
			// title attribute; aria-label is on the button itself.
			await page.getByRole("button", { name: `Edit redirect ${source}`, exact: true }).click();

			// Change the destination
			const editDialog = redirectForm(page);
			await expect(editDialog).toBeVisible();
			const destInput = editDialog.locator('input[placeholder*="new-page"]');
			await destInput.clear();
			await destInput.fill(updated);

			// Save
			await editDialog.getByRole("button", { name: "Save" }).click();
			await expect(editDialog).toBeHidden({ timeout: 10000 });

			// Verify the updated destination is shown
			await expect(page.getByText(updated, { exact: true })).toBeVisible();
			await expect(page.getByText(original, { exact: true })).toBeHidden();
		});

		test("deletes a redirect", async ({ admin, page }) => {
			const source = `/to-delete-${uniqueSuffix()}`;
			await admin.goto("/redirects");
			await admin.waitForShell();
			await admin.waitForLoading();

			await createRedirect(page, source, `/deleted-dest-${uniqueSuffix()}`);
			await expect(page.getByText(source, { exact: true })).toBeVisible();

			// See note above re: Kumo 2.x Button title -> Tooltip.
			await page.getByRole("button", { name: `Delete redirect ${source}`, exact: true }).click();

			// Confirm deletion in the ConfirmDialog
			const confirm = page
				.getByRole("dialog")
				.filter({ has: page.getByRole("button", { name: "Delete", exact: true }) });
			await expect(confirm).toBeVisible();
			await confirm.getByRole("button", { name: "Delete", exact: true }).click();
			await expect(confirm).toBeHidden({ timeout: 10000 });

			// Redirect should be gone
			await expect(page.getByText(source, { exact: true })).toBeHidden();
		});
	});

	test.describe("404 Tracking", () => {
		test("renders the 404 errors tab", async ({ admin, page }) => {
			// Other tests request missing pages at the same time, so serve no 404s.
			await page.route(NOT_FOUND_SUMMARY_URL, (route) =>
				route.fulfill({ json: { data: { items: [] } } }),
			);
			await admin.goto("/redirects");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Click the "404 Errors" tab
			await page.locator("button", { hasText: "404 Errors" }).click();

			// Should show the empty state for 404s
			await expect(page.locator("text=No 404 errors recorded yet")).toBeVisible({
				timeout: 10000,
			});
		});
	});
});
