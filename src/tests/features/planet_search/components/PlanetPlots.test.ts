import { describe, it, expect } from "vitest";
import { DOMWrapper } from "@vue/test-utils";

import PlanetPlots from "@/features/planet_search/components/PlanetPlots.vue";
import { PTag, PTooltip } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

const TS = "2026-10-24T17:37:45.416641Z";

function plots(total: number, used: number, ghost = 0, ghostAllowed = false) {
	return {
		plots_total: total,
		plots_used: used,
		ghost_sites: ghost,
		supports_ghost_sites: ghostAllowed,
		plots_updated: TS,
	};
}

async function mount(planet?: ReturnType<typeof plots>) {
	const { wrapper } = await mountComponent(PlanetPlots, { planet });
	return wrapper;
}

describe("PlanetPlots", () => {
	it("free plots, as of the site list's date", async () => {
		const wrapper = await mount(plots(395, 63));
		expect(wrapper.text()).toBe("planet_search.plots.free");
		expect(wrapper.findComponent(PTag).exists()).toBe(false);
		expect(wrapper.findComponent(PTooltip).props("disabled")).toBe(false);
		// the tooltip's wrapper takes focus, with its 24 px / 44 px hit area
		const trigger = wrapper.find(".ptooltip");
		expect(trigger.attributes("tabindex")).toBe("0");
		expect(trigger.classes()).toContain("touch-target");
		expect(wrapper.find("[data-testid='planet-plots']").attributes("tabindex")).toBeUndefined();
	});

	it("red Full without ghost sites", async () => {
		const wrapper = await mount(plots(10, 10));
		const tag = wrapper.findComponent(PTag);
		expect(tag.props("type")).toBe("error");
		expect(tag.text()).toBe("planet_search.plots.full");
	});

	it("amber Full · ghost sites, with the ghost tooltip", async () => {
		const wrapper = await mount(plots(418, 418, 96, true));
		const tag = wrapper.findComponent(PTag);
		expect(tag.props("type")).toBe("warning");
		expect(tag.text()).toBe("planet_search.plots.full_ghost");

		await wrapper.find("[data-testid='planet-plots']").trigger("focusin");
		expect(new DOMWrapper(document.body).text()).toContain(
			"planet_search.plots.ghost_tooltip planet_search.plots.as_of"
		);
	});

	it("muted plots unknown without data, no tooltip", async () => {
		const wrapper = await mount();
		expect(wrapper.text()).toBe("planet_search.plots.unknown");
		expect(wrapper.find(".text-muted").exists()).toBe(true);
		expect(wrapper.findComponent(PTooltip).exists()).toBe(false);
	});
});
