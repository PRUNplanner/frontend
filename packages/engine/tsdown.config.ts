import { defineConfig } from "tsdown";

// `pnpm --filter @prunplanner/engine build`: ESM and .d.ts in dist/, what
// publishConfig.exports points at. The workspace itself imports src/.
export default defineConfig({
	entry: { index: "src/index.ts", "schemas/index": "src/schemas/index.ts" },
	format: "esm",
	dts: true,
	platform: "neutral",
	outDir: "dist",
});
