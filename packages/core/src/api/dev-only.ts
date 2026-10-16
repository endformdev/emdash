/**
 * Gate for development-only endpoints and behavior (dev-bypass, dev-reset,
 * captured dev emails).
 *
 * Always enabled in `astro dev`. A production build enables it only when the
 * server process is started with `EMDASH_INSECURE_TEST_BYPASS` set to the
 * exact value below, so the Playwright suite can run against a production
 * build. The value is deliberately public: it is a switch, not a secret, and
 * must never be set on a real deployment.
 */
export const INSECURE_TEST_BYPASS_VALUE = "i-understand-this-site-has-no-authentication";

/** Safe outside Vite (e.g. integration hooks), where `import.meta.env` is undefined. */
export function isInsecureTestBypassEnabled(): boolean {
	const env = typeof process !== "undefined" && process.env ? process.env : {};
	return env.EMDASH_INSECURE_TEST_BYPASS === INSECURE_TEST_BYPASS_VALUE;
}

export function isDevOnlyEnabled(): boolean {
	return import.meta.env.DEV || isInsecureTestBypassEnabled();
}
