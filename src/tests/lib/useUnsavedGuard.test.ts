import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, h, ref } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";

import { useUnsavedGuard } from "@/lib/useUnsavedGuard";

const unsaved = ref(false);
const onAsk = vi.fn();
let wrapper: VueWrapper;

const Editor = defineComponent({
	setup() {
		useUnsavedGuard(
			() => unsaved.value,
			() => "leave?",
			onAsk
		);
		return () => h("div");
	},
});
const Page = { render: () => h("div") };

// "/" redirects in a global guard, like the router does for logged in users
async function mountAt(path: string) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: "/", component: Page },
			{ path: "/empire", component: Page },
			{ path: "/search", component: Page },
			{ path: "/plan", component: Editor },
		],
	});
	router.beforeEach((to) => (to.path === "/" ? "/empire" : undefined));
	router.push(path);
	await router.isReady();
	wrapper = mount(RouterView, { global: { plugins: [router] } });
	await flushPromises();
	return router;
}

describe("useUnsavedGuard", () => {
	afterEach(() => {
		wrapper.unmount();
		unsaved.value = false;
		onAsk.mockClear();
		vi.restoreAllMocks();
	});

	it("leaves without asking when nothing is unsaved", async () => {
		const confirm = vi.spyOn(window, "confirm");
		const router = await mountAt("/plan");

		await router.push("/search");

		expect(confirm).not.toHaveBeenCalled();
		expect(router.currentRoute.value.path).toBe("/search");
	});

	it("asks once when the navigation is redirected", async () => {
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
		const router = await mountAt("/plan");
		unsaved.value = true;

		await router.push("/");

		expect(confirm).toHaveBeenCalledTimes(1);
		expect(confirm).toHaveBeenCalledWith("leave?");
		expect(onAsk).toHaveBeenCalledTimes(1);
		expect(router.currentRoute.value.path).toBe("/empire");
	});

	it("stays when declined and asks again on the next try", async () => {
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
		const router = await mountAt("/plan");
		unsaved.value = true;

		await router.push("/");
		await router.push("/");

		expect(confirm).toHaveBeenCalledTimes(2);
		expect(router.currentRoute.value.path).toBe("/plan");
	});

	it("prompts on tab close only while unsaved", async () => {
		await mountAt("/plan");
		const close = () => {
			const event = new Event("beforeunload", { cancelable: true });
			window.dispatchEvent(event);
			return event.defaultPrevented;
		};

		expect(close()).toBe(false);
		unsaved.value = true;
		await flushPromises();
		expect(close()).toBe(true);
		wrapper.unmount();
		expect(close()).toBe(false);
	});
});
