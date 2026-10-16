import { env } from "cloudflare:test";
import { Kysely } from "kysely";
import { afterAll, beforeAll, beforeEach, describe } from "vitest";

import { RawBindingD1Dialect } from "../../../cloudflare/src/db/d1-dialect.js";
import { runMigrations } from "../../src/database/migrations/runner.js";
import { MediaFolderRepository } from "../../src/database/repositories/media-folders.js";
import type { Database } from "../../src/database/types.js";
import { testMediaFolderSearch } from "../utils/media-folder-search.js";
import { resetD1Schema } from "./d1-schema.js";

declare module "cloudflare:test" {
	interface ProvidedEnv {
		DB: D1Database;
	}
}

describe("media folder search on D1", () => {
	let db: Kysely<Database>;
	let folders: MediaFolderRepository;

	beforeAll(async () => {
		db = new Kysely<Database>({ dialect: new RawBindingD1Dialect({ database: env.DB }) });
		await resetD1Schema(db);
		await runMigrations(db);
		folders = new MediaFolderRepository(db);
	});

	beforeEach(async () => {
		await db.deleteFrom("media_folders").execute();
	});

	afterAll(async () => {
		await db.destroy();
	});

	testMediaFolderSearch(() => folders);
});
