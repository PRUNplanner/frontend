import { defineProject } from "vitest/config";

// The package's own tests: plain Node, none of the app's setup (no jsdom,
// no IndexedDB, no stores). Run by the app's `pnpm test` as project "engine".
export default defineProject({
	test: {
		name: "engine",
		environment: "node",
		include: ["tests/**/*.test.ts"],
		unstubGlobals: true,
		clearMocks: true,
	},
});
