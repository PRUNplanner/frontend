import { describe, expect, it } from "vitest";

import { baseStaffing, isStaffed } from "@/features/base_roi/baseROIPopulation";
import { filterRows } from "@/features/base_roi/baseROIMetrics";

// Types & Interfaces
import type { PopulationReport } from "@/features/api/schemas/gameData.schemas";
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

const report = {
	free_pioneer: 1200,
	open_jobs_pioneer: 150,
	free_settler: 0,
	open_jobs_settler: 0,
} as PopulationReport;

describe("baseStaffing", () => {
	it("counts free workers less the jobs already open", () => {
		const fits = baseStaffing(
			[{ tier: "pioneer", required: 1050 }],
			report
		);
		expect(fits).toEqual({ hasReport: true, gaps: [] });
		expect(isStaffed(fits)).toBe(true);

		const short = baseStaffing(
			[{ tier: "pioneer", required: 1051 }],
			report
		);
		expect(short.gaps).toEqual([
			{ tier: "pioneer", required: 1051, available: 1050 },
		]);
		expect(isStaffed(short)).toBe(false);
	});

	it("lists only the tiers it can't fill", () => {
		const { gaps } = baseStaffing(
			[
				{ tier: "pioneer", required: 100 },
				{ tier: "settler", required: 1 },
			],
			report
		);
		expect(gaps.map((g) => g.tier)).toEqual(["settler"]);
	});

	it("a planet without a report isn't staffed", () => {
		const none = baseStaffing(
			[{ tier: "pioneer", required: 1 }],
			undefined
		);
		expect(none).toEqual({ hasReport: false, gaps: [] });
		expect(isStaffed(none)).toBe(false);
	});
});

describe("filterRows with staffing", () => {
	const row = (key: string) =>
		({
			key,
			kind: "resource",
			metrics: {
				fitsLogistics: true,
				marketCapacity: 5,
				dailyProfit: 100,
				breakEven: 20,
			},
		}) as IBaseROIRow;
	const filter = {
		showResources: true,
		showRecipes: true,
		showNegative: false,
		showUnbuildable: false,
		minMarketCapacity: 0,
	};
	const staffing = new Map([
		["ok", { hasReport: true, gaps: [] }],
		["none", { hasReport: false, gaps: [] }],
	]);
	const rows = [row("ok"), row("none"), row("unchecked")];

	it("hides unstaffed rows, never rows that weren't checked", () => {
		const { rows: shown, hidden } = filterRows(rows, [], filter, staffing);
		expect(shown.map((r) => r.key).sort()).toEqual(["ok", "unchecked"]);
		expect(hidden.unstaffed).toBe(1);
	});
	it("hides a full planet without ghost sites, not one with them", () => {
		const plots = (supports_ghost_sites: boolean) => ({
			plots_total: 100,
			plots_used: 100,
			ghost_sites: 0,
			supports_ghost_sites,
			plots_updated: null,
		});
		const list = [
			{ ...row("full"), plots: plots(false) },
			{ ...row("ghost"), plots: plots(true) },
			{ ...row("unknown"), plots: undefined },
		];
		const { rows: shown, hidden } = filterRows(list, [], filter);
		expect(shown.map((r) => r.key).sort()).toEqual(["ghost", "unknown"]);
		expect(hidden.noPlots).toBe(1);

		const all = filterRows(list, [], { ...filter, showUnbuildable: true });
		expect(all.rows).toHaveLength(3);
		expect(all.hidden.noPlots).toBe(0);
	});

	it("shows them with the setting on", () => {
		const { rows: shown, hidden } = filterRows(
			rows,
			[],
			{ ...filter, showUnbuildable: true },
			staffing
		);
		expect(shown).toHaveLength(3);
		expect(hidden.unstaffed).toBe(0);
	});
});
