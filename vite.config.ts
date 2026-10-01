import { defineConfig } from "vite";
import path from "path";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { compression } from "vite-plugin-compression2";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";

// read package.json
import pkg from "./package.json";

const dbVersionString = pkg.dbVersion;
const appVersion = pkg.version;

// convert to numeric version
const [major, minor, patch] = dbVersionString.split(".").map(Number);
const indexedDBVersion = major * 10000 + minor * 100 + patch;

export function skipEmptyChunks(): Plugin {
	return {
		name: "skip-empty-chunks",
		// @ts-expect-error Rollout imported from Vite
		generateBundle(_options: unknown, bundle: OutputBundle) {
			// add linebreak
			console.log("\n");
			for (const fileName in bundle) {
				// @ts-expect-error Rollout imported from Vite
				const chunkOrAsset: OutputChunk | OutputAsset =
					bundle[fileName];

				if (chunkOrAsset.type === "chunk") {
					if (!chunkOrAsset.code.trim()) {
						delete bundle[fileName];
						console.log(
							`[skip-empty-chunks] Skipping empty chunk: ${fileName}`
						);
					}
				}
			}
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	base: "/",
	define: {
		__INDEXEDDB_VERSION__: JSON.stringify(indexedDBVersion),
		__APP_VERSION__: JSON.stringify(appVersion),
	},
	server: {
		watch: {
			ignored: [
				"**/node_modules/**",
				"**/.git/**",
				"**/dist/**",
				"**/coverage/**",
			],
		},
	},
	plugins: [
		vue(),
		tailwindcss(),
		tsconfigPaths(),
		AutoImport({ imports: ["vue", "vue-router", "pinia"] }),
		Components({
			resolvers: [NaiveUiResolver()],
		}),
		skipEmptyChunks(),
		compression({
			algorithms: ["gzip", "brotliCompress"],
		}),
		visualizer({
			filename: "dist/bundle-stats.html",
			template: "treemap",
			gzipSize: true,
			brotliSize: true,
			open: process.env.ANALYZE === "true",
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			vue: "vue/dist/vue.runtime.esm-bundler.js",
		},
		dedupe: ["vue"],
	},
	optimizeDeps: {
		include: ["vue", "vue-router", "pinia"],
		exclude: [],
		esbuildOptions: {
			target: "ESNext",
		},
	},
	assetsInclude: ["**/*.md"],
	build: {
		target: "esnext",
		cssCodeSplit: true,
		outDir: "dist",
		emptyOutDir: true,
		sourcemap: true,
		minify: "esbuild",
		commonjsOptions: {
			transformMixedEsModules: true,
		},
		rollupOptions: {
			cache: false,
			watch: false,
			treeshake: {
				moduleSideEffects: true,
			},
			output: {
				// sourcemapExcludeSources: false,

				entryFileNames: "assets/[name].[hash].js",
				chunkFileNames: "assets/chunks/[name].[hash].js",
				assetFileNames: "assets/[ext]/[name].[hash].[ext]",

				// Named chunks only for what the shell needs on every page;
				// Rollup splits everything else per route. posthog-js stays
				// its own chunk, fetched only after consent.
				manualChunks(id) {
					if (!id.includes("node_modules")) return;
					const parts = id.split("node_modules/").pop()!.split("/");
					const pkg = parts[0].startsWith("@")
						? `${parts[0]}/${parts[1]}`
						: parts[0];

					if (pkg === "posthog-js") return "vendor_posthog";
					if (pkg === "vue" || pkg.startsWith("@vue/"))
						return "vendor_vue";
					if (pkg === "vue-router") return "vendor_vue_router";
					if (pkg.startsWith("pinia")) return "vendor_pinia";
					if (pkg === "vue-i18n" || pkg.startsWith("@intlify/"))
						return "vendor_vue_i18n";
				},
			},
		},
	},
	envPrefix: "VITE_",
});
