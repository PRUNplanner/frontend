import { describe, it, expect, vi } from "vitest";
import { h } from "vue";

import CXFixedPriceTable from "@/features/exchanges/components/CXFixedPriceTable.vue";
import { PButton, PInputNumber, PSelect, PTag } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type { CXDataTickerOption } from "@/features/api/schemas/cxData.schemas";
import type { IMaterialCOGM } from "@/features/exchanges/useExchangePlanData.types";
import type { IPriceSource } from "@/features/cx/priceBook";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: (ctx: { ticker: string }) => h("span", ctx.ticker),
	},
}));
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
	props: Record<string, unknown> = {}
) {
	const emitted: CXDataTickerOption[][] = [];
	const mounted = await mountComponent(CXFixedPriceTable, {
		prices,
		marketPrice,
		location: "exchanges_view",
		...props,
		"onUpdate:prices": async (value: CXDataTickerOption[]) => {
			emitted.push(value);
			await mounted.setProps({ prices: value });
		},
	});
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
		const table = await mountTable([{ type: "BOTH", ticker: "H2O", value: 9 }]);
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
		const table = await mountTable([{ type: "BOTH", ticker: "H2O", value: 9 }]);
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
		const table = await mountTable([{ type: "BOTH", ticker: "RAT", value: 75 }]);
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
		expect(table.wrapper.find("input[aria-label='exchanges.fixed.search']").exists()).toBe(true);
		const few = await mountTable(many.slice(0, 9));
		expect(few.wrapper.find("input[aria-label='exchanges.fixed.search']").exists()).toBe(false);
	});
});
