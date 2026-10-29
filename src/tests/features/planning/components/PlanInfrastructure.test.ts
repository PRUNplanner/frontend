import { describe, it, expect, vi } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import { trackPlanEdit } from "@/lib/analytics/useAnalytics";
import PlanInfrastructure from "@/features/planning/components/PlanInfrastructure.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { IInfrastructureRecord } from "@/features/planning/usePlanCalculation.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackPlanEdit: vi.fn() }));

const INFRASTRUCTURE: IInfrastructureRecord = {
	HB1: 1,
	HB2: 2,
	HB3: 3,
	HB4: 4,
	HB5: 5,
	HBB: 6,
	HBC: 7,
	HBM: 8,
	HBL: 9,
	STO: 10,
	STA: 11,
	STE: 12,
	STV: 13,
	STW: 14,
};

// display order, habitations first, then storages
const ORDER = [
	"HB1",
	"HBB",
	"HB2",
	"HBC",
	"HB3",
	"HBM",
	"HB4",
	"HBL",
	"HB5",
	"STO",
	"STA",
	"STE",
	"STV",
	"STW",
];

async function mountInfrastructure(props: Record<string, unknown> = {}) {
	return mountComponent(PlanInfrastructure, {
		disabled: false,
		autoOptimizeHabs: false,
		infrastructureData: INFRASTRUCTURE,
		planetNaturalId: "ZZ-000a",
		...props,
	});
}

const checkbox = (wrapper: VueWrapper) => wrapper.find("input[type=checkbox]");
const numberInputs = (wrapper: VueWrapper) =>
	wrapper.findAll("input:not([type=checkbox])");
const numberInput = (wrapper: VueWrapper, inf: string) =>
	numberInputs(wrapper).at(ORDER.indexOf(inf))!;
/** disabled state per building, in display order */
const disabledInputs = (wrapper: VueWrapper) =>
	numberInputs(wrapper).map((i) => (i.element as HTMLInputElement).disabled);
const buttons = (wrapper: VueWrapper) => wrapper.findAll("button");
const costButton = (wrapper: VueWrapper) =>
	buttons(wrapper).find((b) => b.text() === "plan.base.housing.cheapest");
const areaButton = (wrapper: VueWrapper) =>
	buttons(wrapper).find((b) => b.text() === "plan.base.housing.least_area");
const labels = (wrapper: VueWrapper) =>
	wrapper.findAll("[data-ticker]").map((s) => s.text());

// only HB1, HBC and STO in use
const SPARSE: IInfrastructureRecord = {
	...(Object.fromEntries(
		Object.keys(INFRASTRUCTURE).map((k) => [k, 0])
	) as IInfrastructureRecord),
	HB1: 4,
	HBC: 2,
	STO: 1,
};

describe("PlanInfrastructure", () => {
	it.each([
		["every", INFRASTRUCTURE],
		["a few", SPARSE],
	])(
		"lists every type, habitations then storages, with %s in use",
		async (_, infrastructureData) => {
			const { wrapper } = await mountInfrastructure({ infrastructureData });

			expect(labels(wrapper)).toEqual(ORDER);
			expect(
				numberInputs(wrapper).map(
					(i) => (i.element as HTMLInputElement).value
				)
			).toEqual(
				ORDER.map((inf) =>
					String(infrastructureData[inf as keyof IInfrastructureRecord])
				)
			);
		}
	);

	it("enables everything without auto-optimize", async () => {
		const { wrapper } = await mountInfrastructure();

		expect((checkbox(wrapper).element as HTMLInputElement).checked).toBe(
			false
		);
		expect(checkbox(wrapper).attributes("disabled")).toBeUndefined();
		expect(disabledInputs(wrapper)).toEqual(ORDER.map(() => false));
		expect(costButton(wrapper)?.exists()).toBe(true);
		expect(areaButton(wrapper)?.exists()).toBe(true);
	});

	it("locks habitations and hides the optimize buttons with auto-optimize", async () => {
		const { wrapper } = await mountInfrastructure({
			autoOptimizeHabs: true,
		});

		expect((checkbox(wrapper).element as HTMLInputElement).checked).toBe(
			true
		);
		// the solver owns the 9 habitations, storages stay editable
		expect(disabledInputs(wrapper)).toEqual(
			ORDER.map((inf) => !inf.startsWith("ST"))
		);
		expect(costButton(wrapper)).toBeUndefined();
		expect(areaButton(wrapper)).toBeUndefined();
	});

	it("disables everything when disabled", async () => {
		const { wrapper } = await mountInfrastructure({ disabled: true });

		expect(checkbox(wrapper).attributes("disabled")).toBeDefined();
		expect(disabledInputs(wrapper)).toEqual(ORDER.map(() => true));
		expect(costButton(wrapper)).toBeUndefined();
		expect(areaButton(wrapper)).toBeUndefined();
	});

	it("disables storages when disabled with auto-optimize", async () => {
		const { wrapper } = await mountInfrastructure({
			disabled: true,
			autoOptimizeHabs: true,
		});

		expect(disabledInputs(wrapper)).toEqual(ORDER.map(() => true));
	});

	it("unlocks habitations when auto-optimize is turned off", async () => {
		const { wrapper, setProps } = await mountInfrastructure({
			autoOptimizeHabs: true,
		});

		await setProps({ autoOptimizeHabs: false });

		expect(disabledInputs(wrapper)).toEqual(ORDER.map(() => false));
		expect(costButton(wrapper)?.exists()).toBe(true);
	});

	it.each([true, false])(
		"emits auto-optimize %s with the auto goal",
		async (value) => {
			const { wrapper, component } = await mountInfrastructure({
				autoOptimizeHabs: !value,
			});

			await checkbox(wrapper).setValue(value);

			expect(component.emitted("update:auto-optimize-habs")).toEqual([
				[value, "auto"],
			]);
		}
	);

	it("emits the optimize goals", async () => {
		const { wrapper, component } = await mountInfrastructure();

		await costButton(wrapper)!.trigger("click");
		await areaButton(wrapper)!.trigger("click");

		expect(component.emitted("optimize-habs")).toEqual([
			["cost"],
			["area"],
		]);
	});

	it("emits and tracks a new amount", async () => {
		const { wrapper, component } = await mountInfrastructure();

		await numberInput(wrapper, "HBC").setValue("25");

		expect(component.emitted("update:infrastructure")).toEqual([
			["HBC", 25],
		]);
		expect(trackPlanEdit).toHaveBeenCalledWith({
			field: "infrastructure",
			planet_natural_id: "ZZ-000a",
			infrastructure_type: "HBC",
			amount: 25,
		});
	});

	it("emits storage amounts with auto-optimize", async () => {
		const { wrapper, component } = await mountInfrastructure({
			autoOptimizeHabs: true,
		});

		await numberInput(wrapper, "STW").setValue("2");

		expect(component.emitted("update:infrastructure")).toEqual([
			["STW", 2],
		]);
	});

	it("clamps amounts at 0 without an upper limit", async () => {
		const { wrapper, component } = await mountInfrastructure();

		await numberInput(wrapper, "HB1").setValue("-4");
		await numberInput(wrapper, "HB1").setValue("1234");

		expect(component.emitted("update:infrastructure")).toEqual([
			["HB1", 0],
			["HB1", 1234],
		]);
	});

	it("ignores a cleared input", async () => {
		const { wrapper, component } = await mountInfrastructure();

		await numberInput(wrapper, "STO").setValue("");

		expect(component.emitted("update:infrastructure")).toBeUndefined();
		expect(trackPlanEdit).not.toHaveBeenCalled();
	});

	it("follows new amounts", async () => {
		const { wrapper, setProps } = await mountInfrastructure();

		await setProps({ infrastructureData: { ...INFRASTRUCTURE, HBB: 42 } });

		expect(
			(numberInput(wrapper, "HBB").element as HTMLInputElement).value
		).toBe("42");
	});
});
