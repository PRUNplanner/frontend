import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";

import { usePlanSharedCopy } from "@/features/planning/usePlanSharedCopy";
import { useUserStore } from "@/stores/userStore";
import { mountComposable } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IPlanCalculation,
	IPlanViewProps,
} from "@/features/planning/planView.types";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";

const { trackEvent, toast, buildChangeSummary } = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	toast: vi.fn(),
	buildChangeSummary: vi.fn((_summary: object) => "summary"),
}));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent,
}));
vi.mock("@/ui/useToast", () => ({ useToast: () => toast }));
// the shared version calculates like the copy
vi.mock("@/features/planning/usePlanCalculation", () => ({
	usePlanCalculation: () => ({
		result: ref("before"),
		overviewData: ref({}),
	}),
}));
vi.mock("@/features/sharing/sharedPlan.util", () => ({
	planFigures: (result: unknown) => result,
	buildingChanges: () => ({ added: 1 }),
	buildChangeSummary,
}));
vi.mock("@/features/planning_data/planDiff", () => ({
	diffPlan: () => [{ kind: "added" }, { kind: "removed" }],
}));
const pinia = createPinia();
const empire = (uuid: string) => ({ uuid }) as PlanEmpireElement;
const PLAN = {
	planet_natural_id: "KW-020c",
	name: "Shared",
} as unknown as IPlanDefinition;

function setup(props: Partial<IPlanViewProps>) {
	const modified = ref(false);
	const calculation = {
		modified,
		result: ref("after"),
		overviewData: ref({}),
		planName: ref("Shared"),
		snapshot: () => "{}",
		savedSnapshot: () => "{}",
	} as unknown as IPlanCalculation;
	const refs = {
		uuid: ref<string | undefined>(undefined),
		list: ref<PlanEmpireElement[] | undefined>(undefined),
		cxUuid: ref<string | undefined>(undefined),
	};
	const applySavedPlan = vi.fn();
	const viewProps = ref({ planData: PLAN, ...props } as IPlanViewProps);
	return { modified, calculation, refs, applySavedPlan, viewProps };
}

async function mountShared(s: ReturnType<typeof setup>) {
	return mountComposable(
		() =>
			usePlanSharedCopy(
				s.calculation,
				s.refs,
				s.applySavedPlan,
				// read reactively, like props
				new Proxy({} as IPlanViewProps, {
					get: (_, key: keyof IPlanViewProps) =>
						s.viewProps.value[key],
				})
			),
		{ pinia }
	);
}

describe("usePlanSharedCopy", () => {
	beforeEach(() => {
		setActivePinia(pinia);
		vi.clearAllMocks();
	});

	it("compares a changed copy against the shared version", async () => {
		const s = setup({ shared: true, sharedPlanUuid: "s-1" });
		const { result: shared } = await mountShared(s);
		expect(shared.sharedChanged.value).toBe(false);
		expect(shared.sharedCompare.value).toBeUndefined();
		expect(shared.sharedChanges.value).toBeUndefined();

		s.modified.value = true;
		expect(shared.sharedCompare.value).toEqual({
			before: "before",
			after: "after",
		});
		expect(shared.sharedChanges.value).toEqual({ added: 1 });
		expect(shared.sharedPriceSource.value).toBe(
			"sharing.banner.price_universe"
		);
	});

	it("never compares an own plan", async () => {
		const s = setup({});
		s.modified.value = true;
		const { result: shared } = await mountShared(s);
		expect(shared.sharedChanged.value).toBe(false);
		expect(shared.sharedCompare.value).toBeUndefined();
	});

	it("prices with the viewer's default empire, also after logging in", async () => {
		const s = setup({ shared: true });
		await mountShared(s);
		expect(s.refs.uuid.value).toBeUndefined();

		useUserStore().preferences.defaultEmpireUuid = "e-2";
		s.viewProps.value = {
			...s.viewProps.value,
			empireList: [empire("e-1"), empire("e-2")],
		};
		await nextTick();
		expect(s.refs.list.value).toHaveLength(2);
		expect(s.refs.uuid.value).toBe("e-2");

		// the picked one stays while it's in the list
		s.refs.uuid.value = "e-1";
		s.viewProps.value = {
			...s.viewProps.value,
			empireList: [empire("e-1"), empire("e-3")],
		};
		await nextTick();
		expect(s.refs.uuid.value).toBe("e-1");
	});

	it("resets to the shared version", async () => {
		const s = setup({ shared: true });
		const { result: shared } = await mountShared(s);
		shared.resetShared();
		expect(s.applySavedPlan).toHaveBeenCalledWith(PLAN);
		expect(s.applySavedPlan.mock.calls[0][0]).not.toBe(PLAN);
		expect(trackEvent).toHaveBeenCalledWith("plan:shared_reset", {
			planet_natural_id: "KW-020c",
		});
	});

	it("copies the change summary, a failed copy says so", async () => {
		const s = setup({ shared: true, sharedPlanUuid: "s-1" });
		s.modified.value = true;
		const { result: shared } = await mountShared(s);
		const writeText = vi.fn(async () => {});
		vi.stubGlobal("navigator", { clipboard: { writeText } });

		await shared.copySharedChanges();
		expect(writeText).toHaveBeenCalledWith("summary");
		expect(buildChangeSummary.mock.calls[0][0]).toMatchObject({
			name: "Shared",
			planet: "KW-020c",
			url: expect.stringContaining("/s-1"),
		});
		expect(toast).toHaveBeenCalledWith("sharing.banner.copied");
		expect(trackEvent).toHaveBeenCalledWith("plan:shared_copy_changes", {
			planet_natural_id: "KW-020c",
			change_count: 2,
		});

		writeText.mockRejectedValueOnce(new Error("denied"));
		await shared.copySharedChanges();
		expect(toast).toHaveBeenLastCalledWith("sharing.banner.copy_failed", {
			type: "error",
		});
		vi.unstubAllGlobals();
	});
});
