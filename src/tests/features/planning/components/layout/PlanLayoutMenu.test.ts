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
			"customise",
		]);
		expect(options(wrapper).at(-1)).toMatchObject({
			label: "Customise Custom Layout…",
		});
	});

	it("has no customising where it isn't offered (a phone)", async () => {
		const { wrapper } = await mountMenu({ canCustomise: false });
		// Tinted parts is set while customising, not here
		expect(keys(wrapper)).toEqual(["standard"]);
	});

	it("picks a layout, nothing for the one in use, or customises", async () => {
		const { wrapper, component } = await mountMenu({ hasCustom: true });
		const dropdown = wrapper.findComponent(PDropdown);
		dropdown.vm.$emit("select", "custom");
		dropdown.vm.$emit("select", "standard");
		dropdown.vm.$emit("select", "customise");
		expect(component.emitted("pick")).toEqual([["custom"]]);
		expect(component.emitted("customise")).toHaveLength(1);
	});
});
