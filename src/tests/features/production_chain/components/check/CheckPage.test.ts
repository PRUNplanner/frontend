import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";

import CheckPage from "@/features/production_chain/components/check/CheckPage.vue";
import CheckBar from "@/features/production_chain/components/check/CheckBar.vue";
import CheckAside from "@/features/production_chain/components/check/CheckAside.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	fixtureEmpirePlans,
	index,
	planContextFor,
	seedGameData,
} from "@/tests/features/production_chain/chain.fixtures";

// vi.mock factories are hoisted, so are their helpers
const { nav, trackEvent, execute, copy } = vi.hoisted(() => ({
	nav: {
		route: { query: {} as Record<string, string> },
		replace: vi.fn(),
		push: vi.fn(),
	},
	trackEvent: vi.fn(),
	execute: vi.fn(),
	copy: vi.fn(async (_value: string) => true),
}));

vi.mock("@/features/help/components/HelpDrawer.vue", () => ({
	default: { name: "HelpDrawer", render: () => null },
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent,
}));
vi.mock("@/util/data", async (original) => ({
	...(await original<typeof import("@/util/data")>()),
	copyToClipboard: copy,
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params?: unknown) => ({
		execute: () => execute(name, params),
	}),
}));
// the fixture planets aren't in the planet store: their contexts come from the index
vi.mock("@/features/planning/usePlanContext", async (original) => {
	const actual =
		await original<typeof import("@/features/planning/usePlanContext")>();
	return {
		...actual,
		usePlanContext: () => ({
			...actual.usePlanContext(),
			createContext: async (_: unknown, planetId: string) =>
				planContextFor(planetId),
		}),
	};
});
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRoute: () => nav.route,
	useRouter: () => ({
		replace: nav.replace,
		push: nav.push,
		resolve: (to: { query: Record<string, string> }) => ({
			href: `/production-chain?${new URLSearchParams(to.query)}`,
		}),
	}),
}));

const PLANS = fixtureEmpirePlans();
const EMPIRES = [
	{ uuid: "e1", empire_name: "Main", plans: PLANS },
	{ uuid: "e2", empire_name: "Side", plans: [] },
];

function serve(fail = false) {
	execute.mockImplementation((name: string) => {
		switch (name) {
			case "GetAllEmpires":
				return Promise.resolve(EMPIRES);
			case "GetEmpirePlans":
				return fail
					? Promise.reject(new Error("down"))
					: Promise.resolve(PLANS);
			case "GetMultiplePlanets":
				return Promise.resolve([]);
			default:
				return Promise.resolve(index);
		}
	});
}

const lastQuery = () => nav.replace.mock.calls.at(-1)![0].query;
const actions = () =>
	trackEvent.mock.calls
		.filter(([e]) => e === "production_chain:action")
		.map(([, p]) => p.action);

async function mountPage(query: Record<string, string> = { mode: "check" }) {
	nav.route.query = query;
	const mounted = await mountComponent(CheckPage);
	const { wrapper } = mounted;
	const find = (testid: string) => wrapper.find(`[data-testid='${testid}']`);
	await vi.waitFor(
		() =>
			expect(
				find("check-empty").exists() ||
					find("check-result-profit").exists()
			).toBe(true),
		{ timeout: 5000 }
	);
	return { ...mounted, find };
}

describe("CheckPage", () => {
	beforeAll(seedGameData);

	beforeEach(() => {
		nav.replace.mockClear();
		nav.push.mockClear();
		trackEvent.mockClear();
		copy.mockClear();
		execute.mockReset();
		serve();
	});
	afterEach(() => vi.useRealTimers());

	it("opens the first empire, checks everything it sells and tracks it", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		const { wrapper, find } = await mountPage();
		expect(execute).toHaveBeenCalledWith("GetEmpirePlans", {
			empireUuid: "e1",
		});
		// one load for the empire
		expect(
			execute.mock.calls.filter(([n]) => n === "GetEmpirePlans")
		).toHaveLength(1);
		expect(find("check-empty").exists()).toBe(true);

		await find("check-empty-all").trigger("click");
		await flushPromises();
		expect(lastQuery().t).toContain("DW");
		expect(find("check-result-profit").exists()).toBe(true);
		expect(actions()).toContain("check_add_all");
		// 1 s after the last change
		vi.advanceTimersByTime(900);
		expect(trackEvent.mock.calls.some(([e]) => e === "tool:use")).toBe(
			false
		);
		vi.advanceTimersByTime(200);
		const use = trackEvent.mock.calls.find(([e]) => e === "tool:use");
		expect(use?.[1]).toMatchObject({
			tool_name: "production_chain",
			mode: "check",
			bases_checked: 5,
		});
		expect(wrapper.text()).toContain("production_chains.check.summary");
	});

	it("switches tabs, copies the link and opens a base", async () => {
		const { wrapper, find } = await mountPage({
			mode: "check",
			empire: "e1",
			t: "DW,RAT",
		});
		expect(find("check-bases").exists()).toBe(true);
		await find("check-base-toggle-C").trigger("click");
		expect(actions()).toContain("check_open_base");

		await find("check-tab-findings").trigger("click");
		expect(find("check-findings").exists()).toBe(true);
		await find("check-tab-chains").trigger("click");
		expect(find("check-chains").exists()).toBe(true);
		await find("check-tab-bases").trigger("click");

		await find("check-copy-link").trigger("click");
		expect(copy.mock.calls[0][0]).toContain("t=DW%2CRAT");
		expect(actions()).toContain("link_copy");

		// the aside adds what the other bases sell
		wrapper.findComponent(CheckAside).vm.$emit("add", ["C"]);
		await flushPromises();
		expect(lastQuery().t).toBe("DW,RAT,C");
	});

	it("picks a planet in the list, keeps it in the link and goes back", async () => {
		const { wrapper, find } = await mountPage({
			mode: "check",
			empire: "e1",
			t: "DW,RAT",
		});
		await find("check-tab-findings").trigger("click");
		await find("check-findings-kind-location").trigger("click");
		await wrapper
			.find("[data-testid='check-finding-all-planets']")
			.trigger("click");
		const body = new DOMWrapper(document.body);
		await vi.waitFor(() =>
			expect(
				body.find("[data-testid='check-planet-list']").exists()
			).toBe(true)
		);
		await body
			.findAll("[data-testid='check-planets-use']")[1]
			.trigger("click");
		await flushPromises();
		expect(lastQuery().loc).toMatch(/^[A-E]:[A-Z]+:[A-Z0-9]+:/);
		expect(wrapper.text()).toContain(
			"production_chains.check.options.picked"
		);

		await wrapper
			.find("[data-testid='check-finding-reset']")
			.trigger("click");
		await flushPromises();
		expect(lastQuery().loc).toBeUndefined();

		await wrapper
			.find("[data-testid='check-finding-try']")
			.trigger("click");
		expect(actions()).toContain("check_try");
		const to = nav.push.mock.calls[0][0];
		expect(to.name).toBe("production-chain");
		expect(to.query.t).toMatch(/^(DW|RAT):/);
		expect(to.query.mode).toBeUndefined();
	});

	it("changes the settings and the empire", async () => {
		const { wrapper, find } = await mountPage({
			mode: "check",
			empire: "e1",
			t: "DW",
		});
		const bar = wrapper.findComponent(CheckBar);
		bar.vm.$emit("update:setup", false);
		bar.vm.$emit("update:min", 50);
		bar.vm.$emit("update:payback", 30);
		await flushPromises();
		expect(lastQuery()).toMatchObject({ setup: "0", min: "50", pay: "30" });
		expect(actions()).toContain("check_setup_toggle");
		expect(find("check-result-setup").text()).toContain(
			"production_chains.check.results.hidden"
		);

		bar.vm.$emit("empire", "e2");
		await vi.waitFor(() =>
			expect(execute).toHaveBeenCalledWith("GetEmpirePlans", {
				empireUuid: "e2",
			})
		);
		expect(lastQuery().empire).toBe("e2");
	});

	it("says when the plans can't load, and retries", async () => {
		serve(true);
		nav.route.query = { mode: "check", empire: "e1" };
		const { wrapper } = await mountComponent(CheckPage);
		await vi.waitFor(() =>
			expect(wrapper.find("[role='alert']").exists()).toBe(true)
		);
		expect(wrapper.text()).toContain("production_chains.check.error");
		serve();
		await wrapper.find("[role='alert'] button").trigger("click");
		await vi.waitFor(() =>
			expect(wrapper.find("[data-testid='check-empty']").exists()).toBe(
				true
			)
		);
	});
});
