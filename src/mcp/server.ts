import { createServer } from "node:http";

// Util
import { createHandler } from "@/mcp/app";
import { logEvent } from "@/mcp/log";

// The PRUNplanner MCP server (docs/mcp.md): pnpm build:mcp && pnpm start:mcp

const port = Number(process.env.PORT ?? 8080);
const handler = createHandler({
	apiUrl: (
		process.env.PRUNPLANNER_API_URL ?? "http://localhost:8000"
	).replace(/\/$/, ""),
	appUrl: (
		process.env.PRUNPLANNER_APP_URL ?? "https://prunplanner.org"
	).replace(/\/$/, ""),
	version: __APP_VERSION__,
});

createServer((req, res) => {
	handler(req, res).catch(() => {
		if (!res.headersSent) res.writeHead(500);
		res.end();
	});
}).listen(port, () =>
	logEvent("mcp_server_started", { port, version: __APP_VERSION__ })
);
