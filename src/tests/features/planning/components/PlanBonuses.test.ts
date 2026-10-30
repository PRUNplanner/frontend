import { describe, it, expect, vi } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import { trackPlanEdit } from "@/lib/analytics/useAnalytics";
import PlanBonuses from "@/features/planning/components/PlanBonuses.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackPlanEdit: vi.fn(),
}));

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

	it.each([true, false])("emits and tracks corp HQ %s", async (value) => {
		const { wrapper, component } = await mountBonuses({ corphq: !value });

		await checkbox(wrapper).setValue(value);

		expect(component.emitted("update:corphq")).toEqual([[value]]);
		expect(trackPlanEdit).toHaveBeenCalledWith({
			field: "corphq",
			planet_natural_id: "ZZ-000a",
			value,
		});
	});

	it("emits and tracks the COGC program", async () => {
		const { wrapper, component } = await mountBonuses();

		select(wrapper).vm.$emit("update:value", "PIONEERS");

		expect(component.emitted("update:cogc")).toEqual([["PIONEERS"]]);
		expect(trackPlanEdit).toHaveBeenCalledWith({
			field: "cogc",
			planet_natural_id: "ZZ-000a",
			value: "PIONEERS",
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

	it.each([true, false])(
		"passes disabled: %s to corp HQ and COGC",
		async (disabled) => {
			const { wrapper } = await mountBonuses({ disabled });

			expect(
				(checkbox(wrapper).element as HTMLInputElement).disabled
			).toBe(disabled);
			expect(select(wrapper).props("disabled")).toBe(disabled);
		}
	);
});
