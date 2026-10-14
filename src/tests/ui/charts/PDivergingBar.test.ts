import { describe, it, expect, vi } from "vitest";
import { h, nextTick } from "vue";

import PDivergingBar from "@/ui/charts/PDivergingBar.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountBar(
	props: {
		value: number;
		maxAbs: number;
		negAbs?: number;
		text?: string;
		mirror?: boolean;
		negText?: string;
	},
	center = false
) {
	const { wrapper } = await mountComponent({
		setup: () => () =>
			h(
				PDivergingBar,
				{ label: "Bar", ...props },
				center ? { center: () => h("b", "FE") } : {}
			),
	});
	return wrapper;
}

describe("PDivergingBar", () => {
	it("draws a positive value right of zero", async () => {
		const wrapper = await mountBar({ value: 50, maxAbs: 200 });
		const bar = wrapper.find("[data-bar]");
		expect(bar.classes()).toContain("bg-positive");
		expect(bar.attributes("style")).toContain("width: 25%");
	});

	it("draws a negative value left of zero on its own extent", async () => {
		const wrapper = await mountBar({ value: -10, maxAbs: 200, negAbs: 20 });
		const bar = wrapper.find("[data-bar]");
		expect(bar.classes()).toContain("bg-negative");
		expect(bar.attributes("style")).toContain("width: 50%");
		// halves sized by their extents: the zero line is shared
		const halves = wrapper.findAll("[role=img] > div");
		expect(halves[0].attributes("style")).toContain("flex: 20 1 0%");
		expect(halves[1].attributes("style")).toContain("flex: 200 1 0%");
	});

	it("puts the text inside a wide bar and beside a narrow one", async () => {
		const wide = await mountBar({ value: 80, maxAbs: 100, text: "80" });
		expect(wide.find("[data-bar] span").text()).toBe("80");
		const narrow = await mountBar({ value: 10, maxAbs: 100, text: "10" });
		expect(narrow.find("[data-bar] span").exists()).toBe(false);
		expect(narrow.text()).toContain("10");
	});

	it("puts the centre slot between the halves, without a zero line", async () => {
		const wrapper = await mountBar({ value: -5, maxAbs: 10 }, true);
		expect(wrapper.find("b").text()).toBe("FE");
		expect(wrapper.html()).not.toContain("border-l");
	});

	it("mirrors a value to both sides, each with its own text", async () => {
		const wrapper = await mountBar({
			value: 9483,
			maxAbs: 9483,
			mirror: true,
			text: "+9,483",
			negText: "−9,483",
		});
		const bars = wrapper.findAll("[data-bar]");
		expect(bars).toHaveLength(2);
		expect(bars[0].classes()).toContain("bg-negative");
		expect(bars[0].text()).toBe("−9,483");
		expect(bars[1].classes()).toContain("bg-positive");
		expect(bars[1].text()).toBe("+9,483");
		expect(
			(await mountBar({ value: 0, maxAbs: 1, mirror: true }))
				.find("[data-bar]")
				.exists()
		).toBe(false);
	});

	it("draws nothing for zero or without an extent", async () => {
		expect((await mountBar({ value: 0, maxAbs: 10 })).find("[data-bar]").exists()).toBe(false);
		const none = await mountBar({ value: 5, maxAbs: 0 });
		expect(none.find("[data-bar]").attributes("style")).toContain("width: 0%");
	});

	it("moves text that doesn't fit the measured bar beside it", async () => {
		// each half 100 px wide
		vi.stubGlobal(
			"ResizeObserver",
			class {
				constructor(private cb: () => void) {}
				observe() {
					this.cb();
				}
				disconnect() {}
			}
		);
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			100
		);

		// 40 % is 40 px, "1,322,766" needs about 75 px
		const wrapper = await mountBar({
			value: 40,
			maxAbs: 100,
			text: "1,322,766",
		});
		await nextTick();
		const bar = wrapper.find("[data-bar]");
		expect(bar.find("span").exists()).toBe(false);
		expect(wrapper.text()).toContain("1,322,766");

		// "40" fits inside 40 px
		const short = await mountBar({ value: 40, maxAbs: 100, text: "40" });
		await nextTick();
		expect(short.find("[data-bar] span").text()).toBe("40");
		vi.restoreAllMocks();
	});
});
