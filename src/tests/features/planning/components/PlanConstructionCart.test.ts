import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import {
	buildingsStore,
	exchangesStore,
	materialsStore,
} from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";
import PlanConstructionCart from "@/features/planning/components/tools/PlanConstructionCart.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import buildings from "@/tests/test_data/api_data_buildings.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";

// lets a test hold back price lookups, to finish calculations out of order
const priceGate = vi.hoisted(() => ({
	wait: undefined as Promise<void> | undefined,
}));
vi.mock("@/features/cx/usePrice", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/features/cx/usePrice")>();
	return {
		...actual,
		usePrice: (...args: Parameters<typeof actual.usePrice>) => {
			const price = actual.usePrice(...args);
			return {
				...price,
				getPrice: async (
					...a: Parameters<typeof price.getPrice>
				): Promise<number> => {
					if (priceGate.wait) await priceGate.wait;
					return price.getPrice(...a);
				},
			};
		},
	};
});

const mock = new AxiosMockAdapter(apiService.client);

const CX_UUID = "cx-uuid";
// BUY prices of the CX
const PRICES = { BBH: 100, BSE: 50, MCG: 10 };

const mat = (ticker: string, input: number) => ({ ticker, input, output: 0 });
// FRM: 50 pioneers, HB1: houses 100 pioneers, CM: core module
const CONSTRUCTION = [
	{ ticker: "HB1", materials: [mat("BBH", 2), mat("BSE", 2)], amount: 1 },
	{ ticker: "FRM", materials: [mat("BBH", 4), mat("BSE", 4)], amount: 3 },
	{ ticker: "CM", materials: [mat("MCG", 100)], amount: 1 },
];

async function mountCart(
	options: {
		planet?: string;
		fio?: boolean;
		fioFails?: boolean;
		construction?: typeof CONSTRUCTION;
	} = {}
) {
	const pinia = createPinia();
	const planningStore = usePlanningStore(pinia);
	planningStore.setCXs([
		// @ts-expect-error mock data
		{
			uuid: CX_UUID,
			cx_name: "CX",
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: Object.entries(PRICES).map(
					([ticker, value]) => ({ ticker, type: "BUY", value })
				),
				ticker_planets: [],
			},
		},
	]);

	if (options.fio || options.fioFails) {
		// @ts-expect-error partial profile
		useUserStore(pinia).profile = {
			fio_apikey: "key",
			prun_username: "user",
		};
		mock.onGet(/data\/storage\/$/).reply(
			options.fioFails ? 500 : 200,
			fio_storage
		);
	}

	return mountComponent(
		PlanConstructionCart,
		{
			planetNaturalId: options.planet ?? "ZV-307c",
			cxUuid: CX_UUID,
			constructionData: options.construction ?? CONSTRUCTION,
			productionBuildingData: [{ name: "FRM", amount: 3 }],
			infrastructureData: { HB1: 1 },
		},
		{ pinia }
	);
}

const tables = (wrapper: VueWrapper) => wrapper.findAll("table");

/** building rows of the first table as cell texts, inputs as their value */
function buildingRows(wrapper: VueWrapper) {
	return tables(wrapper)[0]
		.findAll("tbody tr")
		.slice(0, -2)
		.map((tr) =>
			tr
				.findAll("th, td")
				.map((c) =>
					c.find("input").exists()
						? (c.find("input").element as HTMLInputElement).value
						: c.text()
				)
		);
}

/** sum row of the first table */
const materialSums = (wrapper: VueWrapper) =>
	tables(wrapper)[0]
		.findAll("tbody tr")
		.at(-2)!
		.findAll("td")
		.slice(1)
		.map((td) => td.text());

/** price, weight and volume of a table's summary */
function summary(wrapper: VueWrapper, table: 0 | 1) {
	const cells = tables(wrapper)
		.at(table)!.findAll("tbody tr")
		.at(-1)!
		.findAll(".grid > div")
		.map((d) => d.text().split(" ")[0]);
	return { price: cells[1], weight: cells[3], volume: cells[5] };
}

/** material rows of the second table: ticker, amount, (stock), need */
function needRows(wrapper: VueWrapper) {
	return tables(wrapper)[1]
		.findAll("tbody tr")
		.slice(0, -1)
		.map((tr) =>
			tr
				.findAll("td")
				.filter((td) => !td.find("input").exists())
				.map((td) => td.text())
		);
}

async function setBuildingAmount(
	wrapper: VueWrapper,
	building: string,
	value: number
) {
	const row = tables(wrapper)[0]
		.findAll("tbody tr")
		.find((tr) => tr.find("th").text() === building)!;
	await row.find("input").setValue(String(value));
	await flushPromises();
}

async function setOverride(wrapper: VueWrapper, ticker: string, value: number) {
	const row = tables(wrapper)[1]
		.findAll("tbody tr")
		.find((tr) => tr.find("td").text() === ticker)!;
	await row.find("input").setValue(String(value));
	await flushPromises();
}

const habitationWarning = (wrapper: VueWrapper) =>
	tables(wrapper)[0].find("thead .picon").exists();

describe("PlanConstructionCart", () => {
	beforeAll(async () => {
		axiosSetup();
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await buildingsStore.setMany(buildings);
		await useMaterialData().preload();
		await (await useBuildingData()).preloadBuildings();
	});

	beforeEach(() => {
		mock.reset();
	});

	it("lists planned buildings with their construction materials", async () => {
		const { wrapper } = await mountCart();

		// building, amount, planned, BBH, BSE, MCG; core module is always 1
		expect(buildingRows(wrapper)).toEqual([
			["CM", "1", "1", "0", "0", "100"],
			["FRM", "3", "3", "12", "12", "0"],
			["HB1", "1", "1", "2", "2", "0"],
		]);
		expect(materialSums(wrapper)).toEqual(["14", "14", "100"]);
	});

	it("sums price, weight and volume of all materials", async () => {
		const { wrapper } = await mountCart();

		// 14 * 100 + 14 * 50 + 100 * 10
		// weight: 14 * 0.5 + 14 * 0.3 + 100 * 0.24
		// volume: 14 * 0.8 + 14 * 0.5 + 100 * 0.1
		expect(summary(wrapper, 0)).toEqual({
			price: "3,100.00",
			weight: "35.20",
			volume: "28.20",
		});
	});

	it("recalculates materials when an amount changes", async () => {
		const { wrapper } = await mountCart();

		await setBuildingAmount(wrapper, "FRM", 1);

		expect(buildingRows(wrapper)[1]).toEqual([
			"FRM",
			"1",
			"3",
			"4",
			"4",
			"0",
		]);
		expect(materialSums(wrapper)).toEqual(["6", "6", "100"]);
		expect(summary(wrapper, 0).price).toBe("1,900.00");
	});

	it("warns when habitations don't house the workforce", async () => {
		const { wrapper } = await mountCart();

		// 3 FRM need 150 pioneers, one HB1 houses 100
		expect(habitationWarning(wrapper)).toBe(true);
		const hb1Input = tables(wrapper)[0]
			.findAll("tbody tr")[2]
			.find(".min-w-20");
		expect(hb1Input.classes()).toContain("[&>div>input]:text-negative");

		// 2 FRM need exactly 100
		await setBuildingAmount(wrapper, "FRM", 2);
		expect(habitationWarning(wrapper)).toBe(false);
	});

	it("reduces the need by a stock override", async () => {
		const { wrapper } = await mountCart();

		expect(needRows(wrapper)).toEqual([
			["BBH", "14", "14"],
			["BSE", "14", "14"],
			["MCG", "100", "100"],
		]);

		await setOverride(wrapper, "BBH", 4);
		// more than needed never goes negative
		await setOverride(wrapper, "BSE", 20);

		expect(needRows(wrapper).map((r) => r[2])).toEqual(["10", "0", "100"]);
		// 10 * 100 + 100 * 10, 10 * 0.5 + 100 * 0.24, 10 * 0.8 + 100 * 0.1
		expect(summary(wrapper, 1)).toEqual({
			price: "2,000.00",
			weight: "29.00",
			volume: "18.00",
		});
	});

	it("keeps the latest building total when an older one finishes last", async () => {
		let release!: () => void;
		priceGate.wait = new Promise((r) => (release = r));
		const { wrapper } = await mountCart();

		// the first totals wait for prices, the ones after the change don't
		priceGate.wait = undefined;
		await setBuildingAmount(wrapper, "FRM", 1);
		// 6 * 100 + 6 * 50 + 100 * 10
		expect(summary(wrapper, 0).price).toBe("1,900.00");

		release();
		await flushPromises();
		expect(summary(wrapper, 0).price).toBe("1,900.00");
	});

	describe("with FIO", () => {
		it("subtracts built buildings and flags unplanned ones", async () => {
			const { wrapper } = await mountCart({ fio: true });

			// ZV-307c has 1 CM, 21 HB1, no FRM and unplanned buildings
			expect(buildingRows(wrapper)).toEqual([
				["CM", "1", "0", "1", "0", "0", "0"],
				["FRM", "0", "3", "3", "12", "12", "0"],
				["HB1", "21", "0", "1", "0", "0", "0"],
			]);
			const built = tables(wrapper)[0]
				.findAll("tbody tr")
				.map((tr) => tr.findAll("th")[1]?.classes());
			expect(built[0]).toContain("text-neutral-500");
			expect(built[2]).toContain("text-red-500");

			expect(wrapper.find("h2 .picon").exists()).toBe(true);
			// built habitations count towards housing
			expect(habitationWarning(wrapper)).toBe(false);
		});

		it("doesn't warn when every built building is planned", async () => {
			const built = ["BMP", "HB1", "HBB", "WPL", "STO", "PPF", "CM"];
			const { wrapper } = await mountCart({
				fio: true,
				construction: built.map((ticker) => ({
					ticker,
					materials: [],
					amount: 0,
				})),
			});

			expect(wrapper.find("h2 .picon").exists()).toBe(false);
		});

		it("takes stock from the selected storage", async () => {
			const { wrapper } = await mountCart({ fio: true });

			// planet storage has none of the materials
			expect(wrapper.findComponent(PSelect).text()).toContain("ZV-307c");
			expect(needRows(wrapper)).toEqual([
				["BBH", "12", "0", "12"],
				["BSE", "12", "0", "12"],
				["MCG", "0", "0", "0"],
			]);

			// ANT warehouse has plenty
			wrapper.findComponent(PSelect).vm.$emit("update:value", "WAR#ANT");
			await flushPromises();

			expect(needRows(wrapper)).toEqual([
				["BBH", "12", "2,012", "0"],
				["BSE", "12", "2,536", "0"],
				["MCG", "0", "7,697", "0"],
			]);
			expect(summary(wrapper, 1).price).toBe("0.00");
		});

		it("keeps the latest total when an older one finishes last", async () => {
			let release!: () => void;
			priceGate.wait = new Promise((r) => (release = r));
			const { wrapper } = await mountCart({ fio: true });

			// the planet's totals wait for prices, the warehouse's don't
			priceGate.wait = undefined;
			wrapper.findComponent(PSelect).vm.$emit("update:value", "WAR#ANT");
			await flushPromises();
			expect(summary(wrapper, 1).price).toBe("0.00");

			release();
			await flushPromises();
			expect(summary(wrapper, 1).price).toBe("0.00");
			// the held back buildings' total still lands, built ones
			// subtracted: 12 * 100 + 12 * 50
			expect(summary(wrapper, 0).price).toBe("1,800.00");
		});

		it("preselects no storage when the planet has none", async () => {
			const { wrapper } = await mountCart({ fio: true, planet: "XX-000a" });

			expect(wrapper.findComponent(PSelect).text()).toContain(
				"No FIO Storage"
			);
			// nothing built there
			expect(buildingRows(wrapper).map((r) => r[1])).toEqual([
				"0",
				"0",
				"0",
			]);
		});

		it("still renders when FIO storage fails to load", async () => {
			const { wrapper } = await mountCart({ fioFails: true });

			expect(wrapper.text()).not.toContain(
				"plan.tools.construction_cart.table.built"
			);
			expect(materialSums(wrapper)).toEqual(["14", "14", "100"]);
		});
	});
});
