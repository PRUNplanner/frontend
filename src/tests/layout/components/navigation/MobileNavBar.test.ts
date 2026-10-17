import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive, ref } from "vue";
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
import VersionUpdateChip from "@/layout/components/VersionUpdateChip.vue";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

const route = reactive({
	name: "empire" as string,
	params: {} as Record<string, string>,
	fullPath: "/empire",
});
vi.mock("vue-router", () => ({
	useRoute: () => route,
	useRouter: () => ({ push: vi.fn() }),
}));

const execute = vi.fn();
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string) => ({
		state: ref({ data: [] }),
		execute: () => execute(name),
	}),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

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

async function mountBar() {
	usePlanningStore().setEmpires([EMPIRE]);
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
		).toEqual(["Bober", "DEIMALO"]);

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

	it("closes a sheet on a backdrop tap", async () => {
		const w = await mountBar();
		await open(w, `${NAV}.more`);
		const mask = body().find(".pdrawer-mask");
		await mask.trigger("mousedown");
		await mask.trigger("click");
		await flushPromises();
		expect(body().find("[role=dialog]").exists()).toBe(false);
	});

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
