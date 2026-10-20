// Prerenders "/" into dist/index.html after `vite build` and the SSR build
// of src/prerender.ts (see the build script and docs/seo.md). The logic is
// in src/prerender.ts; this only provides a DOM, reads and writes files.
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { JSDOM } from "jsdom";

const DIST = "dist";
const BUNDLE = ".prerender/assets";

// modules that read browser globals at import time (storage, navigator)
const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
	url: "https://prunplanner.org/",
	pretendToBeVisual: true,
});
for (const key of [
	"window",
	"document",
	"navigator",
	"localStorage",
	"sessionStorage",
	"location",
	"history",
	"DOMParser",
	"HTMLElement",
	"Element",
	"Node",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
])
	Object.defineProperty(globalThis, key, {
		value: dom.window[key],
		configurable: true,
		writable: true,
	});
window.matchMedia = () => ({ matches: false, addEventListener() {} });

const entry = readdirSync(BUNDLE).find((f) => /^prerender\..*\.js$/.test(f));
const { renderLanding, renderSitemap, injectLanding, checkLanding } =
	await import(`../${BUNDLE}/${entry}`);

const shell = readFileSync(`${DIST}/index.html`, "utf8");
const { html, teleports } = await renderLanding();
const index = injectLanding(shell, html, teleports);
const sitemap = renderSitemap(new Date());

const files = { "index.html": index, "sitemap.xml": sitemap };
for (const [name, content] of Object.entries(files)) {
	writeFileSync(`${DIST}/${name}`, content);
	// next to Vite's compressed files, which still hold the empty shell
	writeFileSync(`${DIST}/${name}.gz`, gzipSync(content, { level: 9 }));
	writeFileSync(`${DIST}/${name}.br`, brotliCompressSync(content));
}
rmSync(".prerender", { recursive: true, force: true });

const errors = checkLanding(
	index,
	readFileSync(`${DIST}/robots.txt`, "utf8"),
	sitemap
);
if (errors.length) {
	console.error(`prerender: dist/index.html fails:\n- ${errors.join("\n- ")}`);
	process.exit(1);
}
console.log(`prerender: / (${Math.round(index.length / 1024)} kB), sitemap.xml`);
