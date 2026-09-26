import { describe, it, expect, vi, beforeEach } from "vitest";
import { VueWrapper } from "@vue/test-utils";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanArea from "@/features/planning/components/PlanArea.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import { IAreaResult } from "@/features/planning/usePlanCalculation.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

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
const areaLeft = (wrapper: VueWrapper) => wrapper.find("span.font-bold");

describe("PlanArea", () => {
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
	});

	it("shows permits, used / total and the free area", async () => {
		const { wrapper } = await mountArea();

		expect(permitsInput(wrapper).value).toBe("2");
		expect(wrapper.text()).toContain("350 / 500");
		expect(areaLeft(wrapper).text()).toBe("150");
		expect(wrapper.text()).toContain("plan.components.area.free");
	});

	it("colors free area positive", async () => {
		const { wrapper } = await mountArea();

		expect(areaLeft(wrapper).classes()).toContain("text-positive");
		expect(areaLeft(wrapper).classes()).not.toContain("text-negative");
	});

	it("colors exactly zero free area positive", async () => {
		// 500 used of 500, 0 left is still fine
		const { wrapper } = await mountArea({
			areaData: { ...AREA, areaUsed: 500, areaLeft: 0 },
		});

		expect(areaLeft(wrapper).classes()).toContain("text-positive");
	});

	it("colors overused area negative", async () => {
		// 520 used of 500 leaves 500 - 520 = -20
		const { wrapper } = await mountArea({
			areaData: { ...AREA, areaUsed: 520, areaLeft: -20 },
		});

		expect(areaLeft(wrapper).text()).toBe("-20");
		expect(areaLeft(wrapper).classes()).toContain("text-negative");
		expect(areaLeft(wrapper).classes()).not.toContain("text-positive");
	});

	it("emits and tracks new permits", async () => {
		const { wrapper, component } = await mountArea();

		await wrapper.find("input").setValue("3");

		expect(component.emitted("update:permits")).toEqual([[3]]);
		expect(trackEvent).toHaveBeenCalledWith("plan_update_permits", {
			permits: 3,
			planetNaturalId: "ZZ-000a",
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
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("follows new area data", async () => {
		const { wrapper, setProps } = await mountArea();

		await setProps({
			areaData: { permits: 3, areaUsed: 10, areaTotal: 750, areaLeft: 740 },
		});

		expect(permitsInput(wrapper).value).toBe("3");
		expect(wrapper.text()).toContain("10 / 750");
		expect(areaLeft(wrapper).text()).toBe("740");
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
