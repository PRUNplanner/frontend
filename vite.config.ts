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

				// manual chunking
				manualChunks(id) {
					if (id.includes("node_modules")) {
						const parts = id
							.split("node_modules/")
							.pop()!
							.split("/");

						let pkg = parts[0];
						if (pkg.startsWith("@") && parts.length > 1) {
							pkg = `${parts[0]}/${parts[1]}`;
						}

						if (pkg === "chartjs") return "vendor_chartjs";
						if (pkg === "showdown") return "vendor_showdown";
						if (pkg === "lightweight-charts")
							return "vendor_lightweight";
						if (pkg === "posthog-js") return "vendor_posthog";

						// Sanitize vendor name for the general vendor chunk
						return (
							"vendor_" +
							pkg
								.replace(/^@/, "")
								.replace(/[^a-zA-Z0-9]/g, "_")
								.replace(/_+$/, "")
						);
					}

					if (
						id.includes("src/ui/") ||
						id.includes("/features/") ||
						id.includes("/components/")
					) {
						return "app-core";
					}

					if (id.includes("/views/")) {
						return;
					}
				},
			},
		},
	},
	envPrefix: "VITE_",
});
