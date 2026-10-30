import { effectScope, ref } from "vue";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useBurnXITAction } from "@/features/xit/useBurnXITAction";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { IXITActionElement } from "@/features/xit/xitAction.types";

// test data
import cx_definition from "@/tests/test_data/api_data_cx_definition.json";
import { setupPlanningTestData } from "@/tests/features/planning/usePlanCalculation.fixtures";
import { golden } from "@/tests/golden";

/**
 * Golden: the burn resupply table, its weight, volume and price totals
 * and fit() results, with real material and exchange data.
 */

// consumed, produced, idle and already stocked materials
const ELEMENTS: IXITActionElement[] = [
	{ ticker: "RAT", stock: 120, delta: -36.5 },
	{ ticker: "DW", stock: 40, delta: -28 },
	{ ticker: "OVE", stock: 15, delta: -7.25 },
	{ ticker: "PWO", stock: 0, delta: -3.1 },
	{ ticker: "COF", stock: 500, delta: -2 },
	{ ticker: "H2O", stock: 2340, delta: 0 },
	{ ticker: "FEO", stock: 10, delta: 12.75 },
	{ ticker: "MCG", stock: 0, delta: -120.4 },
	{ ticker: "BSE", stock: 3, delta: -0.5 },
];

interface IBurnCase {
	days: number;
	hideInfinite: boolean;
	overrides?: Record<string, number | null>;
	inactive?: string[];
	cxUuid?: string;
	planet?: string;
}

// the one place that calls the composable
function runBurn(input: IBurnCase) {
	const days = ref(input.days);
	const scope = effectScope();
	const burn = scope.run(() =>
		useBurnXITAction({
			elements: ref(structuredClone(ELEMENTS)),
			resupplyDays: days,
			hideInfinite: ref(input.hideInfinite),
			materialOverrides: ref({ ...input.overrides }),
			materialInactives: ref(new Set(input.inactive ?? [])),
			cxUuid: ref(input.cxUuid),
			planetNaturalId: ref(input.planet),
		})
	)!;
	// fit returns the days, the button applies them
	const fit = (weight: number, volume: number) =>
		(days.value = burn.fit(weight, volume));
	return { ...burn, fit, days, scope };
}

const FITS: [number, number][] = [
	[500, 500],
	[1000, 3000],
	[3000, 1000],
	[50, 50],
	[100_000, 100_000],
];

async function snapshot(input: IBurnCase) {
	const burn = runBurn(input);
	try {
		await flushPromises();
		const table = {
			materialTable: burn.materialTable.value,
			totalWeightVolume: burn.totalWeightVolume.value,
			totalPrice: burn.totalPrice.value,
		};
		const fits = [];
		for (const [weight, volume] of FITS) {
			burn.days.value = input.days;
			burn.fit(weight, volume);
			await flushPromises();
			fits.push({
				weight,
				volume,
				resupplyDays: burn.days.value,
				totalWeightVolume: burn.totalWeightVolume.value,
				totalPrice: burn.totalPrice.value,
			});
		}
		return { ...table, fits };
	} finally {
		burn.scope.stop();
	}
}

const cases: [string, IBurnCase][] = [
	["all", { days: 10, hideInfinite: false }],
	["hide_infinite", { days: 10, hideInfinite: true }],
	[
		"override",
		{ days: 7, hideInfinite: false, overrides: { RAT: 1000, DW: null } },
	],
	["inactive", { days: 10, hideInfinite: true, inactive: ["MCG", "OVE"] }],
	[
		"cx_planet",
		{
			days: 14,
			hideInfinite: true,
			cxUuid: cx_definition.uuid,
			planet: "KW-688c",
		},
	],
];

describe("useBurnXITAction (golden)", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});

	afterEach(() => {
		usePlanningStore().cxs = {};
	});

	it("snapshots every case", async () => {
		usePlanningStore().cxs[cx_definition.uuid] =
			cx_definition as unknown as CX;
		const result: Record<string, unknown> = {};
		for (const [name, input] of cases) result[name] = await snapshot(input);

		await expect(golden(result)).toMatchFileSnapshot(
			"./__snapshots__/useBurnXITAction.golden.json"
		);
	});
});
