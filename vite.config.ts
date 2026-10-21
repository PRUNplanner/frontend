import { defineConfig } from "vite";
import path from "path";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { compression } from "vite-plugin-compression2";
import AutoImport from "unplugin-auto-import/vite";
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

// the commit in CI and Docker, else the build time; the tab compares it with
// the deployed version.json to know when a newer build is out
const buildId =
	process.env.BUILD_REVISION ||
	process.env.COMMIT_REF ||
	new Date().toISOString();

export function buildVersion(): Plugin {
	return {
		name: "build-version",
		config: (_config, { command }) => ({
			define: {
				__BUILD_ID__: JSON.stringify(
					command === "build" ? buildId : "dev"
				),
			},
		}),
		generateBundle() {
			this.emitFile({
				type: "asset",
				fileName: "version.json",
				source: JSON.stringify({ version: buildId }),
			});
		},
	};
}

// the API's connection opens with the HTML, so the first request (the
// market report's summary) doesn't wait for DNS, TCP and TLS after the JS
export function apiPreconnect(): Plugin {
	let origin = "";
	return {
		name: "api-preconnect",
		configResolved(config) {
			// same fallback as lib/config.ts
			origin = new URL(
				config.env.VITE_API_BASE_URL || "https://api.prunplanner.org"
			).origin;
		},
		transformIndexHtml: () => [
			{
				tag: "link",
				// CORS requests without credentials use the anonymous pool
				attrs: { rel: "preconnect", href: origin, crossorigin: "" },
				injectTo: "head",
			},
		],
	};
}

// the body text's font starts with the HTML, not after the CSS
export function preloadBodyFont(): Plugin {
	return {
		name: "preload-body-font",
		transformIndexHtml: (_html, ctx) => {
			const font = Object.keys(ctx.bundle ?? {}).find((f) =>
				/roboto-latin-400-normal\.[^/]+\.woff2$/.test(f)
			);
			return font
				? [
						{
							tag: "link",
							attrs: {
								rel: "preload",
								as: "font",
								type: "font/woff2",
								href: `/${font}`,
								crossorigin: "",
							},
							injectTo: "head",
						},
					]
				: [];
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
		skipEmptyChunks(),
		buildVersion(),
		apiPreconnect(),
		preloadBodyFont(),
		compression({
			algorithms: ["gzip", "brotliCompress"],
		}),
		// ANALYZE=true pnpm build: bundle treemap, kept out of dist/
		process.env.ANALYZE === "true" &&
			visualizer({
				filename: ".scratch/bundle-stats.html",
				template: "treemap",
				gzipSize: true,
				brotliSize: true,
				open: true,
			}),
	],
	resolve: {
		alias: [
			{ find: "@", replacement: path.resolve(__dirname, "./src") },
			// exact match: vue/server-renderer (the prerender) is the package's
			{ find: /^vue$/, replacement: "vue/dist/vue.runtime.esm-bundler.js" },
		],
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
	// the prerender bundles everything, so vue resolves through the alias once
	ssr: { noExternal: true },
	envPrefix: "VITE_",
});
