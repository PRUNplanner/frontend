import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { DOMWrapper, flushPromises } from "@vue/test-utils";

import PHoverCard from "@/ui/components/PHoverCard.vue";
import { mountComponent } from "@/tests/mountComponent";

const createFloating = vi.hoisted(() =>
	vi.fn((..._args: unknown[]) => ({ destroy: () => {} }))
);
vi.mock("@/ui/popper", () => ({ createFloating }));

/** a trigger at x 300–350 in a window of the given width */
async function openAt(innerWidth: number, placement = "left") {
	vi.stubGlobal("innerWidth", innerWidth);
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
		left: 300,
		right: 350,
		top: 100,
		bottom: 120,
	} as DOMRect);
	const { wrapper } = await mountComponent(
		PHoverCard,
		{
			label: "RAT market",
			placement,
			width: 626,
		},
		{ attach: true }
	);
	await wrapper.find("[role=button]").trigger("focusin");
	await nextTick();
	await flushPromises();
	const body = new DOMWrapper(document.body);
	return {
		placement: createFloating.mock.lastCall?.[2],
		region: body.find("[role=region]"),
	};
}

describe("PHoverCard", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		createFloating.mockClear();
	});

	it("opens on the wanted side when the card fits there", async () => {
		const { placement, region } = await openAt(1440, "right");

		expect(placement).toBe("right");
		expect(region.attributes("aria-label")).toBe("RAT market");
		// 1440 − 350 − 8 offset − 8 edge
		expect(region.find("div").attributes("style")).toContain(
			"max-width: 1074px"
		);
	});

	it("takes the roomier side and limits the width when it doesn't fit", async () => {
		// left: 300 − 16 = 284, right: 768 − 350 − 16 = 402
		const { placement, region } = await openAt(768);

		expect(placement).toBe("right");
		expect(region.find("div").attributes("style")).toContain(
			"max-width: 402px"
		);
	});

	it("keeps the wanted side when the other has less room", async () => {
		const { placement } = await openAt(500);

		expect(placement).toBe("left");
	});
});
