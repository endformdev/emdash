import { expect, it } from "vitest";

import type { MediaFolderRepository } from "../../src/database/repositories/media-folders.js";

export function testMediaFolderSearch(getFolders: () => MediaFolderRepository): void {
	it.each([
		["long ASCII", `${"a".repeat(48)}b`],
		["multibyte Unicode", "資料".repeat(9)],
		["literal wildcard characters", "%_\\".repeat(9)],
		["Unicode normalization expansion", "ﬃ".repeat(17)],
	])("finds the complete %s substring", async (_label, term) => {
		const folders = getFolders();
		const match = await folders.create(`prefix ${term} suffix`);
		await folders.create(`prefix ${term.slice(0, -1)}x suffix`);

		expect(await folders.findMany({ q: `  ${term.toUpperCase()}  ` })).toEqual({
			items: [match],
			nextCursor: undefined,
		});
	});

	it("searches a maximum-length folder name", async () => {
		const folders = getFolders();
		const name = "a".repeat(200);
		const match = await folders.create(name);
		await folders.create(`${name.slice(0, -1)}b`);

		expect(await folders.findMany({ q: name })).toEqual({
			items: [match],
			nextCursor: undefined,
		});
	});

	it("paginates matching folders without including a truncated-term match", async () => {
		const folders = getFolders();
		const term = `${"a".repeat(48)}b`;
		const first = await folders.create(`A ${term}`);
		await folders.create(`B ${term.slice(0, -1)}c`);
		const second = await folders.create(`C ${term}`);

		const page = await folders.findMany({ q: term, limit: 1 });
		expect(page.items).toEqual([first]);
		expect(page.nextCursor).toBeDefined();
		expect(await folders.findMany({ q: term, limit: 1, cursor: page.nextCursor })).toEqual({
			items: [second],
			nextCursor: undefined,
		});
	});
}
