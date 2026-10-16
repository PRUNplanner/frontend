import { describe, it, expect, vi } from "vitest";

import CXPriceLadder from "@/features/exchanges/components/CXPriceLadder.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";

// FE has no asks on NC1, Universe trades it at 71.53
const exchanges: Record<string, object> = {
	"FE.NC1": { vwap_7d: 60, vwap_30d: 62, ask: 0, bid: 58 },
	"FE.UNIVERSE": { vwap_7d: 70, vwap_30d: 71.53, ask: 0, bid: 0 },
};
vi.mock("@/database/services/useExchangeData", () => ({
	useExchangeData: () => ({
		getExchangeTickerLoaded: (id: string) => {
			if (!exchanges[id]) throw new Error(`no ${id}`);
			return exchanges[id];
		},
	}),
}));

const askNC1: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "NC1_ASK" }],
	cx_planets: [],
	ticker_empire: [],
	ticker_planets: [],
};

async function mountLadder(cxData: CXData, onOpen = vi.fn()) {
	const { wrapper } = await mountComponent(CXPriceLadder, {
		cxData,
		planet: "A",
		ticker: "FE",
		type: "BUY",
		onOpen,
	});
	const rows = wrapper.findAll("tr").map((tr) => ({
		label: tr.find("td").text(),
		value: tr.findAll("td")[1].text(),
		winner: tr.attributes("data-winner") === "true",
		struck: tr.findAll("td")[1].classes().includes("line-through"),
		amber: tr.classes().includes("text-warning"),
	}));
	return { wrapper, rows };
}

describe("CXPriceLadder", () => {
	it("shows an exchange rule without a price as the amber winner", async () => {
		const { rows } = await mountLadder(askNC1);

		expect(rows.map((r) => r.value)).toEqual([
			"–",
			"–",
			"–",
			"exchanges.ladder.no_price",
			"71.53",
		]);
		expect(rows[3]).toMatchObject({ winner: true, amber: true });
		// Universe is below the winner
		expect(rows[4]).toMatchObject({ winner: false, struck: true });
	});

	it("strikes the levels below a fixed price", async () => {
		const { rows } = await mountLadder({
			...askNC1,
			ticker_empire: [{ type: "BUY", ticker: "FE", value: 50 }],
		});

		expect(rows[1]).toMatchObject({ value: "50.00", winner: true });
		expect(rows[3].struck).toBe(true);
		expect(rows[4].struck).toBe(true);
		expect(rows.some((r) => r.amber)).toBe(false);
	});

	it("opens the scope of the winning rule", async () => {
		const onOpen = vi.fn();
		const { wrapper } = await mountLadder(
			{
				...askNC1,
				cx_planets: [
					{
						planet: "A",
						preferences: [{ type: "BUY", exchange: "NC1_BID" }],
					},
				],
			},
			onOpen
		);

		await wrapper.find("button").trigger("click");
		expect(onOpen).toHaveBeenCalledWith("A");
	});

	it("opens all planets for the Universe fallback", async () => {
		const onOpen = vi.fn();
		const { wrapper, rows } = await mountLadder(
			{ ...askNC1, cx_empire: [] },
			onOpen
		);

		expect(rows[4]).toMatchObject({ value: "71.53", winner: true });
		await wrapper.find("button").trigger("click");
		expect(onOpen).toHaveBeenCalledWith("all");
	});
});
