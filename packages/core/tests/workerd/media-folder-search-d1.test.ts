import { env } from "cloudflare:test";
import { Kysely } from "kysely";
import { expect, it } from "vitest";

import { RawBindingD1Dialect } from "../../../cloudflare/src/db/d1-dialect.js";
import { runMigrations } from "../../src/database/migrations/runner.js";
import { MediaFolderRepository } from "../../src/database/repositories/media-folders.js";
import type { Database } from "../../src/database/types.js";
import { resetD1Schema } from "./d1-schema.js";

declare module "cloudflare:test" {
	interface ProvidedEnv {
		DB: D1Database;
	}
}

it("searches the complete 49-character folder substring on D1", async () => {
	const db = new Kysely<Database>({ dialect: new RawBindingD1Dialect({ database: env.DB }) });
	try {
		await resetD1Schema(db);
		await runMigrations(db);
		const folders = new MediaFolderRepository(db);
		const term = `${"a".repeat(48)}b`;
		const match = await folders.create(`prefix ${term} suffix`);
		await folders.create(`prefix ${term.slice(0, -1)}c suffix`);

		expect(await folders.findMany({ q: term })).toEqual({
			items: [match],
			nextCursor: undefined,
		});
	} finally {
		await db.destroy();
	}
});
