import { defineConfig } from "vite";
import path from "path";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { compression } from "vite-plugin-compression2";
import AutoImport from "unplugin-auto-import/vite";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";

// read package.json
import pkg from "./package.json" with { type: "json" };

const dbVersionString = pkg.dbVersion;
const appVersion = pkg.version;

// convert to numeric version
const [major, minor, patch] = dbVersionString.split(".").map(Number);
const indexedDBVersion = major * 10000 + minor * 100 + patch;

// Cloudflare Pages compresses on the fly and ignores precompressed files,
// which only spa-to-http (the Docker image, production) serves. Pages only
// builds previews, so it skips the sourcemaps too.
const cfPages = !!process.env.CF_PAGES;

// the commit in CI and Docker, else the build time; the tab compares it with
// the deployed version.json to know when a newer build is out
const buildId =
	process.env.BUILD_REVISION ||
	process.env.CF_PAGES_COMMIT_SHA ||
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
		AutoImport({ imports: ["vue", "vue-router", "pinia"] }),
		buildVersion(),
		apiPreconnect(),
		preloadBodyFont(),
		!cfPages &&
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
			{
				find: "@",
				replacement: path.resolve(import.meta.dirname, "./src"),
			},
			// exact match: vue/server-renderer (the prerender) is the package's
			{
				find: /^vue$/,
				replacement: "vue/dist/vue.runtime.esm-bundler.js",
			},
		],
		dedupe: ["vue"],
	},
	optimizeDeps: {
		include: ["vue", "vue-router", "pinia"],
		exclude: [],
	},
	assetsInclude: ["**/*.md"],
	build: {
		target: "esnext",
		cssCodeSplit: true,
		outDir: "dist",
		emptyOutDir: true,
		sourcemap: !cfPages,
		rolldownOptions: {
			output: {
				entryFileNames: "assets/[name].[hash].js",
				chunkFileNames: "assets/chunks/[name].[hash].js",
				assetFileNames: "assets/[ext]/[name].[hash].[ext]",

				// Named chunks only for what the shell needs on every page;
				// Rolldown splits everything else per route. posthog-js stays
				// its own chunk, fetched only after consent. A group also takes
				// its dependencies, so vue goes first, else pinia's would take it.
				codeSplitting: {
					groups: [
						{
							name: "vendor_vue",
							test: /node_modules\/(vue|@vue\/[^/]+)\//,
							priority: 2,
						},
						{
							name: "vendor_vue_router",
							test: /node_modules\/vue-router\//,
							priority: 1,
						},
						{
							name: "vendor_pinia",
							test: /node_modules\/pinia[^/]*\//,
							priority: 1,
						},
						{
							name: "vendor_vue_i18n",
							test: /node_modules\/(vue-i18n|@intlify\/[^/]+)\//,
							priority: 1,
						},
						{
							name: "vendor_posthog",
							test: /node_modules\/posthog-js\//,
							priority: 1,
						},
					],
				},
			},
		},
	},
	// the prerender bundles everything, so vue resolves through the alias once
	ssr: { noExternal: true },
	envPrefix: "VITE_",
});
