import type { ServerInfo } from "./index";

/**
 * Create a draft post through the API and return its id. Tests that edit a
 * post use one of their own, since other tests run against the same site.
 */
export async function createPost(serverInfo: ServerInfo, title: string): Promise<string> {
	const response = await fetch(`${serverInfo.baseUrl}/_emdash/api/content/posts`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${serverInfo.token}`,
			"Content-Type": "application/json",
			Origin: serverInfo.baseUrl,
			"X-EmDash-Request": "1",
		},
		body: JSON.stringify({
			data: {
				title,
				body: [
					{
						_type: "block",
						_key: "intro",
						style: "normal",
						children: [{ _type: "span", _key: "intro-text", text: "Post body." }],
						markDefs: [],
					},
				],
			},
		}),
	});
	if (!response.ok) throw new Error(`Creating post failed: ${response.status}`);
	const body: { data?: { item?: { id?: unknown } } } = await response.json();
	const id = body.data?.item?.id;
	if (typeof id !== "string") throw new Error("Creating post returned no id");
	return id;
}
