import { defineMiddleware } from "astro:middleware";

const LOCALES = new Set(["en", "fr", "es"]);

export const onRequest = defineMiddleware((context, next) => {
	const locale = context.params.locale;
	if (locale && !LOCALES.has(locale)) return new Response("Not found", { status: 404 });
	return next();
});
