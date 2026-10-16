import { describe, it, expect } from "vitest";

import RepairFIOBuildings from "@/features/repair_analysis/components/RepairFIOBuildings.vue";
import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";
import PTag from "@/ui/components/PTag.vue";
import { mountComponent } from "@/tests/mountComponent";

import plan from "@/locales/en_US/plan.json";

const BUILDINGS = [
	{
		index: 1,
		ageDays: 20,
		condition: 0.95,
		repairMaterials: [{ ticker: "BBH", amount: 1 }],
	},
	{
		index: 2,
		ageDays: 58,
		condition: 0.8,
		repairMaterials: [
			{ ticker: "BBH", amount: 2 },
			{ ticker: "BSE", amount: 1 },
		],
	},
	{ index: 3, ageDays: undefined, condition: 0.6, repairMaterials: [] },
	{
		index: 4,
		ageDays: 70,
		condition: 0.7,
		repairMaterials: [{ ticker: "BBH", amount: 3 }],
	},
];

async function mountFIO(props: Record<string, unknown> = {}) {
	return mountComponent(
		RepairFIOBuildings,
		{
			ticker: "FRM",
			planet: "Montem",
			buildings: BUILDINGS,
			interval: 60,
			planned: 4,
			stale: false,
			...props,
		},
		{ messages: { plan } }
	);
}

describe("RepairFIOBuildings", () => {
	it("lists the buildings due first, never repaired last", async () => {
		const { wrapper } = await mountFIO();
		const rows = wrapper.findAll("[data-testid=repair-fio-building]");

		expect(wrapper.text()).toContain("Your FRM on Montem (FIO)");
		expect(rows.map((r) => r.find("span").text())).toEqual([
			"#4",
			"#2",
			"#1",
			"#3",
		]);
		expect(rows[0].text()).toContain("70 d since repair");
		expect(rows[0].text()).toContain("70.0 %");
		expect(rows[3].text()).toContain("never repaired");
		expect(rows[3].findComponent(PTag).exists()).toBe(false);
	});

	it("tags each building's due date at the interval", async () => {
		const { wrapper } = await mountFIO();

		expect(
			wrapper
				.findAllComponents(PTag)
				.map((t) => [t.props("type"), t.text()])
		).toEqual([
			["error", "Overdue 10 d"],
			["warning", "Due in 2 d"],
			["secondary", "In 40 d"],
		]);
	});

	it("sends FIO's repair materials of the due ones to XIT", async () => {
		const { wrapper } = await mountFIO();

		// #4 overdue and #2 due in 2 d, #1 is not due yet
		expect(
			wrapper.findComponent(XITTransferActionButton).props("elements")
		).toEqual([
			{ ticker: "BBH", value: 5 },
			{ ticker: "BSE", value: 1 },
		]);
		expect(
			wrapper.findComponent(XITTransferActionButton).props("transferName")
		).toBe("Repair");
	});

	it("has no XIT when nothing is due", async () => {
		const { wrapper } = await mountFIO({ interval: 120 });

		expect(wrapper.findComponent(XITTransferActionButton).exists()).toBe(
			false
		);
	});

	it("notes stale FIO amounts only with due buildings", async () => {
		const stale = await mountFIO({ stale: true });
		expect(stale.wrapper.find("[data-testid=repair-fio-stale]").text()).toContain(
			"may be higher by now"
		);

		const fresh = await mountFIO();
		expect(fresh.wrapper.find("[data-testid=repair-fio-stale]").exists()).toBe(
			false
		);
	});

	it("notes when FIO has another count than the plan", async () => {
		const { wrapper } = await mountFIO({ planned: 6 });

		expect(wrapper.find("[data-testid=repair-fio-count]").text()).toContain(
			"FIO: 4 built · plan: 6"
		);

		const same = await mountFIO();
		expect(same.wrapper.find("[data-testid=repair-fio-count]").exists()).toBe(
			false
		);
	});
});
