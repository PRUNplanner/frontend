import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive, ref } from "vue";
import {
	DOMWrapper,
	flushPromises,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import AppSidebar from "@/layout/components/navigation/AppSidebar.vue";
import { mountComponent } from "@/tests/mountComponent";
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { useVersionCheck } from "@/lib/useVersionCheck";
import { relativeFromDate } from "@/util/date";
import VersionUpdateChip from "@/layout/components/VersionUpdateChip.vue";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type {
	FIOStatus,
	UserProfile,
} from "@/features/api/schemas/user.schemas";

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
vi.mock("@/router", () => ({ default: { push: vi.fn() } }));

const execute = vi.fn();
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({ state: ref({ data: [] }), execute }),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

const body = () => new DOMWrapper(document.body);
const NAV = "common.navigation";

function empire(uuid: string, planCount: number): PlanEmpireElement {
	return {
		uuid,
		empire_name: `Empire ${uuid}`,
		empire_faction: "NONE",
		empire_permits_used: 0,
		empire_permits_total: 3,
		modified_at: "",
		plans: Array.from({ length: planCount }, (_, i) => ({
			uuid: `${uuid}-p${i}`,
			plan_name: `Plan ${String.fromCharCode(90 - i)}`,
			planet_natural_id: `ZV-${100 + i}a`,
		})),
	} as PlanEmpireElement;
}

function profile(fio_status: FIOStatus): UserProfile {
	return {
		id: 1,
		username: "test-user",
		email: null,
		is_email_verified: true,
		fio_apikey: fio_status === "none" ? null : "key",
		prun_username: fio_status === "none" ? null : "PRUN",
		fio_status,
		fio_last_refreshed_at: null,
	};
}

let pinia: Pinia;

async function mountSidebar(empires: PlanEmpireElement[] = [empire("a", 3)]) {
	usePlanningStore().setEmpires(empires);
	const { wrapper } = await mountComponent(AppSidebar, {}, { pinia });
	return wrapper;
}

function goTo(name: string, params: Record<string, string> = {}) {
	Object.assign(route, {
		name,
		params,
		fullPath: `/${name}/${Object.values(params).join("/")}`,
	});
	return nextTick();
}

const links = (w: VueWrapper) => w.findAllComponents(RouterLinkStub);

describe("AppSidebar", () => {
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
		useUserStore().profile = profile("none");
	});

	it("marks the open plan and the empire row as its parent", async () => {
		const w = await mountSidebar();
		const empireRow = links(w).find((l) => l.props("to") === "/empire")!;
		expect(empireRow.attributes("aria-current")).toBe("page");

		await goTo("plan", { planetNaturalId: "ZV-101a", planUuid: "a-p1" });
		const current = w.findAll("[aria-current=page]");
		expect(current).toHaveLength(1);
		expect(current[0].text()).toContain("Plan Y");
		expect(empireRow.attributes("aria-current")).toBeUndefined();
		expect(empireRow.classes()).toContain("text-ink-strong");
	});

	it("lists the plans A–Z and opens another without the empire page", async () => {
		const w = await mountSidebar();
		const plans = w.findAll("[data-nav-plans] a");
		expect(plans.map((a) => a.find("span.truncate").text())).toEqual([
			"Plan X",
			"Plan Y",
			"Plan Z",
		]);
		const link = links(w).find((l) => l.text().startsWith("Plan X"))!;
		expect(link.props("to")).toBe("/plan/ZV-102a/a-p2");
		await link.trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("app:nav_click", {
			target: "plan",
			area: "sidebar",
			section: "plans",
		});
	});

	it("marks nothing for a new plan or a shared plan", async () => {
		const w = await mountSidebar();
		await goTo("plan", { planetNaturalId: "ZV-101a" });
		expect(w.findAll("[aria-current=page]")).toHaveLength(0);
		await goTo("shared-plan", { sharedPlanUuid: "s1" });
		expect(w.findAll("[aria-current=page]")).toHaveLength(0);
	});

	it("shows a plan of another empire as one extra row", async () => {
		const w = await mountSidebar([empire("a", 2), empire("b", 1)]);
		await goTo("plan", { planetNaturalId: "ZV-100a", planUuid: "b-p0" });
		const current = w.findAll("[aria-current=page]");
		expect(current).toHaveLength(1);
		expect(current[0].text()).toContain(`${NAV}.not_in_empire`);
		expect(w.findAll("[data-nav-plans] li")).toHaveLength(3);
	});

	it("offers to create an empire without one, and Planet Search without plans", async () => {
		let w = await mountSidebar([]);
		expect(w.find("[data-nav-plans]").exists()).toBe(false);
		const create = links(w).find(
			(l) => l.text() === `${NAV}.create_empire`
		)!;
		expect(create.props("to")).toBe("/manage");

		w.unmount();
		w = await mountSidebar([empire("a", 0)]);
		expect(w.text()).toContain(`${NAV}.no_plans`);
	});

	it("shows the filter from 15 plans on; Escape and switching empire clear it", async () => {
		let w = await mountSidebar([empire("a", 14)]);
		expect(w.find("input").exists()).toBe(false);
		w.unmount();

		w = await mountSidebar([empire("a", 15), empire("b", 15)]);
		const input = w.find("input");
		await input.setValue("zv-101");
		expect(w.findAll("[data-nav-plans] li")).toHaveLength(1);
		await input.setValue("nothing");
		expect(w.text()).toContain(`${NAV}.plans_filter_empty`);

		await input.trigger("keydown", { key: "Escape" });
		expect((input.element as HTMLInputElement).value).toBe("");
		expect(w.findAll("[data-nav-plans] li")).toHaveLength(15);

		await input.setValue("Plan Z");
		useUserStore().setPreference("defaultEmpireUuid", "b");
		await flushPromises();
		expect((w.find("input").element as HTMLInputElement).value).toBe("");
	});

	it("switches the empire from the Switch menu", async () => {
		const w = await mountSidebar([empire("a", 1), empire("b", 2)]);
		await w.find("button.text-xs").trigger("click");
		await flushPromises();
		const options = body().findAll("[role=menuitem]");
		expect(options.map((o) => o.text())).toEqual(["Empire a", "Empire b"]);
		await options[1].trigger("click");
		expect(useUserStore().preferences.defaultEmpireUuid).toBe("b");
		expect(w.findAll("[data-nav-plans] li")).toHaveLength(2);
	});

	it("shows Tools by default, and a dot while folded on a tool", async () => {
		const w = await mountSidebar();
		const toggle = w.find("button[aria-controls]");
		expect(toggle.attributes("aria-expanded")).toBe("true");

		await goTo("market-live");
		expect(w.find("[data-tools-dot]").exists()).toBe(false);
		expect(w.find("[aria-current=page]").text()).toBe(`${NAV}.market_live`);

		await toggle.trigger("click");
		expect(toggle.attributes("aria-expanded")).toBe("false");
		expect(w.find("[data-tools-dot]").exists()).toBe(true);
		// unfold it again for the other tests
		await toggle.trigger("click");
	});

	it("shows FIO Burn and Repair only with FIO", async () => {
		useUserStore().profile = profile("ok");
		const w = await mountSidebar();
		const toggle = w.find("button[aria-controls]");
		await toggle.trigger("click");
		const targets = links(w).map((l) => l.props("to"));
		expect(targets).toContain("/fio/burn");
		expect(targets).toContain("/fio/repair");
		await toggle.trigger("click");
	});

	it("handles the storage 404 of a failing user without FIO data", async () => {
		const notFound = Promise.reject(
			Object.assign(new Error("No storage data available."), {
				status: 404,
			})
		);
		const handled = vi.spyOn(notFound, "catch");
		execute.mockReturnValue(notFound);
		useUserStore().profile = profile("error");

		await mountSidebar();
		expect(execute).toHaveBeenCalledWith();
		expect(handled).toHaveBeenCalledOnce();
	});

	it.each([
		["ok", `${NAV}.fio.fio_active`, "success", undefined],
		["none", `${NAV}.fio.fio_inactive`, "warning", "/profile"],
		["error", `${NAV}.fio.fio_inactive`, "warning", "/profile"],
		["syncing", `${NAV}.fio.fio_syncing`, "secondary", "/profile"],
		["no_data", `${NAV}.fio.fio_no_data`, "warning", "/profile"],
		["invalid_credentials", `${NAV}.fio.fio_rejected`, "error", "/profile"],
	] as const)(
		"FIO %s: icon state, name and link",
		async (status, label, type, to) => {
			useUserStore().profile = profile(status);
			const w = await mountSidebar();
			const icon = w.find("[data-fio-state]");
			expect(icon.attributes("aria-label")).toBe(label);
			expect(icon.attributes("data-fio-state")).toBe(type);
			const link = links(w).find((l) => l.attributes("data-fio-state"));
			expect(link?.props("to")).toBe(to);
		}
	);

	it("opens the account menu with Profile, API, Logout and the version", async () => {
		const logout = vi
			.spyOn(useUserStore(), "logout")
			.mockImplementation(() => {});
		const w = await mountSidebar();
		const button = w.find(`button[aria-label="${NAV}.account_menu"]`);
		await button.trigger("click");
		await flushPromises();
		expect(button.attributes("aria-expanded")).toBe("true");
		const menu = body().find(`nav[aria-label="${NAV}.account"]`);
		expect(menu.text()).toContain(`${NAV}.profile`);
		expect(menu.text()).toContain(`${NAV}.api`);
		expect(
			links(w)
				.filter((l) => menu.element.contains(l.element))
				.map((l) => l.props("to"))
		).toEqual(["/profile", "/apikey", "/debug"]);
		await menu.find("button").trigger("click");
		expect(logout).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledWith("/");
	});
});

describe("AppSidebar version chip", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		execute.mockReset().mockResolvedValue(undefined);
		Object.assign(route, {
			name: "empire",
			params: {},
			fullPath: "/empire",
		});
		useUserStore().profile = profile("ok");
	});

	it("shows the update chip under the logo after Later", async () => {
		const { updateAvailable, latestVersion, later } = useVersionCheck();
		const w = await mountSidebar();
		expect(w.findComponent(VersionUpdateChip).exists()).toBe(false);

		updateAvailable.value = true;
		latestVersion.value = "new-build";
		later();
		await flushPromises();

		expect(w.findComponent(VersionUpdateChip).exists()).toBe(true);
		updateAvailable.value = false;
	});
});

describe("SidebarRail", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		execute.mockReset().mockResolvedValue(undefined);
		Object.assign(route, {
			name: "empire",
			params: {},
			fullPath: "/empire",
		});
		useUserStore().profile = profile("ok");
		useUserStore().setPreference("layoutNavigationStyle", "collapsed");
	});

	it("names every control, no truncated labels", async () => {
		const w = await mountSidebar();
		for (const el of w.findAll("a, button"))
			expect(el.attributes("aria-label") || el.text()).toBeTruthy();
		expect(w.text()).not.toContain(`${NAV}.planning`);
		// every icon-only control has a tooltip
		const icons = w
			.findAll("a[aria-label], button[aria-label]")
			.filter((el) => !el.text());
		expect(icons).toHaveLength(8);
		for (const el of icons)
			expect(el.element.closest(".ptooltip"), el.html()).not.toBeNull();
	});

	it("opens the plans and tools popovers; navigation and Escape close them", async () => {
		const w = await mountSidebar([empire("a", 2)]);
		const plans = w.find(`button[aria-label="${NAV}.plans"]`);
		await plans.trigger("click");
		await flushPromises();
		expect(plans.attributes("aria-expanded")).toBe("true");
		expect(body().findAll("[data-nav-plans] li")).toHaveLength(2);

		await goTo("plan", { planetNaturalId: "ZV-100a", planUuid: "a-p0" });
		await flushPromises();
		expect(plans.attributes("aria-expanded")).toBe("false");
		expect(body().find("[data-nav-plans]").exists()).toBe(false);

		const tools = w.find(`button[aria-label="${NAV}.tools"]`);
		await tools.trigger("click");
		await flushPromises();
		expect(body().text()).toContain(`${NAV}.market_live`);
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await flushPromises();
		expect(tools.attributes("aria-expanded")).toBe("false");
	});

	it("expands again", async () => {
		const w = await mountSidebar();
		await w.find(`button[aria-label="${NAV}.expand"]`).trigger("click");
		expect(useUserStore().preferences.layoutNavigationStyle).toBe("full");
	});
});

describe("AppSidebar behaviour", () => {
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
		useUserStore().profile = profile("ok");
	});

	it("tracks a click on every destination with its section", async () => {
		const w = await mountSidebar();
		const tracked: Record<string, unknown[]> = {};
		for (const link of links(w)) {
			vi.mocked(trackEvent).mockClear();
			await link.trigger("click");
			tracked[`${link.props("to")}#${link.text() || "icon"}`] = vi
				.mocked(trackEvent)
				.mock.calls.map((c) => c[1]);
		}

		const section = (target: string, area: string, sec: string) => [
			{ target, area, section: sec },
		];
		// the logo does not count as a menu click
		expect(tracked["/#PRUNplanner"]).toEqual([]);
		expect(tracked[`/search#${NAV}.planet_search`]).toEqual(
			section("search", "sidebar", "planning")
		);
		expect(tracked[`/manage#${NAV}.management`]).toEqual(
			section("manage", "sidebar", "planning")
		);
		expect(tracked[`/exchanges#${NAV}.exchanges`]).toEqual(
			section("exchanges", "sidebar", "planning")
		);
		expect(tracked["/empire#EAEmpire a"]).toEqual(
			section("empire", "sidebar", "empire")
		);
		expect(tracked["/search#icon"]).toEqual(
			section("search", "sidebar", "plans")
		);
		expect(tracked[`/fio/burn#${NAV}.fio_burn`]).toEqual(
			section("fio-burn", "sidebar", "tools")
		);
		expect(tracked[`/market-live#${NAV}.market_live`]).toEqual(
			section("market-live", "sidebar", "tools")
		);
		expect(tracked["/help#icon"]).toEqual(
			section("help", "sidebar", "footer")
		);
	});

	it("tracks the create-empire link when there is no empire", async () => {
		const w = await mountSidebar([]);
		await links(w)
			.find((l) => l.text() === `${NAV}.create_empire`)!
			.trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("app:nav_click", {
			target: "manage",
			area: "sidebar",
			section: "empire",
		});
	});

	it("collapses to the rail and remembers the choice", async () => {
		const w = await mountSidebar();
		expect(w.find("aside").classes()).toContain("w-62");

		await w.find(`button[aria-label="${NAV}.collapse"]`).trigger("click");

		expect(useUserStore().preferences.layoutNavigationStyle).toBe(
			"collapsed"
		);
		expect(w.find("aside").classes()).toContain("w-16");
		expect(w.find(`button[aria-label="${NAV}.expand"]`).exists()).toBe(
			true
		);
	});

	it("marks the open page in the planning, tools and help rows", async () => {
		const w = await mountSidebar();
		await goTo("manage");
		let current = w.findAll("[aria-current=page]");
		expect(current.map((c) => c.text())).toEqual([`${NAV}.management`]);
		expect(current[0].classes()).toContain("text-prunplanner");

		await goTo("help");
		current = w.findAll("[aria-current=page]");
		expect(current).toHaveLength(1);
		expect(current[0].attributes("aria-label")).toBe(`${NAV}.help`);
		expect(current[0].classes()).toContain("text-prunplanner");
	});

	it("shows the FIO data age next to the FIO tools once it is known", async () => {
		const w = await mountSidebar();
		const fioHeader = () =>
			w.findAll(
				"#" +
					w.find("button[aria-controls]").attributes("aria-controls")
			)[0];
		expect(fioHeader().text()).not.toMatch(/\d+\s*(minute|hour)|ago/i);

		const synced = new Date(Date.now() - 2 * 3600 * 1000);
		usePlanningStore().fio_storage_timestamp = synced;
		await flushPromises();

		expect(fioHeader().text()).toContain(relativeFromDate(synced));
	});

	it("loads the FIO storage for a user with FIO and drops it without", async () => {
		const invalidate = vi.spyOn(useQueryStore(), "invalidateKey");
		const w = await mountSidebar();
		expect(execute).toHaveBeenCalled();
		expect(invalidate).not.toHaveBeenCalled();

		useUserStore().profile = profile("none");
		await flushPromises();

		expect(invalidate).toHaveBeenCalledWith(["gamedata", "fio"], {
			exact: false,
			skipRefetch: true,
		});
		w.unmount();
	});

	it("rethrows a storage error that is not a 404", async () => {
		const failure = Object.assign(new Error("boom"), { status: 500 });
		let thrown: unknown;
		// the rethrow happens inside the catch handler: run it here
		execute.mockReturnValue({
			catch: (handler: (err: unknown) => void) => {
				try {
					handler(failure);
				} catch (err) {
					thrown = err;
				}
			},
		});

		await mountSidebar();

		expect(thrown).toBe(failure);
	});
});

describe("SidebarRail behaviour", () => {
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
		useUserStore().profile = profile("ok");
		useUserStore().setPreference("layoutNavigationStyle", "collapsed");
	});

	const rail = (target: string, section: string) => [
		"app:nav_click",
		{ target, area: "rail", section },
	];

	it("tracks a click on each icon with its section", async () => {
		const w = await mountSidebar();
		const tracked: Record<string, unknown[]> = {};
		for (const link of links(w)) {
			vi.mocked(trackEvent).mockClear();
			await link.trigger("click");
			tracked[link.props("to") as string] = vi
				.mocked(trackEvent)
				.mock.calls.slice(0, 1);
		}

		expect(tracked["/"]).toEqual([]);
		expect(tracked["/search"]).toEqual([rail("search", "planning")]);
		expect(tracked["/manage"]).toEqual([rail("manage", "planning")]);
		expect(tracked["/exchanges"]).toEqual([rail("exchanges", "planning")]);
		expect(tracked["/empire"]).toEqual([rail("empire", "empire")]);
		expect(tracked["/help"]).toEqual([rail("help", "footer")]);
	});

	it("tracks the tools in the popover", async () => {
		const w = await mountSidebar();
		await w.find(`button[aria-label="${NAV}.tools"]`).trigger("click");
		await flushPromises();
		vi.mocked(trackEvent).mockClear();

		const burn = links(w).find((l) => l.props("to") === "/fio/burn")!;
		await burn.trigger("click");

		expect(trackEvent).toHaveBeenCalledWith(...rail("fio-burn", "tools"));
	});

	it("offers to create an empire without one, and has no plans button", async () => {
		const w = await mountSidebar([]);
		expect(w.find(`button[aria-label="${NAV}.plans"]`).exists()).toBe(
			false
		);

		const empireLink = links(w).filter(
			(l) => l.attributes("aria-label") === `${NAV}.create_empire`
		);
		expect(empireLink).toHaveLength(1);
		await empireLink[0].trigger("click");

		expect(trackEvent).toHaveBeenCalledWith(...rail("manage", "empire"));
	});

	it("marks the open page on the icons", async () => {
		const w = await mountSidebar();
		const current = () =>
			w
				.findAll("[aria-current=page]")
				.map((c) => c.attributes("aria-label"));
		expect(current()).toEqual(["Empire a"]);
		expect(w.find("span.outline-prunplanner").exists()).toBe(true);

		await goTo("manage");
		expect(current()).toEqual([`${NAV}.management`]);
		expect(w.find("span.outline-prunplanner").exists()).toBe(false);

		await goTo("help");
		expect(current()).toEqual([`${NAV}.help`]);
	});

	it("highlights the tools button and the open tool in its popover", async () => {
		await goTo("market-live");
		const w = await mountSidebar();
		const tools = w.find(`button[aria-label="${NAV}.tools"]`);
		expect(tools.classes()).toContain("text-prunplanner");

		await tools.trigger("click");
		await flushPromises();

		const current = body().findAll("[aria-current=page]");
		expect(current.map((c) => c.text())).toEqual([`${NAV}.market_live`]);
		expect(current[0].classes()).toContain("bg-prunplanner/10");
	});

	it("shows the FIO data age on the FIO group of the popover", async () => {
		const synced = new Date(Date.now() - 2 * 3600 * 1000);
		usePlanningStore().fio_storage_timestamp = synced;
		const w = await mountSidebar();
		await w.find(`button[aria-label="${NAV}.tools"]`).trigger("click");
		await flushPromises();

		const group = body()
			.findAll("div.uppercase")
			.find((d) => d.text().startsWith(`${NAV}.fio.fio`))!;
		expect(group.find(".bg-positive").exists()).toBe(true);
		expect(group.text()).toContain(relativeFromDate(synced));
	});

	it("leaves the FIO group out of the popover without FIO", async () => {
		useUserStore().profile = profile("none");
		const w = await mountSidebar();
		await w.find(`button[aria-label="${NAV}.tools"]`).trigger("click");
		await flushPromises();

		expect(body().text()).toContain(`${NAV}.market`);
		expect(body().text()).not.toContain(`${NAV}.fio.fio`);
	});
});
