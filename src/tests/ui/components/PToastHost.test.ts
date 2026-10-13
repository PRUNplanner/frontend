import { afterEach, describe, expect, it, vi } from "vitest";
import {
	DOMWrapper,
	enableAutoUnmount,
	flushPromises,
	mount,
} from "@vue/test-utils";
import { createI18n } from "vue-i18n";

import PToastHost from "@/ui/components/PToastHost.vue";
import { closeToast, toast, toasts } from "@/ui/useToast";

enableAutoUnmount(afterEach);

const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });
const body = () => new DOMWrapper(document.body);

function mountHost() {
	mount(PToastHost, { global: { plugins: [i18n] } });
}

describe("PToastHost", () => {
	afterEach(() => {
		[...toasts.value].forEach((t) => closeToast(t.id));
		vi.useRealTimers();
	});

	it("renders the toasts bottom-right, outside the app root", async () => {
		mountHost();
		toast("one");
		toast("two", { type: "error" });
		await flushPromises();

		const host = body().find(".ptoast-host");
		expect(host.element.parentElement).toBe(document.body);
		expect(host.classes()).toEqual(
			expect.arrayContaining(["fixed", "bottom-20", "right-4", "items-end"])
		);
		expect(host.findAll("[role=status], [role=alert]").map((t) => t.text()))
			.toEqual(["one", "two"]);
	});

	it("runs the action and closes with the X", async () => {
		mountHost();
		const onClick = vi.fn();
		toast("Removed", { action: { label: "Undo", onClick } });
		toast("Failed", { type: "error", duration: 0, closable: true });
		await flushPromises();

		const buttons = body().findAll(".ptoast-host button");
		await buttons.find((b) => b.text() === "Undo")!.trigger("click");
		expect(onClick).toHaveBeenCalledTimes(1);

		await body()
			.find('.ptoast-host button[aria-label="common.ui.close"]')
			.trigger("click");
		expect(toasts.value.map((t) => t.text)).toEqual(["Removed"]);
	});

	it("keeps a toast while hovered", async () => {
		vi.useFakeTimers();
		mountHost();
		toast("Saved");
		await flushPromises();

		const item = body().find(".ptoast-host > div");
		await item.trigger("mouseenter");
		vi.advanceTimersByTime(10_000);
		expect(toasts.value).toHaveLength(1);

		await item.trigger("mouseleave");
		vi.advanceTimersByTime(6000);
		expect(toasts.value).toHaveLength(0);
	});
});
