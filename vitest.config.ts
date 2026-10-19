import path from "path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const alias = { "@": path.resolve(__dirname, "./src") };

// component and view tests run separately, see vitest.components.config.ts
export const COMPONENT_TESTS = "src/tests/{**/components,views}/**";

export default defineConfig({
	define: {
		__INDEXEDDB_VERSION__: Date.now(), // force db upgrade each test run
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
		__BUILD_ID__: JSON.stringify("dev"),
	},
	test: {
		setupFiles: "./src/tests/vitest.setup.ts",
		globals: true,
		env: loadEnv("", ""),
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/coverage/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/.claude/**",
			"**/*.md",
			COMPONENT_TESTS,
		],
		environment: "jsdom",
		// type-level tests (*.test-d.ts); `pnpm tsc` checks every other file
		typecheck: {
			enabled: true,
			tsconfig: "./tsconfig.typecheck.json",
			ignoreSourceErrors: true,
		},
		// undo vi.stubGlobal / vi.stubEnv after each test
		unstubGlobals: true,
		unstubEnvs: true,
		// Off for `pnpm test`. `pnpm test:coverage` runs the unit and the component
		// suites (vitest.components.config.ts) as blob reports and merges them
		// into the one coverage/lcov.info that CI uploads to Codacy
		// (.github/workflows/coverage.yml). Both configs share these options, as
		// the include/exclude filter is applied while each suite runs.
		coverage: {
			enabled: false,
			provider: "v8",
			// lcov paths relative to src/, which is how Codacy maps them
			reporter: [["lcov", { projectRoot: "./src" }], ["html"], "text-summary"],
			// every file counts, also those without a test (they show as 0%)
			include: ["src/**"],
			// only tests, types, the entry point and static data
			exclude: [
				"src/tests/**",
				"src/main.ts",
				"**/*.d.ts",
				"**/*.{json,css,md}",
			],
			reportOnFailure: true,
			// fail CI when the combined coverage drops, raise these as it grows.
			// Only checked on the merged report, each suite alone is below them
			thresholds: process.argv.includes("--merge-reports")
				? { statements: 97, branches: 95, functions: 96, lines: 98 }
				: undefined,
		},
	},
	resolve: {
		alias,
	},
	plugins: [vue()],
});
