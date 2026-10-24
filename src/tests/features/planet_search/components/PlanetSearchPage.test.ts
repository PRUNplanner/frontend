import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { h, isReactive, nextTick, reactive, ref } from "vue";

import PlanetSearchPage from "@/features/planet_search/components/PlanetSearchPage.vue";
import { defaultFilter } from "@/features/planet_search/planetSearch.engine";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	PlanetSearchFilter,
	PlanetSearchReference,
	PlanetSearchSaved,
} from "@/features/planet_search/planetSearch.schemas";

// test data
import fixture from "@/tests/test_data/api_data_planet_search_index.json";

const route = reactive({ query: {} as Record<string, string> });
const replace = vi.fn();
// the page's leave guard, run it to leave
const leave = vi.hoisted(() => ({ guard: () => {} }));
vi.mock("vue-router", () => ({
	useRoute: () => route,
	useRouter: () => ({ replace }),
	onBeforeRouteLeave: (guard: () => void) => (leave.guard = guard),
}));

const empires = [
	{
		uuid: "e1",
		empire_name: "Main",
		plans: [
			{
				uuid: "p1",
				plan_name: "Alpha",
				planet_natural_id: fixture[0].planet_natural_id,
			},
			{
				uuid: "p3",
				plan_name: "Shared",
				planet_natural_id: fixture[2].planet_natural_id,
			},
		],
	},
	{
		uuid: "e2",
		empire_name: "Small",
		plans: [
			{
				uuid: "p2",
				plan_name: "Beta",
				planet_natural_id: fixture[1].planet_natural_id,
			},
			{
				uuid: "p3",
				plan_name: "Shared",
				planet_natural_id: fixture[2].planet_natural_id,
			},
		],
	},
];
const failIndex = { value: false };
// holds the index back while set, resolve it to let the page finish loading
const gate: { promise: Promise<void> | null } = { promise: null };
const session = reactive({ loggedIn: true });
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string) => ({
		execute: async () => {
			await gate.promise;
			if (failIndex.value && name === "GetPlanetSearchIndex")
				throw new Error("down");
			// reactive, like a query cache hit
			return name === "GetPlanetSearchIndex"
				? reactive(fixture)
				: empires;
		},
	}),
}));
vi.mock("@/stores/userStore", () => ({
	useUserStore: () => ({
		get isLoggedIn() {
			return session.loggedIn;
		},
	}),
}));
vi.mock("@/features/preferences/usePreferences", () => ({
	usePreferences: () => ({ defaultEmpireUuid: ref("e1") }),
}));
const toast = vi.fn();
vi.mock("@/ui/useToast", () => ({ useToast: () => toast }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
// the rows' tiles look materials up, which the page tests don't load
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: ["ticker"],
		render(this: { ticker: string }) {
			return h("span", this.ticker);
		},
	},
}));
vi.mock("@/database/services/useMaterialData", () => ({
	useMaterialData: () => ({ getMaterialClass: () => "" }),
}));
vi.mock("@/features/help/components/HelpDrawer.vue", () => ({
	default: { render: () => h("div") },
}));
// the game data gate has its own tests: it lets the body through
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () => ({
	default: {
		setup: (_: unknown, { slots }: { slots: { default?: () => unknown } }) =>
			() => slots.default?.(),
	},
}));

function stubMedia(desktop: boolean) {
	vi.stubGlobal("matchMedia", () => ({
		matches: desktop,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));
}

const panel = (wrapper: VueWrapper) =>
	wrapper.findComponent({ name: "PlanetSearchFilterPanel" });

// the url follows 300 ms after the last change; the margin covers a timer
// firing a little early, which lodash reschedules
async function urlSettled() {
	await new Promise((r) => setTimeout(r, 350));
	await flushPromises();
}

describe("PlanetSearchPage", () => {
	beforeEach(() => {
		route.query = {};
		replace.mockClear();
		toast.mockClear();
		session.loggedIn = true;
		gate.promise = null;
	});

	it("switching empire drops plan picks and keeps exchanges", async () => {
		stubMedia(true);
		route.query = { ref: "plan:p1,cx:NC1,plan:foreign", j: "30" };
		const { wrapper } = await mountComponent(PlanetSearchPage);
		await flushPromises();

		// the foreign plan is ignored once the empire is known
		expect(
			(panel(wrapper).props("filter") as PlanetSearchFilter).references
		).toEqual([
			{ kind: "plan", planUuid: "p1" },
			{ kind: "cx", code: "NC1" },
		]);

		panel(wrapper).vm.$emit("update:empire", "e2");
		await flushPromises();
		expect(
			(panel(wrapper).props("filter") as PlanetSearchFilter).references
		).toEqual([{ kind: "cx", code: "NC1" }]);
		await urlSettled();
		expect(replace).toHaveBeenLastCalledWith({
			query: { ref: "cx:NC1", j: "30" },
		});
	});

	it("reports a switch to another view", async () => {
		stubMedia(true);
		const { wrapper } = await mountComponent(PlanetSearchPage);
		await flushPromises();
		vi.mocked(trackEvent).mockClear();

		wrapper
			.findComponent({ name: "PlanetSearchResultsBar" })
			.vm.$emit("update:view", "chart");
		await flushPromises();
		expect(trackEvent).toHaveBeenCalledWith("planet_search:view_change", {
			view: "chart",
		});
	});

	it("renders compare only on desktop and caps pins at 4", async () => {
		stubMedia(false);
		route.query = { pin: "OT-580b" };
		const small = await mountComponent(PlanetSearchPage);
		await flushPromises();
		expect(
			small.wrapper
				.findComponent({ name: "PlanetSearchCompare" })
				.exists()
		).toBe(false);
		expect(
			small.wrapper
				.find('button[aria-label="planet_search.results.pin"]')
				.exists()
		).toBe(false);

		stubMedia(true);
		route.query = {
			pin: fixture
				.slice(0, 4)
				.map((p) => p.planet_natural_id)
				.join(","),
			surf: "rg",
			x: "MGC,BL,SEA,HSE,INS,TSH",
		};
		const large = await mountComponent(PlanetSearchPage);
		await vi.waitFor(() =>
			expect(
				large.wrapper
					.findComponent({ name: "PlanetSearchCompare" })
					.exists()
			).toBe(true)
		);
		await vi.waitFor(() =>
			expect(
				large.wrapper
					.find('button[aria-label="planet_search.results.pin"]')
					.exists()
			).toBe(true)
		);
		await large.wrapper
			.find('button[aria-label="planet_search.results.pin"]')
			.trigger("click");
		expect(toast).toHaveBeenCalledWith("planet_search.compare.full");
	});

	it("restores plan picks of a non-default empire and follows url changes", async () => {
		stubMedia(true);
		route.query = { ref: "plan:p2", sort: "ref:plan:p2:asc" };
		const { wrapper } = await mountComponent(PlanetSearchPage);
		await flushPromises();

		expect(panel(wrapper).props("empireUuid")).toBe("e2");
		expect(
			(panel(wrapper).props("filter") as PlanetSearchFilter).references
		).toEqual([{ kind: "plan", planUuid: "p2" }]);
		expect(replace).not.toHaveBeenCalled();

		// a link to /search while already there
		route.query = { ref: "plan:p1", fert: "1" };
		await flushPromises();
		expect(panel(wrapper).props("empireUuid")).toBe("e1");
		expect(panel(wrapper).props("filter")).toMatchObject({
			fertile: true,
			references: [{ kind: "plan", planUuid: "p1" }],
		});
	});

	it("notes name matches hidden by the filters and relaxes them", async () => {
		stubMedia(true);
		route.query = { q: "KI-" };
		const { wrapper } = await mountComponent(PlanetSearchPage);
		await flushPromises();
		const note = () =>
			wrapper
				.findComponent({ name: "PlanetSearchResultsBar" })
				.find('[role="status"]');
		const current = () =>
			panel(wrapper).props("filter") as PlanetSearchFilter;

		expect(note().text()).toContain("planet_search.name_note.text");
		expect(note().text()).toContain("planet_search.name_note.show_all");
		expect(note().findAll("button").length).toBeGreaterThan(1);

		// the first relaxation
		const before = current();
		await note().findAll("button")[0].trigger("click");
		await flushPromises();
		expect(current()).not.toEqual(before);
		expect(current().text).toBe("KI-");
		await urlSettled();
		expect(
			Object.keys(replace.mock.lastCall![0].query).length
		).toBeGreaterThan(1);
		expect(replace.mock.lastCall![0].query.q).toBe("KI-");

		// show all: everything but the name at its widest
		await note().findAll("button").at(-1)!.trigger("click");
		await flushPromises();
		await urlSettled();
		expect(replace).toHaveBeenLastCalledWith({
			query: { q: "KI-", surf: "rg", x: "MGC,BL,SEA,HSE,INS,TSH" },
		});
		expect(note().text()).toBe("");

		// narrowed again, but without name text: no note
		panel(wrapper).vm.$emit("update:filter", { ...before, text: "" });
		await flushPromises();
		expect(note().text()).toBe("");
	});

	it("saves a search that was changed in the panel", async () => {
		stubMedia(true);
		const { wrapper } = await mountComponent(PlanetSearchPage);
		await flushPromises();
		const header = wrapper.findComponent({ name: "PlanetSearchHeader" });

		// the panel spreads its reactive filter prop, like every toggle does
		const current = panel(wrapper).props("filter") as PlanetSearchFilter;
		panel(wrapper).vm.$emit("update:filter", { ...current, fertile: true });
		await flushPromises();
		header.vm.$emit("save", "Fertile");
		await flushPromises();

		expect(toast).toHaveBeenCalledWith("planet_search.header.saved_toast");
		expect(header.props("saved")).toMatchObject([
			{ name: "Fertile", filter: { fertile: true, surface: ["rocky"] } },
		]);
	});

	it("shows an error when the index can't load", async () => {
		stubMedia(true);
		failIndex.value = true;
		const { wrapper } = await mountComponent(PlanetSearchPage);
		await flushPromises();
		failIndex.value = false;
		expect(wrapper.text()).toContain("planet_search.load_error");
	});

	it("picks the empire holding all plan picks when a plan is in several", async () => {
		stubMedia(true);
		// p3 is in both empires, p2 only in e2
		route.query = { ref: "plan:p3,plan:p2" };
		const { wrapper } = await mountComponent(PlanetSearchPage);
		await flushPromises();

		expect(panel(wrapper).props("empireUuid")).toBe("e2");
		expect(
			(panel(wrapper).props("filter") as PlanetSearchFilter).references
		).toEqual([
			{ kind: "plan", planUuid: "p3" },
			{ kind: "plan", planUuid: "p2" },
		]);
	});

	it("keeps index entries raw and updates results on a filter change", async () => {
		stubMedia(true);
		const { wrapper } = await mountComponent(PlanetSearchPage);
		await flushPromises();
		const bar = wrapper.findComponent({ name: "PlanetSearchResultsBar" });

		expect(bar.props("total")).toBe(fixture.length);
		const before = bar.props("count") as number;
		const first = (bar.props("results") as unknown[])[0];
		expect(isReactive(first)).toBe(false);
		expect(fixture).toContain(first);

		panel(wrapper).vm.$emit("update:filter", {
			...(panel(wrapper).props("filter") as PlanetSearchFilter),
			text: "KI-",
		});
		await flushPromises();
		expect(bar.props("count")).toBeLessThan(before);
	});

	describe("url", () => {
		afterEach(() => vi.useRealTimers());

		async function mountSearch() {
			stubMedia(true);
			const mounted = await mountComponent(PlanetSearchPage);
			await flushPromises();
			replace.mockClear();
			vi.useFakeTimers();
			return mounted;
		}

		function type(wrapper: VueWrapper, text: string) {
			const current = panel(wrapper).props(
				"filter"
			) as PlanetSearchFilter;
			panel(wrapper).vm.$emit("update:filter", { ...current, text });
		}

		it("typing 20 characters replaces the url once, with the final query", async () => {
			const { wrapper } = await mountSearch();
			const name = "KI-448b Montem Prime";

			for (let i = 1; i <= name.length; i++) {
				type(wrapper, name.slice(0, i));
				await nextTick();
				await vi.advanceTimersByTimeAsync(100);
			}
			expect(replace).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(300);
			expect(replace).toHaveBeenCalledOnce();
			expect(replace.mock.lastCall![0].query.q).toBe(name);
		});

		it("leaving the page writes a pending url change", async () => {
			const { wrapper } = await mountSearch();

			type(wrapper, "KI-");
			await nextTick();
			wrapper.unmount();

			expect(replace).toHaveBeenCalledOnce();
			expect(replace.mock.lastCall![0].query.q).toBe("KI-");
		});

		it("a pending url change never lands on the next page", async () => {
			const { wrapper } = await mountSearch();

			type(wrapper, "KI-");
			await nextTick();
			// a link to another page
			leave.guard();
			wrapper.unmount();
			await vi.advanceTimersByTimeAsync(300);

			expect(replace).not.toHaveBeenCalled();
		});
	});
});

describe("PlanetSearchPage actions", () => {
	beforeEach(() => {
		route.query = {};
		replace.mockClear();
		toast.mockClear();
		vi.mocked(trackEvent).mockClear();
		session.loggedIn = true;
		gate.promise = null;
		stubMedia(true);
		// the test environment has no localStorage
		const data: Record<string, string> = {};
		vi.stubGlobal("localStorage", {
			getItem: (k: string) => data[k] ?? null,
			setItem: (k: string, v: string) => (data[k] = v),
			clear: () => {},
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	const header = (wrapper: VueWrapper) =>
		wrapper.findComponent({ name: "PlanetSearchHeader" });
	const bar = (wrapper: VueWrapper) =>
		wrapper.findComponent({ name: "PlanetSearchResultsBar" });
	const filterOf = (wrapper: VueWrapper) =>
		panel(wrapper).props("filter") as PlanetSearchFilter;
	const stored = () =>
		JSON.parse(localStorage.getItem("prunplanner_planet_search") ?? "{}");

	async function mountPage() {
		const mounted = await mountComponent(PlanetSearchPage);
		await flushPromises();
		return mounted;
	}

	describe("saved searches", () => {
		it("loads a saved search with its view and filter", async () => {
			const { wrapper } = await mountPage();
			panel(wrapper).vm.$emit("update:filter", {
				...filterOf(wrapper),
				fertile: true,
			});
			await flushPromises();
			bar(wrapper).vm.$emit("update:view", "matrix");
			await flushPromises();
			header(wrapper).vm.$emit("save", "Mine");
			await flushPromises();
			const [saved] = header(wrapper).props(
				"saved"
			) as PlanetSearchSaved[];

			// away from it, then back
			header(wrapper).vm.$emit("reset");
			bar(wrapper).vm.$emit("update:view", "list");
			await flushPromises();
			expect(filterOf(wrapper).fertile).toBe(false);

			header(wrapper).vm.$emit("load", saved);
			await flushPromises();
			expect(filterOf(wrapper).fertile).toBe(true);
			expect(bar(wrapper).props("view")).toBe("matrix");
			expect(toast).toHaveBeenLastCalledWith(
				"planet_search.header.loaded_toast"
			);
		});

		it("loading while the data is in flight leaves the empire to the load", async () => {
			let release = () => {};
			gate.promise = new Promise<void>((r) => (release = r));
			const { wrapper } = await mountComponent(PlanetSearchPage);
			await flushPromises();
			expect(
				wrapper
					.findComponent({ name: "PlanetSearchFilterPanel" })
					.exists()
			).toBe(false);

			header(wrapper).vm.$emit("load", {
				id: "s1",
				name: "Plan pick",
				view: "list",
				filter: {
					...defaultFilter(),
					references: [{ kind: "plan", planUuid: "p2" }],
				},
			});
			await flushPromises();

			release();
			await flushPromises();
			expect(panel(wrapper).props("empireUuid")).toBe("e2");
			expect(filterOf(wrapper).references).toEqual([
				{ kind: "plan", planUuid: "p2" },
			]);
		});

		it("renames and deletes a saved search", async () => {
			const { wrapper } = await mountPage();
			header(wrapper).vm.$emit("save", "One");
			header(wrapper).vm.$emit("save", "Two");
			await flushPromises();
			const [one, two] = header(wrapper).props(
				"saved"
			) as PlanetSearchSaved[];

			header(wrapper).vm.$emit("rename", one, "Renamed");
			await flushPromises();
			expect(
				(header(wrapper).props("saved") as PlanetSearchSaved[]).map(
					(x) => x.name
				)
			).toEqual(["Renamed", "Two"]);
			expect(
				stored().savedSearches.map((x: { name: string }) => x.name)
			).toEqual(["Renamed", "Two"]);

			header(wrapper).vm.$emit("delete", one);
			await flushPromises();
			expect(
				(header(wrapper).props("saved") as PlanetSearchSaved[]).map(
					(x) => x.id
				)
			).toEqual([two.id]);
			expect(toast).toHaveBeenLastCalledWith(
				"planet_search.header.deleted_toast"
			);
			expect(stored().savedSearches).toHaveLength(1);
		});
	});

	describe("header", () => {
		it("copies the link and reports a blocked clipboard", async () => {
			const writeText = vi.fn().mockResolvedValue(undefined);
			vi.stubGlobal("navigator", { clipboard: { writeText } });
			const { wrapper } = await mountPage();

			header(wrapper).vm.$emit("copy");
			await flushPromises();
			expect(writeText).toHaveBeenCalledWith(window.location.href);
			expect(toast).toHaveBeenLastCalledWith(
				"planet_search.header.link_copied"
			);

			writeText.mockRejectedValueOnce(new Error("denied"));
			header(wrapper).vm.$emit("copy");
			await flushPromises();
			expect(toast).toHaveBeenLastCalledWith(
				"planet_search.header.copy_failed",
				{ type: "error" }
			);
		});

		it("typing in the name field narrows the filter", async () => {
			const { wrapper } = await mountPage();
			header(wrapper).vm.$emit("update:text", "KI-");
			await flushPromises();
			expect(filterOf(wrapper).text).toBe("KI-");
			expect(header(wrapper).props("filter")).toMatchObject({
				text: "KI-",
			});
		});

		it("reset restores the default filter and sort", async () => {
			route.query = { fert: "1", q: "KI-", sort: "name:desc" };
			const { wrapper } = await mountPage();
			expect(filterOf(wrapper).fertile).toBe(true);
			expect(bar(wrapper).props("sorts")).toHaveLength(1);

			header(wrapper).vm.$emit("reset");
			await flushPromises();
			expect(filterOf(wrapper)).toEqual(defaultFilter());
			expect(bar(wrapper).props("sorts")).toEqual([]);
			await urlSettled();
			expect(replace).toHaveBeenLastCalledWith({ query: {} });
		});

		it("names plan picks, falling back to ? for an unknown plan", async () => {
			const { wrapper } = await mountPage();
			const name = header(wrapper).props("refName") as (
				r: PlanetSearchReference
			) => string;

			expect(name({ kind: "cx", code: "NC1" })).toBe("NC1");
			expect(name({ kind: "plan", planUuid: "p1" })).toBe("Alpha");
			expect(name({ kind: "plan", planUuid: "gone" })).toBe("?");
		});
	});

	describe("layout", () => {
		it("collapses the docked filter panel and remembers it", async () => {
			const { wrapper } = await mountPage();
			const toggle = () => wrapper.find("aside button[aria-expanded]");
			expect(toggle().attributes("aria-label")).toBe(
				"planet_search.filters.collapse"
			);
			expect(toggle().attributes("aria-expanded")).toBe("true");

			await toggle().trigger("click");
			expect(panel(wrapper).exists()).toBe(false);
			expect(toggle().attributes("aria-label")).toBe(
				"planet_search.filters.expand"
			);
			expect(toggle().attributes("aria-expanded")).toBe("false");
			await flushPromises();
			expect(stored().filtersCollapsed).toBe(true);

			await toggle().trigger("click");
			expect(panel(wrapper).exists()).toBe(true);
		});

		it("reopens collapsed when it was left collapsed", async () => {
			localStorage.setItem(
				"prunplanner_planet_search",
				JSON.stringify({ filtersCollapsed: true })
			);
			const { wrapper } = await mountPage();
			expect(panel(wrapper).exists()).toBe(false);
			expect(
				wrapper
					.find("aside button[aria-expanded]")
					.attributes("aria-label")
			).toBe("planet_search.filters.expand");
		});

		it("small screens filter in a drawer showing the result count", async () => {
			stubMedia(false);
			const { wrapper } = await mountPage();
			expect(wrapper.find("aside").exists()).toBe(false);
			expect(panel(wrapper).exists()).toBe(false);

			bar(wrapper).vm.$emit("open-filters");
			await flushPromises();
			const drawer = document.body.querySelector(
				'[aria-label="planet_search.filters.title"]'
			);
			expect(drawer).not.toBeNull();
			const showResults = [
				...document.body.querySelectorAll("button"),
			].find((b) =>
				b.textContent?.includes("planet_search.filters.show_results")
			)!;
			expect(showResults).toBeDefined();

			// the drawer's panel drives the same filter
			panel(wrapper).vm.$emit("update:filter", {
				...filterOf(wrapper),
				fertile: true,
			});
			await flushPromises();
			expect(filterOf(wrapper).fertile).toBe(true);

			showResults.click();
			await flushPromises();
			expect(
				document.body.querySelector(
					'button[aria-label="planet_search.filters.close"]'
				)
			).toBeNull();
		});

		it("closing the drawer from its own controls leaves the page as it was", async () => {
			stubMedia(false);
			const { wrapper } = await mountPage();
			bar(wrapper).vm.$emit("open-filters");
			await flushPromises();
			const drawer = wrapper.findComponent({ name: "PDrawer" });
			expect(drawer.props("show")).toBe(true);

			drawer.vm.$emit("update:show", false);
			await flushPromises();
			expect(drawer.props("show")).toBe(false);
		});

		it("the drawer's close button hides it", async () => {
			stubMedia(false);
			const { wrapper } = await mountPage();
			bar(wrapper).vm.$emit("open-filters");
			await flushPromises();
			const close = document.body.querySelector<HTMLButtonElement>(
				'button[aria-label="planet_search.filters.close"]'
			)!;
			expect(close).not.toBeNull();

			close.click();
			await flushPromises();
			expect(
				document.body.querySelector(
					'button[aria-label="planet_search.filters.close"]'
				)
			).toBeNull();
		});

		it("follows the screen size across the desktop breakpoint", async () => {
			let onChange: (e: { matches: boolean }) => void = () => {};
			const removeEventListener = vi.fn();
			// the page's desktop query; the header's phone query stays wide
			vi.stubGlobal("matchMedia", (query: string) => ({
				matches: true,
				addEventListener: (_: string, cb: typeof onChange) => {
					if (query.includes("1024")) onChange = cb;
				},
				removeEventListener,
			}));
			const { wrapper } = await mountPage();
			expect(wrapper.find("aside").exists()).toBe(true);
			expect(bar(wrapper).props("isDesktop")).toBe(true);

			onChange({ matches: false });
			await flushPromises();
			expect(wrapper.find("aside").exists()).toBe(false);
			expect(bar(wrapper).props("isDesktop")).toBe(false);

			onChange({ matches: true });
			await flushPromises();
			expect(wrapper.find("aside").exists()).toBe(true);

			wrapper.unmount();
			expect(removeEventListener).toHaveBeenCalledWith(
				"change",
				onChange
			);
		});

		it("assumes a desktop where media queries are missing", async () => {
			vi.stubGlobal("matchMedia", undefined);
			const { wrapper } = await mountPage();
			expect(bar(wrapper).props("isDesktop")).toBe(true);
			expect(wrapper.find("aside").exists()).toBe(true);
		});
	});

	describe("hidden columns and materials", () => {
		it("keeps what the results bar hides in the prefs", async () => {
			const { wrapper } = await mountPage();
			expect(bar(wrapper).props("hiddenColumns")).toEqual([]);
			expect(bar(wrapper).props("hiddenMaterials")).toEqual([]);

			bar(wrapper).vm.$emit("update:hiddenColumns", ["cogc"]);
			bar(wrapper).vm.$emit("update:hiddenMaterials", ["H2O"]);
			await flushPromises();

			expect(bar(wrapper).props("hiddenColumns")).toEqual(["cogc"]);
			expect(bar(wrapper).props("hiddenMaterials")).toEqual(["H2O"]);
			expect(stored()).toMatchObject({
				hiddenColumns: ["cogc"],
				hiddenMaterials: ["H2O"],
			});
		});
	});

	describe("views", () => {
		it("opens in the last used view on a fresh visit", async () => {
			const first = await mountPage();
			first.wrapper
				.findComponent({ name: "PlanetSearchResultsBar" })
				.vm.$emit("update:view", "chart");
			await flushPromises();
			expect(stored().view).toBe("chart");
			first.wrapper.unmount();

			const again = await mountPage();
			expect(bar(again.wrapper).props("view")).toBe("chart");
		});

		it("a link opens in its own view, whatever was used last", async () => {
			localStorage.setItem(
				"prunplanner_planet_search",
				JSON.stringify({ view: "chart" })
			);
			route.query = { view: "matrix" };
			const { wrapper } = await mountPage();
			expect(bar(wrapper).props("view")).toBe("matrix");
		});

		it("shows the matrix and the chart in place of the list", async () => {
			const { wrapper } = await mountPage();
			await vi.waitFor(() =>
				expect(
					wrapper.findComponent({ name: "PlanetSearchList" }).exists()
				).toBe(true)
			);

			bar(wrapper).vm.$emit("update:view", "matrix");
			await vi.waitFor(() =>
				expect(
					wrapper
						.findComponent({ name: "PlanetSearchMatrix" })
						.exists()
				).toBe(true)
			);
			expect(
				wrapper.findComponent({ name: "PlanetSearchList" }).exists()
			).toBe(false);

			bar(wrapper).vm.$emit("update:view", "chart");
			await vi.waitFor(() =>
				expect(
					wrapper
						.findComponent({ name: "PlanetSearchChart" })
						.exists()
				).toBe(true)
			);
			expect(
				wrapper.findComponent({ name: "PlanetSearchMatrix" }).exists()
			).toBe(false);
			await urlSettled();
			expect(replace.mock.lastCall![0].query.view).toBe("chart");
		});

		it("each view pins a planet and sorts through the page", async () => {
			const id = fixture[0].planet_natural_id;
			const { wrapper } = await mountPage();
			for (const [view, name] of [
				["list", "PlanetSearchList"],
				["matrix", "PlanetSearchMatrix"],
				["chart", "PlanetSearchChart"],
			] as const) {
				bar(wrapper).vm.$emit("update:view", view);
				await vi.waitFor(() =>
					expect(wrapper.findComponent({ name }).exists()).toBe(true)
				);
				const child = wrapper.findComponent({ name });

				child.vm.$emit("pin", id);
				await flushPromises();
				expect(
					wrapper
						.findComponent({ name: "PlanetSearchCompare" })
						.props("planets")
				).toHaveLength(1);

				// the same event again unpins
				child.vm.$emit("pin", id);
				await flushPromises();
				expect(
					wrapper
						.findComponent({ name: "PlanetSearchCompare" })
						.props("planets")
				).toEqual([]);

				if (view === "chart") continue;
				child.vm.$emit("sort", [{ key: "name", dir: "desc" }]);
				await flushPromises();
				expect(bar(wrapper).props("sorts")).toEqual([
					{ key: "name", dir: "desc" },
				]);
				child.vm.$emit("sort", []);
				await flushPromises();
			}
		});

		it("unpins from the compare panel", async () => {
			const id = fixture[0].planet_natural_id;
			route.query = { pin: id };
			const { wrapper } = await mountPage();
			const compare = () =>
				wrapper.findComponent({ name: "PlanetSearchCompare" });
			await vi.waitFor(() => expect(compare().exists()).toBe(true));
			expect(compare().props("planets")).toHaveLength(1);

			compare().vm.$emit("unpin", id);
			await flushPromises();
			expect(compare().props("planets")).toEqual([]);
		});
	});

	describe("sort chain", () => {
		it("sorts from the results bar and keeps the sort in the url", async () => {
			const { wrapper } = await mountPage();
			bar(wrapper).vm.$emit("sort", [{ key: "name", dir: "desc" }]);
			await flushPromises();
			expect(bar(wrapper).props("sorts")).toEqual([
				{ key: "name", dir: "desc" },
			]);
			await urlSettled();
			expect(replace.mock.lastCall![0].query.sort).toBe("name:desc");
		});

		it("drops a plan sort once its pick is removed", async () => {
			route.query = { ref: "plan:p1", sort: "name:asc,ref:plan:p1:asc" };
			const { wrapper } = await mountPage();
			expect(bar(wrapper).props("sorts")).toHaveLength(2);

			panel(wrapper).vm.$emit("update:filter", {
				...filterOf(wrapper),
				references: [],
			});
			await flushPromises();
			expect(bar(wrapper).props("sorts")).toEqual([
				{ key: "name", dir: "asc" },
			]);
		});

		it("keeps a plan sort while its pick stays", async () => {
			route.query = { ref: "plan:p1", sort: "ref:plan:p1:asc" };
			const { wrapper } = await mountPage();

			panel(wrapper).vm.$emit("update:filter", {
				...filterOf(wrapper),
				fertile: true,
			});
			await flushPromises();
			expect(bar(wrapper).props("sorts")).toHaveLength(1);
		});

		it("drops a material sort when its column is gone, but not in the matrix", async () => {
			const { wrapper } = await mountPage();
			const mat = { key: "mat:ZZZ", dir: "desc" } as const;
			bar(wrapper).vm.$emit("sort", [mat]);
			await flushPromises();
			expect(bar(wrapper).props("sorts")).toEqual([mat]);

			// the matrix shows every material, so the key stays valid
			bar(wrapper).vm.$emit("update:view", "matrix");
			await flushPromises();
			expect(bar(wrapper).props("sorts")).toEqual([mat]);

			bar(wrapper).vm.$emit("update:view", "list");
			await flushPromises();
			expect(bar(wrapper).props("sorts")).toEqual([]);
		});
	});

	describe("url changes while on the page", () => {
		it("ignores a link to the search it already shows", async () => {
			route.query = { fert: "1" };
			const { wrapper } = await mountPage();
			const before = filterOf(wrapper);

			route.query = { fert: "1" };
			await flushPromises();
			expect(filterOf(wrapper)).toBe(before);
		});

		it("takes a link that lands before the data has loaded", async () => {
			let release = () => {};
			gate.promise = new Promise<void>((r) => (release = r));
			const { wrapper } = await mountComponent(PlanetSearchPage);
			await flushPromises();

			route.query = { ref: "plan:p2" };
			await flushPromises();
			release();
			await flushPromises();
			expect(panel(wrapper).props("empireUuid")).toBe("e2");
			expect(filterOf(wrapper).references).toEqual([
				{ kind: "plan", planUuid: "p2" },
			]);
		});

		it("follows a link into another view and its pins", async () => {
			const id = fixture[1].planet_natural_id;
			const { wrapper } = await mountPage();

			route.query = { view: "matrix", pin: id };
			await flushPromises();
			expect(bar(wrapper).props("view")).toBe("matrix");
			await vi.waitFor(() =>
				expect(
					wrapper
						.findComponent({ name: "PlanetSearchCompare" })
						.props("planets")
				).toHaveLength(1)
			);
		});
	});

	describe("tracking", () => {
		it("reports one search per settled filter with its result count", async () => {
			const { wrapper } = await mountPage();
			vi.useFakeTimers();
			vi.mocked(trackEvent).mockClear();

			for (const text of ["K", "KI", "KI-"]) {
				panel(wrapper).vm.$emit("update:filter", {
					...filterOf(wrapper),
					text,
				});
				await nextTick();
				await vi.advanceTimersByTimeAsync(400);
			}
			expect(trackEvent).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(700);
			expect(trackEvent).toHaveBeenCalledOnce();
			expect(trackEvent).toHaveBeenCalledWith("tool:use", {
				tool_name: "planet_search",
				filter: expect.objectContaining({ q: "KI-" }),
				result_count: bar(wrapper).props("count"),
			});
		});

		it("reports nothing once the page is gone", async () => {
			const { wrapper } = await mountPage();
			vi.useFakeTimers();
			vi.mocked(trackEvent).mockClear();

			panel(wrapper).vm.$emit("update:filter", {
				...filterOf(wrapper),
				text: "KI-",
			});
			await nextTick();
			wrapper.unmount();
			await vi.advanceTimersByTimeAsync(2000);
			expect(trackEvent).not.toHaveBeenCalled();
		});
	});

	describe("logged out", () => {
		it("loads no empires and offers no plan picks", async () => {
			session.loggedIn = false;
			route.query = { ref: "plan:p1,cx:NC1" };
			const { wrapper } = await mountPage();

			expect(panel(wrapper).props("showPlans")).toBe(false);
			expect(panel(wrapper).props("empires")).toEqual([]);
			expect(panel(wrapper).props("empireUuid")).toBeUndefined();
			expect(filterOf(wrapper).references).toEqual([
				{ kind: "cx", code: "NC1" },
			]);
		});

		it("introduces the tool with the planet count, only to visitors", async () => {
			session.loggedIn = false;
			gate.promise = new Promise(() => {});
			const { wrapper } = await mountComponent(PlanetSearchPage);
			// the title row paints before the index
			expect(wrapper.find("[data-intro]").text()).toBe(
				"planet_search.intro.lead_any"
			);
			wrapper.unmount();

			gate.promise = null;
			const loaded = (await mountPage()).wrapper;
			expect(loaded.find("[data-intro]").text()).toBe(
				"planet_search.intro.lead"
			);
			loaded.unmount();

			session.loggedIn = true;
			const member = (await mountPage()).wrapper;
			expect(member.find("[data-intro]").exists()).toBe(false);
		});

		it("loads the empires after a login on the page, the search stays", async () => {
			session.loggedIn = false;
			route.query = { ref: "cx:NC1", fert: "1" };
			const { wrapper } = await mountPage();
			const before = filterOf(wrapper);

			session.loggedIn = true;
			await flushPromises();

			expect(panel(wrapper).props("showPlans")).toBe(true);
			expect(panel(wrapper).props("empires")).toEqual(empires);
			expect(panel(wrapper).props("empireUuid")).toBe("e1");
			expect(filterOf(wrapper)).toEqual(before);
		});

		it("keeps the empires of a login made while the index loads", async () => {
			session.loggedIn = false;
			let release!: () => void;
			gate.promise = new Promise((r) => (release = r));
			const { wrapper } = await mountComponent(PlanetSearchPage);

			session.loggedIn = true;
			await flushPromises();
			release();
			await flushPromises();

			expect(panel(wrapper).props("empires")).toEqual(empires);
		});
	});

	describe("no results", () => {
		it("explains which restrictions hide every planet", async () => {
			route.query = { q: "no such planet anywhere", fert: "1" };
			const { wrapper } = await mountPage();
			expect(bar(wrapper).props("count")).toBe(0);
			expect(bar(wrapper).props("nameNote")).toBeNull();
			expect(bar(wrapper).props("hints")).not.toEqual([]);
		});
	});
});
