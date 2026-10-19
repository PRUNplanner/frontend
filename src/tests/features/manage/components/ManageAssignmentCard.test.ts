import { describe, it, expect } from "vitest";
import { RouterLinkStub } from "@vue/test-utils";

import ManageAssignmentCard from "@/features/manage/components/ManageAssignmentCard.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IAssignmentEmpire,
	IAssignmentRow,
} from "@/features/manage/useAssignmentMatrix.types";

const PLAN = "00000001-0000-4000-8000-000000000000";
const EMPIRES: IAssignmentEmpire[] = [
	{ empireUuid: "e1", empireName: "Alpha" },
	{ empireUuid: "e2", empireName: "Beta" },
	{ empireUuid: "e3", empireName: "Gamma" },
	{ empireUuid: "e4", empireName: "Delta" },
];
const ROW: IAssignmentRow = {
	planUuid: PLAN,
	planName: "Plan A",
	planetId: "ZV-307c",
	planetName: "Vallis",
};

async function mountCard(props: Record<string, unknown> = {}) {
	const mounted = await mountComponent(ManageAssignmentCard, {
		row: ROW,
		empires: EMPIRES,
		cells: "0000",
		...props,
	});
	// one chip per empire, after the menu button
	const chips = () => mounted.wrapper.findAll("button[aria-pressed]");
	return { ...mounted, chips };
}

describe("ManageAssignmentCard", () => {
	it("links the plan and names its planet", async () => {
		const { wrapper } = await mountCard();

		const link = wrapper.findComponent(RouterLinkStub);
		expect(link.props("to")).toBe(`/plan/ZV-307c/${PLAN}`);
		expect(link.text()).toBe("Plan A");
		expect(wrapper.text()).toContain("Vallis ·");
		expect(wrapper.find(".font-mono").text()).toBe("ZV-307c");
	});

	it("leaves the planet name out when it is unknown", async () => {
		const { wrapper } = await mountCard({
			row: { ...ROW, planetName: undefined },
		});

		expect(wrapper.text()).not.toContain("·");
		expect(wrapper.find(".font-mono").text()).toBe("ZV-307c");
	});

	it("shows every cell state on its chip", async () => {
		// assigned, free, to be added, to be removed
		const { chips } = await mountCard({ cells: "10+-" });
		const [assigned, free, adding, removing] = chips();

		expect(chips().map((c) => c.attributes("aria-pressed"))).toEqual([
			"true",
			"false",
			"true",
			"false",
		]);
		expect(chips().map((c) => c.text())).toEqual([
			"Alpha",
			"Beta",
			"Gamma",
			"Delta",
		]);
		expect(assigned.classes()).toContain("bg-blue-800");
		expect(assigned.classes()).not.toContain("bg-unsaved-stripes");
		expect(free.classes()).not.toContain("bg-blue-800");
		expect(free.classes()).not.toContain("bg-unsaved-stripes");
		expect(adding.classes()).toEqual(
			expect.arrayContaining(["bg-blue-800", "bg-unsaved-stripes"])
		);
		expect(adding.classes()).not.toContain("line-through");
		expect(removing.classes()).toEqual(
			expect.arrayContaining(["bg-unsaved-stripes", "line-through"])
		);
		expect(removing.classes()).not.toContain("bg-blue-800");
	});

	it("emits toggle, select and menu with the plan", async () => {
		const { wrapper, component, chips } = await mountCard();

		await chips()[1].trigger("click");
		expect(component.emitted("toggle")).toEqual([[PLAN, "e2"]]);

		await wrapper.find("input[type=checkbox]").setValue(true);
		expect(component.emitted("select")).toEqual([[PLAN]]);

		const menuButton = wrapper.find("button[aria-busy]");
		await menuButton.trigger("click");
		expect(component.emitted("menu")).toEqual([[PLAN, menuButton.element]]);
	});

	it("shows a spinner instead of the dots while busy", async () => {
		const idle = await mountCard();
		expect(
			idle.wrapper.find("button[aria-busy]").attributes("aria-busy")
		).toBe("false");
		expect(idle.wrapper.find(".pspin").exists()).toBe(false);
		expect(idle.wrapper.find("button[aria-busy] svg").exists()).toBe(true);

		const busy = await mountCard({ busy: true });
		const button = busy.wrapper.find("button[aria-busy]");
		expect(button.attributes("aria-busy")).toBe("true");
		expect(button.find(".pspin").exists()).toBe(true);
		expect(button.find("svg.size-5").exists()).toBe(false);
	});

	it("reflects the selection on its checkbox", async () => {
		const off = await mountCard();
		const on = await mountCard({ selected: true });

		expect(
			off.wrapper.find<HTMLInputElement>("input[type=checkbox]").element
				.checked
		).toBe(false);
		expect(
			on.wrapper.find<HTMLInputElement>("input[type=checkbox]").element
				.checked
		).toBe(true);
	});
});
