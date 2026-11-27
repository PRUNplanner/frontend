import { z } from "zod";

// Util
import {
	calculate,
	findEmpireCX,
	getCXs,
	getDefaultEmpireUuid,
	getEmpires,
	getPlan,
	loadEmpireCX,
	loadPlanSetup,
	planSetup,
	resolveEmpire,
} from "@/mcp/context";
import { getPlanet, loadGameData } from "@/mcp/gameData";
import { calculateWithHabs } from "@/mcp/variant";
import { body, createPlan } from "@/mcp/tools/savePlan";
import { ToolError } from "@/mcp/backend";
import { pickEmpire } from "@/features/empire/util/planEmpire.util";
import {
	defineTool,
	figures,
	detailArg,
	planDetails,
	PLAN_FULL_DETAIL,
	summarizeDetails,
	planUrl,
	uuidArg,
} from "@/mcp/tools/shared";
import { buildPlanSummary } from "@/features/planning/planSummary.util";

// Schemas
import { PlanShareSchema } from "@prunplanner/engine/schemas";
import {
	SharedCreatePayloadSchema,
	SharedCreateResponseSchema,
	SharedListResponseSchema,
} from "@/features/api/schemas/sharingData.schemas";

// Types & Interfaces
import type { IPlanSetup } from "@/mcp/context";
import type { IBackend } from "@/mcp/backend";

export const getShares = (b: IBackend) =>
	b.get("/planning/shared/", SharedListResponseSchema);

export const shareUrl = (appUrl: string, uuid: string): string =>
	`${appUrl}/shared/${uuid}`;

export const sharePlan = defineTool({
	name: "share_plan",
	title: "Share a plan",
	write: "save",
	description:
		"Creates a public read-only link to a plan, as the app's Share: anyone with the link sees the plan and can copy it into their account. If the plan is already shared, returns its link. Remove a link with delete (kind share).",
	inputSchema: z.object({ plan_uuid: uuidArg() }),
	async run({ plan_uuid }, { backend, appUrl }) {
		const existing = (await getShares(backend)).find(
			(s) => s.plan === plan_uuid
		);
		if (existing) {
			const url = shareUrl(appUrl, existing.uuid);
			return {
				text: `The plan is already shared: ${url}`,
				data: {
					share: {
						uuid: existing.uuid,
						url,
						views: existing.view_count,
						created: existing.created_at,
					},
				},
			};
		}
		const setup = await loadPlanSetup(backend, plan_uuid, undefined);
		const share = await backend.send(
			"POST",
			"/planning/shared/",
			{
				plan: plan_uuid,
				// the link preview's numbers, as the app sends them
				plan_summary: buildPlanSummary(
					calculate(setup),
					setup.ctx.prices
				),
			},
			SharedCreatePayloadSchema,
			SharedCreateResponseSchema
		);
		const url = shareUrl(appUrl, share.uuid);
		return {
			text: `Shared "${setup.plan.plan_name}": ${url}`,
			data: {
				plan: {
					uuid: setup.plan.uuid,
					name: setup.plan.plan_name,
					url: planUrl(appUrl, setup.plan),
				},
				share: { uuid: share.uuid, url, views: 0 },
			},
		};
	},
});

export const copySharedPlan = defineTool({
	name: "copy_shared_plan",
	title: "Copy a shared plan",
	write: "save",
	description:
		"Copies a plan someone shared (its link or share uuid) into the user's account as a new plan, as the app's Copy on a shared plan: named plan_name (default \"<name> (Copy)\"), in empire_uuid, else the empire calculate_new_plan would pick (default, else only empire). Returns the new plan's uuid, url and numbers.",
	inputSchema: z.object({
		share: z
			.string()
			.describe(
				"The share link (https://prunplanner.org/shared/<uuid>) or its uuid"
			),
		plan_name: z.string().trim().min(1).max(100).optional(),
		empire_uuid: uuidArg()
			.optional()
			.describe("Empire the copy is calculated in and added to"),
	}),
	async run(args, { backend, appUrl }) {
		const uuid = shareUuid(args.share);
		const shared = (
			await backend.get(
				`/planning/shared/${encodeURIComponent(uuid)}/`,
				PlanShareSchema
			)
		).plan_details;
		const [planet, gameData, pricing] = await Promise.all([
			getPlanet(backend, shared.planet_natural_id),
			loadGameData(backend),
			loadEmpireCX(backend, args.empire_uuid),
		]);
		// the shared plan as it is, in the copy's empire
		const v = calculateWithHabs(
			gameData,
			shared,
			planet,
			pricing.empire,
			pricing.cx,
			"plan"
		);
		const name = args.plan_name ?? `${shared.plan_name} (Copy)`;
		// a shared plan's copy keeps the sharer's habs: auto-habs off
		const { uuid: planUuid, notes } = await createPlan(
			backend,
			body(v, name, v.empire?.uuid),
			false
		);
		const id = planet.planet_natural_id;
		const url = `${appUrl}/plan/${id}/${planUuid}`;
		const d = figures(v.calc);
		return {
			text: `Copied as "${name}" on ${id} in ${v.empire ? `the empire "${v.empire.empire_name}"` : "no empire"}: profit ${d.profit} per day. ${url}`,
			data: {
				plan: {
					uuid: planUuid,
					name,
					planet: id,
					url,
					empire: v.empire
						? { uuid: v.empire.uuid, name: v.empire.empire_name }
						: null,
				},
				per_day: d,
				note:
					[pricing.note, ...notes].filter(Boolean).join(" ") || null,
				empire_choices: pricing.choices,
				reload_hint:
					"If PRUNplanner is open, reload the page to see the change.",
			},
		};
	},
});

/** the share uuid from a share link or the uuid itself */
function shareUuid(share: string): string {
	const uuid =
		/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(
			share
		)?.[0];
	if (!uuid) throw new ToolError(`No share uuid in "${share}".`);
	return uuid;
}

export const getSharedPlan = defineTool({
	name: "get_shared_plan",
	title: "Calculate a shared plan",
	description:
		"Calculates a plan someone shared (its link or share uuid) as get_plan does, without copying it into the account: the same result as get_plan. It is calculated as the app shows it: someone else's plan in the user's default empire, else their first (its faction and CX preference), the user's own shared plan as its plan page opens it; empire_uuid picks another. Opening it counts a view, like opening the link. copy_shared_plan saves a copy.",
	inputSchema: z.object({
		share: z
			.string()
			.describe(
				"The share link (https://prunplanner.org/shared/<uuid>) or its uuid"
			),
		empire_uuid: uuidArg()
			.optional()
			.describe("Empire to calculate in (faction, CX prices)"),
		detail: detailArg(PLAN_FULL_DETAIL),
	}),
	async run({ share, empire_uuid, detail }, { backend, appUrl }) {
		const uuid = shareUuid(share);
		const shared = await backend.get(
			`/planning/shared/${encodeURIComponent(uuid)}/`,
			PlanShareSchema
		);
		// the user's own plan (the backend serves a plan only to its owner;
		// the share payload carries no empires): the app redirects to its
		// plan page, so it is calculated exactly as get_plan
		const ownPlan = await getPlan(backend, shared.plan_details.uuid).catch(
			(e: unknown) => {
				if (e instanceof ToolError && e.message.startsWith("Not found"))
					return undefined;
				throw e;
			}
		);
		const own = !!ownPlan;
		let setup: IPlanSetup;
		if (ownPlan)
			setup = await loadPlanSetup(backend, ownPlan.uuid, empire_uuid);
		else {
			const [planet, gameData, empires, cxs, defaultEmpire] =
				await Promise.all([
					getPlanet(backend, shared.plan_details.planet_natural_id),
					loadGameData(backend),
					getEmpires(backend),
					getCXs(backend),
					getDefaultEmpireUuid(backend),
				]);
			const plan = { ...shared.plan_details, empires: [] };
			// someone else's plan: the user's default empire, else their
			// first, as the shared plan page (usePlanSharedCopy, pickEmpire)
			const viewerEmpire = pickEmpire(empires, defaultEmpire);
			const resolved =
				empire_uuid || !viewerEmpire
					? resolveEmpire(plan, empires, empire_uuid)
					: { empire: viewerEmpire };
			setup = planSetup(
				plan,
				planet,
				gameData,
				resolved,
				findEmpireCX(cxs, resolved.empire?.uuid)
			);
		}
		const plan = setup.plan;
		const full = planDetails(setup, calculate(setup), appUrl);
		const details = detail === "full" ? full : summarizeDetails(full);
		const url = shareUrl(appUrl, uuid);
		const d = details.per_day;
		return {
			text: `Shared plan ${plan.plan_name} on ${plan.planet_natural_id}: profit ${d.profit} per day (revenue ${d.revenue}, cost ${d.cost}), construction cost ${d.construction_cost}. ${url}`,
			data: {
				...details,
				// someone else's plan page isn't the user's: the share link;
				// their own plan keeps its uuid and page for the other tools
				plan: own ? details.plan : { ...details.plan, uuid: null, url },
				share: { uuid, url, views: shared.view_count, own_plan: own },
			},
		};
	},
});
