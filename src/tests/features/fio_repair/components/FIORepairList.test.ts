import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import { h } from "vue";

import fio from "@/locales/en_US/fio.json";

// Stores
import { useUserStore } from "@/stores/userStore";

// Components
import FIORepairBaseList from "@/features/fio_repair/components/FIORepairBaseList.vue";
import FIORepairSettings from "@/features/fio_repair/components/FIORepairSettings.vue";
import FIORepairStats from "@/features/fio_repair/components/FIORepairStats.vue";
import FIORepairTimeline from "@/features/fio_repair/components/FIORepairTimeline.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	bober,
	shiptronia,
} from "@/tests/features/fio_repair/components/fioRepairBase";

vi.mock("@/features/exchanges/components/CXPreferenceSelector.vue", () => ({
	default: {
		name: "CXPreferenceSelector",
		props: { cxUuid: String, addUndefinedCX: Boolean },
		emits: ["update:cxuuid"],
		render: () => h("div", { "data-testid": "cx-select" }),
	},
}));

const messages = { fio };
let pinia: Pinia;

describe("FIO Repair components", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	describe("FIORepairSettings", () => {
		it("settings change preferences and report the change", async () => {
			const userStore = useUserStore();
			const onChange = vi.fn();
			const onUsePlans = vi.fn();
			const { wrapper, setProps } = await mountComponent(
				FIORepairSettings,
				{
					usePlans: true,
					counts: { matched: 12, likely: 1, none: 2 },
					onChange,
					"onUpdate:usePlans": onUsePlans,
				},
				{ pinia, messages }
			);

			expect(
				wrapper.find("[data-testid=fio-repair-match-summary]").text()
			).toBe("12 matched · 1 likely · 2 without");
			expect(wrapper.text()).toContain("Without a plan, every");

			const inputs = wrapper.findAll<HTMLInputElement>(
				"input[inputmode=numeric]"
			);
			expect(inputs.map((i) => i.element.value)).toStrictEqual([
				"60",
				"7",
			]);
			await inputs.at(0)!.setValue("45");
			await inputs.at(1)!.setValue("3");
			expect(userStore.preferences.fioRepairIntervalDays).toBe(45);
			expect(userStore.preferences.fioRepairDueSoonDays).toBe(3);
			expect(onChange).toHaveBeenCalledWith("interval");
			expect(onChange).toHaveBeenCalledWith("due_soon");

			await wrapper.find("input[type=checkbox]").setValue(false);
			expect(onUsePlans).toHaveBeenCalledWith(false);
			expect(onChange).toHaveBeenCalledWith("use_plans");

			wrapper
				.findComponent({ name: "CXPreferenceSelector" })
				.vm.$emit("update:cxuuid", "CX1");
			expect(onChange).toHaveBeenCalledWith("exchange");

			await setProps({ usePlans: false });
			expect(wrapper.text()).toContain("Repair every");
			expect(wrapper.text()).toContain("for every base");
		});
	});

	describe("FIORepairStats", () => {
		it("counts bases, filters, sums what's due", async () => {
			const onFilter = vi.fn();
			const unknown = shiptronia({
				planet: "X",
				status: "unknown",
				due: null,
			});
			const { wrapper } = await mountComponent(
				FIORepairStats,
				{
					bases: [bober(), shiptronia(), unknown],
					dueSoon: 7,
					onFilter,
				},
				{ pinia, messages }
			);

			const stat = (key: string) =>
				wrapper.find(`[data-testid=fio-repair-stat-${key}]`);
			// a base without date counts as overdue
			expect(stat("overdue").text()).toContain("2 bases");
			expect(stat("soon").text()).toContain("Due within 7 d");
			expect(stat("soon").text()).toContain("0 bases");
			expect(stat("later").text()).toContain("1 base");

			await stat("soon").trigger("click");
			expect(onFilter).toHaveBeenCalledWith("soon");

			expect(
				wrapper.find("[data-testid=fio-repair-due-cost]").text()
			).toBe("676,000 ȼ");
			expect(
				wrapper.find("[data-testid=fio-repair-waiting]").text()
			).toBe("+1,900 ȼ / day");
		});
	});

	describe("FIORepairTimeline", () => {
		it("one chip per base, undated bases share one, ticks never wrap", async () => {
			const onSelect = vi.fn();
			const onUnknown = vi.fn();
			const { wrapper } = await mountComponent(
				FIORepairTimeline,
				{
					bases: [
						bober(),
						shiptronia(),
						shiptronia({ planet: "X", name: "Nova", due: null }),
					],
					dueSoon: 7,
					selected: "ZV-307b",
					onSelect,
					onUnknown,
				},
				{ pinia, messages }
			);

			const chips = wrapper.findAll("[data-testid=fio-repair-chip]");
			expect(chips.map((c) => c.text())).toStrictEqual([
				"1 without repair date",
				"Bober",
				"Shiptronia",
			]);
			expect(chips[1].attributes("aria-pressed")).toBe("true");

			await chips[2].trigger("click");
			expect(onSelect).toHaveBeenCalledWith("VH-331e");
			await chips[0].trigger("click");
			expect(onUnknown).toHaveBeenCalled();

			const ticks = wrapper.findAll("[data-testid=fio-repair-tick]");
			expect(ticks.map((t) => t.text())).toStrictEqual([
				"−5 d",
				"today",
				"+5 d",
				"+10 d",
				"+15 d",
				"+20 d",
			]);
			expect(ticks[0].classes()).toContain("whitespace-nowrap");
		});

		it("crowded spots fold into +n", async () => {
			const bases = Array.from({ length: 6 }, (_, i) =>
				shiptronia({ planet: `P${i}`, name: `Base ${i}`, due: 10 })
			);
			const { wrapper } = await mountComponent(
				FIORepairTimeline,
				{ bases, dueSoon: 7, selected: undefined },
				{ pinia, messages }
			);
			expect(
				wrapper.findAll("[data-testid=fio-repair-chip]")
			).toHaveLength(4);
			expect(wrapper.find("[data-testid=fio-repair-more]").text()).toBe(
				"+2"
			);
		});
	});

	describe("FIORepairBaseList", () => {
		it("rows, plan labels, ages, filter and selection", async () => {
			const onSelect = vi.fn();
			const onFilter = vi.fn();
			const likely = bober({
				planet: "ZV-307c",
				name: "Hephaestus",
				match: {
					...bober().match,
					confidence: "likely",
				},
				since: null,
				status: "unknown",
				due: null,
			});
			const { wrapper, setProps } = await mountComponent(
				FIORepairBaseList,
				{
					bases: [likely, bober(), shiptronia()],
					selected: "ZV-307b",
					interval: 60,
					usePlans: true,
					filter: "all",
					onSelect,
					"onUpdate:filter": onFilter,
				},
				{ pinia, messages }
			);

			const rows = () => wrapper.findAll("[data-testid=fio-repair-row]");
			const plans = () =>
				wrapper
					.findAll("[data-testid=fio-repair-row-plan]")
					.map((p) => p.text());
			expect(plans()).toStrictEqual([
				"likely plan Bober NR+PG",
				"plan Bober NR+PG",
				"no plan · every 60 d",
			]);
			expect(
				wrapper
					.findAll("[data-testid=fio-repair-row-since]")
					.map((s) => s.text())
			).toStrictEqual(["No repair date", "72 d", "built 41 d"]);
			expect(
				rows()[1].find("[data-testid=fio-repair-row-buildings]").text()
			).toBe("10 POL · 7 LAB");
			expect(rows()[1].attributes("aria-pressed")).toBe("true");

			await rows()[2].trigger("click");
			expect(onSelect).toHaveBeenCalledWith("VH-331e");

			// overdue holds the undated base too
			expect(
				wrapper.find("[data-testid=fio-repair-filter-overdue]").text()
			).toBe("Overdue 2");
			await wrapper
				.find("[data-testid=fio-repair-filter-later]")
				.trigger("click");
			expect(onFilter).toHaveBeenCalledWith("later");

			await setProps({ filter: "later", usePlans: false });
			expect(rows()).toHaveLength(1);
			await setProps({ filter: "soon" });
			expect(wrapper.text()).toContain("No base in this filter.");

			await setProps({ filter: "all" });
			expect(plans()[0]).toBe("no plan · every 60 d");
		});

		it("a picked plan says so", async () => {
			const picked = bober({
				match: { ...bober().match, confidence: "picked" },
			});
			const { wrapper } = await mountComponent(
				FIORepairBaseList,
				{
					bases: [picked],
					selected: undefined,
					interval: 60,
					usePlans: true,
					filter: "all",
				},
				{ pinia, messages }
			);
			await flushPromises();
			expect(
				wrapper.find("[data-testid=fio-repair-row-plan]").text()
			).toBe("plan Bober NR+PG (your choice)");
		});
	});
});
