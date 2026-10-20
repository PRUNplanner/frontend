import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createPinia } from "pinia";
import { createHead } from "@unhead/vue/server";

import AppProvider from "@/AppProvider.vue";
import router from "@/router";
import { i18n } from "@/lib/i18n";
import { buildSitemap } from "@/lib/seo/site";

// The build-time prerender of "/" (scripts/prerender.mjs runs this bundle):
// English, logged out, tours on their first step, panel closed. No
// onMounted runs, so it sends no events and makes no API calls.

/**
 * The landing page's markup for #app of dist/index.html, and what its
 * components teleport to <body> (the client hydrates both)
 */
export async function renderLanding(): Promise<{
	html: string;
	teleports: string;
}> {
	const app = createSSRApp(AppProvider);
	app.use(router);
	app.use(createPinia());
	app.use(i18n);
	app.use(createHead());
	await router.push("/");
	await router.isReady();
	const ctx: { teleports?: Record<string, string> } = {};
	const html = await renderToString(app, ctx);
	return { html, teleports: ctx.teleports?.body ?? "" };
}

/** sitemap.xml of every route with meta.indexable */
export function renderSitemap(date: Date): string {
	return buildSitemap(
		router
			.getRoutes()
			.filter((r) => r.meta.indexable)
			.map((r) => r.path),
		date
	);
}

// the app's entry starts once the prerendered page has painted (its
// first-contentful-paint entry), or after a second where that never comes
// (a background tab), so the text paints without waiting for the scripts.
// Where index.html hides the page (skip-prerender) nothing paints: it starts
// right away. Either way only once the page is parsed, after /env.js has run.
const START_AFTER_PAINT = (src: string) =>
	`<script>(function(){var s=0;function load(){var e=document.createElement("script");e.type="module";e.crossOrigin="";e.src=${JSON.stringify(src)};document.head.appendChild(e)}function go(){if(s)return;s=1;if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load()}if(document.documentElement.classList.contains("skip-prerender"))go();try{new PerformanceObserver(function(l){if(l.getEntriesByName("first-contentful-paint").length)go()}).observe({type:"paint",buffered:true})}catch(e){}setTimeout(go,1000)})()</script>`;

/**
 * dist/index.html with the landing page in #app, marked for main.ts (which
 * hydrates it), the body teleports first in <body>, and its scripts loaded
 * after the first paint. The server answers every path with it; index.html
 * hides the landing page where it doesn't belong.
 */
export function injectLanding(
	shell: string,
	markup: string,
	teleports = ""
): string {
	const mount = '<div id="app"></div>';
	if (!shell.includes(mount)) throw new Error("no empty #app in the shell");
	// hydration looks for body teleports from <body>'s first child on
	const body = shell.match(/<body[^>]*>\s*/);
	if (!body) throw new Error("no <body> in the shell");
	const entry = shell.match(
		/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/
	);
	if (!entry) throw new Error("no module entry in the shell");
	return shell
		.replace(body[0], `${body[0].trimEnd()}${teleports}`)
		.replace(mount, `<div id="app" data-prerendered>${markup}</div>`)
		.replace(/\s*<link rel="modulepreload"[^>]*>/g, "")
		.replace(entry[0], START_AFTER_PAINT(entry[1]));
}

export { checkLanding } from "@/lib/seo/checkLanding";
