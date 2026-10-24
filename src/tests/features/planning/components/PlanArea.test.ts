import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import { trackPlanEdit } from "@/lib/analytics/useAnalytics";
import PlanArea from "@/features/planning/components/PlanArea.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { IAreaResult } from "@/features/planning/usePlanCalculation.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackPlanEdit: vi.fn() }));

const AREA: IAreaResult = {
	permits: 2,
	areaUsed: 350,
	areaTotal: 500,
	areaLeft: 150,
};

async function mountArea(props: Record<string, unknown> = {}) {
	return mountComponent(PlanArea, {
		disabled: false,
		areaData: AREA,
		planetNaturalId: "ZZ-000a",
		...props,
	});
}

const permitsInput = (wrapper: VueWrapper) =>
	wrapper.find("input").element as HTMLInputElement;

describe("PlanArea", () => {
	beforeEach(() => {
		vi.mocked(trackPlanEdit).mockClear();
	});

	it("shows the permits and the total area", async () => {
		const { wrapper } = await mountArea();

		expect(permitsInput(wrapper).value).toBe("2");
		expect(wrapper.text()).toContain("plan.components.area.permits");
		expect(wrapper.text()).toContain("plan.base.planet.area");
		// used and free area moved to the results bar
		expect(wrapper.text()).not.toContain("350");
		expect(wrapper.text()).not.toContain("150");
	});

	it("emits and tracks new permits", async () => {
		const { wrapper, component } = await mountArea();

		await wrapper.find("input").setValue("3");

		expect(component.emitted("update:permits")).toEqual([[3]]);
		expect(trackPlanEdit).toHaveBeenCalledWith({
			field: "permits",
			amount: 3,
			planet_natural_id: "ZZ-000a",
		});
	});

	it("clamps permits to 1..3", async () => {
		const { wrapper, component } = await mountArea();

		await wrapper.find("input").setValue("7");
		await wrapper.find("input").setValue("0");

		expect(component.emitted("update:permits")).toEqual([[3], [1]]);
	});

	it("ignores a cleared permits input", async () => {
		const { wrapper, component } = await mountArea();

		// the input emits null while empty, PlanView would clamp it to 1
		await wrapper.find("input").setValue("");

		expect(component.emitted("update:permits")).toBeUndefined();
		expect(trackPlanEdit).not.toHaveBeenCalled();
	});

	it("follows new area data", async () => {
		const { wrapper, setProps } = await mountArea();

		await setProps({
			areaData: {
				permits: 3,
				areaUsed: 10,
				areaTotal: 750,
				areaLeft: 740,
			},
		});

		expect(permitsInput(wrapper).value).toBe("3");
	});

	it("disables the permits input", async () => {
		const { wrapper } = await mountArea({ disabled: true });

		expect(permitsInput(wrapper).disabled).toBe(true);
	});

	it("enables the permits input", async () => {
		const { wrapper } = await mountArea();

		expect(permitsInput(wrapper).disabled).toBe(false);
	});
});
