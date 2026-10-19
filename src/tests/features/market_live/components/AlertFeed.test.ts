import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import AlertFeed from "@/features/market_live/components/AlertFeed.vue";
import { mountComponent } from "@/tests/mountComponent";
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type {
	MarketEvent,
	TriggerContext,
} from "@/features/market_live/cxDetectors.types";
import type { CXDataPoint } from "@/features/market_live/cxExchange.types";

// the detail has its own test
vi.mock("@/features/market_live/components/AlertFeedDetail.vue", () => ({
	default: {
		name: "AlertFeedDetail",
		props: ["data"],
		render: (ctx: { data: CXDataPoint }) => h("span", ctx.data.ticker),
	},
}));

const dataPoint = (extra: Record<string, number | string> = {}) =>
	({
		ticker: "RAT.NC1",
		material_ticker: "RAT",
		exchange_code: "NC1",
		price: 120,
		...extra,
	}) as CXDataPoint;

const trigger = (extra: Partial<TriggerContext> = {}): TriggerContext => ({
	field: "price",
	operator: "gt",
	currentValue: 120,
	targetValue: 100,
	comparisonType: "static",
	thresholdReached: 100,
	...extra,
});

const event = (
	id: string,
	extra: Partial<MarketEvent> = {},
	metadata: Partial<MarketEvent["metadata"]> = {}
): MarketEvent => ({
	id,
	ticker: "RAT.NC1",
	severity: "LOW",
	message: "",
	timestamp: new Date(2026, 0, 2, 13, 5, 9),
	metadata: {
		configId: "c1",
		name: "Cheap rations",
		triggers: [trigger()],
		data: dataPoint(),
		...metadata,
	},
	...extra,
});

async function mountFeed(eventLog: MarketEvent[]) {
	const { wrapper } = await mountComponent(AlertFeed, { eventLog });
	return wrapper;
}

// one event's row: its first grid
const rowOf = (wrapper: VueWrapper, i = 0) =>
	wrapper.findAll(".group")[i].find(".grid");
// the chips of the logic column
const chips = (wrapper: VueWrapper, i = 0) =>
	rowOf(wrapper, i)!
		.findAll(".font-mono.flex-wrap > div")
		.map((c) => c.findAll("span").map((s) => s.text()));
// the values column, one line per numeric trigger
const values = (wrapper: VueWrapper, i = 0) =>
	rowOf(wrapper, i)!
		.find(".col-span-3")
		.findAll(":scope > div")
		.map((d) => d.text().replace(/\s+/g, " "));

describe("AlertFeed", () => {
	it("waits for events", async () => {
		const wrapper = await mountFeed([]);

		expect(wrapper.text()).toContain(
			"market_live.components.alert_feed.waiting"
		);
		expect(wrapper.findAll(".group")).toHaveLength(0);
	});

	it("lists the heading columns and hides the hint with events", async () => {
		const wrapper = await mountFeed([event("e1")]);

		expect(wrapper.text()).toContain(
			"market_live.components.alert_feed.table.ticker_alert"
		);
		expect(wrapper.text()).toContain(
			"market_live.components.alert_feed.table.logic"
		);
		expect(wrapper.text()).not.toContain(
			"market_live.components.alert_feed.waiting"
		);
	});

	it("shows ticker, alert name, severity and time of an event", async () => {
		const wrapper = await mountFeed([event("e1")]);
		const row = rowOf(wrapper)!;

		expect(row.find("p.font-bold").text()).toBe("RAT.NC1");
		expect(row.find("p.uppercase").text()).toBe("Cheap rations");
		expect(row.text()).toContain("market_live.severity_type.LOW");
		expect(row.text()).toContain("13:05:09");
	});

	it.each([
		["LOW", "border-transparent", "bg-gray-dark"],
		["MEDIUM", "border-warning", "bg-warning/10"],
		["HIGH", "border-negative", "bg-negative"],
	] as const)("marks %s severity", async (severity, border, badge) => {
		const wrapper = await mountFeed([event("e1", { severity })]);
		const row = rowOf(wrapper)!;

		expect(row.classes()).toContain(border);
		expect(row.classes().includes("bg-negative/20")).toBe(
			severity === "HIGH"
		);
		expect(row.find("span.rounded").classes()).toContain(badge);
		expect(row.text()).toContain(`market_live.severity_type.${severity}`);
	});

	it("gives every event its own row and detail", async () => {
		const wrapper = await mountFeed([
			event("e1"),
			event(
				"e2",
				{ ticker: "DW.NC1" },
				{ data: dataPoint({ ticker: "DW.NC1" }) }
			),
		]);

		expect(wrapper.findAll(".group")).toHaveLength(2);
		expect(
			wrapper
				.findAllComponents({ name: "AlertFeedDetail" })
				.map((d) => d.props("data").ticker)
		).toEqual(["RAT.NC1", "DW.NC1"]);
	});

	describe("logic column", () => {
		it("shows the field, current value, operator and target", async () => {
			const wrapper = await mountFeed([event("e1")]);

			expect(chips(wrapper)).toEqual([
				[
					"price",
					formatNumber(120, 2, true),
					">",
					formatNumber(100, 2, true),
				],
			]);
		});

		it.each([
			["gt", ">"],
			["lt", "<"],
			["eq", "="],
			["neq", "≠"],
			["matches", "≈"],
			// not in the map: shown as it is
			["between", "between"],
		])("draws operator %s as %s", async (operator, symbol) => {
			const wrapper = await mountFeed([
				event("e1", {}, { triggers: [trigger({ operator })] }),
			]);

			expect(chips(wrapper)[0][2]).toBe(symbol);
		});

		it("shows string values as they are", async () => {
			const wrapper = await mountFeed([
				event(
					"e1",
					{},
					{
						triggers: [
							trigger({
								field: "exchange_code",
								operator: "matches",
								currentValue: "NC1",
								targetValue: "N",
							}),
						],
					}
				),
			]);

			expect(chips(wrapper)[0]).toEqual([
				"exchange_code",
				"NC1",
				"≈",
				"N",
			]);
		});

		it.each([
			["static", []],
			["previous", ["PREVIOUS"]],
			["previous_pct", ["RELATIVE CHANGE"]],
		] as const)("tags a %s comparison", async (comparisonType, tag) => {
			const wrapper = await mountFeed([
				event("e1", {}, { triggers: [trigger({ comparisonType })] }),
			]);

			expect(chips(wrapper)[0].slice(4)).toEqual(tag);
		});

		it("shows a chip per trigger", async () => {
			const wrapper = await mountFeed([
				event(
					"e1",
					{},
					{
						triggers: [
							trigger(),
							trigger({
								field: "bid",
								operator: "lt",
								currentValue: 1,
							}),
						],
						data: dataPoint({ bid: 1 }),
					}
				),
			]);

			expect(chips(wrapper).map((c) => c[0])).toEqual(["price", "bid"]);
		});
	});

	describe("values column", () => {
		it("shows the value green above its target, red below", async () => {
			const wrapper = await mountFeed([
				event(
					"e1",
					{},
					{
						triggers: [
							trigger(),
							trigger({
								field: "bid",
								currentValue: 1,
								targetValue: 2,
							}),
						],
						data: dataPoint({ bid: 1 }),
					}
				),
			]);

			const lines = rowOf(wrapper)!
				.find(".col-span-3")
				.findAll(":scope > div");
			expect(lines.map((l) => l.classes())).toEqual([
				["text-positive"],
				["text-negative"],
			]);
			expect(values(wrapper)).toEqual([
				formatNumber(120, 2, true),
				formatNumber(1, 2, true),
			]);
		});

		it("shows the previous value before the arrow", async () => {
			const wrapper = await mountFeed([
				event("e1", {}, { prevData: dataPoint({ price: 100 }) }),
			]);

			expect(values(wrapper)).toEqual([
				`${formatNumber(100, 2, true)} → ${formatNumber(120, 2, true)}`,
			]);
		});

		it("adds a % to the values of a percent field", async () => {
			const wrapper = await mountFeed([
				event(
					"e1",
					{},
					{
						triggers: [
							trigger({
								field: "price_change_pct",
								currentValue: 5,
								targetValue: 3,
							}),
						],
						data: dataPoint({ price_change_pct: 5 }),
						prevData: dataPoint({ price_change_pct: 2 }),
					}
				),
			]);

			expect(values(wrapper)).toEqual([
				`${formatNumber(2, 2, true)} % → ${formatNumber(5, 2, true)} %`,
			]);
		});

		it("leaves out values that aren't numbers", async () => {
			const wrapper = await mountFeed([
				event(
					"e1",
					{},
					{
						triggers: [trigger({ field: "exchange_code" })],
						data: dataPoint({ exchange_code: "NC1" }),
					}
				),
			]);

			expect(values(wrapper)).toEqual([]);
		});
	});
});
