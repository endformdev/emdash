/**
 * Gzip reverse proxy for the production-build fixture.
 *
 * Astro's standalone Node server sends responses uncompressed, while real
 * deployments sit behind a CDN or proxy that compresses them. On Endform every
 * test downloads the admin bundle through the CLI machine, so compressing it
 * cuts the bytes on that path by about four times. Only built assets are
 * compressed, so pages and API responses reach tests exactly as the server
 * sent them.
 */
import { createServer, request, type Server } from "node:http";
import { createGzip } from "node:zlib";

const BUILT_ASSET_PATH = /^\/_astro\//;
const COMPRESSIBLE_TYPE = /^(text\/|application\/(javascript|json|xml)|image\/svg\+xml)/;
const ACCEPTS_GZIP = /\bgzip\b/;

export function startCompressionProxy(listenPort: number, targetPort: number): Promise<Server> {
	const server = createServer((clientRequest, clientResponse) => {
		const upstream = request(
			{
				host: "127.0.0.1",
				port: targetPort,
				method: clientRequest.method,
				path: clientRequest.url,
				headers: clientRequest.headers,
			},
			(upstreamResponse) => {
				const headers = { ...upstreamResponse.headers };
				const acceptsGzip = ACCEPTS_GZIP.test(
					String(clientRequest.headers["accept-encoding"] ?? ""),
				);
				const compress =
					acceptsGzip &&
					clientRequest.method !== "HEAD" &&
					BUILT_ASSET_PATH.test(clientRequest.url ?? "") &&
					!headers["content-encoding"] &&
					COMPRESSIBLE_TYPE.test(String(headers["content-type"] ?? ""));
				if (!compress) {
					clientResponse.writeHead(upstreamResponse.statusCode ?? 502, headers);
					upstreamResponse.pipe(clientResponse);
					return;
				}
				delete headers["content-length"];
				headers["content-encoding"] = "gzip";
				headers.vary = headers.vary ? `${headers.vary}, Accept-Encoding` : "Accept-Encoding";
				clientResponse.writeHead(upstreamResponse.statusCode ?? 502, headers);
				upstreamResponse.pipe(createGzip()).pipe(clientResponse);
			},
		);
		upstream.on("error", () => {
			if (!clientResponse.headersSent) clientResponse.writeHead(502);
			clientResponse.end();
		});
		clientRequest.pipe(upstream);
	});
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(listenPort, "localhost", () => resolve(server));
	});
}
