import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanBonuses from "@/features/planning/components/PlanBonuses.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

async function mountBonuses(props: Record<string, unknown> = {}) {
	return mountComponent(PlanBonuses, {
		disabled: false,
		corphq: false,
		cogc: "---",
		planetNaturalId: "ZZ-000a",
		...props,
	});
}

const select = (wrapper: VueWrapper) => wrapper.findComponent(PSelect);
const checkbox = (wrapper: VueWrapper) => wrapper.find("input[type=checkbox]");

describe("PlanBonuses", () => {
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
	});

	it("offers no program, the advertising and the workforce programs", async () => {
		const { wrapper } = await mountBonuses();

		expect(select(wrapper).props("options")).toEqual([
			{ value: "---", label: "game.cogc_program.NONE" },
			...[
				"AGRICULTURE",
				"CHEMISTRY",
				"CONSTRUCTION",
				"ELECTRONICS",
				"FOOD_INDUSTRIES",
				"FUEL_REFINING",
				"MANUFACTURING",
				"METALLURGY",
				"RESOURCE_EXTRACTION",
			].map((p) => ({
				value: p,
				label: `game.cogc_program.ADVERTISING_${p}`,
			})),
			...[
				"PIONEERS",
				"SETTLERS",
				"TECHNICIANS",
				"ENGINEERS",
				"SCIENTISTS",
			].map((p) => ({
				value: p,
				label: `game.cogc_program.WORKFORCE_${p}`,
			})),
		]);
	});

	it("shows corp HQ and the COGC program", async () => {
		const { wrapper } = await mountBonuses({
			corphq: true,
			cogc: "METALLURGY",
		});

		expect((checkbox(wrapper).element as HTMLInputElement).checked).toBe(
			true
		);
		expect(select(wrapper).props("value")).toBe("METALLURGY");
		expect(select(wrapper).text()).toContain(
			"game.cogc_program.ADVERTISING_METALLURGY"
		);
	});

	it("shows no corp HQ", async () => {
		const { wrapper } = await mountBonuses();

		expect((checkbox(wrapper).element as HTMLInputElement).checked).toBe(
			false
		);
	});

	it("emits and tracks corp HQ", async () => {
		const { wrapper, component } = await mountBonuses();

		await checkbox(wrapper).setValue(true);

		expect(component.emitted("update:corphq")).toEqual([[true]]);
		expect(trackEvent).toHaveBeenCalledWith("plan_update_corphq", {
			planetNaturalId: "ZZ-000a",
			corphq: true,
		});
	});

	it("emits and tracks removing corp HQ", async () => {
		const { wrapper, component } = await mountBonuses({ corphq: true });

		await checkbox(wrapper).setValue(false);

		expect(component.emitted("update:corphq")).toEqual([[false]]);
		expect(trackEvent).toHaveBeenCalledWith("plan_update_corphq", {
			planetNaturalId: "ZZ-000a",
			corphq: false,
		});
	});

	it("emits and tracks the COGC program", async () => {
		const { wrapper, component } = await mountBonuses();

		select(wrapper).vm.$emit("update:value", "PIONEERS");

		expect(component.emitted("update:cogc")).toEqual([["PIONEERS"]]);
		expect(trackEvent).toHaveBeenCalledWith("plan_update_cogc", {
			planetNaturalId: "ZZ-000a",
			cogc: "PIONEERS",
		});
	});

	it("follows new props", async () => {
		const { wrapper, setProps } = await mountBonuses();

		await setProps({ corphq: true, cogc: "CHEMISTRY" });

		expect((checkbox(wrapper).element as HTMLInputElement).checked).toBe(
			true
		);
		expect(select(wrapper).props("value")).toBe("CHEMISTRY");
	});

	it("disables corp HQ and COGC", async () => {
		const { wrapper } = await mountBonuses({ disabled: true });

		expect(checkbox(wrapper).attributes("disabled")).toBeDefined();
		expect(select(wrapper).props("disabled")).toBe(true);
	});

	it("enables corp HQ and COGC", async () => {
		const { wrapper } = await mountBonuses();

		expect(checkbox(wrapper).attributes("disabled")).toBeUndefined();
		expect(select(wrapper).props("disabled")).toBe(false);
	});
});
