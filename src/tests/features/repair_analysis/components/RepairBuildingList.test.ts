import { describe, it, expect, vi } from "vitest";

import RepairBuildingList from "@/features/repair_analysis/components/RepairBuildingList.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import PTag from "@/ui/components/PTag.vue";
import { mountComponent } from "@/tests/mountComponent";
import { repairBuilding } from "@/tests/features/repair_analysis/components/repairFixtures";

import plan from "@/locales/en_US/plan.json";

const frm = repairBuilding();
const ext = repairBuilding({ ticker: "EXT", name: "Extractor", amount: 1 });

async function mountList(props: Record<string, unknown> = {}) {
	const handlers = { onSelect: vi.fn(), onInterval: vi.fn(), onReset: vi.fn() };
	const mounted = await mountComponent(
		RepairBuildingList,
		{
			buildings: [frm, ext],
			intervals: { FRM: frm.best, EXT: ext.range[1] + 20 },
			selected: "FRM",
			onSelect: handlers.onSelect,
			"onUpdate:interval": handlers.onInterval,
			onReset: handlers.onReset,
			...props,
		},
		{ messages: { plan } }
	);
	return { ...mounted, ...handlers };
}

describe("RepairBuildingList", () => {
	it("lists every type with its best day, good range and profit", async () => {
		const { wrapper } = await mountList();
		const rows = wrapper.findAll("[data-testid=repair-building-row]");

		expect(rows).toHaveLength(2);
		expect(rows[0].text()).toContain("2× FRM");
		expect(rows[0].text()).toContain("Farm");
		expect(rows[0].text().replace(/\s+/g, " ")).toContain(
			`${frm.best} d (${frm.range[0]}–${frm.range[1]})`
		);
	});

	it("marks the selected row and selects another", async () => {
		const { wrapper, onSelect } = await mountList();
		const [first, second] = wrapper.findAll("button[aria-pressed]");

		expect(first.attributes("aria-pressed")).toBe("true");
		expect(second.attributes("aria-pressed")).toBe("false");
		expect(
			wrapper.findAll("[data-testid=repair-building-row]")[0].classes()
		).toContain("bg-selected");

		await second.trigger("click");
		expect(onSelect).toHaveBeenCalledWith("EXT");
	});

	it("warns on an interval outside the good range", async () => {
		const { wrapper } = await mountList();
		const [inRange, outside] = wrapper.findAllComponents(PInputNumber);

		expect(inRange.props("status")).toBeUndefined();
		expect(outside.props("status")).toBe("warning");
		expect(outside.props("value")).toBe(ext.range[1] + 20);
	});

	it("emits an edited interval and ignores an emptied field", async () => {
		const { wrapper, onInterval } = await mountList();
		const field = wrapper.findAllComponents(PInputNumber)[0];

		field.vm.$emit("update:value", 30);
		field.vm.$emit("update:value", null);

		expect(onInterval).toHaveBeenCalledTimes(1);
		expect(onInterval).toHaveBeenCalledWith("FRM", 30);
	});

	it("resets all intervals", async () => {
		const { wrapper, onReset } = await mountList();

		const reset = wrapper
			.findAll("button")
			.find((b) => b.text() === "Reset all to best")!;
		await reset.trigger("click");
		expect(onReset).toHaveBeenCalled();
	});

	it("draws the good range without a FIO site", async () => {
		const { wrapper } = await mountList();

		expect(wrapper.text()).toContain("Good range");
		expect(wrapper.findAll("svg[role=img]")).toHaveLength(2);
		expect(wrapper.findAllComponents(PTag)).toHaveLength(0);
	});

	it("shows the next due date with a FIO site", async () => {
		const { wrapper } = await mountList({
			due: { FRM: -3, EXT: undefined },
		});

		expect(wrapper.text()).toContain("Next due");
		const tag = wrapper.findComponent(PTag);
		expect(tag.props("type")).toBe("error");
		expect(tag.text()).toBe("Overdue 3 d");
		// no building of the type on the site
		expect(
			wrapper.findAll("[data-testid=repair-building-row]")[1].text()
		).toContain("—");
		expect(wrapper.findAll("svg[role=img]")).toHaveLength(0);
	});

	it.each([
		[-1, "error", "Overdue 1 d"],
		[0, "warning", "Due today"],
		[7, "warning", "Due in 7 d"],
		[8, "secondary", "In 8 d"],
	])("tags %i days as %s", async (days, type, text) => {
		const { wrapper } = await mountList({ due: { FRM: days } });
		const tag = wrapper.findComponent(PTag);

		expect(tag.props("type")).toBe(type);
		expect(tag.text()).toBe(text);
	});

	it("lays the types out as cards on phones", async () => {
		const { wrapper, onSelect } = await mountList({
			cards: true,
			due: { FRM: 5 },
		});
		const cards = wrapper.findAll("[data-testid=repair-building-card]");

		expect(wrapper.find("table").exists()).toBe(false);
		expect(cards).toHaveLength(2);
		expect(cards[0].text()).toContain(`Every ${frm.best} d · best ${frm.best}`);
		expect(cards[0].text()).toContain("Due in 5 d");

		await cards[1].trigger("click");
		expect(onSelect).toHaveBeenCalledWith("EXT");
	});
});
