import { defineConfig } from "vite";
import path from "path";

// read package.json
import pkg from "./package.json" with { type: "json" };

// The MCP server and its Claude Desktop bridge (docs/mcp.md): Node bundles
// with every dependency inside, no app plugins or public files.
// vite build --config vite.mcp.ts --ssr <entry> --outDir <dir>
export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
	},
	publicDir: false,
	resolve: {
		alias: [
			{
				find: "@",
				replacement: path.resolve(import.meta.dirname, "./src"),
			},
		],
	},
	build: {
		target: "node22",
		emptyOutDir: true,
		sourcemap: true,
		rolldownOptions: {
			output: { entryFileNames: "[name].js" },
		},
	},
	ssr: { noExternal: true, target: "node" },
});
