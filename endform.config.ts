import { defineEndformConfig } from "endform";

export default defineEndformConfig({
	additionalFiles: ["e2e/fixtures/assets/test-image.png"],
	proxyNetworkHosts: ["<loopback>"],
	concurrentTestLimits: [{ scope: "within-suite-run", limit: 1 }],
});
