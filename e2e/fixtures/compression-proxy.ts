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
import { createServer, request, type OutgoingHttpHeaders, type Server } from "node:http";
import { createGzip } from "node:zlib";

const BUILT_ASSET_PATH = /^\/_astro\//;
const COMPRESSIBLE_TYPE = /^(text\/|application\/(javascript|json|xml)|image\/svg\+xml)/;
const ACCEPTS_GZIP = /\bgzip\b/;

interface CompressedAsset {
	headers: OutgoingHttpHeaders;
	body: Buffer;
}

export function startCompressionProxy(listenPort: number, targetPort: number): Promise<Server> {
	// Built assets are content-hashed and never change while the server runs,
	// so each one is compressed once instead of on every request.
	const compressedAssets = new Map<string, CompressedAsset>();

	const server = createServer((clientRequest, clientResponse) => {
		const url = clientRequest.url ?? "";
		const wantsGzip =
			clientRequest.method === "GET" &&
			BUILT_ASSET_PATH.test(url) &&
			ACCEPTS_GZIP.test(String(clientRequest.headers["accept-encoding"] ?? ""));
		const cached = wantsGzip ? compressedAssets.get(url) : undefined;
		if (cached) {
			clientResponse.writeHead(200, cached.headers);
			clientResponse.end(cached.body);
			return;
		}

		const upstream = request(
			{
				host: "127.0.0.1",
				port: targetPort,
				method: clientRequest.method,
				path: url,
				headers: clientRequest.headers,
			},
			(upstreamResponse) => {
				const status = upstreamResponse.statusCode ?? 502;
				const headers: OutgoingHttpHeaders = { ...upstreamResponse.headers };
				const compress =
					wantsGzip &&
					!headers["content-encoding"] &&
					COMPRESSIBLE_TYPE.test(String(headers["content-type"] ?? ""));
				if (!compress) {
					clientResponse.writeHead(status, headers);
					upstreamResponse.pipe(clientResponse);
					return;
				}
				delete headers["content-length"];
				headers["content-encoding"] = "gzip";
				headers.vary = headers.vary ? `${headers.vary}, Accept-Encoding` : "Accept-Encoding";
				clientResponse.writeHead(status, headers);
				const gzip = createGzip();
				const chunks: Buffer[] = [];
				gzip.on("data", (chunk: Buffer) => chunks.push(chunk));
				gzip.on("end", () => {
					if (status === 200) compressedAssets.set(url, { headers, body: Buffer.concat(chunks) });
				});
				upstreamResponse.pipe(gzip).pipe(clientResponse);
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
