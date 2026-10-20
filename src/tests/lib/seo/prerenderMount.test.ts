import { afterEach, describe, expect, it, vi } from "vitest";
import type { App } from "vue";
import type { Router } from "vue-router";

import { mountApp, prepareMount } from "@/lib/seo/prerenderMount";

vi.mock("@/layout/components/HomepageHeader.vue", () => ({ default: {} }));

function setup(prerendered: boolean, route = "homepage") {
	document.head.innerHTML =
		'<meta name="description" content="static"><link rel="canonical" href="https://prunplanner.org/"><meta name="theme-color" content="#030707">';
	document.body.innerHTML = prerendered
		? '<!--teleport start anchor--><div class="ptoast-host"></div><!--teleport anchor--><div id="app" data-prerendered><h1>landing</h1></div>'
		: '<div id="app"></div>';
	const isReady = vi.fn().mockResolvedValue(undefined);
	const router = { isReady, currentRoute: { value: { name: route } } };
	return { router: router as unknown as Router, isReady };
}

describe("prepareMount", () => {
	afterEach(() => {
		document.head.innerHTML = "";
		document.body.innerHTML = "";
	});

	it("hands the description and canonical to useHead", async () => {
		const { router } = setup(false);

		await prepareMount(router, "en_US");

		expect(document.head.innerHTML).toBe(
			'<meta name="theme-color" content="#030707">'
		);
	});

	it("over the empty shell, mounts right away", async () => {
		const { router, isReady } = setup(false);

		await prepareMount(router, "en_US");

		expect(isReady).not.toHaveBeenCalled();
	});

	it("over the prerendered landing page, waits for the route first", async () => {
		const { router, isReady } = setup(true);

		await prepareMount(router, "en_US");

		expect(isReady).toHaveBeenCalled();
	});

	it("mounts on #app and shows a hidden #app again", () => {
		setup(true);
		const mount = vi.fn();

		mountApp({ mount } as unknown as App);

		expect(mount).toHaveBeenCalledWith(document.getElementById("app"));
		expect(document.getElementById("app")!.hasAttribute("data-prerendered")).toBe(false);
	});

	it("hydrates the landing page as it is", async () => {
		const { router } = setup(true);

		await prepareMount(router, "en_US");

		expect(document.body.innerHTML).toContain("ptoast-host");
		expect(document.getElementById("app")!.innerHTML).toBe("<h1>landing</h1>");
	});

	it("clears the landing page and its teleports when a session goes on to /empire", async () => {
		const { router } = setup(true, "empire");

		await prepareMount(router, "en_US");

		expect(document.body.innerHTML).toBe('<div id="app" data-prerendered=""></div>');
	});

	it("mounts fresh over the English prerender when another locale is stored", async () => {
		const { router } = setup(true);

		await prepareMount(router, "de_DE");

		expect(document.body.innerHTML).toBe('<div id="app" data-prerendered=""></div>');
	});
});
