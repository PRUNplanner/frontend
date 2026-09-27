import path from "path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const alias = { "@": path.resolve(__dirname, "./src") };

// component and view tests run locally only, see vitest.components.config.ts
export const COMPONENT_TESTS = "src/tests/{**/components,views}/**";

export default defineConfig({
	define: {
		__INDEXEDDB_VERSION__: Date.now(), // force db upgrade each test run
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
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
		// type-level tests (*.test-d.ts); `pnpm tsc` skips src/tests, whose
		// other files aren't type clean, so only these files' errors count
		typecheck: {
			enabled: true,
			tsconfig: "./tsconfig.vitest.json",
			ignoreSourceErrors: true,
		},
		// undo vi.stubGlobal / vi.stubEnv after each test
		unstubGlobals: true,
		unstubEnvs: true,
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: [["lcov", { projectRoot: "./src" }], ["html"]],
			include: ["src/**"],
			exclude: [
				"src/layout/*",
				"src/AppProvider.vue",
				"src/App.vue",
				"src/ui/**",
				"src/main.ts",
				"src/views/*",
				"**/components/**",
				"**/dist/**",
				"src/tests/**",
				"**/queryRepository.ts",
				"src/lib/query_cache/queries/*.queries.ts",
				"**/QueryCacheView.vue",
				"src/features/wrapper/**",
				"src/util/axiosSetup.ts",
				"**/*.d.ts",
				"src/router/**",
				"src/lib/analytics/**",
				"**/*.md",
				"**/.DS_Store",
			],
			reportOnFailure: true,
			// fail CI when coverage drops, raise these as coverage grows
			thresholds: {
				statements: 94,
				branches: 82,
				functions: 95,
				lines: 95,
			},
		},
	},
	resolve: {
		alias,
	},
	plugins: [vue()],
});
