import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { h, reactive, ref } from "vue";

import PlanetSearchPage from "@/features/planet_search/components/PlanetSearchPage.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { PlanetSearchFilter } from "@/features/planet_search/planetSearch.schemas";

// test data
import fixture from "@/tests/test_data/api_data_planet_search_index.json";

const route = reactive({ query: {} as Record<string, string> });
const replace = vi.fn();
vi.mock("vue-router", () => ({
	useRoute: () => route,
	useRouter: () => ({ replace }),
}));

const empires = [
	{
		uuid: "e1",
		empire_name: "Main",
		plans: [
			{ uuid: "p1", plan_name: "Alpha", planet_natural_id: fixture[0].planet_natural_id },
			{ uuid: "p3", plan_name: "Shared", planet_natural_id: fixture[2].planet_natural_id },
		],
	},
	{
		uuid: "e2",
		empire_name: "Small",
		plans: [
			{ uuid: "p2", plan_name: "Beta", planet_natural_id: fixture[1].planet_natural_id },
			{ uuid: "p3", plan_name: "Shared", planet_natural_id: fixture[2].planet_natural_id },
		],
	},
];
const failIndex = { value: false };
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string) => ({
		execute: async () => {
			if (failIndex.value && name === "GetPlanetSearchIndex") throw new Error("down");
			return name === "GetPlanetSearchIndex" ? fixture : empires;
		},
	}),
}));
vi.mock("@/stores/userStore", () => ({
	useUserStore: () => ({ isLoggedIn: true }),
}));
vi.mock("@/features/preferences/usePreferences", () => ({
	usePreferences: () => ({ defaultEmpireUuid: ref("e1") }),
}));
const toast = vi.fn();
vi.mock("@/ui/useToast", () => ({ useToast: () => toast }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/help/components/HelpDrawer.vue", () => ({
	default: { render: () => h("div") },
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

describe("PlanetSearchPage", () => {
	beforeEach(() => {
		route.query = {};
		replace.mockClear();
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
		expect(replace).toHaveBeenLastCalledWith({
			query: { ref: "cx:NC1", j: "30" },
		});
	});

	it("renders compare only on desktop and caps pins at 4", async () => {
		stubMedia(false);
		route.query = { pin: "OT-580b" };
		const small = await mountComponent(PlanetSearchPage);
		await flushPromises();
		expect(small.wrapper.findComponent({ name: "PlanetSearchCompare" }).exists()).toBe(false);
		expect(small.wrapper.find('button[aria-label="planet_search.results.pin"]').exists()).toBe(false);

		stubMedia(true);
		route.query = {
			pin: fixture.slice(0, 4).map((p) => p.planet_natural_id).join(","),
			surf: "rg",
			x: "MGC,BL,SEA,HSE,INS,TSH",
		};
		const large = await mountComponent(PlanetSearchPage);
		await vi.waitFor(() =>
			expect(large.wrapper.findComponent({ name: "PlanetSearchCompare" }).exists()).toBe(true)
		);
		await vi.waitFor(() =>
			expect(large.wrapper.find('button[aria-label="planet_search.results.pin"]').exists()).toBe(true)
		);
		await large.wrapper.find('button[aria-label="planet_search.results.pin"]').trigger("click");
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
		const current = () => panel(wrapper).props("filter") as PlanetSearchFilter;

		expect(note().text()).toContain("planet_search.name_note.text");
		expect(note().text()).toContain("planet_search.name_note.show_all");
		expect(note().findAll("button").length).toBeGreaterThan(1);

		// the first relaxation
		const before = current();
		await note().findAll("button")[0].trigger("click");
		await flushPromises();
		expect(current()).not.toEqual(before);
		expect(current().text).toBe("KI-");
		expect(Object.keys(replace.mock.lastCall![0].query).length).toBeGreaterThan(1);
		expect(replace.mock.lastCall![0].query.q).toBe("KI-");

		// show all: everything but the name at its widest
		await note().findAll("button").at(-1)!.trigger("click");
		await flushPromises();
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
});
