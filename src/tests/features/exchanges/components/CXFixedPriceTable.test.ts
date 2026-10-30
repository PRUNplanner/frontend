import { describe, it, expect, vi } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import CXFixedPriceTable from "@/features/exchanges/components/CXFixedPriceTable.vue";
import { PButton, PInputNumber, PSelect, PTag } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type { CXDataTickerOption } from "@/features/api/schemas/cxData.schemas";
import type { IMaterialCOGM } from "@/features/exchanges/useExchangePlanData.types";
import type { IPriceSource } from "@/features/cx/priceBook";
import type { PSelectOption } from "@/ui/ui.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
vi.mock(
	"@/features/material_tile/components/MaterialTile.vue",
	async () => (await import("@/tests/stubs")).materialTile
);
vi.mock("@/database/services/useMaterialData", async () => {
	const { ref } = await import("vue");
	return {
		useMaterialData: () => ({
			materialSelectOptions: ref(
				["DW", "GRN", "H2O", "RAT"].map((t) => ({ label: t, value: t }))
			),
		}),
	};
});

const source: IPriceSource = {
	level: "empire_exchange",
	exchange: "NC1",
	key: "vwap_30d",
	zero: false,
	volume: "NC1",
};
const marketPrice = () => ({ price: 100, source });

const cogm = (ticker: string, value: number): IMaterialCOGM => ({
	ticker,
	value,
	entries: [{ planUuid: "p1", planName: "Montem", planet: "OT-580b", value }],
});

async function mountTable(
	prices: CXDataTickerOption[],
	props: Record<string, unknown> = {},
	options: { attach?: boolean } = {}
) {
	const emitted: CXDataTickerOption[][] = [];
	const mounted = await mountComponent(
		CXFixedPriceTable,
		{
			prices,
			marketPrice,
			location: "exchanges_view",
			...props,
			"onUpdate:prices": async (value: CXDataTickerOption[]) => {
				emitted.push(value);
				await mounted.setProps({ prices: value });
			},
		},
		options
	);
	const inputs = () => mounted.wrapper.findAllComponents(PInputNumber);
	const button = (text: string) =>
		mounted.wrapper
			.findAllComponents(PButton)
			.find((b) => b.text().trim() === text);
	return { ...mounted, emitted, inputs, button };
}

describe("CXFixedPriceTable", () => {
	it("shows one row per material with the market and % difference", async () => {
		const table = await mountTable([
			{ type: "BUY", ticker: "RAT", value: 75 },
			{ type: "SELL", ticker: "RAT", value: 130 },
		]);
		const rows = table.wrapper.findAll("tbody tr");
		expect(rows).toHaveLength(1);
		expect(rows[0].text()).toContain("100.00");
		expect(rows[0].text()).toContain("-25 %");
		expect(table.inputs().map((i) => i.props("value"))).toEqual([75, 130]);
	});

	it("keeps the stored shape on edits", async () => {
		const table = await mountTable([
			{ type: "BOTH", ticker: "H2O", value: 9 },
		]);
		table.inputs()[1].vm.$emit("update:value", 12);
		await table.setProps({});
		expect(table.emitted.at(-1)).toEqual([
			{ type: "BUY", ticker: "H2O", value: 9 },
			{ type: "SELL", ticker: "H2O", value: 12 },
		]);
		table.inputs()[0].vm.$emit("update:value", null);
		await table.setProps({});
		expect(table.emitted.at(-1)).toEqual([
			{ type: "SELL", ticker: "H2O", value: 12 },
		]);
	});

	it("adds an empty row that stores nothing until a price is set", async () => {
		const table = await mountTable([]);
		table.wrapper.findComponent(PSelect).vm.$emit("update:value", "GRN");
		await table.setProps({});
		await table.button("exchanges.fixed.add")!.trigger("click");
		await table.setProps({});

		expect(table.wrapper.text()).toContain("GRN");
		expect(table.emitted.at(-1) ?? []).toEqual([]);

		table.inputs()[0].vm.$emit("update:value", 5);
		await table.setProps({});
		table.inputs()[1].vm.$emit("update:value", 5);
		await table.setProps({});
		expect(table.emitted.at(-1)).toEqual([
			{ type: "BOTH", ticker: "GRN", value: 5 },
		]);
	});

	it("removes a row", async () => {
		const table = await mountTable([
			{ type: "BOTH", ticker: "H2O", value: 9 },
		]);
		await table.button("")!.trigger("click");
		expect(table.emitted.at(-1)).toEqual([]);
	});

	it("uses the lowest COGM as buy price and marks it in use", async () => {
		const table = await mountTable(
			[{ type: "BOTH", ticker: "RAT", value: 75 }],
			{ cogms: new Map([["RAT", cogm("RAT", 64.4321)]]) }
		);
		expect(table.wrapper.text()).toContain("64.43");
		expect(table.wrapper.text()).toContain("Montem");

		await table.button("exchanges.fixed.use")!.trigger("click");
		await table.setProps({});
		expect(table.emitted.at(-1)).toEqual([
			{ type: "BUY", ticker: "RAT", value: 64.43 },
			{ type: "SELL", ticker: "RAT", value: 75 },
		]);
		expect(trackEvent).toHaveBeenCalledWith("exchange:use_cogm", {
			location: "exchanges_view",
			material_ticker: "RAT",
		});
		expect(
			table.wrapper
				.findAllComponents(PTag)
				.some((t) => t.props("value") === "exchanges.fixed.in_use")
		).toBe(true);
	});

	it("hides the COGM column without COGMs", async () => {
		const table = await mountTable([
			{ type: "BOTH", ticker: "RAT", value: 75 },
		]);
		expect(table.wrapper.text()).not.toContain("exchanges.fixed.cogm");
	});

	it("shows inherited prices muted and overrides them", async () => {
		const table = await mountTable([], {
			inherited: [{ type: "BUY", ticker: "RAT", value: 75 }],
		});
		expect(table.wrapper.text()).toContain("exchanges.fixed.inherited");
		await table.button("exchanges.fixed.override")!.trigger("click");
		await table.setProps({});
		expect(table.emitted.at(-1)).toEqual([
			{ type: "BUY", ticker: "RAT", value: 75 },
		]);
		expect(table.wrapper.text()).not.toContain("exchanges.fixed.inherited");
	});

	it("offers search and sort from 10 rows", async () => {
		const many = Array.from({ length: 10 }, (_, i) => ({
			type: "BOTH" as const,
			ticker: `M${String(i).padStart(2, "0")}`,
			value: i,
		}));
		const table = await mountTable(many);
		expect(
			table.wrapper
				.find("input[aria-label='exchanges.fixed.search']")
				.exists()
		).toBe(true);
		const few = await mountTable(many.slice(0, 9));
		expect(
			few.wrapper
				.find("input[aria-label='exchanges.fixed.search']")
				.exists()
		).toBe(false);
	});

	it("clears a side by emptying its input", async () => {
		const table = await mountTable([
			{ type: "BOTH", ticker: "H2O", value: 9 },
		]);

		table.inputs()[1].vm.$emit("update:value", null);
		await table.setProps({});

		expect(table.emitted.at(-1)).toEqual([
			{ type: "BUY", ticker: "H2O", value: 9 },
		]);
	});

	it("keeps a row with both sides cleared in its place", async () => {
		const table = await mountTable([
			{ type: "BUY", ticker: "DW", value: 50 },
			{ type: "BUY", ticker: "H2O", value: 9 },
			{ type: "BUY", ticker: "RAT", value: 75 },
		]);

		table.inputs()[2].vm.$emit("update:value", null);
		await table.setProps({});
		expect(table.emitted.at(-1)).toEqual([
			{ type: "BUY", ticker: "DW", value: 50 },
			{ type: "BUY", ticker: "RAT", value: 75 },
		]);
		expect(table.inputs()).toHaveLength(6);

		table.inputs()[2].vm.$emit("update:value", 10);
		await table.setProps({});
		expect(table.emitted.at(-1)).toEqual([
			{ type: "BUY", ticker: "DW", value: 50 },
			{ type: "BUY", ticker: "H2O", value: 10 },
			{ type: "BUY", ticker: "RAT", value: 75 },
		]);
	});

	it("stores one BOTH again once both sides match", async () => {
		const table = await mountTable([
			{ type: "BOTH", ticker: "H2O", value: 9 },
		]);

		table.inputs()[1].vm.$emit("update:value", 12);
		await table.setProps({});
		table.inputs()[1].vm.$emit("update:value", 9);
		await table.setProps({});
		expect(table.emitted.at(-1)).toEqual([
			{ type: "BOTH", ticker: "H2O", value: 9 },
		]);
	});

	it("shows prices changed elsewhere as stored", async () => {
		const table = await mountTable([
			{ type: "BOTH", ticker: "H2O", value: 9 },
		]);
		table.inputs()[1].vm.$emit("update:value", 12);
		await table.setProps({});

		// e.g. the COGM button sets the buy price
		await table.setProps({
			prices: [
				{ type: "BUY", ticker: "H2O", value: 7 },
				{ type: "SELL", ticker: "H2O", value: 7 },
			],
		});
		table.inputs()[0].vm.$emit("update:value", 8);
		await table.setProps({});
		expect(table.emitted.at(-1)).toEqual([
			{ type: "BUY", ticker: "H2O", value: 8 },
			{ type: "SELL", ticker: "H2O", value: 7 },
		]);
	});

	it("drops an unsaved empty row when the prices are reset from outside", async () => {
		const table = await mountTable([
			{ type: "BUY", ticker: "H2O", value: 9 },
		]);
		table.inputs()[0].vm.$emit("update:value", null);
		await table.setProps({});
		expect(table.inputs()).toHaveLength(2);

		// e.g. Discard restores the saved prices
		await table.setProps({
			prices: [{ type: "BUY", ticker: "RAT", value: 75 }],
		});
		expect(table.inputs()).toHaveLength(2);
		expect(table.wrapper.text()).not.toContain("H2O");
	});

	describe("market column", () => {
		it("signs a fixed price above the market", async () => {
			const table = await mountTable([
				{ type: "BUY", ticker: "RAT", value: 130 },
			]);

			expect(table.wrapper.find("tbody tr").text()).toContain("+30 %");
		});

		it("compares a sell-only row with the sell market", async () => {
			const marketPrice = vi.fn(() => ({ price: 200, source }));
			const table = await mountTable(
				[{ type: "SELL", ticker: "RAT", value: 150 }],
				{ marketPrice }
			);

			expect(marketPrice).toHaveBeenCalledWith("RAT", "SELL");
			expect(table.wrapper.find("tbody tr").text()).toContain("-25 %");
		});

		it("leaves the difference out without a fixed side or market price", async () => {
			const noMarket = await mountTable(
				[{ type: "BUY", ticker: "RAT", value: 5 }],
				{ marketPrice: () => ({ price: 0, source }) }
			);
			expect(noMarket.wrapper.find("tbody tr").text()).not.toContain("%");

			const noFixed = await mountTable([]);
			noFixed.wrapper
				.findComponent(PSelect)
				.vm.$emit("update:value", "GRN");
			await noFixed.setProps({});
			await noFixed.button("exchanges.fixed.add")!.trigger("click");
			expect(noFixed.wrapper.find("tbody tr").text()).not.toContain("%");
		});
	});

	describe("adding", () => {
		it("offers only materials without a row", async () => {
			const table = await mountTable([
				{ type: "BOTH", ticker: "DW", value: 1 },
			]);

			expect(
				table.wrapper
					.findComponent(PSelect)
					.props("options")
					.map((o: PSelectOption) => o.value)
			).toEqual(["GRN", "H2O", "RAT"]);
		});

		it("needs a chosen material", async () => {
			const table = await mountTable([]);

			expect(
				table.button("exchanges.fixed.add")!.attributes("disabled")
			).toBeDefined();
		});

		it("focuses the new row's buy input and resets the select", async () => {
			const table = await mountTable([], {}, { attach: true });
			table.wrapper
				.findComponent(PSelect)
				.vm.$emit("update:value", "GRN");
			await table.setProps({});

			await table.button("exchanges.fixed.add")!.trigger("click");
			await table.setProps({});

			expect(document.activeElement).toBe(
				table.wrapper.find("[data-buy=GRN] input").element
			);
			expect(
				table.wrapper.findComponent(PSelect).props("value")
			).toBeNull();
		});
	});

	describe("long lists", () => {
		// M00..M11 fixed at 100 + 10 * i, the market is 100: M00 is +0 %
		const many = Array.from({ length: 12 }, (_, i) => ({
			type: "BOTH" as const,
			ticker: `M${String(i).padStart(2, "0")}`,
			value: 100 + 10 * (11 - i),
		}));
		const tickers = (wrapper: VueWrapper) =>
			wrapper
				.findAll("tbody tr")
				.map((r) => r.findComponent({ name: "MaterialTile" }).text());

		it("sorts by material, searches case-insensitively", async () => {
			const table = await mountTable(structuredClone(many).reverse());
			expect(tickers(table.wrapper).slice(0, 2)).toEqual(["M00", "M01"]);

			await table.wrapper
				.find("input[aria-label='exchanges.fixed.search']")
				.setValue(" m1 ");

			expect(tickers(table.wrapper)).toEqual(["M10", "M11"]);
		});

		it("sorts by the difference to the market, unknown last", async () => {
			const table = await mountTable(many, {
				marketPrice: (ticker: string) => ({
					price: ticker === "M05" ? 0 : 100,
					source,
				}),
			});

			table.wrapper
				.findAllComponents(PSelect)[0]
				.vm.$emit("update:value", "diff");
			await table.setProps({});

			// M11 is fixed at 100 (+0 %), M00 at 210; M05 has no market price
			expect(tickers(table.wrapper)).toEqual([
				"M11",
				"M10",
				"M09",
				"M08",
				"M07",
				"M06",
				"M04",
				"M03",
				"M02",
				"M01",
				"M00",
				"M05",
			]);
		});
	});

	describe("COGM", () => {
		it("shows the plan count for a COGM made in several plans", async () => {
			const entries = [
				{
					planUuid: "p1",
					planName: "Montem",
					planet: "OT-580b",
					value: 60,
				},
				{
					planUuid: "p2",
					planName: "Other",
					planet: "XY-123a",
					value: 60,
				},
				{
					planUuid: "p2",
					planName: "Other",
					planet: "XY-123a",
					value: 70,
				},
			];
			const table = await mountTable(
				[{ type: "BOTH", ticker: "RAT", value: 75 }],
				{
					cogms: new Map([
						["RAT", { ticker: "RAT", value: 60, entries }],
					]),
				}
			);

			expect(table.wrapper.text()).toContain("exchanges.fixed.made_in");
			expect(table.wrapper.text()).not.toContain("Montem");

			await table.wrapper.find("tbody [tabindex='0']").trigger("focusin");
			const tip = document.body.querySelector("[role=tooltip]")!;
			expect(
				Array.from(tip.children).map((e) =>
					e.textContent?.replace(/\s+/g, " ").trim()
				)
			).toEqual([
				`Montem · OT-580b · ${formatNumber(60)}`,
				`Other · XY-123a · ${formatNumber(60)}`,
				`Other · XY-123a · ${formatNumber(70)}`,
			]);
		});

		it("shows a dash for a material without a COGM", async () => {
			const table = await mountTable(
				[{ type: "BOTH", ticker: "RAT", value: 75 }],
				{ cogms: new Map() }
			);

			expect(table.wrapper.text()).toContain("—");
			expect(table.button("exchanges.fixed.use")).toBeUndefined();
		});
	});

	describe("empty and inherited rows", () => {
		it("explains an empty list across all columns", async () => {
			const table = await mountTable([], { cogms: new Map() });

			const cell = table.wrapper.find("tbody td[colspan]");
			expect(cell.text()).toBe("exchanges.fixed.empty");
			expect(cell.attributes("colspan")).toBe("6");

			const plain = await mountTable([]);
			expect(
				plain.wrapper.find("tbody td[colspan]").attributes("colspan")
			).toBe("5");
		});

		it("shows dashes for the side an inherited price doesn't fix", async () => {
			const table = await mountTable([], {
				cogms: new Map(),
				inherited: [
					{ type: "BUY", ticker: "RAT", value: 75 },
					{ type: "SELL", ticker: "DW", value: 80 },
				],
			});
			const [rat, dw] = table.wrapper.findAll("tbody tr");

			expect(rat.findAll("td").map((td) => td.text())).toEqual([
				"RAT",
				formatNumber(75),
				"—",
				"exchanges.fixed.inherited",
				"exchanges.fixed.override",
			]);
			expect(dw.findAll("td")[1].text()).toBe("—");
			expect(dw.findAll("td")[2].text()).toBe(formatNumber(80));
			expect(rat.find("td[colspan]").attributes("colspan")).toBe("2");
			expect(table.wrapper.text()).not.toContain("exchanges.fixed.empty");
		});

		it("overrides with both sides of the inherited price", async () => {
			const table = await mountTable([], {
				inherited: [
					{ type: "BUY", ticker: "RAT", value: 75 },
					{ type: "SELL", ticker: "RAT", value: 90 },
				],
			});

			await table.button("exchanges.fixed.override")!.trigger("click");

			expect(table.emitted.at(-1)).toEqual([
				{ type: "BUY", ticker: "RAT", value: 75 },
				{ type: "SELL", ticker: "RAT", value: 90 },
			]);
		});
	});
});
