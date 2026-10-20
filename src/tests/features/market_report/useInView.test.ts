import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref, type Ref } from "vue";

import { useInView } from "@/features/market_report/useInView";

// a stand-in observer: the test says when the element is near
let report: (near: boolean) => void = () => {};
class FakeObserver {
	constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
		report = (near) => cb([{ isIntersecting: near }]);
	}
	observe() {}
	disconnect() {}
}

function mountAt(top: number) {
	vi.stubGlobal("IntersectionObserver", FakeObserver);
	vi.stubGlobal("innerHeight", 900);
	let seen: Ref<boolean> | undefined;
	mount(
		defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				seen = useInView(el);
				return () => h("div", { ref: el });
			},
		})
	);
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
		top,
	} as DOMRect);
	return () => seen!.value;
}

describe("useInView", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("waits for a scroll when the section is only near the fold", async () => {
		const seen = mountAt(962);
		report(true);
		expect(seen()).toBe(false);

		window.dispatchEvent(new Event("scroll"));
		await nextTick();
		expect(seen()).toBe(true);
	});

	it("loads at once a section that is already on screen", () => {
		const seen = mountAt(500);
		report(true);
		expect(seen()).toBe(true);
	});

	it("a scroll far away loads nothing", () => {
		const seen = mountAt(5000);
		window.dispatchEvent(new Event("scroll"));
		report(false);
		expect(seen()).toBe(false);
	});
});
