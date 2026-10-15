const HELPER_ROUTE =
	/\/packages\/core\/(?:src|dist)\/astro\/routes\/api\/(?:setup\/dev-(?:bypass|reset)|auth\/dev-bypass|dev\/emails)\.(?:ts|mjs)$/;
const ARTIFACT_ROUTE =
	/\/packages\/core\/(?:src|dist)\/astro\/routes\/api\/admin\/plugins\/registry\/artifact\.(?:ts|mjs)$/;
const TRAILING_SEMICOLON = /;\s*$/;

// Private fixture builds retain setup helpers and the localhost mock registry.
// The admin and application middleware still compile in production mode.
export function builtTestHelpers() {
	return {
		name: "emdash-e2e-built-helpers",
		apply: "build",
		enforce: "pre",
		transform(code, id) {
			if (id === "\0virtual:emdash/config") {
				const config = JSON.parse(
					code.slice("export default ".length).replace(TRAILING_SEMICOLON, ""),
				);
				config.registry = process.env.EMDASH_REGISTRY_URL ?? false;
				return { code: `export default ${JSON.stringify(config)};`, map: null };
			}
			if (id.includes("/packages/core/") && code.includes("function validateAggregatorUrl(")) {
				return {
					code: code.replace(
						"options.allowLocalhost ?? import.meta.env.DEV",
						'(aggregatorUrl === "http://127.0.0.1:4445" || (options.allowLocalhost ?? import.meta.env.DEV))',
					),
					map: null,
				};
			}
			if (
				id.includes("/packages/core/") &&
				code.includes("async function resolveSafeArtifactTarget(")
			) {
				return {
					code: code.replace(
						"if (!import.meta.env.DEV)",
						'if (!import.meta.env.DEV && url.origin !== "http://127.0.0.1:4445")',
					),
					map: null,
				};
			}
			if (
				ARTIFACT_ROUTE.test(id) ||
				(id.includes("/packages/core/") &&
					code.includes("Registry artifact fetch requires an abort signal"))
			) {
				return {
					code: code.replace("allowHttpLocalhost: import.meta.env.DEV", "allowHttpLocalhost: true"),
					map: null,
				};
			}
			if (!HELPER_ROUTE.test(id.split("?")[0])) return undefined;
			if (!code.includes("import.meta.env.DEV")) {
				throw new Error(`Missing development guard in fixture helper: ${id}`);
			}
			return { code: code.replaceAll("import.meta.env.DEV", "true"), map: null };
		},
	};
}
