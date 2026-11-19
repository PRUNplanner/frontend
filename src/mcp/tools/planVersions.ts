import { basisText } from "@/mcp/priceBasis";
import { z } from "zod";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { diffPlan } from "@/features/planning_data/planDiff";
import { changeLineText } from "@/features/save_conflict/changeLineText";

// Util
import { getPlan, loadPlanSetup } from "@/mcp/context";
import { storeEmpireStates } from "@/mcp/empireState";
import {
	defineTool,
	figures,
	money,
	planUrl,
	plural,
	uuidArg,
} from "@/mcp/tools/shared";

// Schemas
import {
	PlanSchema,
	PlanVersionActivatePayloadSchema,
	PlanVersionListSchema,
	PlanVersionSchema,
} from "@/features/api/schemas/planningData.schemas";

// English texts, as the app shows change lines
import gameMessages from "@/locales/en_US/game.json";
import saveConflictMessages from "@/locales/en_US/save_conflict.json";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { IPlanSetup } from "@/mcp/context";
import type { IPlanDiffable } from "@/features/planning_data/planDiff";
import type { PlanData } from "@/features/api/schemas/planningData.schemas";

const versionsPath = (planUuid: string): string =>
	`/planning/plan/${encodeURIComponent(planUuid)}/versions/`;

// snapshots are stored as saved: older plan_data may lack newer keys
const StoredVersionSchema = PlanVersionSchema.extend({
	plan_data: PlanVersionSchema.shape.plan_data.partial(),
});
type StoredVersion = z.infer<typeof StoredVersionSchema>;

const getVersion = (b: IBackend, planUuid: string, versionUuid: string) =>
	b.get(
		`${versionsPath(planUuid)}${encodeURIComponent(versionUuid)}/`,
		StoredVersionSchema
	);

const messages: Record<string, unknown> = {
	game: gameMessages,
	save_conflict: saveConflictMessages,
};

/** vue-i18n's t over the English messages: the key back when missing */
function t(key: string, params: Record<string, string | number> = {}): string {
	const message = key
		.split(".")
		.reduce<unknown>(
			(node, part) =>
				(node as Record<string, unknown> | undefined)?.[part],
			messages
		);
	if (typeof message !== "string") return key;
	return message.replace(/\{(\w+)\}/g, (match, name: string) =>
		name in params ? String(params[name]) : match
	);
}

/** a version's plan fields, missing plan_data keys empty */
function versionPlan(version: StoredVersion): IPlanDiffable {
	const data: PlanData = {
		buildings: [],
		infrastructure: [],
		experts: [],
		workforce: [],
		...version.plan_data,
	};
	return {
		plan_name: version.plan_name,
		plan_cogc: version.plan_cogc,
		plan_corphq: version.plan_corphq,
		plan_permits_used: version.plan_permits_used,
		plan_data: data,
	};
}

/**
 * What differs between two plans, worded as the app's version compare
 * (name, permits, COGC, Corp HQ, buildings and recipes, habs and storage,
 * experts, luxuries)
 * @author jplacht
 */
export const planChanges = (from: IPlanDiffable, to: IPlanDiffable) =>
	diffPlan(from, to).map((line) => ({
		text: changeLineText(line, t),
		...line,
	}));

/** profit, cost and construction cost in the plan's empire, CX and planet */
function sideFigures(setup: IPlanSetup, plan: IPlanDiffable) {
	const { profit, cost, construction_cost } = figures(
		calculatePlan({ ...setup.input, plan }, setup.ctx)
	);
	return { profit, cost, construction_cost };
}

const versionLabel = (version: StoredVersion): string =>
	version.name ? `"${version.name}"` : `the version of ${version.created_at}`;

export const listPlanVersions = defineTool({
	name: "list_plan_versions",
	title: "List a plan's versions",
	description:
		"Lists the saved versions of one base plan, newest first: uuid, kind (save, restore, baseline, admin), name (empty when unnamed), when it was saved, whether it is the active one, and for a restore the version it came from. Use the uuids with diff_plan_versions.",
	inputSchema: z.object({
		plan_uuid: uuidArg().describe("Plan (from list_plans)"),
	}),
	async run({ plan_uuid }, { backend, appUrl }) {
		const [plan, versions] = await Promise.all([
			getPlan(backend, plan_uuid),
			backend.get(versionsPath(plan_uuid), PlanVersionListSchema),
		]);
		const list = versions
			.toSorted(
				(a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
			)
			.map((v) => ({
				uuid: v.uuid,
				kind: v.kind,
				name: v.name,
				created_at: v.created_at,
				is_active: v.is_active,
				source_version: v.source_version,
			}));
		return {
			text: `${plan.plan_name}: ${plural(list.length, "saved version")}${list.length ? `, newest ${list[0].created_at}` : ""}.`,
			data: {
				plan: {
					uuid: plan.uuid,
					name: plan.plan_name,
					url: planUrl(appUrl, plan),
				},
				versions: list,
			},
		};
	},
});

export const diffPlanVersions = defineTool({
	name: "diff_plan_versions",
	title: "Compare plan versions",
	description:
		"Compares two saved versions of a base plan, or a version with the plan as saved now: the changes as PRUNplanner's version compare words them (name, permits, COGC, Corp HQ, buildings and recipes, habs and storage, experts, luxuries), and profit, cost per day and construction cost of both sides calculated with the plan engine in the plan's current empire, CX and planet, with the difference.",
	inputSchema: z.object({
		plan_uuid: uuidArg().describe("Plan (from list_plans)"),
		from_version: uuidArg().describe(
			"Older side, a version (from list_plan_versions)"
		),
		to_version: uuidArg()
			.optional()
			.describe("Newer side, a version; default the plan as saved now"),
	}),
	async run({ plan_uuid, from_version, to_version }, { backend, appUrl }) {
		const [setup, from, to] = await Promise.all([
			loadPlanSetup(backend, plan_uuid, undefined),
			getVersion(backend, plan_uuid, from_version),
			to_version
				? getVersion(backend, plan_uuid, to_version)
				: Promise.resolve(undefined),
		]);
		const fromPlan = versionPlan(from);
		const toPlan = to ? versionPlan(to) : setup.plan;

		const changes = planChanges(fromPlan, toPlan);
		const before = sideFigures(setup, fromPlan);
		const after = sideFigures(setup, toPlan);
		const difference = {
			profit: money(after.profit - before.profit),
			cost: money(after.cost - before.cost),
			construction_cost: money(
				after.construction_cost - before.construction_cost
			),
		};

		const side = (version: StoredVersion | undefined) =>
			version
				? {
						version: version.uuid,
						name: version.name,
						created_at: version.created_at,
					}
				: { version: null, name: "plan as saved now" };
		const toLabel = to ? versionLabel(to) : "the plan as saved now";
		const empire = setup.resolved.empire;
		return {
			text: `${setup.plan.plan_name}, ${versionLabel(from)} → ${toLabel}: ${changes.length ? changes.map((c) => c.text).join("; ") : "no changes"}. Profit ${before.profit} → ${after.profit} per day (${difference.profit >= 0 ? "+" : ""}${difference.profit}).${setup.resolved.note ? " " + setup.resolved.note : ""}`,
			data: {
				plan: {
					uuid: setup.plan.uuid,
					name: setup.plan.plan_name,
					url: planUrl(appUrl, setup.plan),
				},
				price_basis: basisText(setup.basis, setup.cx),
				empire: empire
					? {
							uuid: empire.uuid,
							name: empire.empire_name,
							faction: empire.empire_faction,
						}
					: null,
				note: setup.resolved.note ?? null,
				from: { ...side(from), figures: before },
				to: { ...side(to), figures: after },
				difference,
				changes,
			},
		};
	},
});

export const restorePlanVersion = defineTool({
	name: "restore_plan_version",
	title: "Restore a plan version",
	write: "save",
	overwrites: true,
	description:
		"Makes a saved version the plan again, as the app's Restore: a new version on top, so the versions in between stay and this can be undone the same way. Use it to undo a save_plan. Get version uuids from list_plan_versions. Unsaved edits open in the app stay as a draft.",
	inputSchema: z.object({ plan_uuid: uuidArg(), version_uuid: uuidArg() }),
	async run({ plan_uuid, version_uuid }, { backend, appUrl }) {
		const plan = await backend.send(
			"POST",
			`${versionsPath(plan_uuid)}${encodeURIComponent(version_uuid)}/activate/`,
			// a draft this call didn't see stays (backend _restore keeps it)
			{ draft_updated_at: null },
			PlanVersionActivatePayloadSchema,
			PlanSchema
		);
		const stale = await storeEmpireStates(
			backend,
			(plan.empires ?? []).map((e) => e.uuid)
		);
		return {
			text: `Restored the version as the plan "${plan.plan_name}" (a new version on top). ${planUrl(appUrl, plan)}${stale ? ` ${stale}` : ""}`,
			data: {
				plan: {
					uuid: plan.uuid,
					name: plan.plan_name,
					url: planUrl(appUrl, plan),
				},
				restored_version: version_uuid,
				reload_hint:
					"If PRUNplanner is open, reload the page to see the change.",
			},
		};
	},
});
