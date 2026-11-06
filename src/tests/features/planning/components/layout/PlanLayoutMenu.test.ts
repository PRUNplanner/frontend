import { describe, expect, it } from "vitest";

import PlanLayoutMenu from "@/features/planning/components/layout/PlanLayoutMenu.vue";
import PDropdown from "@/ui/components/PDropdown.vue";
import { mountComponent } from "@/tests/mountComponent";
import plan from "@/locales/en_US/plan.json";

async function mountMenu(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanLayoutMenu,
		{ choice: "today", hasCustom: false, canCustomise: true, ...props },
		{ messages: { plan } }
	);
}

const options = (wrapper: Awaited<ReturnType<typeof mountMenu>>["wrapper"]) =>
	wrapper.findComponent(PDropdown).props("options");

describe("PlanLayoutMenu", () => {
	it("lists the presets with a line each, the one in use checked", async () => {
		const { wrapper } = await mountMenu();
		expect(options(wrapper)).toEqual([
			{
				key: "today",
				label: "Today's",
				hint: "Results on top · Base · Production with tools · Material I/O",
				checked: true,
			},
			{
				key: "wide",
				label: "Wide",
				hint: "Supply and Plan check next to Production",
				checked: false,
			},
			{
				key: "stacked",
				label: "Stacked",
				hint: "Base parts side by side, Production full width below",
				checked: false,
			},
			{ type: "divider" },
			{ key: "customise", label: "Customise, starting from Today's…" },
		]);
		expect(
			wrapper.find("[data-layout-menu]").attributes("aria-label")
		).toBe("Layout: Today's");
	});

	it("offers Custom Layout once there is one", async () => {
		const { wrapper } = await mountMenu({
			choice: "custom",
			hasCustom: true,
		});
		expect(
			options(wrapper).map((o) => ("key" in o ? o.key : undefined))
		).toEqual([
			"today",
			"wide",
			"stacked",
			"custom",
			undefined,
			"customise",
		]);
		expect(options(wrapper).at(-1)).toMatchObject({
			label: "Customise Custom Layout…",
		});
	});

	it("has no customising where it isn't offered (a phone)", async () => {
		const { wrapper } = await mountMenu({ canCustomise: false });
		expect(
			options(wrapper).map((o) => ("key" in o ? o.key : undefined))
		).toEqual(["today", "wide", "stacked"]);
	});

	it("picks a layout, nothing for the one in use, or customises", async () => {
		const { wrapper, component } = await mountMenu();
		const dropdown = wrapper.findComponent(PDropdown);
		dropdown.vm.$emit("select", "wide");
		dropdown.vm.$emit("select", "today");
		dropdown.vm.$emit("select", "customise");
		expect(component.emitted("pick")).toEqual([["wide"]]);
		expect(component.emitted("customise")).toHaveLength(1);
	});
});
