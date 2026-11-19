import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

// Types & Interfaces
import type { JSONRPCMessage } from "@modelcontextprotocol/server";

/*
 * Claude Desktop extension (.mcpb): a stdio MCP server that forwards every
 * message to PRUNplanner's Streamable HTTP endpoint with the user's API
 * key. Claude Desktop passes the extension settings as env (manifest.json).
 */

const url =
	process.env.PRUNPLANNER_MCP_URL || "https://mcp.prunplanner.org/mcp";
const key = process.env.PRUNPLANNER_API_KEY;

const local = new StdioServerTransport();
const remote = new StreamableHTTPClientTransport(new URL(url), {
	requestInit: { headers: { Authorization: `Api-Key ${key ?? ""}` } },
});

/** a failed forward still answers the request, so the client doesn't wait */
function fail(message: JSONRPCMessage, error: unknown): void {
	if (!("id" in message) || !("method" in message)) return;
	void local.send({
		jsonrpc: "2.0",
		id: message.id,
		error: {
			code: -32000,
			message: `PRUNplanner MCP at ${url}: ${error instanceof Error ? error.message : String(error)}`,
		},
	});
}

local.onmessage = (message) => {
	remote.send(message).catch((error: unknown) => fail(message, error));
};
remote.onmessage = (message) => void local.send(message);
remote.onerror = (error) => process.stderr.write(`remote: ${error.message}\n`);
local.onclose = () => void remote.close();

await remote.start();
await local.start();
