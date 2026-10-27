/**
 * Long-running fixture server for Endform runs.
 *
 * Endform runs each test on a remote machine, so Playwright's globalSetup
 * can't hand server info to tests through a local temp file. This process
 * runs the normal global setup, then serves the server info on port 4446.
 * Endform proxies loopback traffic from the runners back to this machine,
 * where the `serverInfo` fixture fetches it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import globalSetup from "./global-setup.js";
import globalTeardown from "./global-teardown.js";

const SERVER_INFO_PATH = join(tmpdir(), "emdash-pw-server.json");
const PORT = 4446;

await globalSetup();
// Endform only echoes a webServer's stderr.
console.error(
	`[pw] Fixture ready (${process.env.EMDASH_E2E_BUILD === "production" ? "dev-output build" : "astro dev"})`,
);

const server = createServer(async (request, response) => {
	if (request.url === "/ready" && request.method === "GET") {
		response.end("ready");
		return;
	}
	if (request.url !== "/server-info") {
		response.writeHead(404).end();
		return;
	}
	if (request.method === "GET") {
		response.setHeader("Content-Type", "application/json");
		response.end(readFileSync(SERVER_INFO_PATH));
		return;
	}
	if (request.method === "POST") {
		let body = "";
		for await (const chunk of request) body += chunk;
		const update: { token?: unknown } = JSON.parse(body);
		if (typeof update.token !== "string") {
			response.writeHead(400).end();
			return;
		}
		const info = JSON.parse(readFileSync(SERVER_INFO_PATH, "utf8"));
		info.token = update.token;
		writeFileSync(SERVER_INFO_PATH, JSON.stringify(info, null, 2));
		response.end();
		return;
	}
	response.writeHead(405).end();
});

server.listen(PORT, "127.0.0.1");

let stopping = false;
async function stop() {
	if (stopping) return;
	stopping = true;
	server.close();
	await globalTeardown();
	process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
