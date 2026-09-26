import { describe, it, expect, beforeAll } from "vitest";
import { defineComponent, h, Suspense } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useExchangeData } from "@/database/services/useExchangeData";
import { useMaterialData } from "@/database/services/useMaterialData";
import MaterialCXOverviewTable from "@/features/cx/components/MaterialCXOverviewTable.vue";
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import { IMaterialExchangeOverview } from "@/database/services/useExchangeData.types";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

const TICKER = "CL";

/** Mounts the async-setup component inside Suspense */
async function mountTable(daily?: number) {
	const { getMaterialExchangeOverview } = useExchangeData();
	const overviewData: IMaterialExchangeOverview =
		await getMaterialExchangeOverview(TICKER);

	const wrapper = mount(
		defineComponent({
			render: () =>
				h(Suspense, null, {
					default: () =>
						h(MaterialCXOverviewTable, {
							ticker: TICKER,
							daily,
							overviewData,
						}),
				}),
		}),
		{ global: { mocks: { $t: (key: string) => key } } }
	);
	await flushPromises();

	return { wrapper, overviewData };
}

/** Market share cells of the 7d / 30d traded volume row */
function shareCells(
	wrapper: Awaited<ReturnType<typeof mountTable>>["wrapper"],
	label: "terms.7d" | "terms.30d"
) {
	// vwap rows carry the same labels, traded volume follows its header
	const rows = wrapper.findAll("tr");
	const header = rows.findIndex(
		(tr) => tr.text() === "cx_info_table.traded_volume"
	);
	expect(header).toBeGreaterThan(-1);
	const row = rows
		.slice(header + 1)
		.find((tr) => tr.findAll("td")[0]?.text().startsWith(label));
	expect(row).toBeDefined();
	return row!
		.findAll("td")
		.slice(1)
		.map((td) => td.find("div"));
}

describe("MaterialCXOverviewTable", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	it("shows no market share without a daily amount", async () => {
		const { wrapper } = await mountTable();

		expect(shareCells(wrapper, "terms.7d").every((d) => !d.exists())).toBe(
			true
		);
	});

	it("shows the daily amount's share of traded volume per exchange", async () => {
		const { exchangeTypesArray } = useExchangeData();
		// negative deltas (consumption) count the same as production
		const daily = -250;
		const { wrapper, overviewData } = await mountTable(daily);

		for (const [label, days, key] of [
			["terms.7d", 7, "sum_traded_7d"],
			["terms.30d", 30, "sum_traded_30d"],
		] as const) {
			const cells = shareCells(wrapper, label);

			exchangeTypesArray.forEach((cx, i) => {
				const traded = overviewData[key][cx];
				const share = traded > 0 ? ((250 * days) / traded) * 100 : 0;
				const cell = cells[i];

				expect(cell.text()).toBe(
					share ? `${formatNumber(share)}%` : "—"
				);
				expect(cell.classes()).toContain(
					share >= 5 ? "text-negative" : "text-white/50"
				);
			});
		}
	});

	it("flags a share of 5% and above", async () => {
		const { exchangeTypesArray } = useExchangeData();
		const { overviewData: data } = await mountTable();
		const cx = exchangeTypesArray.find((c) => data.sum_traded_7d[c] > 0)!;

		// exactly 5% of the 7d volume, per day
		const { wrapper } = await mountTable(
			(data.sum_traded_7d[cx] * 0.05) / 7
		);
		const cell = shareCells(wrapper, "terms.7d")[
			exchangeTypesArray.indexOf(cx)
		];

		expect(cell.text()).toBe(`${formatNumber(5)}%`);
		expect(cell.classes()).toContain("text-negative");
	});
});
