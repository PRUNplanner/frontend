import { describe, it, expect } from "vitest";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";

import { useUserStore } from "@/stores/userStore";
import PlanVisitationFrequency from "@/features/planning/components/tools/PlanVisitationFrequency.vue";
import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import {
	IMaterialIO,
	IStorageRecord,
} from "@/features/planning/usePlanCalculation.types";

const PLAN_UUID = "plan-uuid";

/** total weight and volume carry the sign of delta */
function io(
	ticker: string,
	delta: number,
	totalWeight: number,
	totalVolume: number
): IMaterialIO {
	return {
		ticker,
		input: delta < 0 ? -delta : 0,
		output: delta > 0 ? delta : 0,
		delta,
		price: 0,
		individualWeight: 0,
		individualVolume: 0,
		totalWeight,
		totalVolume,
	};
}

// imports: 23 t / 12 m³ per day, exports: 50 t / 30 m³ per day
const MATERIAL_IO = [
	io("RAT", -100, -21, -10),
	io("H2O", -10, -2, -2),
	io("FE", 20, 50, 30),
];

// 1500 base + 5000 of one STO, in t and m³
const ONE_STO: IStorageRecord = { STO: 1, STA: 0, STE: 0, STV: 0, STW: 0 };
const NO_STORAGE: IStorageRecord = { STO: 0, STA: 0, STE: 0, STV: 0, STW: 0 };

async function mountTool(
	props: Partial<{
		storage: IStorageRecord;
		materialIO: IMaterialIO[];
		disabled: boolean;
		planUuid: string;
	}> = {},
	pinia = createPinia()
) {
	return mountComponent(
		PlanVisitationFrequency,
		{
			storage: ONE_STO,
			materialIO: MATERIAL_IO,
			disabled: false,
			...props,
		},
		{ pinia }
	);
}

function tableCells(wrapper: VueWrapper, index: number) {
	return wrapper
		.findAll("table")
		.at(index)!.findAll("tbody tr")
		.map((tr) => tr.findAll("td").map((td) => td.text()));
}

/** import, export, sum rows (weight, volume) and the days storage lasts */
function storageTable(wrapper: VueWrapper) {
	const rows = tableCells(wrapper, 0);
	return {
		import: rows[0].slice(1),
		export: rows[1].slice(1),
		sum: rows[2].slice(1),
		filled: rows[3][1].split(" ")[0],
	};
}

async function exclude(wrapper: VueWrapper, tickers: string[]) {
	wrapper.findComponent(PSelectMultiple).vm.$emit("update:value", tickers);
	await flushPromises();
}

describe("PlanVisitationFrequency", () => {
	it("splits daily flows into import and export, sums by the larger", async () => {
		const { wrapper } = await mountTool();

		expect(storageTable(wrapper)).toEqual({
			import: ["23.00", "12.00"],
			export: ["50.00", "30.00"],
			sum: ["50.00", "30.00"],
			// min(6500 / 50, 6500 / 30)
			filled: "130.00",
		});
	});

	it("calculates visitation days and the limiting factor per ship", async () => {
		const { wrapper } = await mountTool();

		// weight, volume, export days, limit, import days, limit
		expect(tableCells(wrapper, 1)).toEqual([
			["500", "500", "10.00", "t", "21.74", "t"],
			["1,000", "1,000", "20.00", "t", "43.48", "t"],
			["2,000", "2,000", "40.00", "t", "86.96", "t"],
			["1,000", "3,000", "20.00", "t", "43.48", "t"],
			["3,000", "1,000", "33.33", "m³", "83.33", "m³"],
			["5,000", "5,000", "100.00", "t", "217.39", "t"],
		]);
	});

	it("lists the plans storage buildings", async () => {
		const { wrapper } = await mountTool();
		expect(wrapper.text()).toContain(
			"plan.tools.visitation_frequency.storage.info"
		);
		expect(wrapper.text()).not.toContain("info_no_storage");

		const { wrapper: none } = await mountTool({ storage: NO_STORAGE });
		expect(none.text()).toContain(
			"plan.tools.visitation_frequency.storage.info_no_storage"
		);
		// base storage only: 1500 / 50
		expect(storageTable(none).filled).toBe("30.00");
	});

	it("leaves excluded materials out and shows ∞ without exports", async () => {
		const { wrapper } = await mountTool();

		await exclude(wrapper, ["FE"]);

		expect(storageTable(wrapper)).toEqual({
			import: ["23.00", "12.00"],
			export: ["0.00", "0.00"],
			sum: ["23.00", "12.00"],
			// min(6500 / 23, 6500 / 12)
			filled: "282.61",
		});
		expect(tableCells(wrapper, 1)[0]).toEqual([
			"500",
			"500",
			"∞",
			"t",
			"21.74",
			"t",
		]);
	});

	it("stores exclusions as plan preference", async () => {
		const pinia = createPinia();
		const { wrapper } = await mountTool({ planUuid: PLAN_UUID }, pinia);

		await exclude(wrapper, ["RAT"]);

		expect(
			useUserStore(pinia).getPlanPreference(PLAN_UUID)
				.visitationMaterialExclusions
		).toEqual(["RAT"]);
		expect(storageTable(wrapper).import).toEqual(["2.00", "2.00"]);
	});

	it("applies stored exclusions on load", async () => {
		const pinia = createPinia();
		useUserStore(pinia).setPlanPreference(PLAN_UUID, {
			visitationMaterialExclusions: ["FE"],
		});

		const { wrapper } = await mountTool({ planUuid: PLAN_UUID }, pinia);

		expect(storageTable(wrapper).export).toEqual(["0.00", "0.00"]);
	});

	it("keeps exclusions local while disabled", async () => {
		const pinia = createPinia();
		const { wrapper } = await mountTool(
			{ planUuid: PLAN_UUID, disabled: true },
			pinia
		);

		await exclude(wrapper, ["RAT"]);

		expect(storageTable(wrapper).import).toEqual(["2.00", "2.00"]);
		expect(
			useUserStore(pinia).getPlanPreference(PLAN_UUID)
				.visitationMaterialExclusions
		).not.toEqual(["RAT"]);
	});

	it("follows new material flows", async () => {
		const { wrapper, setProps } = await mountTool();

		await setProps({ materialIO: [io("RAT", -100, -21, -10)] });

		expect(storageTable(wrapper).import).toEqual(["21.00", "10.00"]);
		expect(storageTable(wrapper).export).toEqual(["0.00", "0.00"]);
	});
});
