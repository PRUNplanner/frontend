import { describe, it, expect } from "vitest";
import { nextTick } from "vue";
import type { VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import FIOBurnPlanTable from "@/features/fio/components/FIOBurnPlanTable.vue";
import { usePreferences } from "@/features/preferences/usePreferences";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IFIOBurnPlanetTableElement,
	IFIOBurnTableElementMaterial,
} from "@/features/fio/useFIOBurn.types";

const material = (
	ticker: string,
	exhaustion: number
): IFIOBurnTableElementMaterial => ({
	ticker,
	input: 1,
	output: 0,
	delta: -1,
	stock: 0,
	exhaustion,
});

const MATERIALS = [
	material("C", 3),
	material("DW", 8),
	material("RAT", 9),
	material("PT", 26),
	material("EXO", 40),
	material("FE", Infinity),
];

// the ids sort the other way round than the names
const PLANS: IFIOBurnPlanetTableElement[] = [
	{
		planUuid: "a-uuid",
		planName: "Zeta",
		planetId: "KW-020a",
		minDays: 3,
		burnMaterials: MATERIALS,
	},
	{
		planUuid: "z-uuid",
		planName: "Alpha",
		planetId: "KW-020a",
		minDays: 9,
		burnMaterials: [],
	},
	{
		planUuid: "m-uuid",
		planName: "Mid",
		planetId: "KW-020a",
		minDays: 1,
		burnMaterials: [],
	},
];

const MESSAGES = {
	fio: {
		burn: {
			components: {
				overview: {
					axis: "0 – {max} d",
					summary: {
						red: "{n} red",
						yellow: "{n} yellow",
						materials:
							"no materials | {n} material | {n} materials",
					},
				},
			},
		},
	},
};

const plans = (wrapper: VueWrapper) =>
	wrapper.findAll("tbody td[data-col-key=planUuid] a").map((a) => a.text());
const sort = (wrapper: VueWrapper, key: string) =>
	wrapper.find(`th[data-col-key="${key}"] button`).trigger("click");

async function mountTable() {
	const pinia = createPinia();
	setActivePinia(pinia);
	const { wrapper } = await mountComponent(
		FIOBurnPlanTable,
		{ planTable: PLANS },
		{ pinia, messages: MESSAGES }
	);
	return wrapper;
}

describe("FIOBurnPlanTable", () => {
	it("sorts the plan column by the plan name, not its id", async () => {
		const wrapper = await mountTable();
		expect(plans(wrapper)).toEqual(["Zeta", "Alpha", "Mid"]);

		await sort(wrapper, "planUuid");
		expect(plans(wrapper)).toEqual(["Zeta", "Mid", "Alpha"]);
		await sort(wrapper, "planUuid");
		expect(plans(wrapper)).toEqual(["Alpha", "Mid", "Zeta"]);
	});

	it("sorts by burn days", async () => {
		const wrapper = await mountTable();

		await sort(wrapper, "minDays");
		expect(plans(wrapper)).toEqual(["Alpha", "Zeta", "Mid"]);
		expect(tableRows(wrapper).map((r) => Object.keys(r))[0]).toEqual([
			"planUuid",
			"strip",
			"minDays",
		]);
	});

	it("sums up each plan's materials under its name", async () => {
		const wrapper = await mountTable();
		const summaries = wrapper
			.findAll("tbody td[data-col-key=planUuid] div")
			.map((d) => d.text());

		expect(summaries).toEqual([
			"1 red · 2 yellow · 5 materials",
			"no materials",
			"no materials",
		]);
	});

	it("strips one dot per material on the axis and +n beyond it", async () => {
		const wrapper = await mountTable();
		const strip = wrapper.find("tbody td[data-col-key=strip]");

		// C, DW, RAT, PT on 0..30; EXO beyond; FE produced
		expect(strip.findAll(".relative button")).toHaveLength(4);
		expect(strip.text()).toBe("+1");
	});

	it("moves the axis with the yellow threshold, without a reload", async () => {
		const wrapper = await mountTable();
		const header = () => wrapper.find('th[data-col-key="strip"]').text();
		expect(header()).toContain("0 – 30 d");

		usePreferences().burnDaysYellow.value = 5;
		await nextTick();

		expect(header()).toContain("0 – 15 d");
		// PT and EXO are beyond 15 d now
		const strip = wrapper.find("tbody td[data-col-key=strip]");
		expect(strip.findAll(".relative button")).toHaveLength(3);
		expect(strip.text()).toBe("+2");
	});
});
