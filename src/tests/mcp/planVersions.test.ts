// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";

// App
import { diffPlan } from "@/features/planning_data/planDiff";
import { changeLineText } from "@/features/save_conflict/changeLineText";
import game from "@/locales/en_US/game.json";
import saveConflict from "@/locales/en_US/save_conflict.json";

// MCP
import { createBackend } from "@/mcp/backend";
import { getPlan } from "@/mcp/tools/getPlan";
import { diffPlanVersions, listPlanVersions } from "@/mcp/tools/planVersions";
import {
	API_KEY,
	PLAN_UUID,
	fakeBackend,
	fixtures,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";
import type { IPlanDiffable } from "@/features/planning_data/planDiff";

const OLD = "11111111-1111-4111-8111-111111111111";
const NOW = "22222222-2222-4222-8222-222222222222";
const plan = fixtures.plan;

const snapshot = (planData: Record<string, unknown>) => ({
	plan_name: plan.plan_name,
	planet_natural_id: plan.planet_natural_id,
	plan_corphq: plan.plan_corphq,
	plan_cogc: plan.plan_cogc,
	plan_permits_used: plan.plan_permits_used,
	plan_data: planData,
});

// an old snapshot: other name, no COGC, 15 FP instead of 19, no experts key
const { experts: _experts, ...oldData } = {
	...plan.plan_data,
	buildings: plan.plan_data.buildings.map((b) =>
		b.name === "FP" ? { ...b, amount: 15 } : b
	),
};
const oldVersion = {
	uuid: OLD,
	kind: "save",
	name: "Before FP",
	created_at: "2026-11-01T10:00:00Z",
	source_version: null,
	is_active: false,
	data_bytes: 100,
	...snapshot(oldData),
	plan_name: "Old name",
	plan_cogc: "---",
};
const nowVersion = {
	uuid: NOW,
	kind: "restore",
	name: "",
	created_at: "2026-11-10T10:00:00Z",
	source_version: OLD,
	is_active: true,
	data_bytes: 120,
	...snapshot(plan.plan_data),
};
const listItem = (v: typeof oldVersion | typeof nowVersion) => ({
	uuid: v.uuid,
	kind: v.kind,
	name: v.name,
	created_at: v.created_at,
	source_version: v.source_version,
	is_active: v.is_active,
	data_bytes: v.data_bytes,
});

const ROUTES: [RegExp, unknown][] = [
	[/\/versions\/$/, [listItem(oldVersion), listItem(nowVersion)]],
	[new RegExp(`/versions/${OLD}/$`), oldVersion],
	[new RegExp(`/versions/${NOW}/$`), nowVersion],
];

// the app's text: vue-i18n over the same English messages
const { t } = createI18n({
	legacy: false,
	locale: "en_US",
	messages: { en_US: { game, save_conflict: saveConflict } },
}).global;

let backend: IFakeBackend;
let env: IToolEnv;

beforeEach(() => {
	backend = fakeBackend(undefined, ROUTES);
	env = {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		}),
	};
});

const appLines = (from: IPlanDiffable, to: IPlanDiffable) =>
	diffPlan(from, to).map((line) => ({
		text: changeLineText(line, t),
		...line,
	}));

describe("list_plan_versions", () => {
	it("lists versions newest first with the plan's url", async () => {
		const { data } = await listPlanVersions.run(
			{ plan_uuid: PLAN_UUID },
			env
		);
		expect(
			(data.versions as { uuid: string }[]).map((v) => v.uuid)
		).toEqual([NOW, OLD]);
		expect(data.versions).toContainEqual({
			uuid: NOW,
			kind: "restore",
			name: "",
			created_at: nowVersion.created_at,
			is_active: true,
			source_version: OLD,
		});
		expect(data.plan).toMatchObject({
			uuid: PLAN_UUID,
			url: `https://app.test/plan/${plan.planet_natural_id}/${PLAN_UUID}`,
		});
		expect(backend.requests.every((r) => r.method === "GET")).toBe(true);
	});
});

describe("diff_plan_versions", () => {
	const oldPlan = {
		...oldVersion,
		plan_data: { ...oldData, experts: [] },
	} as unknown as IPlanDiffable;

	it("words the changes to the saved plan as the app does, with profits", async () => {
		const { data, text } = await diffPlanVersions.run(
			{ plan_uuid: PLAN_UUID, from_version: OLD },
			env
		);
		const expected = appLines(oldPlan, plan as unknown as IPlanDiffable);
		expect(data.changes).toEqual(expected);
		expect(expected.map((l) => l.text)).toEqual([
			`Name Old name → ${plan.plan_name}`,
			"COGC None → RES",
			"FP 15 → 19",
			// the old snapshot had no experts key: none
			"Agriculture experts 0 → 3",
			"Food Industries experts 0 → 2",
			"Resource Extraction experts 0 → 1",
		]);
		expect(text).toContain("FP 15 → 19");

		const { from, to, difference } = data as any;
		expect(to.version).toBeNull();
		expect(from.version).toBe(OLD);
		// the saved side is the plan as get_plan calculates it
		const saved = await getPlan.run({ plan_uuid: PLAN_UUID }, env);
		expect(to.figures.profit).toBe((saved.data as any).per_day.profit);
		expect(from.figures.profit).not.toBe(to.figures.profit);
		expect(difference.profit).toBeCloseTo(
			to.figures.profit - from.figures.profit,
			1
		);
		expect(difference.construction_cost).toBeGreaterThan(0);
		expect(backend.requests.every((r) => r.method === "GET")).toBe(true);
	});

	it("compares two versions", async () => {
		const { data } = await diffPlanVersions.run(
			{ plan_uuid: PLAN_UUID, from_version: OLD, to_version: NOW },
			env
		);
		expect(data.changes).toEqual(
			appLines(oldPlan, nowVersion as unknown as IPlanDiffable)
		);
		// the NOW snapshot is the saved plan: same figures
		const saved = await diffPlanVersions.run(
			{ plan_uuid: PLAN_UUID, from_version: OLD },
			env
		);
		expect((data as any).to.version).toBe(NOW);
		expect((data as any).to.figures).toEqual(
			(saved.data as any).to.figures
		);
	});

	it("says no changes for the same version", async () => {
		const { data, text } = await diffPlanVersions.run(
			{ plan_uuid: PLAN_UUID, from_version: NOW, to_version: NOW },
			env
		);
		expect(data.changes).toEqual([]);
		expect((data as any).difference.profit).toBe(0);
		expect(text).toContain("no changes");
	});
});
