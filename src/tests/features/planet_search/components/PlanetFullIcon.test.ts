import { describe, it, expect } from "vitest";
import { DOMWrapper } from "@vue/test-utils";

import PlanetFullIcon from "@/features/planet_search/components/PlanetFullIcon.vue";
import { mountComponent } from "@/tests/mountComponent";

function plots(
	total: number | null,
	used: number | null,
	ghostAllowed = false
) {
	return {
		plots_total: total,
		plots_used: used,
		ghost_sites: 0,
		supports_ghost_sites: ghostAllowed,
		plots_updated: "2026-10-24T17:37:45.416641Z",
	};
}

async function icon(planet: ReturnType<typeof plots>) {
	const { wrapper } = await mountComponent(PlanetFullIcon, { planet });
	return wrapper.find("[data-testid='planet-full']");
}

describe("PlanetFullIcon", () => {
	it("marks a planet no base can settle, with its tooltip", async () => {
		const el = await icon(plots(10, 10));
		expect(el.exists()).toBe(true);
		expect(el.text()).toBe("planet_search.plots.full");
		// 24 px of its own, the tooltip wrapper takes focus with the touch area
		expect(el.classes()).toContain("size-6");
		const trigger = el.element.closest(".ptooltip")!;
		expect(trigger.getAttribute("tabindex")).toBe("0");
		expect(trigger.classList).toContain("touch-target");

		await el.trigger("focusin");
		expect(new DOMWrapper(document.body).text()).toContain(
			"planet_search.plots.full_tooltip planet_search.plots.as_of"
		);
	});

	it("nothing where a base still fits", async () => {
		expect((await icon(plots(10, 4))).exists()).toBe(false);
		// full, but ghost sites take new bases
		expect((await icon(plots(10, 10, true))).exists()).toBe(false);
		expect((await icon(plots(null, null))).exists()).toBe(false);
	});
});
