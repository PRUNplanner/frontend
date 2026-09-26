import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

// Smoke test: boots the real entry point (src/main.ts) the way index.html does.
// Catches the "white page" failure after dependency updates, where a plugin
// or import breaks at startup and nothing gets mounted.
describe("App bootstrap", () => {
	it("mounts the app without errors", { timeout: 30_000 }, async () => {
		const errors = vi.spyOn(console, "error");
		document.body.innerHTML = '<div id="app"></div>';

		await import("@/main");
		const { default: router } = await import("@/router");
		await router.isReady();
		await flushPromises();

		expect(document.querySelector("#app main")).not.toBeNull();
		expect(errors).not.toHaveBeenCalled();
	});
});
