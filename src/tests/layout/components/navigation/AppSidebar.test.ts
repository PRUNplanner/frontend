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
		const create = links(w).find((l) => l.props("to") === "/manage")!;
		expect(create.text()).toBe(`${NAV}.create_empire`);

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

	it("folds Tools by default, with a dot while a tool is open", async () => {
		const w = await mountSidebar();
		const toggle = w.find("button[aria-controls]");
		expect(toggle.attributes("aria-expanded")).toBe("false");
		expect(w.find("[data-tools-dot]").exists()).toBe(false);

		await goTo("market-live");
		expect(w.find("[data-tools-dot]").exists()).toBe(true);

		await toggle.trigger("click");
		expect(toggle.attributes("aria-expanded")).toBe("true");
		expect(w.find("[data-tools-dot]").exists()).toBe(false);
		expect(w.find("[aria-current=page]").text()).toBe(`${NAV}.market_live`);
		// fold it again for the other tests
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
		expect(trackEvent).toHaveBeenCalledWith("app:navigation_toggle", {
			navigation_style: "full",
		});
	});
});
