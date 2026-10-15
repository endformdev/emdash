import { defineEndformConfig } from "endform";

export default defineEndformConfig({
	additionalFiles: ["e2e/fixtures/assets/test-image.png"],
	environmentVariables: ["^EMDASH_E2E_TARGET$", "^EMDASH_E2E_SERVER$"],
	proxyNetworkHosts: ["<loopback>"],
	concurrentTestLimits: [{ scope: "within-suite-run", limit: 1 }],
});
