import { describe, expect, it } from "vitest";

import PlanLayoutMenu from "@/features/planning/components/layout/PlanLayoutMenu.vue";
import PDropdown from "@/ui/components/PDropdown.vue";
import { mountComponent } from "@/tests/mountComponent";
import plan from "@/locales/en_US/plan.json";

async function mountMenu(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanLayoutMenu,
		{
			choice: "standard",
			hasCustom: false,
			canCustomise: true,
			tinted: false,
			...props,
		},
		{ messages: { plan } }
	);
}

const options = (wrapper: Awaited<ReturnType<typeof mountMenu>>["wrapper"]) =>
	wrapper.findComponent(PDropdown).props("options");
const keys = (wrapper: Awaited<ReturnType<typeof mountMenu>>["wrapper"]) =>
	options(wrapper).map((o) => ("key" in o ? o.key : undefined));

describe("PlanLayoutMenu", () => {
	it("lists Standard with its line, checked, and customising", async () => {
		const { wrapper } = await mountMenu();
		expect(options(wrapper)).toEqual([
			{
				key: "standard",
				label: "Standard",
				hint: "Results on top · Base · Production with tools · Material I/O",
				checked: true,
			},
			{ type: "divider" },
			{
				key: "tint",
				label: "Tinted parts",
				hint: "A slightly lighter background on every part, for more contrast",
				checked: false,
			},
			{ type: "divider" },
			{ key: "customise", label: "Customise, starting from Standard…" },
		]);
		expect(
			wrapper.find("[data-layout-menu]").attributes("aria-label")
		).toBe("Layout: Standard");
	});

	it("offers Custom Layout once there is one", async () => {
		const { wrapper } = await mountMenu({
			choice: "custom",
			hasCustom: true,
		});
		expect(keys(wrapper)).toEqual([
			"standard",
			"custom",
			undefined,
			"tint",
			undefined,
			"customise",
		]);
		expect(options(wrapper).at(-1)).toMatchObject({
			label: "Customise Custom Layout…",
		});
	});

	it("has no customising where it isn't offered (a phone)", async () => {
		const { wrapper } = await mountMenu({ canCustomise: false });
		expect(keys(wrapper)).toEqual(["standard", undefined, "tint"]);
	});

	it("picks a layout, nothing for the one in use, or customises", async () => {
		const { wrapper, component } = await mountMenu({ hasCustom: true });
		const dropdown = wrapper.findComponent(PDropdown);
		dropdown.vm.$emit("select", "custom");
		dropdown.vm.$emit("select", "standard");
		dropdown.vm.$emit("select", "customise");
		dropdown.vm.$emit("select", "tint");
		expect(component.emitted("pick")).toEqual([["custom"]]);
		expect(component.emitted("customise")).toHaveLength(1);
		expect(component.emitted("tint")).toEqual([[true]]);
	});
});

describe("PlanLayoutMenu, Tinted parts on", () => {
	it("shows it checked and turns it off", async () => {
		const { wrapper, component } = await mountMenu({ tinted: true });
		expect(options(wrapper)).toContainEqual(
			expect.objectContaining({ key: "tint", checked: true })
		);
		wrapper.findComponent(PDropdown).vm.$emit("select", "tint");
		expect(component.emitted("tint")).toEqual([[false]]);
	});
});
