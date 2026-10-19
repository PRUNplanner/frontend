import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import { h } from "vue";

import fio from "@/locales/en_US/fio.json";

// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Components
import FIORepairOverview from "@/features/fio_repair/components/FIORepairOverview.vue";
import ComputingProgress from "@/layout/components/ComputingProgress.vue";
import FIORepairSettings from "@/features/fio_repair/components/FIORepairSettings.vue";
import FIORepairBasePanel from "@/features/fio_repair/components/FIORepairBasePanel.vue";
import FIORepairBaseList from "@/features/fio_repair/components/FIORepairBaseList.vue";
import { useUserStore } from "@/stores/userStore";
import { usePlanningStore } from "@/stores/planningStore";
import { mountComponent } from "@/tests/mountComponent";
import {
	bober,
	shiptronia,
} from "@/tests/features/fio_repair/components/fioRepairBase";

// Types & Interfaces
import type { IFIORepairBase } from "@/features/fio_repair/fioRepair.types";

const repair = vi.hoisted(() => ({
	bases: undefined as unknown as { value: IFIORepairBase[] },
	resolve: () => {},
	flight: vi.fn(),
}));

vi.mock("@/features/fio_repair/useFIORepair", async () => {
	const { ref: vueRef } = await import("vue");
	return {
		useFIORepair: () => {
			repair.bases = vueRef([]);
			return {
				bases: repair.bases,
				progress: vueRef({ current: 0, total: 1 }),
				load: () => new Promise<void>((r) => (repair.resolve = r)),
				flight: repair.flight,
			};
		},
	};
});
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/exchanges/components/CXPreferenceSelector.vue", () => ({
	default: { name: "CXPreferenceSelector", render: () => h("div") },
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: { name: "MaterialTile", render: () => h("span") },
}));

const messages = { fio };
let pinia: Pinia;

type MediaListener = (e: { matches: boolean }) => void;
const media = {
	listeners: new Map<string, MediaListener>(),
	removed: [] as string[],
};

/** width in px for the layout media queries */
function screen(width: number) {
	vi.stubGlobal("matchMedia", (query: string) => {
		const px = Number(query.match(/(\d+)px/)![1]);
		return {
			matches: query.includes("min-width") ? width >= px : width <= px,
			addEventListener: (_: string, cb: MediaListener) =>
				media.listeners.set(query, cb),
			removeEventListener: (_: string, cb: MediaListener) => {
				if (media.listeners.get(query) === cb)
					media.removed.push(query);
			},
		};
	});
}

/** fires the change event of the wide or phone media query */
const WIDE = "(min-width: 1200px)";
const PHONE = "(max-width: 767px)";
const change = (query: string, matches: boolean) =>
	media.listeners.get(query)!({ matches });

async function mountOverview() {
	const mounted = await mountComponent(
		FIORepairOverview,
		{ plans: [], empires: [] },
		{ pinia, messages }
	);
	expect(mounted.wrapper.findComponent(ComputingProgress).exists()).toBe(
		true
	);
	repair.bases.value = [bober(), shiptronia()];
	repair.resolve();
	await flushPromises();
	return mounted;
}

const rows = (w: Awaited<ReturnType<typeof mountOverview>>["wrapper"]) =>
	w.findAll("[data-testid=fio-repair-row]");
const body = () => new DOMWrapper(document.body);

describe("FIORepairOverview", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		media.listeners.clear();
		media.removed = [];
		vi.mocked(trackEvent).mockClear();
		repair.flight.mockClear();
		repair.flight.mockReturnValue({
			load: { materials: [], cost: 0, weight: 0, volume: 0 },
			fromStore: [],
			extra: 0,
		});
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it("wide: first base selected beside the list, one tool use", async () => {
		screen(1440);
		const { wrapper } = await mountOverview();

		const panel = wrapper.find("[data-testid=fio-repair-panel]");
		expect(panel.text()).toContain("Bober");
		expect(panel.classes()).toContain("sticky");
		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "fio_repair",
		});
		expect(repair.flight).toHaveBeenCalledWith(
			expect.objectContaining({ planet: "ZV-307b" }),
			2,
			true
		);

		await rows(wrapper)[1].trigger("click");
		expect(wrapper.find("[data-testid=fio-repair-panel]").text()).toContain(
			"Shiptronia"
		);
		expect(trackEvent).toHaveBeenCalledWith("fio_repair:base_open", {
			status: "later",
			confidence: "none",
		});

		// the selected base left: the first one again
		repair.bases.value = [bober()];
		await flushPromises();
		expect(wrapper.find("[data-testid=fio-repair-panel]").text()).toContain(
			"Bober"
		);
		expect(
			vi.mocked(trackEvent).mock.calls.filter((c) => c[0] === "tool:use")
		).toHaveLength(1);
	});

	it("stats and timeline set the list filter", async () => {
		screen(1440);
		const { wrapper } = await mountOverview();

		await wrapper
			.find("[data-testid=fio-repair-stat-later]")
			.trigger("click");
		expect(rows(wrapper)).toHaveLength(1);

		repair.bases.value = [
			bober(),
			shiptronia({ status: "unknown", due: null }),
		];
		await flushPromises();
		await wrapper.find("[data-testid=fio-repair-chip]").trigger("click");
		expect(
			wrapper
				.find("[data-testid=fio-repair-filter-overdue]")
				.attributes("aria-pressed")
		).toBe("true");
	});

	it("below 1200 px the panel opens as a drawer", async () => {
		screen(1024);
		const { wrapper } = await mountOverview();
		expect(wrapper.find("[data-testid=fio-repair-panel]").exists()).toBe(
			false
		);

		await rows(wrapper)[0].trigger("click");
		await flushPromises();
		const panel = body().find(
			"[role=dialog] [data-testid=fio-repair-panel]"
		);
		expect(panel.text()).toContain("Bober");

		await panel.find("[data-testid=fio-repair-close]").trigger("click");
		await flushPromises();
		expect(body().find("[role=dialog]").exists()).toBe(false);
	});

	it("phones go list, detail, back", async () => {
		screen(375);
		const { wrapper } = await mountOverview();
		expect(wrapper.find("[data-testid=fio-repair-panel]").exists()).toBe(
			false
		);

		await rows(wrapper)[0].trigger("click");
		expect(wrapper.find("[data-testid=fio-repair-list]").exists()).toBe(
			false
		);
		expect(wrapper.find("[data-testid=fio-repair-settings]").exists()).toBe(
			false
		);

		await wrapper.find("[data-testid=fio-repair-back]").trigger("click");
		expect(wrapper.find("[data-testid=fio-repair-list]").exists()).toBe(
			true
		);
		expect(wrapper.find("[data-testid=fio-repair-panel]").exists()).toBe(
			false
		);
	});

	it("a burst of setting changes is one event per setting", async () => {
		screen(1440);
		vi.useFakeTimers();
		const { wrapper } = await mountOverview();
		const settings = wrapper.findComponent(FIORepairSettings);

		settings.vm.$emit("change", "interval");
		settings.vm.$emit("change", "interval");
		settings.vm.$emit("change", "due_soon");
		vi.advanceTimersByTime(1000);

		const changes = vi
			.mocked(trackEvent)
			.mock.calls.filter((c) => c[0] === "fio_repair:setting_change");
		expect(changes).toStrictEqual([
			["fio_repair:setting_change", { setting: "interval" }],
			["fio_repair:setting_change", { setting: "due_soon" }],
		]);
	});

	it("without matchMedia it lays out as a wide screen", async () => {
		vi.stubGlobal("matchMedia", undefined);
		const { wrapper } = await mountOverview();

		expect(
			wrapper.find("[data-testid=fio-repair-panel]").classes()
		).toContain("sticky");
	});

	it("selects nothing and offers no panel without bases", async () => {
		screen(1440);
		const { wrapper } = await mountComponent(
			FIORepairOverview,
			{ plans: [], empires: [] },
			{ pinia, messages }
		);
		repair.resolve();
		await flushPromises();

		expect(wrapper.find("[data-testid=fio-repair-panel]").exists()).toBe(
			false
		);
		expect(repair.flight).not.toHaveBeenCalled();
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("counts bases by plan match confidence for the settings", async () => {
		screen(1440);
		const { wrapper } = await mountOverview();
		const likely = (c: "likely" | "picked") =>
			bober({
				match: { candidate: undefined, confidence: c, candidates: [] },
			});

		repair.bases.value = [
			bober(),
			likely("picked"),
			likely("likely"),
			likely("likely"),
			shiptronia(),
		];
		await flushPromises();

		expect(
			wrapper.findComponent(FIORepairSettings).props("counts")
		).toEqual({
			matched: 2,
			likely: 2,
			none: 1,
		});
	});

	it("without plans a base opens with confidence none", async () => {
		screen(1440);
		const { wrapper } = await mountOverview();

		wrapper
			.findComponent(FIORepairSettings)
			.vm.$emit("update:usePlans", false);
		await flushPromises();
		vi.mocked(trackEvent).mockClear();
		wrapper.findComponent(FIORepairBaseList).vm.$emit("select", "ZV-307b");
		await flushPromises();

		expect(trackEvent).toHaveBeenCalledWith("fio_repair:base_open", {
			status: "overdue",
			confidence: "none",
		});
	});

	it("names the default exchange in the panel and passes the store toggle on", async () => {
		screen(1440);
		const uuid = "11111111-1111-4111-8111-111111111111";
		usePlanningStore().cxs[uuid] = { uuid, cx_name: "My CX" } as never;
		useUserStore().setPreference("defaultCXUuid", uuid);
		const { wrapper } = await mountOverview();
		const panel = () => wrapper.findComponent(FIORepairBasePanel);

		expect(panel().props("cxName")).toBe("My CX");
		expect(panel().props("useStore")).toBe(true);

		panel().vm.$emit("update:useStore", false);
		await flushPromises();
		expect(panel().props("useStore")).toBe(false);
		expect(repair.flight).toHaveBeenLastCalledWith(
			expect.objectContaining({ planet: "ZV-307b" }),
			2,
			false
		);
	});

	it("has no exchange name for a default exchange that is gone", async () => {
		screen(1440);
		useUserStore().setPreference(
			"defaultCXUuid",
			"22222222-2222-4222-8222-222222222222"
		);
		const { wrapper } = await mountOverview();

		expect(
			wrapper.findComponent(FIORepairBasePanel).props("cxName")
		).toBeUndefined();
	});

	it("growing to a wide screen closes the drawer for the side panel", async () => {
		screen(1024);
		const { wrapper } = await mountOverview();
		await rows(wrapper)[0].trigger("click");
		await flushPromises();
		expect(body().find("[role=dialog]").exists()).toBe(true);

		change(WIDE, true);
		await flushPromises();

		expect(body().find("[role=dialog]").exists()).toBe(false);
		expect(
			wrapper.find("[data-testid=fio-repair-panel]").classes()
		).toContain("sticky");
	});

	it("shrinking from wide keeps the panel out until a base is opened", async () => {
		screen(1440);
		const { wrapper } = await mountOverview();

		change(WIDE, false);
		await flushPromises();

		expect(wrapper.find("[data-testid=fio-repair-panel]").exists()).toBe(
			false
		);
		expect(body().find("[role=dialog]").exists()).toBe(false);
	});

	it("turning into a phone closes the drawer, leaving it closes the detail", async () => {
		screen(1024);
		const { wrapper } = await mountOverview();
		await rows(wrapper)[0].trigger("click");
		await flushPromises();
		expect(body().find("[role=dialog]").exists()).toBe(true);

		change(PHONE, true);
		await flushPromises();
		expect(body().find("[role=dialog]").exists()).toBe(false);

		await rows(wrapper)[0].trigger("click");
		expect(wrapper.find("[data-testid=fio-repair-list]").exists()).toBe(
			false
		);

		change(PHONE, false);
		await flushPromises();
		expect(wrapper.find("[data-testid=fio-repair-list]").exists()).toBe(
			true
		);
	});

	it("stops listening to the layout queries and flushes pending events", async () => {
		screen(1440);
		vi.useFakeTimers();
		const { wrapper } = await mountOverview();

		wrapper.findComponent(FIORepairSettings).vm.$emit("change", "arrival");
		vi.mocked(trackEvent).mockClear();
		wrapper.unmount();

		expect(media.removed.sort()).toEqual([PHONE, WIDE]);
		expect(trackEvent).toHaveBeenCalledWith("fio_repair:setting_change", {
			setting: "arrival",
		});
	});

	it("the drawer shares the store toggle and closes itself", async () => {
		screen(1024);
		const { wrapper } = await mountOverview();
		wrapper
			.findComponent(FIORepairBaseList)
			.vm.$emit("update:filter", "overdue");
		wrapper.findComponent(FIORepairBaseList).vm.$emit("select", "nowhere");
		await flushPromises();

		// an unknown planet selects no base: no event, an empty drawer
		expect(trackEvent).not.toHaveBeenCalledWith(
			"fio_repair:base_open",
			expect.anything()
		);
		expect(wrapper.findComponent(FIORepairBaseList).props("filter")).toBe(
			"overdue"
		);
		expect(body().find("[role=dialog]").exists()).toBe(true);
		expect(body().find("[data-testid=fio-repair-panel]").exists()).toBe(
			false
		);

		wrapper.findComponent(FIORepairBaseList).vm.$emit("select", "ZV-307b");
		await flushPromises();
		const panel = wrapper.findAllComponents(FIORepairBasePanel)[0];
		panel.vm.$emit("update:useStore", false);
		await flushPromises();
		expect(repair.flight).toHaveBeenLastCalledWith(
			expect.objectContaining({ planet: "ZV-307b" }),
			2,
			false
		);

		body()
			.find("[role=dialog]")
			.element.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
			);
		await flushPromises();
		expect(body().find("[role=dialog]").exists()).toBe(false);
	});
});
