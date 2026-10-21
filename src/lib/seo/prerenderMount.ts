import type { App, Component } from "vue";
import type { Router } from "vue-router";

const root = () => document.getElementById("app")!;

/**
 * HomepageHeader, loaded by prepareMount, for a fresh mount: App renders it
 * in its first frame. Its async component would only show a task later,
 * after the page painted, and push the page down (a layout shift on
 * /market). Hydrating the landing page keeps the async component, so the
 * body teleports hydrate in the prerender's order.
 */
export let homepageHeader: Component | undefined;

/** dist/index.html: #app holds the prerendered landing page */
export const isPrerendered = (): boolean =>
	root().hasAttribute("data-prerendered");

/**
 * Before the app mounts. The static description and canonical of
 * index.html go, so the ones useHead sets are the only ones. Over the
 * prerendered landing page, the route and the header are loaded first, so
 * the app hydrates the markup as it is: the same elements stay, nothing
 * repaints.
 *
 * @param {Router} router The app's router
 * @param {string} locale The active locale; the prerender is in en_US
 * @author jplacht
 */
export async function prepareMount(
	router: Router,
	locale: string
): Promise<void> {
	document
		.querySelectorAll(
			'head link[rel="canonical"], head meta[name="description"]'
		)
		.forEach((el) => el.remove());

	if (!isPrerendered()) return;

	const [, header] = await Promise.all([
		router.isReady(),
		import("@/layout/components/HomepageHeader.vue"),
	]);

	// a stored session went on to /empire, or a stored locale isn't the
	// prerender's English: nothing matches, so mount fresh (hydration would
	// keep the classes of elements whose tag matches). The prerender's body
	// teleports go with it.
	if (router.currentRoute.value.name !== "homepage" || locale !== "en_US") {
		while (root().previousSibling) root().previousSibling!.remove();
		root().replaceChildren();
		homepageHeader = header.default;
	}
}

/** Mounts (or hydrates) the app; a stored session's hidden #app shows again */
export function mountApp(app: App): void {
	app.mount(root());
	root().removeAttribute("data-prerendered");
}
