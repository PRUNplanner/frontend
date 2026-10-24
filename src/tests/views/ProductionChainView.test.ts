import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import type { Slots } from "vue";
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";

import ProductionChainView from "@/views/tools/ProductionChainView.vue";
import ChainSettings from "@/features/production_chain/components/ChainSettings.vue";
import { toasts } from "@/ui/useToast";
import { usePlanningStore } from "@/stores/planningStore";
import cxList from "@/tests/test_data/api_data_cx_list.json";
import { mountComponent } from "@/tests/mountComponent";
import {
	index,
	seedGameData,
	NOW,
	splitInput,
} from "@/tests/features/production_chain/chain.fixtures";
import { encodeChain } from "@/features/production_chain/engine/chainUrl";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers
const { passThrough, nav, trackEvent, execute, copy } = vi.hoisted(() => ({
	copy: vi.fn(),
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
	nav: {
		route: { query: {} as Record<string, string> },
		replace: vi.fn(),
	},
	trackEvent: vi.fn(),
	execute: vi.fn(),
}));

vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => ({
	default: { name: "HelpDrawer", render: () => null },
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));
vi.mock("@/util/data", async (original) => ({
	...(await original<typeof import("@/util/data")>()),
	copyToClipboard: copy,
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params?: unknown) => ({
		execute: () => execute(name, params),
	}),
}));
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRoute: () => nav.route,
	useRouter: () => ({
		replace: nav.replace,
		resolve: () => ({ href: "/production-chain" }),
	}),
}));

const STORAGE_KEY = "prunplanner_production_chain";

const toolUses = () =>
	trackEvent.mock.calls.filter(([event]) => event === "tool:use");

describe("ProductionChainView", () => {
	beforeAll(seedGameData);

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		nav.route.query = {};
		nav.replace.mockClear();
		trackEvent.mockClear();
		execute.mockReset();
		execute.mockResolvedValue(index);
		localStorage.clear();
	});

	afterEach(() => vi.useRealTimers());

	it("starts empty without a link or a last chain (AC 15)", async () => {
		const { wrapper } = await mountComponent(ProductionChainView);
		expect(wrapper.find("[data-testid='chain-empty']").exists()).toBe(true);
		expect(
			wrapper.find("[data-testid='chain-result-profit']").exists()
		).toBe(false);
		const createPlans = wrapper.find("[data-testid='chain-create-plans']");
		expect(createPlans.attributes("disabled")).toBeDefined();
		expect(execute).not.toHaveBeenCalled();
	});

	it("restores the chain from the URL, untracked (AC 15)", async () => {
		nav.route.query = {
			t: "DW:100,RAT:50",
			eff: "80",
			raw: "buy",
			byp: "sell",
			src: "C:buy",
		};
		const { wrapper } = await mountComponent(ProductionChainView);
		expect(wrapper.find("[data-testid='chain-empty']").exists()).toBe(
			false
		);
		expect(wrapper.find("[data-testid='chain-row-DW']").exists()).toBe(
			true
		);
		expect(wrapper.find("[data-testid='chain-row-RAT']").exists()).toBe(
			true
		);
		expect(wrapper.findAll("[data-testid='chain-target']").length).toBe(2);
		vi.advanceTimersByTime(2000);
		expect(toolUses()).toEqual([]);
		expect(nav.replace).not.toHaveBeenCalled();
	});

	it("writes changes to the URL and the browser, and tracks them", async () => {
		nav.route.query = { t: "DW:100" };
		const { wrapper } = await mountComponent(ProductionChainView);
		await wrapper
			.find("button[aria-label='production_chains.targets.more']")
			.trigger("click");
		await flushPromises();
		const query = nav.replace.mock.calls.at(-1)![0].query;
		expect(query.t).toBe("DW:110");
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).t).toBe("DW:110");

		vi.advanceTimersByTime(1100);
		expect(toolUses()).toHaveLength(1);
		expect(toolUses()[0][1]).toMatchObject({
			tool_name: "production_chain",
			targets: ["DW"],
			target_count: 1,
			efficiency: 100,
			raw_source: "buy",
			byproducts: "cover",
		});
	});

	it("opens the last chain from the browser without a link", async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: "OVE:50" }));
		const { wrapper } = await mountComponent(ProductionChainView);
		expect(wrapper.find("[data-testid='chain-row-OVE']").exists()).toBe(
			true
		);
	});

	it("loads the planet index only when something extracts (AC 6)", async () => {
		nav.route.query = { t: "DW:100", raw: "extract" };
		const { wrapper } = await mountComponent(ProductionChainView);
		await flushPromises();
		expect(execute).toHaveBeenCalledTimes(1);
		await vi.waitFor(() =>
			expect(
				wrapper
					.find(
						"button[aria-label='production_chains.table.choose_planet']"
					)
					.exists()
			).toBe(true)
		);
	});
});

describe("ProductionChainView interactions", () => {
	beforeAll(seedGameData);

	beforeEach(() => {
		nav.route.query = {};
		nav.replace.mockClear();
		trackEvent.mockClear();
		copy.mockClear();
		execute.mockReset();
		execute.mockResolvedValue(index);
		localStorage.clear();
		toasts.value = [];
	});

	const lastQuery = () => nav.replace.mock.calls.at(-1)![0].query;
	const actions = () =>
		trackEvent.mock.calls
			.filter(([e]) => e === "production_chain:action")
			.map(([, p]) => p.action);
	const byText = (
		wrapper: Awaited<ReturnType<typeof mountComponent>>["wrapper"],
		text: string
	) => wrapper.findAll("button").find((b) => b.text() === text)!;

	it("copies the chain link", async () => {
		nav.route.query = { t: "DW:100" };
		const { wrapper } = await mountComponent(ProductionChainView);
		await byText(wrapper, "production_chains.header.copy_link").trigger(
			"click"
		);
		expect(copy.mock.calls[0][0]).toMatch(/\/production-chain$/);
		expect(actions()).toEqual(["link_copy"]);
		expect(toasts.value.at(-1)!.text).toBe(
			"production_chains.header.link_copied"
		);
	});

	it("buys all cheaper rows and undoes it", async () => {
		nav.route.query = { t: "GWS:1" };
		const { wrapper } = await mountComponent(ProductionChainView);
		await wrapper
			.find("[data-testid='chain-chip-cheaper']")
			.trigger("click");
		const buyAll = wrapper
			.findAll("[data-testid='chain-filter-banner'] button")
			.find((b) =>
				b.text().startsWith("production_chains.filter.buy_all")
			)!;
		await buyAll.trigger("click");
		await flushPromises();
		expect(lastQuery().src).toMatch(/:buy/);
		expect(actions()).toContain("buy_all");
		toasts.value.at(-1)!.action!.onClick();
		await flushPromises();
		expect(lastQuery().src).toBeUndefined();
	});

	it("sets a source, a planet and a recipe", async () => {
		nav.route.query = { t: "DW:100" };
		const { wrapper } = await mountComponent(ProductionChainView);
		const extract = wrapper
			.findAll("[data-testid='chain-row-H2O'] [role=group] button")
			.find((b) => b.text() === "production_chains.table.extract")!;
		await extract.trigger("click");
		await flushPromises();
		expect(lastQuery().src).toBe("H2O:extract");
		expect(execute).toHaveBeenCalledTimes(1);

		await vi.waitFor(() =>
			expect(
				wrapper
					.find(
						"button[aria-label='production_chains.table.choose_planet']"
					)
					.exists()
			).toBe(true)
		);
		await wrapper
			.find("button[aria-label='production_chains.table.choose_planet']")
			.trigger("click");
		const body = new DOMWrapper(document.body);
		await vi.waitFor(() =>
			expect(
				body.findAll("[data-testid='chain-planet-row']").length
			).toBeGreaterThan(0)
		);
		await body
			.findAll("[data-testid='chain-planet-row']")[1]
			.findAll("button")
			.at(-1)!
			.trigger("click");
		await flushPromises();
		expect(lastQuery().planet).toMatch(/^H2O:/);

		await wrapper
			.find("button[aria-label='production_chains.table.choose_recipe']")
			.trigger("click");
		await flushPromises();
		const options = body.findAll("[data-testid='chain-recipe-option']");
		await options.at(-1)!.trigger("click");
		await flushPromises();
		expect(lastQuery().r).toMatch(/^DW:/);
		expect(actions()).toEqual(["source_set", "planet_pick", "recipe_pick"]);
	});

	it("changes the settings", async () => {
		nav.route.query = { t: "DW:100" };
		const { wrapper } = await mountComponent(ProductionChainView);
		const settings = wrapper.findComponent(ChainSettings);
		settings.vm.$emit("update:efficiency", 80);
		settings.vm.$emit("update:rawSource", "extract");
		settings.vm.$emit("update:byproducts", "sell");
		await flushPromises();
		expect(lastQuery()).toMatchObject({
			eff: "80",
			raw: "extract",
			byp: "sell",
		});
	});

	it("says when planets can't load, and retries", async () => {
		execute.mockRejectedValueOnce(new Error("down"));
		nav.route.query = { t: "DW:100", raw: "extract" };
		const { wrapper } = await mountComponent(ProductionChainView);
		await flushPromises();
		expect(wrapper.text()).toContain(
			"production_chains.panel.planets_error"
		);
		await byText(wrapper, "production_chains.panel.retry").trigger("click");
		await flushPromises();
		expect(execute).toHaveBeenCalledTimes(2);
		expect(wrapper.text()).not.toContain(
			"production_chains.panel.planets_error"
		);
	});

	it("works without browser storage", async () => {
		const get = vi
			.spyOn(Storage.prototype, "getItem")
			.mockImplementation(() => {
				throw new Error("blocked");
			});
		const set = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => {
				throw new Error("blocked");
			});
		try {
			const { wrapper } = await mountComponent(ProductionChainView);
			expect(wrapper.find("[data-testid='chain-empty']").exists()).toBe(
				true
			);
			wrapper
				.findComponent({ name: "ChainTargets" })
				.vm.$emit("update:targets", [{ ticker: "DW", perDay: 5 }]);
			await flushPromises();
			expect(lastQuery().t).toBe("DW:5");
		} finally {
			get.mockRestore();
			set.mockRestore();
		}
	});

	it("takes the CX from a link only when it is one of the viewer's", async () => {
		const own = cxList[0].uuid;
		for (const [cx, follows] of [
			[own, false],
			["not-mine", true],
		] as const) {
			const pinia = createPinia();
			// @ts-expect-error fixture strings for the typed unions
			usePlanningStore(pinia).setCXs(cxList.slice(0, 2));
			nav.route.query = { t: "DW:100", cx };
			const { wrapper } = await mountComponent(
				ProductionChainView,
				{},
				{ pinia }
			);
			expect(
				wrapper.findComponent(ChainSettings).props("followDefault")
			).toBe(follows);
		}
	});

	describe("bases", () => {
		/** async components: wait for their import, then render */
		const settle = async () => {
			await vi.dynamicImportSettled();
			await flushPromises();
		};
		const actions = () =>
			trackEvent.mock.calls
				.filter(([event]) => event === "production_chain:action")
				.map(([, props]) => props.action);
		const lastQuery = () => nav.replace.mock.calls.at(-1)![0].query;

		async function openBases(
			wrapper: Awaited<ReturnType<typeof mountComponent>>["wrapper"]
		) {
			const tab = wrapper
				.findAll("nav button")
				.find((b) => b.text() === "production_chains.panel.bases")!;
			await tab.trigger("click");
			await settle();
		}

		it("splits, moves and removes bases, kept in the URL (AC 6, 14)", async () => {
			nav.route.query = { t: "DW:100,RAT:100,OVE:50" };
			const { wrapper } = await mountComponent(ProductionChainView);
			await openBases(wrapper);
			await wrapper.find("[data-testid='chain-split']").trigger("click");
			await flushPromises();
			expect(lastQuery().bases).toBe(
				"A:game.expertise.AGRICULTURE::auto,B:game.expertise.FOOD_INDUSTRIES::auto"
			);
			expect(lastQuery().base).toContain("DW:B");

			wrapper
				.findComponent({ name: "ChainPanel" })
				.vm.$emit("base", "DW", "new");
			await flushPromises();
			expect(lastQuery().base).toContain("DW:C");
			expect(lastQuery().bases).toContain("C:::auto");

			wrapper
				.findComponent({ name: "ChainBases" })
				.vm.$emit("remove", "C");
			await flushPromises();
			expect(lastQuery().bases).not.toContain("C:");
			// its steps go back to the first base
			expect(lastQuery().base).not.toContain("DW:");
			expect(actions()).toEqual([
				"split",
				"base_add",
				"base_move",
				"base_remove",
			]);
		});

		it("creates plans in a new empire and keeps the links until the chain changes (AC 10–13)", async () => {
			// the fixture's COGC programs run then
			vi.useFakeTimers({
				toFake: ["setTimeout", "clearTimeout", "Date"],
				now: NOW,
			});
			nav.route.query = encodeChain({
				input: splitInput(),
				cx: undefined,
			});
			let plan = 0;
			execute.mockImplementation((name: string) => {
				if (name === "GetPlanetSearchIndex")
					return Promise.resolve(index);
				if (name === "GetAllEmpires") return Promise.resolve([]);
				if (name === "CreateEmpire")
					return Promise.resolve({
						uuid: "e9",
						empire_name: "Chain",
					});
				if (name === "CreatePlan")
					return Promise.resolve({
						uuid: `p${++plan}`,
						modified_at: "",
					});
				return Promise.resolve([]);
			});
			const { wrapper } = await mountComponent(ProductionChainView);
			await flushPromises();
			await wrapper
				.find("[data-testid='chain-create-plans']")
				.trigger("click");
			await settle();
			const body = new DOMWrapper(document.body);
			await body
				.find("[data-testid='chain-create-submit']")
				.trigger("click");
			await flushPromises();

			const calls = execute.mock.calls.filter(([name]) =>
				name.startsWith("Create")
			);
			expect(calls.map(([name]) => name)).toEqual([
				"CreateEmpire",
				"CreatePlan",
				"CreatePlan",
			]);
			expect(calls[0][1].data).toMatchObject({ empire_faction: "NONE" });
			expect(calls[1][1].data).toMatchObject({
				empire_uuid: "e9",
				planet_natural_id: "PG-899b",
				plan_cogc: "AGRICULTURE",
			});
			expect(trackEvent).toHaveBeenCalledWith("production_chain:action", {
				action: "plans_create",
				plan_count: 2,
				empire: "new",
				faction: "NONE",
			});
			expect(
				body.find("[data-testid='chain-create-result']").text()
			).toContain("A ·");

			await openBases(wrapper);
			expect(
				wrapper.find("[data-testid='chain-created-links']").exists()
			).toBe(true);
			wrapper
				.findComponent({ name: "ChainBases" })
				.vm.$emit("rename", "A", "Farms");
			await flushPromises();
			expect(
				wrapper.find("[data-testid='chain-created-links']").exists()
			).toBe(false);
		});

		it("keeps the plans made before a failure (AC 13)", async () => {
			nav.route.query = encodeChain({
				input: splitInput(),
				cx: undefined,
			});
			execute.mockImplementation((name: string) => {
				if (name === "GetPlanetSearchIndex")
					return Promise.resolve(index);
				if (name === "CreatePlan") {
					const n = execute.mock.calls.filter(
						([x]) => x === "CreatePlan"
					).length;
					return n === 1
						? Promise.resolve({ uuid: "p1", modified_at: "" })
						: Promise.reject(new Error("down"));
				}
				return Promise.resolve([]);
			});
			const { wrapper } = await mountComponent(ProductionChainView);
			await flushPromises();
			await wrapper
				.find("[data-testid='chain-create-plans']")
				.trigger("click");
			await settle();
			const body = new DOMWrapper(document.body);
			wrapper
				.findAllComponents({ name: "PSegmented" })
				.at(-1)!
				.vm.$emit("update:value", "none");
			await flushPromises();
			await body
				.find("[data-testid='chain-create-submit']")
				.trigger("click");
			await flushPromises();
			expect(
				execute.mock.calls.some(([name]) => name === "CreateEmpire")
			).toBe(false);
			expect(
				body.find("[data-testid='chain-create-error']").exists()
			).toBe(true);
			expect(
				body.find("[data-testid='chain-create-result']").text()
			).toContain("A ·");
		});

		it("sets a base's planet and program, keeps the limits", async () => {
			nav.route.query = { t: "DW:100,RAT:100,OVE:50" };
			execute.mockImplementation((name: string) =>
				Promise.resolve(name === "GetAllPlans" ? [] : index)
			);
			const { wrapper } = await mountComponent(ProductionChainView);
			await openBases(wrapper);
			const bases = () => wrapper.findComponent({ name: "ChainBases" });

			// the only base can't be removed
			bases().vm.$emit("remove", "A");
			await flushPromises();
			expect(actions()).not.toContain("base_remove");

			bases().vm.$emit("cogc", "A", "AGRICULTURE");
			bases().vm.$emit("planet", "A");
			await settle();
			const picker = wrapper.findComponent({
				name: "ChainBasePlanetPicker",
			});
			expect(picker.exists()).toBe(true);
			picker.vm.$emit("use", "PG-899b");
			await flushPromises();
			expect(lastQuery().bases).toBe("A::PG-899b:AGRICULTURE");

			// eight bases at most; moving to a new one is then a no-op
			for (let i = 0; i < 8; i++) bases().vm.$emit("add");
			await flushPromises();
			expect(lastQuery().bases.split(",")).toHaveLength(8);
			const panel = wrapper.findComponent({ name: "ChainPanel" });
			panel.vm.$emit("base", "DW", "new");
			panel.vm.$emit("base", "RAT", "B");
			await flushPromises();
			expect(lastQuery().base).toBe("RAT:B");
			expect(actions()).toEqual(
				expect.arrayContaining([
					"base_cogc",
					"base_planet",
					"base_add",
					"base_move",
				])
			);
		});

		it("creates plans in an existing empire", async () => {
			nav.route.query = encodeChain({
				input: splitInput(),
				cx: undefined,
			});
			execute.mockImplementation((name: string) => {
				if (name === "GetPlanetSearchIndex")
					return Promise.resolve(index);
				if (name === "GetAllEmpires")
					return Promise.resolve([
						{
							uuid: "e1",
							empire_name: "Main",
							empire_faction: "NONE",
							plans: [],
						},
					]);
				if (name === "CreatePlan")
					return Promise.resolve({ uuid: "p1", modified_at: "" });
				return Promise.resolve([]);
			});
			const { wrapper } = await mountComponent(ProductionChainView);
			await flushPromises();
			await wrapper
				.find("[data-testid='chain-create-plans']")
				.trigger("click");
			await settle();
			const dialog = wrapper.findComponent({ name: "ChainCreatePlans" });
			dialog
				.findComponent({ name: "PSegmented" })
				.vm.$emit("update:value", "existing");
			await flushPromises();
			dialog
				.findAllComponents({ name: "PSelect" })
				.at(-1)!
				.vm.$emit("update:value", "e1");
			await flushPromises();
			await new DOMWrapper(document.body)
				.find("[data-testid='chain-create-submit']")
				.trigger("click");
			await flushPromises();
			const calls = execute.mock.calls.filter(([name]) =>
				name.startsWith("Create")
			);
			expect(calls.map(([name]) => name)).toEqual([
				"CreatePlan",
				"CreatePlan",
			]);
			expect(calls[0][1].data.empire_uuid).toBe("e1");
		});
	});
});
