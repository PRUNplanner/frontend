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

/** width in px for the layout media queries */
function screen(width: number) {
	vi.stubGlobal("matchMedia", (query: string) => {
		const px = Number(query.match(/(\d+)px/)![1]);
		return {
			matches: query.includes("min-width") ? width >= px : width <= px,
			addEventListener: () => {},
			removeEventListener: () => {},
		};
	});
}

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
		vi.mocked(trackEvent).mockClear();
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
});
