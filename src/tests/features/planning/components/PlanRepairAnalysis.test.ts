import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { type VueWrapper, RouterLinkStub } from "@vue/test-utils";
import { createPinia } from "pinia";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanRepairAnalysis from "@/features/planning/components/tools/PlanRepairAnalysis.vue";
import RepairBuildingDetail from "@/features/repair_analysis/components/RepairBuildingDetail.vue";
import RepairBuildingList from "@/features/repair_analysis/components/RepairBuildingList.vue";
import PButton from "@/ui/components/PButton.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import PNotice from "@/ui/components/PNotice.vue";
import PTag from "@/ui/components/PTag.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";
import plan from "@/locales/en_US/plan.json";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

const CX_UUID = "cx-uuid";
const PLANET = "ZV-307c";
const DAY_MS = 86_400_000;
// BUY prices of the CX
const PRICES = { BBH: 100, BSE: 50, MCG: 10 };

const mat = (ticker: string, input: number) => ({ ticker, input, output: 0 });
const FRM = {
	name: "FRM",
	amount: 2,
	dailyRevenue: 0,
	workforceDailyCost: 0,
	constructionCost: 0,
	constructionMaterials: [mat("BBH", 4), mat("BSE", 4)],
};
const EXT = {
	name: "EXT",
	amount: 1,
	dailyRevenue: 0,
	workforceDailyCost: 0,
	constructionCost: 0,
	constructionMaterials: [mat("BSE", 16), mat("MCG", 100)],
};
// single FRM, no revenue: 1 BBH + 1 BSE = 150 up to day 45
const FRM_BEST = 45;

const site = (repairedDaysAgo: (number | undefined)[]) => ({
	PlanetIdentifier: PLANET,
	PlanetName: "Montem",
	InvestedPermits: 1,
	MaximumPermits: 3,
	Buildings: [
		...repairedDaysAgo.map((days) => ({
			BuildingTicker: "FRM",
			BuildingLastRepair:
				days === undefined ? undefined : new Date(Date.now() - days * DAY_MS),
			Condition: 0.9,
			ReclaimableMaterials: [],
			RepairMaterials: [{ MaterialTicker: "BBH", MaterialAmount: 2 }],
		})),
		// infrastructure has no repair interval
		{
			BuildingTicker: "HB1",
			Condition: 0.5,
			ReclaimableMaterials: [],
			RepairMaterials: [],
			BuildingLastRepair: new Date(Date.now() - 170 * DAY_MS),
		},
	],
});

interface IMountOptions {
	data?: (typeof FRM)[];
	shared?: boolean;
	fio?: "none" | "no_site" | "site";
	repairedDaysAgo?: (number | undefined)[];
	fioAgeDays?: number;
	// as restored from localStorage: dates are ISO strings
	restored?: boolean;
}

async function mountAnalysis(options: IMountOptions = {}) {
	const pinia = createPinia();
	const planningStore = usePlanningStore(pinia);
	planningStore.setCXs([
		// @ts-expect-error mock data
		{
			uuid: CX_UUID,
			cx_name: "CX",
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: Object.entries(PRICES).map(
					([ticker, value]) => ({ ticker, type: "BUY", value })
				),
				ticker_planets: [],
			},
		},
	]);

	const fio = options.fio ?? "none";
	if (fio !== "none") {
		// @ts-expect-error partial profile
		useUserStore(pinia).profile = {
			fio_apikey: "key",
			prun_username: "user",
		};
		planningStore.setFIOStorageData({
			storage_data: { planets: {}, warehouses: {}, ships: {} },
			sites_data:
				fio === "site"
					? { "site-1": site(options.repairedDaysAgo ?? [50, 10]) }
					: {},
			last_modified: new Date(
				Date.now() - (options.fioAgeDays ?? 0.2) * DAY_MS
			),
		});
		if (options.restored) {
			planningStore.fio_sites_planets = JSON.parse(
				JSON.stringify(planningStore.fio_sites_planets)
			);
			planningStore.fio_storage_timestamp = JSON.parse(
				JSON.stringify(planningStore.fio_storage_timestamp)
			);
		}
	}

	const mounted = await mountComponent(
		PlanRepairAnalysis,
		{
			data: options.data ?? [FRM, EXT],
			cxUuid: CX_UUID,
			planetNaturalId: PLANET,
			shared: options.shared ?? false,
		},
		{ pinia, messages: { plan } }
	);
	if (options.data?.length !== 0)
		await vi.waitFor(() =>
			expect(
				mounted.wrapper.findAll("[data-testid=repair-building-row]")
					.length +
					mounted.wrapper.findAll("[data-testid=repair-building-card]")
						.length
			).toBeGreaterThan(0)
		);
	return mounted;
}

const rows = (wrapper: VueWrapper) =>
	wrapper.findAll("[data-testid=repair-building-row]");
const rowField = (wrapper: VueWrapper, ticker: string) =>
	rows(wrapper)
		.find((r) => r.text().includes(`× ${ticker}`))!
		.findComponent(PInputNumber);
const detail = (wrapper: VueWrapper) =>
	wrapper.findComponent(RepairBuildingDetail);
const detailField = (wrapper: VueWrapper) =>
	detail(wrapper).findComponent(PInputNumber);
const slider = (wrapper: VueWrapper) =>
	detail(wrapper).find("input[type=range]")
		.element as HTMLInputElement;
const pressedPreset = (wrapper: VueWrapper) =>
	detail(wrapper)
		.find("[role=group]")
		.findAllComponents(PButton)
		.filter((b: VueWrapper) => b.attributes("aria-pressed") === "true")
		.map((b: VueWrapper) => b.text());

async function selectRow(wrapper: VueWrapper, ticker: string) {
	await rows(wrapper)
		.find((r) => r.text().includes(`× ${ticker}`))!
		.find("button[aria-pressed]")
		.trigger("click");
}

function stubPhone(phone: boolean) {
	vi.stubGlobal("matchMedia", () => ({
		matches: phone,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));
}

describe("PlanRepairAnalysis", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
	});

	it("lists every type, most expensive repair first, at its best day", async () => {
		const { wrapper } = await mountAnalysis();

		expect(rows(wrapper).map((r) => r.find("button[aria-pressed] span").text())).toEqual(
			["1× EXT", "2× FRM"]
		);
		expect(rowField(wrapper, "FRM").props("value")).toBe(FRM_BEST);
		// the first type is selected
		expect(detail(wrapper).props("building").ticker).toBe("EXT");
		expect(wrapper.text()).toContain("all at best");
	});

	it("keeps the row, the field, the slider and the presets in sync", async () => {
		const { wrapper } = await mountAnalysis();
		await selectRow(wrapper, "FRM");
		expect(detailField(wrapper).props("value")).toBe(FRM_BEST);
		expect(pressedPreset(wrapper)).toEqual([`Best · ${FRM_BEST} d`]);

		// row field
		rowField(wrapper, "FRM").vm.$emit("update:value", 60);
		await wrapper.vm.$nextTick();
		expect(detailField(wrapper).props("value")).toBe(60);
		expect(slider(wrapper).value).toBe("60");
		expect(pressedPreset(wrapper)).toEqual(["60 d"]);
		expect(
			wrapper.find("[data-testid=repair-stats-delta]").text()
		).toContain("vs. all at best");

		// slider
		await detail(wrapper).find("input[type=range]").setValue("90");
		expect(rowField(wrapper, "FRM").props("value")).toBe(90);
		expect(detailField(wrapper).props("value")).toBe(90);

		// preset
		await detail(wrapper)
			.find("[role=group]")
			.findAllComponents(PButton)[1]
			.trigger("click");
		expect(rowField(wrapper, "FRM").props("value")).toBe(30);
		expect(slider(wrapper).value).toBe("30");

		// detail field
		detailField(wrapper).vm.$emit("update:value", 120);
		await wrapper.vm.$nextTick();
		expect(rowField(wrapper, "FRM").props("value")).toBe(120);
		expect(slider(wrapper).value).toBe("120");

		// the other type keeps its best day
		expect(rowField(wrapper, "EXT").props("value")).toBe(
			wrapper.findComponent(RepairBuildingList).props("buildings")[0].best
		);
	});

	it("updates the plan's repair bill with the interval", async () => {
		const { wrapper } = await mountAnalysis();
		const bill = () => wrapper.find("[data-testid=repair-stats]").text();
		const before = bill();

		rowField(wrapper, "FRM").vm.$emit("update:value", 180);
		await wrapper.vm.$nextTick();

		expect(bill()).not.toBe(before);
	});

	it("warns on both fields outside the good range", async () => {
		const { wrapper } = await mountAnalysis();
		await selectRow(wrapper, "FRM");

		rowField(wrapper, "FRM").vm.$emit("update:value", 180);
		await wrapper.vm.$nextTick();

		expect(rowField(wrapper, "FRM").props("status")).toBe("warning");
		expect(detailField(wrapper).props("status")).toBe("warning");
		expect(
			wrapper.find("[data-testid=repair-detail-delta]").classes()
		).toContain("text-warning");
	});

	it("resets all intervals to their best day", async () => {
		const { wrapper } = await mountAnalysis();
		rowField(wrapper, "FRM").vm.$emit("update:value", 120);
		rowField(wrapper, "EXT").vm.$emit("update:value", 10);
		await wrapper.vm.$nextTick();

		await wrapper
			.findAll("button")
			.find((b) => b.text() === "Reset all to best")!
			.trigger("click");

		expect(rowField(wrapper, "FRM").props("value")).toBe(FRM_BEST);
		expect(wrapper.text()).toContain("all at best");
	});

	it("does not keep intervals: a new visit starts at the best days", async () => {
		const first = await mountAnalysis();
		rowField(first.wrapper, "FRM").vm.$emit("update:value", 120);
		first.wrapper.unmount();

		const { wrapper } = await mountAnalysis();
		expect(rowField(wrapper, "FRM").props("value")).toBe(FRM_BEST);
	});

	it("drops intervals of removed types and starts new ones at their best", async () => {
		const { wrapper, setProps } = await mountAnalysis();
		rowField(wrapper, "FRM").vm.$emit("update:value", 120);

		await setProps({ data: [EXT] });
		await vi.waitFor(() => expect(rows(wrapper)).toHaveLength(1));
		await setProps({ data: [FRM, EXT] });
		await vi.waitFor(() => expect(rows(wrapper)).toHaveLength(2));

		expect(rowField(wrapper, "FRM").props("value")).toBe(FRM_BEST);
	});

	it("sends one debounced event per burst of changes", async () => {
		const { wrapper } = await mountAnalysis();
		await selectRow(wrapper, "FRM");
		const range = detail(wrapper).find("input[type=range]");

		await range.setValue("100");
		await range.setValue(String(FRM_BEST));
		wrapper.unmount();

		expect(trackEvent).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith(
			"repair_analysis:interval_set",
			{ source: "slider", ticker: "FRM", in_range: true }
		);
	});

	it("keeps one event per type in a burst over several types", async () => {
		const { wrapper } = await mountAnalysis();

		rowField(wrapper, "FRM").vm.$emit("update:value", 120);
		rowField(wrapper, "EXT").vm.$emit("update:value", 30);
		wrapper.unmount();

		expect(
			vi.mocked(trackEvent).mock.calls.map(
				(c) => (c[1] as { ticker: string }).ticker
			)
		).toEqual(["FRM", "EXT"]);
	});

	it("sends a reset for all types", async () => {
		const { wrapper } = await mountAnalysis();

		await wrapper
			.findAll("button")
			.find((b) => b.text() === "Reset all to best")!
			.trigger("click");
		wrapper.unmount();

		expect(trackEvent).toHaveBeenCalledWith("repair_analysis:interval_set", {
			source: "reset",
			ticker: "all",
			in_range: true,
		});
	});

	it("without FIO: a notice linking to the profile, no FIO parts", async () => {
		const { wrapper } = await mountAnalysis({ fio: "none" });

		const notice = wrapper.findComponent(PNotice);
		expect(notice.text()).toContain("Connect FIO");
		expect(notice.findComponent(RouterLinkStub).props("to")).toBe(
			"/profile#fio"
		);
		expect(wrapper.find("[data-testid=repair-fio-note]").exists()).toBe(
			false
		);
		expect(wrapper.text()).toContain("Good range");
		expect(wrapper.text()).not.toContain("Next due");
		expect(wrapper.find("[data-testid=repair-stats-cost]").exists()).toBe(
			true
		);
		expect(wrapper.findAll(".repair-fio-marker")).toHaveLength(0);
	});

	it("with FIO but no site on the planet: the no-site notice", async () => {
		const { wrapper } = await mountAnalysis({ fio: "no_site" });

		const notice = wrapper.findComponent(PNotice);
		expect(notice.text()).toContain(`No FIO site on ${PLANET} yet`);
		expect(notice.findComponent(RouterLinkStub).exists()).toBe(false);
		expect(wrapper.find("[data-testid=repair-fio-note]").text()).toContain(
			"FIO last update"
		);
		expect(wrapper.text()).toContain("Good range");
	});

	it("with a FIO site: due tags, the next due building and markers", async () => {
		// FRM repaired 50 and 10 days ago, due at day 45
		const { wrapper } = await mountAnalysis({ fio: "site" });

		expect(wrapper.findComponent(PNotice).exists()).toBe(false);
		expect(wrapper.text()).toContain("Next due");
		const frmRow = rows(wrapper).find((r) => r.text().includes("× FRM"))!;
		expect(frmRow.findComponent(PTag).text()).toBe("Overdue 5 d");
		expect(frmRow.findComponent(PTag).props("type")).toBe("error");

		const next = wrapper.find("[data-testid=repair-stats-next]");
		expect(next.text()).toContain("FRM #1");
		expect(next.text()).toContain("Overdue 5 d");

		await selectRow(wrapper, "FRM");
		expect(wrapper.text()).toContain("Your FRM on Montem (FIO)");
		expect(wrapper.findAll("[data-testid=repair-fio-building]")).toHaveLength(
			2
		);
		// FIO has 2 FRM, like the plan
		expect(wrapper.find("[data-testid=repair-fio-count]").exists()).toBe(
			false
		);
		expect(wrapper.findAll(".repair-fio-marker")).toHaveLength(2);
	});

	it("shows a never repaired building without a due date", async () => {
		const { wrapper } = await mountAnalysis({
			fio: "site",
			repairedDaysAgo: [undefined],
		});
		await selectRow(wrapper, "FRM");

		expect(wrapper.text()).toContain("never repaired");
		expect(wrapper.find("[data-testid=repair-fio-count]").text()).toContain(
			"FIO: 1 built · plan: 2"
		);
		// no repair date: no due date, no marker, cost instead of next due
		expect(wrapper.find("[data-testid=repair-stats-cost]").exists()).toBe(
			true
		);
		expect(wrapper.findAll(".repair-fio-marker")).toHaveLength(0);
	});

	it("reads FIO dates restored from storage as strings", async () => {
		const { wrapper } = await mountAnalysis({
			fio: "site",
			restored: true,
			fioAgeDays: 2,
		});

		const frmRow = rows(wrapper).find((r) => r.text().includes("× FRM"))!;
		expect(frmRow.findComponent(PTag).text()).toBe("Overdue 5 d");
		expect(
			wrapper.find("[data-testid=repair-fio-note] .ptooltip").exists()
		).toBe(true);
	});

	it("explains FIO data older than a day", async () => {
		const fresh = await mountAnalysis({ fio: "site" });
		expect(
			fresh.wrapper.find("[data-testid=repair-fio-note] .ptooltip").exists()
		).toBe(false);

		const { wrapper } = await mountAnalysis({ fio: "site", fioAgeDays: 2 });
		expect(
			wrapper.find("[data-testid=repair-fio-note] .ptooltip").exists()
		).toBe(true);
	});

	it("on a shared plan: no FIO parts and no notice, whatever the store holds", async () => {
		const { wrapper } = await mountAnalysis({ fio: "site", shared: true });

		expect(wrapper.findComponent(PNotice).exists()).toBe(false);
		expect(wrapper.find("[data-testid=repair-fio-note]").exists()).toBe(
			false
		);
		expect(wrapper.find("[data-testid=repair-fio-buildings]").exists()).toBe(
			false
		);
		expect(wrapper.text()).not.toContain("Next due");
		expect(wrapper.findAll(".repair-fio-marker")).toHaveLength(0);
	});

	it("says so for a plan without production buildings", async () => {
		const { wrapper } = await mountAnalysis({ data: [] });

		expect(wrapper.text()).toContain("no production buildings");
		expect(wrapper.findComponent(RepairBuildingList).exists()).toBe(false);
	});

	it("on phones: cards open the detail, back returns to the list", async () => {
		stubPhone(true);
		const { wrapper } = await mountAnalysis();

		const cards = wrapper.findAll("[data-testid=repair-building-card]");
		expect(cards).toHaveLength(2);
		expect(detail(wrapper).exists()).toBe(false);

		await cards[1].trigger("click");
		expect(detail(wrapper).props("building").ticker).toBe("FRM");
		expect(detail(wrapper).props("back")).toBe(true);
		expect(wrapper.findComponent(RepairBuildingList).exists()).toBe(false);
		expect(wrapper.find("[data-testid=repair-stats]").exists()).toBe(false);

		await wrapper.find("[aria-label='Back to buildings']").trigger("click");
		expect(wrapper.findAll("[data-testid=repair-building-card]")).toHaveLength(
			2
		);
		expect(detail(wrapper).exists()).toBe(false);
	});
});
