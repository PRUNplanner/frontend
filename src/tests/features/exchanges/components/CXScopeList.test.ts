import { describe, it, expect, vi } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import CXScopeList from "@/features/exchanges/components/CXScopeList.vue";
import { PSelect, PTag } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";
import type { IExchangeNote } from "@/features/exchanges/exchangeNotes.util";
import type { PSelectOption } from "@/ui/ui.types";

vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => ({ planetName: (id: string) => `Planet ${id}` }),
}));

const plan = (planet: string) => ({
	uuid: `plan-${planet}`,
	plan_name: planet,
	planet_natural_id: planet,
});

// two empires use it; E3 doesn't
const empires = [
	{ uuid: "E1", empire_name: "Sky", plans: [plan("A"), plan("B")] },
	{ uuid: "E2", empire_name: "Sea", plans: [plan("B"), plan("C")] },
	{ uuid: "E3", empire_name: "Far", plans: [plan("Z")] },
];

const cx = {
	uuid: "cx",
	cx_name: "Home",
	modified_at: "1",
	empires: empires.slice(0, 2),
} as unknown as CX;

const cxData: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "NC1_30D" }],
	cx_planets: [
		{ planet: "A", preferences: [{ type: "BUY", exchange: "NC1_ASK" }] },
		{ planet: "OLD", preferences: [{ type: "BOTH", exchange: "AI1_7D" }] },
	],
	ticker_empire: [
		{ type: "BUY", ticker: "RAT", value: 75 },
		{ type: "SELL", ticker: "RAT", value: 80 },
	],
	ticker_planets: [
		{ planet: "A", preferences: [{ type: "BOTH", ticker: "DW", value: 0 }] },
	],
};

const notes = [
	{ code: "exchange_gap", kind: "warning", scope: "A" },
	{ code: "fixed_zero", kind: "info", scope: "A" },
] as IExchangeNote[];

async function mountList(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(CXScopeList, {
		scope: undefined,
		includeOthers: false,
		cx,
		cxData,
		notes,
		plans: ["A", "B", "C", "Z"].map(plan),
		empires,
		...props,
	});
	return wrapper;
}

// the list as text lines: headings and planet buttons
const lines = (wrapper: VueWrapper) =>
	wrapper
		.findAll("h3, h4, nav > div button")
		.map((e) => e.text())
		.filter(Boolean);

describe("CXScopeList", () => {
	it("groups the planets", async () => {
		const wrapper = await mountList();

		expect(lines(wrapper)).toEqual([
			expect.stringContaining("exchanges.scopes.overview"),
			expect.stringContaining("exchanges.scopes.all"),
			"exchanges.scopes.own",
			"Planet A2",
			"exchanges.scopes.inherit",
			// grouped by empire, as two empires use it
			"Sky",
			"Planet B",
			"Sea",
			"Planet C",
			"exchanges.scopes.unplanned",
			"Planet OLD1",
		]);
	});

	it("counts rules and marks scopes with warnings", async () => {
		const wrapper = await mountList();
		const tags = wrapper
			.findAllComponents(PTag)
			.map((t) => [t.props("value"), t.props("type")]);

		expect(tags).toEqual([
			// notes
			["2", "warning"],
			// one exchange rule, one fixed price row (a BUY + SELL pair)
			["2", "secondary"],
			["2", "warning"],
			["1", "secondary"],
		]);
	});

	it("opens a scope", async () => {
		const onScope = vi.fn();
		const wrapper = await mountList({ "onUpdate:scope": onScope });

		await wrapper
			.findAll("button")
			.find((b) => b.text() === "Planet B")!
			.trigger("click");

		expect(onScope).toHaveBeenCalledWith("B");
	});

	it("deletes the rules of a planet without a plan", async () => {
		const onDelete = vi.fn();
		const wrapper = await mountList({ onDelete });

		await wrapper
			.find("[aria-label='exchanges.scopes.delete']")
			.trigger("click");

		expect(onDelete).toHaveBeenCalledWith("OLD");
	});

	it("shows other empires' planets on request", async () => {
		const onToggle = vi.fn();
		const wrapper = await mountList({ "onUpdate:includeOthers": onToggle });
		expect(lines(wrapper)).not.toContain("Planet Z");

		await wrapper
			.findAll("button")
			.find((b) => b.text() === "exchanges.scopes.show_others")!
			.trigger("click");
		expect(onToggle).toHaveBeenCalledWith(true);

		const shown = await mountList({ includeOthers: true });
		expect(lines(shown)).toContain("Planet Z");
	});

	it("offers the scopes as a select for small screens", async () => {
		const onScope = vi.fn();
		const wrapper = await mountList({
			scope: "all",
			"onUpdate:scope": onScope,
		});
		const select = wrapper.findComponent(PSelect);
		const options = select.props("options") as PSelectOption[];

		expect(select.props("value")).toBe("all");
		expect(
			options.map((o) => o.children?.map((c) => c.value) ?? o.value)
		).toEqual(["overview", "all", ["A"], ["B", "C"], ["OLD"]]);

		select.vm.$emit("update:value", "B");
		expect(onScope).toHaveBeenCalledWith("B");
		select.vm.$emit("update:value", "overview");
		expect(onScope).toHaveBeenCalledWith(undefined);
	});
});
