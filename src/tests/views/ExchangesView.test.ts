import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { reportError } from "@/lib/analytics/useAnalytics";
import { nextTick, type Ref, type Slots } from "vue";
import {
	flushPromises,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";
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
import type { IExchangeNote } from "@/features/exchanges/exchangeNotes.util";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers. __esModule lets
// defineAsyncComponent pick the default export of a mocked module
const { passThrough, stub, nav, save, parse, trackEvent, mocks } = vi.hoisted(
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
				props: [
					"scope",
					"cxData",
					"notes",
					"rows",
					"planetCounts",
					"unplanned",
					"planetLabel",
				],
				emits: ["open", "use-cogm", "delete", "update:cxData"],
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
		// the refs and sources the mocked composables are created with
		mocks: {
			onRemoteChange: vi.fn(() => false),
			remoteNotice: undefined as unknown as Ref<
				"saved" | "deleted" | null
			>,
			conflictShow: undefined as unknown as Ref<boolean>,
			cogms: undefined as unknown as Ref<Map<string, unknown>>,
			planSource: undefined as unknown as Record<string, () => unknown>,
		},
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
vi.mock("@/features/save_conflict/components/SaveConflictDialog.vue", () =>
	stub("SaveConflictDialog")
);
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent,
}));
vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => ({ planetName: (id: string) => id }),
}));
// plans are calculated in its own test
vi.mock("@/features/exchanges/useExchangePlanData", async () => {
	const { computed, ref } = await import("vue");
	return {
		useExchangePlanData: (source: { cxData: () => CXData | undefined }) => {
			mocks.planSource = source as never;
			mocks.cogms = ref(new Map());
			return {
				bases: ref([]),
				isCalculating: ref(false),
				progress: ref({ current: 0, total: 0 }),
				pricedData: computed(() => source.cxData()),
				materialRows: ref([]),
				materialCOGMs: mocks.cogms,
				planetMaterialRows: () => [],
				priceBookFor: () => ({}),
				bookForPlanet: ref(() => ({})),
			};
		},
	};
});
vi.mock("@/features/cx/useCXSave", async () => {
	const { ref } = await import("vue");
	return {
		useCXSave: () => {
			mocks.remoteNotice = ref(null);
			mocks.conflictShow = ref(false);
			return {
				save,
				remoteNotice: mocks.remoteNotice,
				conflict: { show: mocks.conflictShow },
				onRemoteChange: mocks.onRemoteChange,
			};
		},
	};
});
// the file reading is tested in useCXImportExport.test.ts
vi.mock("@/features/exchanges/useCXImportExport", async (original) => {
	const actual =
		await original<
			typeof import("@/features/exchanges/useCXImportExport")
		>();
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
				Object.entries(
					(to as { query: Record<string, string> }).query
				).filter(([, v]) => v !== undefined)
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
		{
			planet: "A",
			preferences: [{ type: "BOTH", ticker: "DW", value: 0 }],
		},
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

// the store and props of the last mounted view
let planning: ReturnType<typeof usePlanningStore>;
let setViewProps: (next: Record<string, unknown>) => Promise<void>;

// no cxUuid: the route has none and the loader doesn't pick one
async function mountView(cxUuid: string | null = "cx-1"): Promise<VueWrapper> {
	const pinia = createPinia();
	planning = usePlanningStore(pinia);
	planning.setCXs([CX1, CX2]);
	const { wrapper, setProps } = await mountComponent(
		ExchangesView,
		cxUuid === null ? {} : { cxUuid },
		{ pinia }
	);
	setViewProps = setProps;
	// the error view is a lazy component the Suspense waits for
	await vi.dynamicImportSettled();
	await flushPromises();
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
		mocks.onRemoteChange.mockReset().mockReturnValue(false);
		save.mockReset().mockResolvedValue(true);
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

	it("shows an error instead of the editor without a preference", async () => {
		const wrapper = await mountView(null);

		expect(wrapper.text()).toContain("exchanges.empty.title");
		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe(
			"/manage#cx"
		);
		expect(panel(wrapper, "CXHeader").exists()).toBe(false);
	});

	it("opens the preference the loader picks", async () => {
		const wrapper = await mountView(null);

		wrapper
			.findComponent(WrapperPlanningDataLoader)
			.vm.$emit("update:cx-uuid", "cx-2");
		await flushPromises();

		expect(wrapper.find("h1").text()).toBe("Other");
		expect(wrapper.text()).not.toContain("exchanges.empty.title");
	});

	it("takes the new preference once the route changes", async () => {
		const wrapper = await mountView();

		await setViewProps({ cxUuid: "cx-2" });

		expect(wrapper.find("h1").text()).toBe("Other");
	});

	describe("scope", () => {
		it("keeps other query values when the scope changes", async () => {
			nav.route.query = { debug: "1" };
			const wrapper = await mountView();

			panel(wrapper, "CXOverview").vm.$emit("open", "A");
			await flushPromises();

			expect(nav.replace).toHaveBeenCalledWith({
				query: { debug: "1", scope: "A" },
			});
			expect(panel(wrapper, "CXScopeRules").props("scope")).toBe("A");
		});

		it("opens a scope from the rules of another", async () => {
			nav.route.query = { scope: "all" };
			const wrapper = await mountView();

			panel(wrapper, "CXScopeRules").vm.$emit("open", "A");
			await flushPromises();

			expect(panel(wrapper, "CXScopeRules").props("scope")).toBe("A");
		});

		it.each([
			["all", false],
			["A", false],
			["OLD", true],
		])("marks %s unplanned: %s", async (scope, unplanned) => {
			nav.route.query = { scope };
			const wrapper = await mountView();

			expect(panel(wrapper, "CXScopeRules").props("unplanned")).toBe(
				unplanned
			);
			expect(panel(wrapper, "CXScopeRules").props("planetLabel")).toBe(
				scope
			);
		});

		it("gives a scope the notes of its rules", async () => {
			nav.route.query = { scope: "A" };
			const wrapper = await mountView();

			expect(
				panel(wrapper, "CXScopeRules")
					.props("notes")
					.map((n: IExchangeNote) => [n.code, n.scope])
			).toEqual([["fixed_zero", "A"]]);
		});

		it("leaves COGM drifts to the Overview", async () => {
			const wrapper = await mountView();
			mocks.cogms.value = new Map([
				["RAT", { ticker: "RAT", value: 50, entries: [] }],
			]);
			await flushPromises();
			const codes = (name: string) =>
				panel(wrapper, name)
					.props("notes")
					.map((n: IExchangeNote) => n.code);

			expect(codes("CXOverview")).toContain("cogm_drift");

			nav.route.query = { scope: "all" };
			await flushPromises();

			expect(codes("CXScopeRules")).toEqual(["unplanned_planets"]);
		});

		it("counts the planets with own rules and with any plan", async () => {
			const wrapper = await mountView();

			// A has rules and a plan, OLD has no plan, B only a plan
			expect(panel(wrapper, "CXOverview").props("planetCounts")).toEqual([
				1, 2,
			]);
		});
	});

	describe("price plans", () => {
		it("prices the plans of the preference with its edits", async () => {
			const wrapper = await mountView();
			const next = await edit(wrapper);
			const source = mocks.planSource;

			expect(source.plans()).toEqual(plans);
			expect(source.empires()).toEqual(CX1.empires);
			expect(source.cx()).toMatchObject({ uuid: "cx-1" });
			expect(source.cxData()).toEqual(next);
			expect(source.includeOthers()).toBe(false);
		});

		it("includes the plans of other preferences on request", async () => {
			const wrapper = await mountView();

			panel(wrapper, "CXScopeList").vm.$emit(
				"update:includeOthers",
				true
			);
			await flushPromises();

			expect(mocks.planSource.includeOthers()).toBe(true);
		});
	});

	describe("edits", () => {
		const note = { tickers: ["RAT"], cogm: 12.345 } as IExchangeNote;

		it.each([
			["the Overview", "CXOverview", {}],
			["the rules of a scope", "CXScopeRules", { scope: "all" }],
		])(
			"fixes the buy price at the COGM from %s",
			async (_, name, query) => {
				nav.route.query = query;
				const wrapper = await mountView();

				panel(wrapper, name).vm.$emit("use-cogm", note);
				await flushPromises();

				expect(
					panel(wrapper, name).props("cxData").ticker_empire
				).toEqual([{ type: "BUY", ticker: "RAT", value: 12.35 }]);
				expect(wrapper.findComponent(SaveBar).props("count")).toBe(1);
				expect(trackEvent).toHaveBeenCalledWith("exchange:use_cogm", {
					location: "exchanges_view",
					material_ticker: "RAT",
				});
			}
		);

		it("deletes the rules of a planet", async () => {
			nav.route.query = { scope: "A" };
			const wrapper = await mountView();

			panel(wrapper, "CXScopeRules").vm.$emit("delete", "A");
			await flushPromises();

			const data = panel(wrapper, "CXScopeRules").props("cxData");
			expect(
				data.cx_planets.map((p: { planet: string }) => p.planet)
			).toEqual(["OLD"]);
			expect(data.ticker_planets).toEqual([]);
			// the rest stays
			expect(data.cx_empire).toEqual(CX_DATA.cx_empire);
			expect(wrapper.findComponent(SaveBar).exists()).toBe(true);
		});

		it("deletes a planet from the scope list", async () => {
			const wrapper = await mountView();

			panel(wrapper, "CXScopeList").vm.$emit("delete", "OLD");
			await flushPromises();

			expect(
				panel(wrapper, "CXOverview")
					.props("cxData")
					.cx_planets.map((p: { planet: string }) => p.planet)
			).toEqual(["A"]);
		});

		it("renames the preference as an unsaved change", async () => {
			const wrapper = await mountView();

			panel(wrapper, "CXHeader").vm.$emit("rename", "Renamed");
			await flushPromises();

			expect(wrapper.find("h1").text()).toBe("Renamed");
			expect(wrapper.findComponent(SaveBar).props("count")).toBe(1);

			await button(wrapper, "management.save_bar.save").trigger("click");
			await flushPromises();

			expect(save).toHaveBeenCalledWith(expect.anything(), {
				cx_name: "Renamed",
				cx_data: buildPayload(CX_DATA),
			});
		});
	});

	describe("saving", () => {
		const bar = (wrapper: VueWrapper) => wrapper.findComponent(SaveBar);

		it("closes the bar after a save", async () => {
			const wrapper = await mountView();
			await edit(wrapper);

			bar(wrapper).vm.$emit("save");
			await flushPromises();

			expect(bar(wrapper).exists()).toBe(false);
		});

		it("keeps the edits when the save wasn't made", async () => {
			save.mockResolvedValue(false);
			const wrapper = await mountView();
			await edit(wrapper);

			bar(wrapper).vm.$emit("save");
			await flushPromises();

			expect(bar(wrapper).props("state")).toBe("idle");
			expect(bar(wrapper).props("count")).toBe(2);
		});

		it("saves once on a double click", async () => {
			let done: (saved: boolean) => void = () => {};
			save.mockReturnValue(new Promise((resolve) => (done = resolve)));
			const wrapper = await mountView();
			await edit(wrapper);

			bar(wrapper).vm.$emit("save");
			bar(wrapper).vm.$emit("save");
			await flushPromises();

			expect(save).toHaveBeenCalledTimes(1);
			expect(bar(wrapper).props("state")).toBe("saving");
			done(false);
			await flushPromises();
			expect(bar(wrapper).props("state")).toBe("idle");
		});

		it("shows an error state, until discarded", async () => {
			const failure = new Error("offline");
			save.mockRejectedValueOnce(failure);
			const wrapper = await mountView();
			await edit(wrapper);

			bar(wrapper).vm.$emit("save");
			await flushPromises();

			expect(bar(wrapper).props("state")).toBe("error");
			expect(reportError).toHaveBeenCalledWith(failure);

			bar(wrapper).vm.$emit("discard");
			await flushPromises();
			await edit(wrapper);

			expect(bar(wrapper).props("state")).toBe("idle");
		});

		it("shows the conflict dialog the save asks for", async () => {
			const wrapper = await mountView();
			expect(
				wrapper.findComponent({ name: "SaveConflictDialog" }).exists()
			).toBe(false);

			mocks.conflictShow.value = true;
			await flushPromises();

			expect(
				wrapper.findComponent({ name: "SaveConflictDialog" }).exists()
			).toBe(true);
		});
	});

	describe("saved or deleted in another tab", () => {
		const elsewhere = (cx: Partial<CX> | null) => {
			planning.setCXs(cx ? [{ ...CX1, ...cx } as CX, CX2] : [CX2]);
			return flushPromises();
		};
		const notify = (notice: "saved" | "deleted") =>
			mocks.onRemoteChange.mockImplementation(() => {
				mocks.remoteNotice.value = notice;
				return false;
			});

		it("reloads when the preference has no unsaved edits", async () => {
			mocks.onRemoteChange.mockReturnValue(true);
			const wrapper = await mountView();

			await elsewhere({
				modified_at: "v2",
				cx_name: "Renamed elsewhere",
			});

			expect(mocks.onRemoteChange).toHaveBeenCalledWith(
				expect.objectContaining({ modified_at: "v2" }),
				expect.objectContaining({ uuid: "cx-1", modified_at: "v1" }),
				expect.objectContaining({ cx_name: "Home NC1" })
			);
			expect(wrapper.find("h1").text()).toBe("Renamed elsewhere");
		});

		it("offers a reload when there are unsaved edits", async () => {
			notify("saved");
			const wrapper = await mountView();
			await edit(wrapper);

			await elsewhere({
				modified_at: "v2",
				cx_name: "Renamed elsewhere",
			});

			expect(wrapper.find("h1").text()).toBe("Home NC1");
			expect(wrapper.text()).toContain(
				"save_conflict.notice.saved_elsewhere"
			);
			expect(wrapper.findComponent(SaveBar).exists()).toBe(true);

			await button(wrapper, "save_conflict.notice.reload").trigger(
				"click"
			);
			await flushPromises();

			expect(wrapper.find("h1").text()).toBe("Renamed elsewhere");
			expect(wrapper.text()).not.toContain("save_conflict.notice");
			expect(wrapper.findComponent(SaveBar).exists()).toBe(false);
		});

		it("tells when the preference was deleted", async () => {
			notify("deleted");
			const wrapper = await mountView();

			await elsewhere(null);

			expect(mocks.onRemoteChange).toHaveBeenCalledWith(
				undefined,
				expect.objectContaining({ uuid: "cx-1" }),
				expect.anything()
			);
			expect(wrapper.text()).toContain(
				"save_conflict.notice.deleted_elsewhere"
			);
			expect(wrapper.find("h1").text()).toBe("Home NC1");
			// nothing to reload
			expect(
				button(wrapper, "save_conflict.notice.reload")
			).toBeUndefined();
		});

		it("ignores a copy that wasn't modified", async () => {
			await mountView();

			await elsewhere({});

			expect(mocks.onRemoteChange).not.toHaveBeenCalled();
		});

		it("ignores changes while saving", async () => {
			save.mockReturnValue(new Promise(() => {}));
			const wrapper = await mountView();
			await edit(wrapper);
			wrapper.findComponent(SaveBar).vm.$emit("save");
			await flushPromises();

			await elsewhere({ modified_at: "v2" });

			expect(mocks.onRemoteChange).not.toHaveBeenCalled();
		});

		it("keeps the loaded preference while the route's isn't there yet", async () => {
			const wrapper = await mountView();

			await setViewProps({ cxUuid: "cx-3" });

			expect(mocks.onRemoteChange).not.toHaveBeenCalled();
			expect(wrapper.find("h1").text()).toBe("Home NC1");
		});
	});
});
