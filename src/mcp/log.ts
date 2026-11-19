/**
 * MCP server logging: one JSON object per line on stdout, in the shape
 * Vector already ships to Axiom (event, level, timestamp, service). Never
 * pass an API key, the Authorization header or user text here.
 */

export type McpLogEvent =
	| "mcp_session_started"
	| "mcp_tool_called"
	| "mcp_request_rejected"
	| "mcp_server_started";

/**
 * Writes one log event
 * @author jplacht
 *
 * @param {McpLogEvent} event Event name
 * @param {Record<string, unknown>} fields Event fields
 * @param {"info" | "warning" | "error"} [level="info"] Level
 */
export function logEvent(
	event: McpLogEvent,
	fields: Record<string, unknown>,
	level: "info" | "warning" | "error" = "info"
): void {
	process.stdout.write(
		JSON.stringify({
			event,
			level,
			timestamp: new Date().toISOString(),
			service: "mcp",
			...fields,
		}) + "\n"
	);
}
