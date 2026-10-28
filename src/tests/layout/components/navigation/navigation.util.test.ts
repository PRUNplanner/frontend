import { describe, expect, it, vi } from "vitest";

import {
	breadcrumbEmpire,
	FILTER_FROM,
	filterPlans,
	initials,
	pickEmpire,
	planEmpireUuid,
	sortPlans,
	trackNav,
} from "@/layout/components/navigation/navigation.util";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

const plan = (uuid: string, plan_name: string, planet_natural_id: string) => ({
	uuid,
	plan_name,
	planet_natural_id,
});

function empire(uuid: string, planUuids: string[]): PlanEmpireElement {
	return {
		uuid,
		empire_name: `Empire ${uuid}`,
		empire_faction: "NONE",
		empire_permits_used: 0,
		empire_permits_total: 3,
		modified_at: "",
		plans: planUuids.map((p) => plan(p, p, "XX-000a")),
	} as PlanEmpireElement;
}

describe("navigation.util", () => {
	it("sorts plans A–Z by name, case-insensitive", () => {
		const sorted = sortPlans([
			plan("1", "nike", "ZV-194a"),
			plan("2", "Bober", "ZV-307b"),
			plan("3", "DEIMALO", "ZV-759c"),
			plan("4", "alpha", "KI-446b"),
		]);
		expect(sorted.map((p) => p.plan_name)).toEqual([
			"alpha",
			"Bober",
			"DEIMALO",
			"nike",
		]);
	});

	it("filters by plan name or planet id, case-insensitive", () => {
		const plans = [
			plan("1", "Bober NR+PG", "ZV-307b"),
			plan("2", "Griff EPO", "LS-300c"),
		];
		expect(filterPlans(plans, "bober").map((p) => p.uuid)).toEqual(["1"]);
		expect(filterPlans(plans, "ls-300").map((p) => p.uuid)).toEqual(["2"]);
		expect(filterPlans(plans, "  ")).toBe(plans);
		expect(filterPlans(plans, "nothing")).toEqual([]);
		expect(FILTER_FROM).toBe(15);
	});

	it("picks the stored empire, else the first", () => {
		const list = [empire("a", []), empire("b", [])];
		expect(pickEmpire(list, "b")?.uuid).toBe("b");
		expect(pickEmpire(list, "gone")?.uuid).toBe("a");
		expect(pickEmpire(list, undefined)?.uuid).toBe("a");
		expect(pickEmpire([], "a")).toBeUndefined();
	});

	it("links the breadcrumb to the current empire, else the first holding the plan", () => {
		const a = empire("a", ["p1"]);
		const b = empire("b", ["p1", "p2"]);
		const c = empire("c", ["p2"]);
		const list = [a, b, c];
		expect(breadcrumbEmpire("p1", list, b)?.uuid).toBe("b");
		expect(breadcrumbEmpire("p2", list, a)?.uuid).toBe("b");
		expect(breadcrumbEmpire("p3", list, a)).toBeUndefined();
		// a new or shared plan: planet only
		expect(breadcrumbEmpire(undefined, list, a)).toBeUndefined();
	});

	it("calculates a plan with its breadcrumb's empire, else its first", () => {
		const list = [empire("a", ["p1"]), empire("b", ["p1", "p2"]), empire("c", ["p2"])];
		// the navigation shows c; its plans list c and b (another order)
		expect(planEmpireUuid("p2", [{ uuid: "c" }, { uuid: "b" }], list, "c")).toBe("c");
		// the navigation's a doesn't hold p2: the breadcrumb's b, not the plan's first
		expect(planEmpireUuid("p2", [{ uuid: "c" }, { uuid: "b" }], list, "a")).toBe("b");
		// the plan lists no empire the user has: its first
		expect(planEmpireUuid("p9", [{ uuid: "x" }], list, "a")).toBe("x");
		expect(planEmpireUuid("p9", [], list, "a")).toBeUndefined();
	});

	it("makes up to two initials", () => {
		expect(initials("Sky Productions")).toBe("SP");
		expect(initials("sky high productions")).toBe("SH");
		expect(initials("Moria")).toBe("MO");
		expect(initials(" ")).toBe("");
	});

	it("sends app:nav_click with target, area and section", () => {
		trackNav("market-live", "rail", "tools");
		expect(trackEvent).toHaveBeenCalledWith("app:nav_click", {
			target: "market-live",
			area: "rail",
			section: "tools",
		});
	});
});
