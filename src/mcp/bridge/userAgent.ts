/**
 * The bridge's User-Agent: the host's own client name and version from its
 * initialize message (Claude Desktop sends e.g. "claude-ai"), so the server's
 * logs and the backend's (`PRUNplanner-MCP/<version> (<client>)`) show which
 * app is calling, not Node's default "node". The server reads the client name
 * up to the first "/" or space (`clientName` in app.ts).
 *
 * @author jplacht
 */
export function bridgeUserAgent(
	clientInfo: { name?: unknown; version?: unknown } | undefined,
	bridgeVersion: string
): string {
	const token = (value: unknown, fallback: string): string =>
		(typeof value === "string" ? value : "")
			.replace(/[^\w.@+-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 64) || fallback;
	const name = token(clientInfo?.name, "mcpb-host");
	const version = token(clientInfo?.version, "unknown");
	return `${name}/${version} (PRUNplanner .mcpb ${bridgeVersion})`;
}
