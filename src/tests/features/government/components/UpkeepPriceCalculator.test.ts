import { afterEach, describe, it, expect, vi } from "vitest";
import { h } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";

import { usePlanningStore } from "@/stores/planningStore";
import UpkeepPriceCalculator from "@/features/government/components/UpkeepPriceCalculator.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// lets a test hold back price lookups, to see the calculation running
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
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render(this: { ticker: string }) {
			return h("span", this.ticker);
		},
	},
}));

// no exchange data, materials without a CX price cost 0
const CX_CHEAP = "00000001-0000-4000-8000-000000000000";
const CX_PRICEY = "00000002-0000-4000-8000-000000000000";

const cx = (uuid: string, prices: Record<string, number>) => ({
	uuid,
	cx_name: uuid,
	cx_data: {
		cx_empire: [],
		cx_planets: [],
		ticker_empire: Object.entries(prices).map(([ticker, value]) => ({
			ticker,
			type: "BUY",
			value,
		})),
		ticker_planets: [],
	},
});

async function mountCalculator(cxUuid?: string) {
	const pinia = createPinia();
	usePlanningStore(pinia).setCXs([
		// @ts-expect-error mock data
		cx(CX_CHEAP, { DW: 10, OFF: 20, POW: 50, PK: 5 }),
		// @ts-expect-error mock data
		cx(CX_PRICEY, { DW: 1000 }),
	]);

	const mounted = await mountComponent(
		UpkeepPriceCalculator,
		{ cxUuid },
		{ pinia }
	);
	await waitCalculated(mounted.wrapper);
	return mounted;
}

// the first price lookup preloads the exchanges from IndexedDB
async function waitCalculated(wrapper: VueWrapper) {
	await vi.waitFor(() => expect(wrapper.find("table").exists()).toBe(true));
}

const needButton = (wrapper: VueWrapper, need: string) =>
	wrapper
		.findAllComponents(PButton)
		.find(
			(b) =>
				b.text() === `upkeep_price_calculator.calculator.needs.${need}`
		)!;

/** material, building, price per need, CX price, quantity per day */
const rows = (wrapper: VueWrapper) =>
	tableRows(wrapper).map((r) => [
		r.ticker,
		r.buildingTicker,
		r.pricePerNeed,
		r.cxPrice,
		r.qtyPerDay,
	]);

describe("UpkeepPriceCalculator", () => {
	afterEach(() => (priceGate.wait = undefined));

	it("lists the safety materials cheapest first", async () => {
		const { wrapper } = await mountCalculator(CX_CHEAP);

		// price per need = price * qty per day / need of the building,
		// EMC provides safety and health: its need counts twice (2 * 200)
		expect(rows(wrapper)).toEqual([
			// 5 * 2 / 400
			["PK", "EMC", "0.0250", "5.00  ȼ", "2.00"],
			// 50 * 1 / 1250
			["POW", "SDP", "0.0400", "50.00  ȼ", "1.00"],
			// 50 * 0.4 / 400
			["POW", "EMC", "0.0500", "50.00  ȼ", "0.40"],
			// 10 * 10 / 833.3
			["DW", "SST", "0.1200", "10.00  ȼ", "10.00"],
			// 20 * 10 / 833.3
			["OFF", "SST", "0.2400", "20.00  ȼ", "10.00"],
			// no price, last and in building order
			["SUN", "SST", "-", "-", "2.00"],
			["RAD", "SDP", "-", "-", "0.47"],
			["CCD", "SDP", "-", "-", "0.07"],
			["SUD", "SDP", "-", "-", "0.07"],
			["BND", "EMC", "-", "-", "4.00"],
			["RED", "EMC", "-", "-", "0.07"],
			["BSC", "EMC", "-", "-", "0.07"],
		]);
	});

	it("greys out materials without a price", async () => {
		const { wrapper } = await mountCalculator(CX_CHEAP);

		const greyed = (column: string) =>
			wrapper
				.findAll("tbody tr")
				.map((tr) =>
					tr
						.find(`td[data-col-key=${column}] div`)
						.classes("text-white/40")
				);

		// 5 priced materials, then 7 without
		const expected = [...Array(5).fill(false), ...Array(7).fill(true)];
		expect(greyed("pricePerNeed")).toEqual(expected);
		expect(greyed("cxPrice")).toEqual(expected);
	});

	it("sorts by CX price", async () => {
		const { wrapper } = await mountCalculator(CX_CHEAP);

		// naive-ui sorts descending first
		await wrapper.find("th[data-col-key=cxPrice]").trigger("click");

		expect(rows(wrapper).map((r) => r[3])).toEqual([
			"50.00  ȼ",
			"50.00  ȼ",
			"20.00  ȼ",
			"10.00  ȼ",
			"5.00  ȼ",
			...Array(7).fill("-"),
		]);
	});

	it("switches between need types", async () => {
		const { wrapper } = await mountCalculator(CX_CHEAP);

		expect(
			wrapper.findAllComponents(PButton).map((b) => b.props("type"))
		).toEqual([
			"primary",
			"secondary",
			"secondary",
			"secondary",
			"secondary",
		]);

		await needButton(wrapper, "health").trigger("click");

		expect(needButton(wrapper, "health").props("type")).toBe("primary");
		expect(needButton(wrapper, "safety").props("type")).toBe("secondary");
		// the priced health materials
		expect(rows(wrapper).slice(0, 5)).toEqual([
			// HOS: 5 * 2 / 833.33
			["PK", "HOS", "0.0120", "5.00  ȼ", "2.00"],
			// EMC: 5 * 2 / (2 * 200)
			["PK", "EMC", "0.0250", "5.00  ȼ", "2.00"],
			// EMC: 50 * 0.4 / 400
			["POW", "EMC", "0.0500", "50.00  ȼ", "0.40"],
			// WCE, health and comfort: 10 * 6 / (2 * 166.67)
			["DW", "WCE", "0.1800", "10.00  ȼ", "6.00"],
			// INF: 20 * 10 / 833.33
			["OFF", "INF", "0.2400", "20.00  ȼ", "10.00"],
		]);
		expect(
			rows(wrapper)
				.slice(5)
				.map((r) => r[2])
		).toEqual(Array(15).fill("-"));
	});

	it.each([
		// 4DA: 50 * 2 / 833.3, below WCE: 10 * 6 / (2 * 166.7) = 0.1800
		["comfort", ["POW", "4DA", "0.1200"]],
		// VRT: 50 * 1.4 / 833.3, below ACA: 10 * 10 / (2 * 166.7) = 0.2999
		["culture", ["POW", "VRT", "0.0840"]],
		// PBH, culture and education: 20 * 10 / (2 * 166.7)
		["education", ["OFF", "PBH", "0.5999"]],
	])(
		"lists the cheapest %s material",
		async (need, [ticker, building, pricePerNeed]) => {
			const { wrapper } = await mountCalculator(CX_CHEAP);

			await needButton(wrapper, need).trigger("click");

			expect(rows(wrapper).at(0)!.slice(0, 3)).toEqual([
				ticker,
				building,
				pricePerNeed,
			]);
		}
	);

	it("recalculates for another CX", async () => {
		const { wrapper, setProps } = await mountCalculator(CX_CHEAP);

		await setProps({ cxUuid: CX_PRICEY });
		await waitCalculated(wrapper);

		// only DW has a price: 1000 * 10 / 833.3
		expect(rows(wrapper).map((r) => r[2])).toEqual([
			"12.0005",
			...Array(11).fill("-"),
		]);
	});

	it("keeps the selected need type when recalculating", async () => {
		const { wrapper, setProps } = await mountCalculator(CX_CHEAP);

		await needButton(wrapper, "health").trigger("click");
		await setProps({ cxUuid: CX_PRICEY });
		await waitCalculated(wrapper);

		expect(needButton(wrapper, "health").props("type")).toBe("primary");
		// WCE: 1000 * 6 / (2 * 166.67)
		expect(rows(wrapper).at(0)!.slice(0, 3)).toEqual([
			"DW",
			"WCE",
			"17.9996",
		]);
	});

	it("shows a progress bar while calculating", async () => {
		let release: () => void = () => {};
		priceGate.wait = new Promise((resolve) => (release = resolve));
		const pinia = createPinia();
		// @ts-expect-error mock data
		usePlanningStore(pinia).setCXs([cx(CX_CHEAP, { DW: 10 })]);

		const { wrapper } = await mountComponent(
			UpkeepPriceCalculator,
			{ cxUuid: CX_CHEAP },
			{ pinia }
		);

		expect(wrapper.text()).toContain(
			"upkeep_price_calculator.calculator.calculating"
		);
		expect(wrapper.find("table").exists()).toBe(false);

		priceGate.wait = undefined;
		release();
		await waitCalculated(wrapper);
		await flushPromises();
		expect(wrapper.text()).not.toContain(
			"upkeep_price_calculator.calculator.calculating"
		);
	});

	it("shows the progress bar again while recalculating", async () => {
		const { wrapper, setProps } = await mountCalculator(CX_CHEAP);

		let release: () => void = () => {};
		priceGate.wait = new Promise((resolve) => (release = resolve));
		await setProps({ cxUuid: CX_PRICEY });

		expect(wrapper.find("table").exists()).toBe(false);

		priceGate.wait = undefined;
		release();
		await waitCalculated(wrapper);
		expect(rows(wrapper).at(0)![3]).toBe("1,000.00  ȼ");
	});

	it("hides the progress bar when a price lookup fails", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		priceGate.wait = Promise.reject(new Error("prices unavailable"));
		const pinia = createPinia();
		// @ts-expect-error mock data
		usePlanningStore(pinia).setCXs([cx(CX_CHEAP, { DW: 10 })]);

		const { wrapper } = await mountComponent(
			UpkeepPriceCalculator,
			{ cxUuid: CX_CHEAP },
			{ pinia }
		);
		await waitCalculated(wrapper);

		expect(wrapper.text()).not.toContain(
			"upkeep_price_calculator.calculator.calculating"
		);
		expect(tableRows(wrapper)).toHaveLength(0);
		expect(error).toHaveBeenCalledWith(new Error("prices unavailable"));
		error.mockRestore();
	});

	it("lists every material without a price without a CX", async () => {
		const { wrapper } = await mountCalculator();

		expect(rows(wrapper)).toHaveLength(12);
		expect(rows(wrapper).every((r) => r[2] === "-" && r[3] === "-")).toBe(
			true
		);
	});
});
