import { defineEndformConfig } from "endform";

// Every test loads the admin bundle from the CLI machine through the proxy,
// so the CLI machine's network decides how many tests can run at once.
const concurrency = Number(process.env.EMDASH_ENDFORM_CONCURRENCY || 8);

export default defineEndformConfig({
	additionalFiles: ["e2e/fixtures/assets/*"],
	proxyNetworkHosts: ["<loopback>"],
	concurrentTestLimits: [
		{ scope: "within-suite-run", limit: concurrency },
		{ scope: "within-suite-run", label: "project:exclusive", limit: 1 },
		// Tests that delete every comment run one at a time, alongside the rest
		// of the suite.
		{ scope: "within-suite-run", label: "tag:@comments", limit: 1 },
	],
});
