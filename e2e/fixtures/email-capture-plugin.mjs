import { definePlugin } from "emdash";

export function createPlugin() {
	return definePlugin({
		id: "emdash-console-email",
		version: "0.0.0",
		capabilities: ["hooks.email-transport:register"],
		hooks: {
			"email:deliver": {
				exclusive: true,
				handler: async ({ message, source }) => {
					const key = Symbol.for("emdash:dev-emails");
					const emails = (globalThis[key] ??= []);
					emails.push({ message, source, sentAt: new Date().toISOString() });
					if (emails.length > 100) emails.shift();
				},
			},
		},
	});
}
