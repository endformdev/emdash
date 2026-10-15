import { spawn } from "node:child_process";

import globalTeardown from "./global-teardown.js";

try {
	const child = spawn("endform", process.argv.slice(2), { stdio: "inherit" });
	process.exitCode = await new Promise<number>((resolve, reject) => {
		child.once("error", reject);
		child.once("exit", (code) => resolve(code ?? 1));
	});
} finally {
	// Endform can terminate its webServer before the server's signal handler runs.
	await globalTeardown();
}
