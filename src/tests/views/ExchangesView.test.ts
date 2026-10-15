import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick, type Slots } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";

import ExchangesView from "@/views/ExchangesView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import SaveBar from "@/features/save_bar/components/SaveBar.vue";
import { usePlanningStore } from "@/stores/planningStore";
import { pendingConfirm, settleConfirm } from "@/ui/useConfirm";
import { buildPayload, setPlanetRules } from "@/features/exchanges/cxEdit.util";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers. __esModule lets
// defineAsyncComponent pick the default export of a mocked module
const { passThrough, stub, nav, save, parse, trackEvent } = vi.hoisted(
	() => ({
		passThrough: (name: string) => ({
			__esModule: true,
			default: {
				name,
				setup:
					(_: unknown, { slots }: { slots: Slots }) =>
					() =>
						slots.default?.(),
			},
		}),
		// the panels have their own tests, here they show their props
		stub: (name: string) => ({
			__esModule: true,
			default: {
				name,
				props: ["scope", "cxData", "notes", "rows"],
				render: () => null,
			},
		}),
		nav: {
			route: { query: {} as Record<string, string> },
			replace: vi.fn(),
		},
		save: vi.fn(async () => true),
		parse: vi.fn(),
		trackEvent: vi.fn(),
	})
);

vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/features/exchanges/components/CXOverview.vue", () =>
	stub("CXOverview")
);
vi.mock("@/features/exchanges/components/CXScopeRules.vue", () =>
	stub("CXScopeRules")
);
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));
vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => ({ planetName: (id: string) => id }),
}));
// plans are calculated in its own test
vi.mock("@/features/exchanges/useExchangePlanData", async () => {
	const { computed, ref } = await import("vue");
	return {
		useExchangePlanData: (source: { cxData: () => CXData | undefined }) => ({
			bases: ref([]),
			isCalculating: ref(false),
			progressCurrent: ref(0),
			progressTotal: ref(0),
			pricedData: computed(() => source.cxData()),
			materialRows: ref([]),
			materialCOGMs: ref(new Map()),
			planetMaterialRows: () => [],
			priceBookFor: () => ({}),
			bookForPlanet: ref(() => ({})),
		}),
	};
});
vi.mock("@/features/cx/useCXSave", async () => {
	const { ref } = await import("vue");
	return {
		useCXSave: () => ({
			save,
			remoteNotice: ref(null),
			conflict: { show: ref(false) },
			onRemoteChange: () => false,
		}),
	};
});
// the file reading is tested in useCXImportExport.test.ts
vi.mock("@/features/exchanges/useCXImportExport", async (original) => {
	const actual =
		await original<typeof import("@/features/exchanges/useCXImportExport")>();
	return {
		useCXImportExport: () => ({
			...actual.useCXImportExport(),
			parseSettingsCSV: parse,
		}),
	};
});
vi.mock("vue-router", async (original) => {
	const { reactive } = await import("vue");
	nav.route = reactive({ query: {} });
	nav.replace.mockImplementation((to: unknown) => {
		if (typeof to === "object")
			nav.route.query = Object.fromEntries(
				Object.entries((to as { query: Record<string, string> }).query)
					.filter(([, v]) => v !== undefined)
			);
	});
	return {
		...(await original<typeof import("vue-router")>()),
		useRoute: () => nav.route,
		useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
		onBeforeRouteLeave: vi.fn(),
	};
});

const CX_DATA: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "NC1_30D" }],
	cx_planets: [
		{ planet: "A", preferences: [{ type: "BOTH", exchange: "AI1_7D" }] },
		// no plan on this planet
		{ planet: "OLD", preferences: [{ type: "BUY", exchange: "IC1_ASK" }] },
	],
	ticker_empire: [{ type: "BUY", ticker: "RAT", value: 75 }],
	ticker_planets: [
		{ planet: "A", preferences: [{ type: "BOTH", ticker: "DW", value: 0 }] },
	],
};

const plans = [
	{ uuid: "P1", plan_name: "One", planet_natural_id: "A" },
	{ uuid: "P2", plan_name: "Two", planet_natural_id: "B" },
];

const CX1 = {
	uuid: "cx-1",
	cx_name: "Home NC1",
	modified_at: "v1",
	empires: [{ uuid: "E1", empire_name: "Sky", plans }],
	cx_data: CX_DATA,
} as CX;
const CX2 = {
	uuid: "cx-2",
	cx_name: "Other",
	modified_at: "v1",
	empires: [],
	cx_data: {
		cx_empire: [],
		cx_planets: [],
		ticker_empire: [],
		ticker_planets: [],
	},
} as CX;

async function mountView(cxUuid = "cx-1"): Promise<VueWrapper> {
	const pinia = createPinia();
	usePlanningStore(pinia).setCXs([CX1, CX2]);
	const { wrapper } = await mountComponent(
		ExchangesView,
		{ cxUuid },
		{ pinia }
	);
	const loader = wrapper.findComponent(WrapperPlanningDataLoader);
	loader.vm.$emit("data:cx", [CX1, CX2]);
	loader.vm.$emit("data:plan:list", plans);
	loader.vm.$emit("data:empire:list", CX1.empires);
	await flushPromises();
	return wrapper;
}

const panel = (wrapper: VueWrapper, name: string) =>
	wrapper.findComponent({ name });

// an edit of the all-planets rule and of planet A
async function edit(wrapper: VueWrapper): Promise<CXData> {
	nav.route.query = { scope: "all" };
	await flushPromises();
	const next = setPlanetRules(
		{ ...CX_DATA, cx_empire: [{ type: "BOTH", exchange: "AI1_30D" }] },
		"A",
		"cx_planets",
		[]
	);
	panel(wrapper, "CXScopeRules").vm.$emit("update:cxData", next);
	await flushPromises();
	return next;
}

const button = (wrapper: VueWrapper, text: string) =>
	wrapper.findAll("button").find((b) => b.text() === text)!;

describe("ExchangesView", () => {
	beforeEach(() => {
		nav.route.query = {};
		nav.replace.mockClear();
		save.mockClear();
		parse.mockReset();
		trackEvent.mockClear();
	});
	afterEach(() => settleConfirm(false));

	it("opens on the Overview", async () => {
		const wrapper = await mountView();

		expect(panel(wrapper, "CXOverview").exists()).toBe(true);
		expect(panel(wrapper, "CXScopeRules").exists()).toBe(false);
		expect(wrapper.find("h1").text()).toBe("Home NC1");
	});

	it.each([
		["all", "all"],
		["A", "A"],
		// rules but no plan
		["OLD", "OLD"],
	])("opens ?scope=%s", async (query, scope) => {
		nav.route.query = { scope: query };
		const wrapper = await mountView();

		expect(panel(wrapper, "CXScopeRules").props("scope")).toBe(scope);
	});

	it("opens the first preference for an unknown one", async () => {
		await mountView("gone");

		expect(nav.replace).toHaveBeenCalledWith("/exchanges/cx-1");
	});

	it("opens the Overview for an unknown planet", async () => {
		nav.route.query = { scope: "ZZ-000a" };
		const wrapper = await mountView();

		expect(panel(wrapper, "CXOverview").exists()).toBe(true);
	});

	it("switches scope through the URL", async () => {
		const wrapper = await mountView();

		await wrapper
			.findAll("nav button")
			.find((b) => b.text().includes("exchanges.scopes.all_hint"))!
			.trigger("click");
		await flushPromises();

		expect(nav.replace).toHaveBeenCalledWith({ query: { scope: "all" } });
		expect(panel(wrapper, "CXScopeRules").props("scope")).toBe("all");
	});

	it("counts changed scopes and discards them", async () => {
		const wrapper = await mountView();
		expect(wrapper.findComponent(SaveBar).exists()).toBe(false);

		await edit(wrapper);

		expect(wrapper.findComponent(SaveBar).props("count")).toBe(2);
		await button(wrapper, "management.save_bar.discard").trigger("click");
		expect(wrapper.findComponent(SaveBar).exists()).toBe(false);
		expect(trackEvent).toHaveBeenCalledWith("exchange:discard", {
			location: "exchanges_view",
		});
	});

	it("saves the payload, keeping planets without a plan", async () => {
		const wrapper = await mountView();
		const next = await edit(wrapper);

		await button(wrapper, "management.save_bar.save").trigger("click");
		await flushPromises();

		expect(save).toHaveBeenCalledWith(
			expect.objectContaining({ uuid: "cx-1" }),
			{ cx_name: "Home NC1", cx_data: buildPayload(next) }
		);
		const sent = save.mock.calls[0] as unknown as [CX, { cx_data: CXData }];
		expect(sent[1].cx_data.cx_planets.map((p) => p.planet)).toEqual([
			"OLD",
		]);
		expect(trackEvent).toHaveBeenCalledWith("exchange:update", {
			cx_uuid: "cx-1",
			location: "exchanges_view",
		});
	});

	describe("switching preference", () => {
		const switchTo = async (wrapper: VueWrapper) => {
			panel(wrapper, "CXPreferenceSwitch").vm.$emit("switch", "cx-2");
			await flushPromises();
		};

		it("switches at once without changes", async () => {
			const wrapper = await mountView();

			await switchTo(wrapper);

			expect(pendingConfirm.value).toBeNull();
			expect(nav.replace).toHaveBeenCalledWith("/exchanges/cx-2");
		});

		it("asks first with changes", async () => {
			const wrapper = await mountView();
			await edit(wrapper);
			nav.replace.mockClear();

			await switchTo(wrapper);
			expect(pendingConfirm.value?.options.title).toBe(
				"exchanges.switch.confirm_title"
			);
			settleConfirm(false);
			await flushPromises();
			expect(nav.replace).not.toHaveBeenCalled();
			expect(wrapper.findComponent(SaveBar).exists()).toBe(true);

			await switchTo(wrapper);
			settleConfirm(true);
			await flushPromises();
			expect(nav.replace).toHaveBeenCalledWith("/exchanges/cx-2");
		});
	});

	describe("CSV", () => {
		const imported: CXData = {
			cx_empire: [{ type: "BUY", exchange: "CI1_ASK" }],
			cx_planets: [],
			ticker_empire: [
				{ type: "BOTH", ticker: "H2O", value: 9 },
				{ type: "SELL", ticker: "FE", value: 100 },
			],
			ticker_planets: [
				{
					planet: "B",
					preferences: [{ type: "BUY", ticker: "RAT", value: 1 }],
				},
			],
		};

		async function importFile(wrapper: VueWrapper): Promise<void> {
			parse.mockResolvedValue({
				empireCX: imported.cx_empire,
				empireTickerOptions: imported.ticker_empire,
				planetsCX: [],
				plantesTickerOptions: [
					{
						planet: "B",
						exchanges: [],
						ticker: imported.ticker_planets[0].preferences,
					},
				],
			});
			const input = wrapper.find<HTMLInputElement>("input[type=file]");
			Object.defineProperty(input.element, "files", {
				value: [new File(["x"], "rules.csv")],
				configurable: true,
			});
			await input.trigger("change");
			await flushPromises();
		}

		it("asks before an import and keeps the rules on cancel", async () => {
			nav.route.query = { scope: "all" };
			const wrapper = await mountView();

			await importFile(wrapper);
			expect(pendingConfirm.value?.options.title).toBe(
				"exchanges.csv.confirm_title"
			);
			settleConfirm(false);
			await flushPromises();

			expect(wrapper.findComponent(SaveBar).exists()).toBe(false);
			expect(panel(wrapper, "CXScopeRules").props("cxData")).toEqual(
				CX_DATA
			);
		});

		it("replaces the rules on confirm, unsaved, on the Overview", async () => {
			nav.route.query = { scope: "all" };
			const wrapper = await mountView();

			await importFile(wrapper);
			settleConfirm(true);
			await flushPromises();

			expect(wrapper.findComponent(SaveBar).exists()).toBe(true);
			expect(panel(wrapper, "CXOverview").props("cxData")).toEqual(
				imported
			);
		});

		it("shows a toast when the file can't be read", async () => {
			const wrapper = await mountView();
			parse.mockRejectedValue(new Error("Missing CSV columns: CX"));

			const input = wrapper.find<HTMLInputElement>("input[type=file]");
			Object.defineProperty(input.element, "files", {
				value: [new File(["x"], "rules.csv")],
				configurable: true,
			});
			await input.trigger("change");
			await flushPromises();

			expect(pendingConfirm.value).toBeNull();
			const { toasts } = await import("@/ui/useToast");
			expect(toasts.value.at(-1)?.type).toBe("error");
		});

		it("exports the rules as before", async () => {
			const { useCXImportExport } = await vi.importActual<
				typeof import("@/features/exchanges/useCXImportExport")
			>("@/features/exchanges/useCXImportExport");
			let blob: Blob | undefined;
			URL.createObjectURL = vi.fn((b: Blob) => {
				blob = b;
				return "blob:x";
			});
			URL.revokeObjectURL = vi.fn();
			const click = vi
				.spyOn(HTMLAnchorElement.prototype, "click")
				.mockImplementation(() => {});
			const wrapper = await mountView();

			await button(wrapper, "exchanges.header.export").trigger("click");
			await nextTick();

			// the mapping the old view's CSV panel used
			const expected = useCXImportExport().generateSettingsCSV(
				CX_DATA.cx_empire,
				CX_DATA.ticker_empire,
				CX_DATA.cx_planets.map((p) => ({
					planet: p.planet,
					exchanges: p.preferences,
					ticker: [],
				})),
				CX_DATA.ticker_planets.map((p) => ({
					planet: p.planet,
					exchanges: [],
					ticker: p.preferences,
				}))
			);
			expect(await blob!.text()).toBe(expected);
			expect(click).toHaveBeenCalled();
			click.mockRestore();
		});
	});
});
