import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, reactive, ref } from "vue";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import { memoryStorage } from "@/tests/memoryStorage";
import { useNavigation } from "@/layout/components/navigation/useNavigation";
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

const route = reactive({
	name: "empire" as string,
	params: {} as Record<string, string>,
	fullPath: "/empire",
});
enableAutoUnmount(afterEach);

const push = vi.fn();
vi.mock("vue-router", () => ({
	useRoute: () => route,
	useRouter: () => ({ push }),
}));

const state = ref<unknown>({ data: [] });
const execute = vi.fn();
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({ state, execute }),
}));

function empire(
	uuid: string,
	plans: [string, string, string][]
): PlanEmpireElement {
	return {
		uuid,
		empire_name: `Empire ${uuid}`,
		empire_faction: "NONE",
		empire_permits_used: 0,
		empire_permits_total: 3,
		modified_at: "",
		plans: plans.map(([u, n, p]) => ({
			uuid: u,
			plan_name: n,
			planet_natural_id: p,
		})),
	} as PlanEmpireElement;
}

// fresh: load the module anew, as a reload reads the stored fold state
async function setup(fresh = false) {
	let use = useNavigation;
	if (fresh) {
		vi.resetModules();
		use = (await import("@/layout/components/navigation/useNavigation"))
			.useNavigation;
	}
	let nav!: ReturnType<typeof useNavigation>;
	mount(
		defineComponent({
			setup() {
				nav = use();
				return () => h("div");
			},
		})
	);
	return nav;
}

// loading the module anew is slow on a busy machine
describe("useNavigation", { timeout: 60_000 }, () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		execute.mockReset().mockResolvedValue([]);
		push.mockReset();
		state.value = { data: [] };
		Object.assign(route, { name: "empire", params: {}, fullPath: "/" });
		usePlanningStore().setEmpires([
			empire("a", [
				["p2", "zeta", "ZV-307b"],
				["p1", "Alpha", "KI-446b"],
			]),
			empire("b", [["p3", "Beta", "LS-300c"]]),
		]);
	});
	afterEach(() => vi.unstubAllGlobals());

	it("lists the stored empire's plans A–Z, else the first empire's", async () => {
		useUserStore().setPreference("defaultEmpireUuid", "b");
		const nav = await setup();
		expect(nav.currentEmpire.value?.uuid).toBe("b");

		useUserStore().setPreference("defaultEmpireUuid", "gone");
		expect(nav.currentEmpire.value?.uuid).toBe("a");
		expect(nav.plans.value.map((p) => p.plan_name)).toEqual([
			"Alpha",
			"zeta",
		]);
	});

	it("switching sets the empire the empire page opens", async () => {
		const nav = await setup();
		nav.switchEmpire("b");
		expect(useUserStore().preferences.defaultEmpireUuid).toBe("b");
		expect(nav.plans.value.map((p) => p.uuid)).toEqual(["p3"]);
		expect(push).not.toHaveBeenCalled();

		// an empire in the URL would win over the switch
		Object.assign(route, { name: "empire", params: { empireUuid: "a" } });
		nav.switchEmpire("a");
		expect(push).toHaveBeenCalledWith("/empire");
	});

	it("loads the empire list again once a save dropped it", async () => {
		await setup();
		expect(execute).not.toHaveBeenCalled();
		state.value = undefined;
		await nextTick();
		expect(execute).toHaveBeenCalledOnce();
	});

	it("marks a saved plan, and a plan of another empire as stray", async () => {
		const nav = await setup();
		Object.assign(route, {
			name: "plan",
			params: { planetNaturalId: "KI-446b", planUuid: "p1" },
		});
		expect(nav.openPlanUuid.value).toBe("p1");
		expect(nav.openPlanInEmpire.value).toBe(true);
		expect(nav.strayPlan.value).toBeUndefined();

		route.params = { planetNaturalId: "LS-300c", planUuid: "p3" };
		expect(nav.openPlanInEmpire.value).toBe(false);
		expect(nav.strayPlan.value).toEqual({
			uuid: "p3",
			plan_name: "Beta",
			planet_natural_id: "LS-300c",
		});

		// in no empire, not loaded: the planet stands in
		route.params = { planetNaturalId: "OT-580b", planUuid: "p9" };
		expect(nav.strayPlan.value).toEqual({
			uuid: "p9",
			plan_name: "",
			planet_natural_id: "OT-580b",
		});
	});

	it("marks nothing for a new plan or a shared one", async () => {
		const nav = await setup();
		Object.assign(route, {
			name: "plan",
			params: { planetNaturalId: "KI-446b" },
		});
		expect(nav.openPlanUuid.value).toBeUndefined();
		expect(nav.strayPlan.value).toBeUndefined();
		Object.assign(route, {
			name: "shared-plan",
			params: { sharedPlanUuid: "s1" },
		});
		expect(nav.openPlanUuid.value).toBeUndefined();
	});

	it("shows Tools by default and remembers the fold per device", async () => {
		const storage = memoryStorage();
		vi.stubGlobal("localStorage", storage);
		let nav = await setup(true);
		expect(nav.toolsOpen.value).toBe(true);
		nav.toggleTools();
		expect(storage.getItem("prunplanner_nav_tools")).toBe("0");

		// a reload reads it back
		nav = await setup(true);
		expect(nav.toolsOpen.value).toBe(false);
	});

	it("folds and unfolds without storage", async () => {
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("blocked");
			},
		});
		const nav = await setup(true);
		expect(nav.toolsOpen.value).toBe(true);
		nav.toggleTools();
		expect(nav.toolsOpen.value).toBe(false);
	});

	it("knows when the open page is a tool, and hides FIO tools without FIO", async () => {
		const nav = await setup();
		expect(nav.toolActive.value).toBe(false);
		route.name = "market-live";
		expect(nav.toolActive.value).toBe(true);
		expect(nav.tools.value.map((i) => i.name)).not.toContain("fio-burn");
		expect(nav.tools.value).toHaveLength(8);
	});

	// test phase: Base ROI opens by URL only
	it("has no Base ROI entry and keeps the Tools count", async () => {
		const nav = await setup();
		const all = nav.toolGroups.value.flatMap((g) => g.items);
		expect(all.map((i) => i.name)).not.toContain("base-roi");
		expect(all.map((i) => i.to)).not.toContain("/base-roi");
		expect(nav.tools.value).toHaveLength(8);
	});

	it("lists the market report first among the market tools, with a prefetch", async () => {
		const nav = await setup();
		const [first] = nav.toolGroups.value[0].items;
		expect(first).toMatchObject({ name: "market", to: "/market" });
		expect(first.prefetch).toBeTypeOf("function");
	});
});
