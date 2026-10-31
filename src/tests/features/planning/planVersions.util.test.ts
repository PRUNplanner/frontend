import { describe, it, expect, vi, afterEach } from "vitest";

import {
	formatWhen,
	versionAgeDays,
	versionLabel,
	versionState,
} from "@/features/planning/planVersions.util";

// Types & Interfaces
import type { PlanVersionListItem } from "@/features/api/schemas/planningData.schemas";
import type { IPlanDiffable } from "@/features/planning_data/planDiff";

const t = (key: string, params?: Record<string, string | number>) =>
	params ? `${key}:${Object.values(params).join(",")}` : key;

describe("planVersions.util", () => {
	afterEach(() => vi.useRealTimers());

	it("serializes a version like the history, without an empty name", () => {
		const state = {
			plan_data: { buildings: [] },
			plan_permits_used: 2,
			plan_name: "",
			plan_corphq: true,
			plan_cogc: "---",
		} as unknown as IPlanDiffable;
		expect(versionState(state)).toBe(
			'{"plan_cogc":"---","plan_corphq":true,"plan_permits_used":2,"plan_data":{"buildings":[]}}'
		);
	});

	it("says when: time today, yesterday, else the date", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 30, 15, 0));
		const time = (d: Date) =>
			d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

		const today = new Date(2026, 9, 30, 14, 2);
		expect(formatWhen(today, t)).toBe(time(today));
		expect(formatWhen(today.toISOString(), t, true)).toBe(
			`plan.versions.when.today:${time(today)}`
		);
		const yesterday = new Date(2026, 9, 29, 22, 10);
		expect(formatWhen(yesterday, t)).toBe(
			`plan.versions.when.yesterday:${time(yesterday)}`
		);
		const older = new Date(2026, 9, 12, 18, 20);
		expect(formatWhen(older, t)).toContain(time(older));
		expect(formatWhen(older, t)).not.toContain("plan.versions");

		expect(
			versionAgeDays({
				created_at: new Date(2026, 9, 27, 16, 0).toISOString(),
			} as PlanVersionListItem)
		).toBe(2);
	});

	it("labels a version by its name, an unnamed one by when", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 30, 15, 0));
		const created = new Date(2026, 9, 30, 9, 5).toISOString();
		expect(
			versionLabel(
				{ name: "Late", created_at: created } as PlanVersionListItem,
				t
			)
		).toBe("Late");
		expect(
			versionLabel(
				{ name: "", created_at: created } as PlanVersionListItem,
				t
			)
		).toMatch(/^plan\.versions\.when\.today:/);
	});
});
