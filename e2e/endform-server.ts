import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import globalSetup from "./global-setup.js";
import globalTeardown from "./global-teardown.js";

const serverInfoPath = join(tmpdir(), "emdash-pw-server.json");

await globalSetup();

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
		response.end(readFileSync(serverInfoPath));
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
		const info = JSON.parse(readFileSync(serverInfoPath, "utf8"));
		info.token = update.token;
		writeFileSync(serverInfoPath, JSON.stringify(info));
		response.end();
		return;
	}
	response.writeHead(405).end();
});

server.listen(4446, "127.0.0.1");

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
