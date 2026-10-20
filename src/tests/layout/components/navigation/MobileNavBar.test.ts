import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive, ref, type Ref } from "vue";
import { DOMWrapper, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import MobileNavBar from "@/layout/components/navigation/MobileNavBar.vue";
import { mountComponent } from "@/tests/mountComponent";
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { useEmpireProfits } from "@/features/empire/useEmpireProfits";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useVersionCheck } from "@/lib/useVersionCheck";
import { relativeFromDate } from "@/util/date";
import VersionUpdateChip from "@/layout/components/VersionUpdateChip.vue";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

const route = reactive({
	name: "empire" as string,
	params: {} as Record<string, string>,
	fullPath: "/empire",
});
const push = vi.fn();
vi.mock("vue-router", () => ({
	useRoute: () => route,
	useRouter: () => ({ push }),
}));

const execute = vi.fn();
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string) => ({
		state: ref({ data: [] }),
		execute: () => execute(name),
	}),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
// ZV-759c read as unnamed (named after its system), ZV-307b only once the
// game data has loaded
const planetMock = vi.hoisted(() => ({
	loaded: false,
	planets: undefined as unknown as Ref<unknown[]>,
}));
vi.mock("@/database/services/usePlanetData", async () => {
	const { shallowRef } = await import("vue");
	planetMock.planets = shallowRef([]);
	return {
		usePlanetData: () => ({
			planets: planetMock.planets,
			getPlanet: async (id: string) => {
				if (id === "ZV-759c" || (planetMock.loaded && id === "ZV-307b"))
					return { planet_natural_id: id, planet_name: id };
				throw new Error("not loaded");
			},
		}),
	};
});

const NAV = "common.navigation";
const body = () => new DOMWrapper(document.body);
const sheet = () => body().find("[role=dialog]");

const EMPIRE: PlanEmpireElement = {
	uuid: "11111111-1111-4111-8111-111111111111",
	empire_name: "Sky Productions",
	empire_faction: "NONE",
	empire_permits_used: 0,
	empire_permits_total: 3,
	modified_at: "",
	plans: [
		{ uuid: "p2", plan_name: "DEIMALO", planet_natural_id: "ZV-759c" },
		{ uuid: "p1", plan_name: "Bober", planet_natural_id: "ZV-307b" },
	],
} as PlanEmpireElement;

let pinia: Pinia;

async function mountBar(empires: PlanEmpireElement[] = [EMPIRE]) {
	usePlanningStore().setEmpires(empires);
	const { wrapper } = await mountComponent(
		MobileNavBar,
		{},
		{ pinia, attach: true }
	);
	return wrapper;
}

async function open(w: Awaited<ReturnType<typeof mountBar>>, label: string) {
	await w
		.findAll("nav button")
		.find((b) => b.text() === label)!
		.trigger("click");
	await flushPromises();
}

describe("MobileNavBar", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		execute.mockReset().mockResolvedValue(undefined);
		vi.mocked(trackEvent).mockClear();
		Object.assign(route, {
			name: "empire",
			params: {},
			fullPath: "/empire",
		});
		useUserStore().profile = undefined;
	});

	it("shows Empire, Plans, Planet Search and More", async () => {
		const w = await mountBar();
		expect(w.findAll("nav > *").map((e) => e.text())).toEqual([
			`${NAV}.empire`,
			`${NAV}.plans`,
			`${NAV}.planet_search`,
			`${NAV}.more`,
		]);
	});

	it("opens the plans sheet A–Z; navigation closes it", async () => {
		const w = await mountBar();
		await open(w, `${NAV}.plans`);
		expect(sheet().attributes("data-placement")).toBe("bottom");
		expect(
			sheet()
				.findAll("[data-nav-plans] .truncate")
				.map((e) => e.text())
		).toEqual(["Bober", "ZV-307b", "DEIMALO", "Antares II c"]);

		await sheet().find("[data-nav-plans] a").trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("app:nav_click", {
			target: "plan",
			area: "mobile_sheet",
			section: "plans",
		});
		Object.assign(route, { name: "plan", fullPath: "/plan/ZV-307b/p1" });
		await nextTick();
		await flushPromises();
		expect(body().find("[role=dialog]").exists()).toBe(false);
	});

	it("names a planet once the game data has loaded", async () => {
		const w = await mountBar();
		await open(w, `${NAV}.plans`);
		const texts = () =>
			sheet()
				.findAll("[data-nav-plans] .truncate")
				.map((e) => e.text());
		expect(texts()).toContain("ZV-307b");

		planetMock.loaded = true;
		planetMock.planets.value = [{}];
		await flushPromises();
		expect(texts()).toEqual([
			"Bober",
			"Antares I b",
			"DEIMALO",
			"Antares II c",
		]);

		planetMock.loaded = false;
		planetMock.planets.value = [];
	});

	it.each(["more", "plans"])(
		"closes the %s sheet on a backdrop tap",
		async (key) => {
			const w = await mountBar();
			await open(w, `${NAV}.${key}`);
			const mask = body().find(".pdrawer-mask");
			await mask.trigger("mousedown");
			await mask.trigger("click");
			await flushPromises();
			expect(body().find("[role=dialog]").exists()).toBe(false);
		}
	);

	it("shows profit only when the empire's plans are cached, and loads nothing for it", async () => {
		const { setProfits } = useEmpireProfits();
		setProfits(EMPIRE.uuid, { p1: 1234.5, p2: -10 });

		let w = await mountBar();
		await open(w, `${NAV}.plans`);
		expect(sheet().text()).not.toContain("1,234");
		expect(execute).not.toHaveBeenCalledWith("GetEmpirePlans");
		w.unmount();

		useQueryStore().addCacheState(
			"GetEmpirePlans",
			{ empireUuid: EMPIRE.uuid },
			[]
		);
		w = await mountBar();
		await open(w, `${NAV}.plans`);
		expect(sheet().text()).toContain("+1,234.50");
		expect(sheet().text()).toContain("-10");
		expect(execute).not.toHaveBeenCalledWith("GetEmpirePlans");
	});

	it("marks More and puts the update chip in its sheet after Later", async () => {
		const { updateAvailable, latestVersion, later } = useVersionCheck();
		const w = await mountBar();
		expect(w.find("[data-update-dot]").exists()).toBe(false);

		updateAvailable.value = true;
		latestVersion.value = "new-build";
		later();
		await flushPromises();
		expect(w.find("[data-update-dot]").exists()).toBe(true);

		await open(w, `${NAV}.more`);
		expect(w.findComponent(VersionUpdateChip).exists()).toBe(true);
		updateAvailable.value = false;
	});

	it("reaches every sidebar destination through More", async () => {
		useUserStore().profile = {
			id: 1,
			username: "u",
			email: null,
			is_email_verified: true,
			fio_apikey: "key",
			prun_username: "PRUN",
			fio_status: "ok",
			fio_last_refreshed_at: null,
		};
		const w = await mountBar();
		await open(w, `${NAV}.more`);
		const targets = w
			.findAllComponents(RouterLinkStub)
			.map((l) => l.props("to"));
		expect(targets).toEqual(
			expect.arrayContaining([
				"/empire",
				"/search",
				"/manage",
				"/exchanges",
				"/market-exploration",
				"/market-live",
				"/roi-overview",
				"/resource-roi-overview",
				"/hq-upgrade-calculator",
				"/production-chain",
				"/upkeep-price-calculator",
				"/fio/burn",
				"/fio/repair",
				"/profile",
				"/apikey",
				"/help",
				"/debug",
			])
		);
		expect(sheet().text()).toContain(`${NAV}.logout`);
	});
});

describe("MobileNavBar behaviour", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		execute.mockReset().mockResolvedValue(undefined);
		push.mockReset();
		vi.mocked(trackEvent).mockClear();
		Object.assign(route, {
			name: "empire",
			params: {},
			fullPath: "/empire",
		});
		useUserStore().profile = undefined;
	});

	const nav = (target: string, area: string, section: string) => [
		"app:nav_click",
		{ target, area, section },
	];

	it("tracks the bar links and marks the open page", async () => {
		const w = await mountBar();
		const [empire, , search] = w.findAll("nav > *");
		expect(empire.attributes("aria-current")).toBe("page");
		expect(search.attributes("aria-current")).toBeUndefined();

		await empire.trigger("click");
		await search.trigger("click");
		expect(vi.mocked(trackEvent).mock.calls).toEqual([
			nav("empire", "mobile_bar", "empire"),
			nav("search", "mobile_bar", "planning"),
		]);

		Object.assign(route, { name: "search", fullPath: "/search" });
		await nextTick();
		expect(search.attributes("aria-current")).toBe("page");
		expect(empire.attributes("aria-current")).toBeUndefined();
	});

	it("marks Plans while a saved plan is open", async () => {
		Object.assign(route, {
			name: "plan",
			params: { planetNaturalId: "ZV-307b", planUuid: "p1" },
			fullPath: "/plan/ZV-307b/p1",
		});
		const w = await mountBar();
		const plans = w
			.findAll("nav button")
			.find((b) => b.text() === `${NAV}.plans`)!;

		expect(plans.attributes("aria-current")).toBe("page");
		expect(plans.find("span:last-child").classes()).toContain(
			"text-prunplanner"
		);
	});

	it("tracks the plans sheet actions and closes it", async () => {
		const w = await mountBar();
		const sheetLinks = () =>
			w
				.findAllComponents(RouterLinkStub)
				.filter((l) => sheet().element.contains(l.element));

		await open(w, `${NAV}.plans`);
		await sheetLinks()
			.find((l) => l.props("to") === "/empire")!
			.trigger("click");
		expect(trackEvent).toHaveBeenLastCalledWith(
			...nav("empire", "mobile_sheet", "empire")
		);
		expect(body().find("[role=dialog]").exists()).toBe(false);

		await open(w, `${NAV}.plans`);
		await sheetLinks()
			.find((l) => l.props("to") === "/search")!
			.trigger("click");
		expect(trackEvent).toHaveBeenLastCalledWith(
			...nav("search", "mobile_sheet", "plans")
		);
		expect(body().find("[role=dialog]").exists()).toBe(false);
	});

	it("switches the empire from the plans sheet", async () => {
		const other = {
			...EMPIRE,
			uuid: "22222222-2222-4222-8222-222222222222",
			empire_name: "Other Empire",
			plans: [],
		} as PlanEmpireElement;
		const w = await mountBar([EMPIRE, other]);
		await open(w, `${NAV}.plans`);
		await sheet()
			.find(`button[aria-label="${NAV}.empire_switch"]`)
			.trigger("click");
		await flushPromises();

		const options = body().findAll("[role=menuitem]");
		expect(options.map((o) => o.text())).toEqual([
			"Sky Productions",
			"Other Empire",
		]);
		await options[1].trigger("click");

		expect(useUserStore().preferences.defaultEmpireUuid).toBe(other.uuid);
		expect(sheet().text()).toContain("OE");
	});

	it("offers to create an empire in the plans sheet without one", async () => {
		const w = await mountBar([]);
		await open(w, `${NAV}.plans`);
		expect(sheet().find("[data-nav-plans]").exists()).toBe(false);

		const create = w
			.findAllComponents(RouterLinkStub)
			.find((l) => l.props("to") === "/manage")!;
		expect(create.text()).toBe(`${NAV}.create_empire`);
		await create.trigger("click");

		expect(trackEvent).toHaveBeenLastCalledWith(
			...nav("manage", "mobile_sheet", "empire")
		);
		expect(body().find("[role=dialog]").exists()).toBe(false);
	});

	it("tracks the More destinations, marks the open one and closes", async () => {
		useUserStore().profile = {
			id: 1,
			username: "u",
			email: null,
			is_email_verified: true,
			fio_apikey: "key",
			prun_username: "PRUN",
			fio_status: "ok",
			fio_last_refreshed_at: null,
		};
		Object.assign(route, { name: "manage", fullPath: "/manage" });
		const w = await mountBar();
		const expected: Record<string, string[]> = {
			"/manage": ["manage", "planning"],
			"/exchanges": ["exchanges", "planning"],
			"/market-live": ["market-live", "tools"],
			"/fio/burn": ["fio-burn", "tools"],
			"/profile": ["profile", "footer"],
			"/apikey": ["apikey", "footer"],
			"/help": ["help", "footer"],
			"/debug": ["debug", "footer"],
		};

		for (const [to, [target, section]] of Object.entries(expected)) {
			await open(w, `${NAV}.more`);
			vi.mocked(trackEvent).mockClear();
			const link = w
				.findAllComponents(RouterLinkStub)
				.find((l) => l.props("to") === to)!;
			expect(link.attributes("aria-current")).toBe(
				to === "/manage" ? "page" : undefined
			);
			await link.trigger("click");
			expect(vi.mocked(trackEvent).mock.calls, to).toEqual([
				nav(target, "mobile_sheet", section),
			]);
			expect(body().find("[role=dialog]").exists(), to).toBe(false);
		}
	});

	it("logs out from the More sheet and returns to the start page", async () => {
		const logout = vi
			.spyOn(useUserStore(), "logout")
			.mockImplementation(() => {});
		const w = await mountBar();
		await open(w, `${NAV}.more`);

		await sheet()
			.findAll("button")
			.find((b) => b.text() === `${NAV}.logout`)!
			.trigger("click");

		expect(trackEvent).toHaveBeenCalledWith(
			...nav("logout", "mobile_sheet", "footer")
		);
		expect(logout).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledWith("/");
		expect(body().find("[role=dialog]").exists()).toBe(false);
	});

	it("shows the FIO data age on the FIO group in the More sheet", async () => {
		useUserStore().profile = {
			id: 1,
			username: "u",
			email: null,
			is_email_verified: true,
			fio_apikey: "key",
			prun_username: "PRUN",
			fio_status: "ok",
			fio_last_refreshed_at: null,
		};
		const synced = new Date(Date.now() - 2 * 3600 * 1000);
		usePlanningStore().fio_storage_timestamp = synced;
		const w = await mountBar();
		await open(w, `${NAV}.more`);

		const group = sheet()
			.findAll("div")
			.find((d) => d.text().startsWith(`${NAV}.fio.fio`))!;
		expect(group.find(".bg-positive").exists()).toBe(true);
		expect(group.text()).toContain(relativeFromDate(synced));
	});

	it("hides the FIO group in the More sheet without FIO", async () => {
		const w = await mountBar();
		await open(w, `${NAV}.more`);

		expect(sheet().text()).not.toContain(`${NAV}.fio.fio`);
		expect(sheet().text()).toContain(`${NAV}.market`);
	});
});
