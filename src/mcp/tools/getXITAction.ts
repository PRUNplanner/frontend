import { z } from "zod";

// Util
import { calculate, loadPlanSetup } from "@/mcp/context";
import { getMaterials } from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import {
	amount,
	defineTool,
	money,
	planUrl,
	uuidArg,
} from "@/mcp/tools/shared";
import {
	transferAction,
	XITSTATIONWAREHOUSESTOCX,
} from "@/features/xit/xitAction.util";
import {
	constructionTotals,
	plannedAmount,
	supplyAmount,
} from "@/features/planning/util/carts.util";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

// Schemas
import { UserPreferenceSchema } from "@/features/api/schemas/user.schemas";

// Types & Interfaces
import type { IXITTransferMaterial } from "@/features/xit/xitAction.types";

const WAREHOUSES = Object.keys(XITSTATIONWAREHOUSESTOCX) as [
	string,
	...string[],
];

export const getXITAction = defineTool({
	name: "get_xit_action",
	title: "Build a XIT action package",
	description:
		'Builds a XIT package (JSON) for Refined PrUn\'s XIT ACT, as the app\'s XIT buttons do: a transfer from a station warehouse (origin, or chosen when run), optionally bought on that station\'s exchange first (buy). kind: "construction" (a plan\'s Construction cart: construction materials for what\'s still to build, planned minus built), "supply" (its Supply cart: what the base uses up in days, net), "supply_initial" (the first supply: gross inputs for days) or "materials" (your list). origin, buy and days default to the user\'s saved settings. Nothing happens in the game until the user pastes it into XIT ACT and runs it; the destination is chosen there. Returns the JSON, the materials with weight and volume, and the cost at the plan\'s prices.',
	inputSchema: z.object({
		kind: z.enum(["construction", "supply", "supply_initial", "materials"]),
		plan_uuid: uuidArg()
			.optional()
			.describe("The plan (construction, supply)"),
		empire_uuid: uuidArg()
			.optional()
			.describe(
				"Empire the plan is calculated in (default the one its plan page opens with)"
			),
		days: z
			.number()
			.min(1)
			.max(365)
			.optional()
			.describe("Supply days (default the user's Supply cart days)"),
		part: z
			.enum(["all", "production", "workforce"])
			.optional()
			.describe(
				"Supply only production or workforce needs (default all)"
			),
		built: z
			.array(
				z.object({
					ticker: z.string(),
					amount: z.number().int().min(0),
				})
			)
			.optional()
			.describe(
				"Construction: buildings already built (default the plan's saved Built column)"
			),
		materials: z
			.array(
				z.object({ ticker: z.string(), amount: z.number().positive() })
			)
			.max(200)
			.optional()
			.describe("kind materials: what to ship"),
		name: z
			.string()
			.max(40)
			.optional()
			.describe('Package name after "PRUNplanner" (kind materials)'),
		origin: z
			.enum(WAREHOUSES)
			.optional()
			.describe("Station warehouse to ship from (default the user's)"),
		buy: z
			.boolean()
			.optional()
			.describe(
				"Buy on the origin station's exchange first (default the user's; needs a warehouse origin)"
			),
	}),
	async run(args, { backend, appUrl }) {
		const preferences = await backend
			.get("/user/preferences/", UserPreferenceSchema)
			.catch(() => undefined);
		const origin =
			args.origin ??
			preferences?.burnOrigin ??
			preferenceDefaults.burnOrigin;
		const buy =
			args.buy ??
			preferences?.defaultBuyItemsFromCX ??
			preferenceDefaults.defaultBuyItemsFromCX;
		const notes: string[] = [];

		let elements: IXITTransferMaterial[];
		let name: string;
		let setup: Awaited<ReturnType<typeof loadPlanSetup>> | undefined;
		if (args.kind === "materials") {
			if (!args.materials?.length)
				throw new ToolError("kind materials needs materials.");
			const known = new Set(
				(await getMaterials(backend)).map((m) => m.ticker)
			);
			const unknown = args.materials.filter(
				(m) => !known.has(m.ticker.toUpperCase())
			);
			if (unknown.length)
				throw new ToolError(
					`Unknown materials: ${unknown.map((m) => m.ticker).join(", ")}.`
				);
			elements = args.materials.map((m) => ({
				ticker: m.ticker.toUpperCase(),
				value: Math.ceil(m.amount),
			}));
			name = args.name ?? "Transfer";
		} else {
			if (!args.plan_uuid)
				throw new ToolError(`kind ${args.kind} needs plan_uuid.`);
			setup = await loadPlanSetup(
				backend,
				args.plan_uuid,
				args.empire_uuid
			);
			if (setup.resolved.note) notes.push(setup.resolved.note);
			const r = calculate(setup).result;
			if (args.kind === "construction") {
				const built = args.built
					? Object.fromEntries(
							args.built.map((b) => [
								b.ticker.toUpperCase(),
								b.amount,
							])
						)
					: (preferences?.planOverrides[args.plan_uuid]
							?.constructionBuilt ?? {});
				if (!args.built)
					notes.push(
						"Built: the plan's saved Built column; buildings FIO reports as built are not subtracted here (pass built)."
					);
				const amounts = Object.fromEntries(
					r.constructionMaterials.map((b) => [
						b.ticker,
						Math.max(
							(plannedAmount(
								b.ticker,
								r.production.buildings,
								r.infrastructure
							) ?? 0) - (built[b.ticker] ?? 0),
							0
						),
					])
				);
				elements = Object.entries(
					constructionTotals(r.constructionMaterials, amounts)
				).map(([ticker, value]) => ({ ticker, value }));
				name = "Construct";
			} else {
				const days =
					args.days ??
					preferences?.supplyCartDays ??
					preferenceDefaults.supplyCartDays;
				const part = args.part ?? "all";
				const partList =
					part === "workforce"
						? r.workforceMaterialIO
						: part === "production"
							? r.productionMaterialIO
							: r.materialio;
				const inPart = new Set(partList.map((m) => m.ticker));
				elements =
					args.kind === "supply"
						? r.materialio
								.filter(
									(m) => m.delta < 0 && inPart.has(m.ticker)
								)
								.map((m) => ({
									ticker: m.ticker,
									value: supplyAmount(m.delta, days),
								}))
						: partList
								.filter((m) => m.input > 0)
								.map((m) => ({
									ticker: m.ticker,
									value: supplyAmount(m.input, days),
								}));
				notes.push(
					`Supply for ${days} days${part === "all" ? "" : ` (${part} only)`}; stock already on the planet is not subtracted.`
				);
				name =
					args.kind === "supply"
						? "Supply Cart"
						: "Supply Cart Initial";
			}
		}
		// as the XIT button: materials with nothing to ship are left out
		elements = elements.filter((e) => e.value > 0);
		if (buy && !XITSTATIONWAREHOUSESTOCX[origin])
			notes.push(
				'Buying needs a warehouse origin: with "Configure on Execution" the package only transfers.'
			);
		const xit = transferAction(elements, { name, origin, buy });

		const materials = new Map(
			(await getMaterials(backend)).map((m) => [m.ticker, m])
		);
		const rows = elements.map((e) => {
			const m = materials.get(e.ticker);
			return {
				ticker: e.ticker,
				amount: e.value,
				weight_t: amount((m?.weight ?? 0) * e.value),
				volume_m3: amount((m?.volume ?? 0) * e.value),
				...(setup && {
					cost: money(
						setup.ctx.prices.getPrice(e.ticker, "BUY") * e.value
					),
				}),
			};
		});
		const sum = (pick: (r: (typeof rows)[number]) => number | undefined) =>
			rows.reduce((total, r) => total + (pick(r) ?? 0), 0);
		const json = JSON.stringify(xit);
		return {
			text: `XIT package "${xit.global.name}": ${rows.length} materials, ${amount(sum((r) => r.weight_t))} t, ${amount(sum((r) => r.volume_m3))} m³${setup ? `, about ${money(sum((r) => r.cost))} at the plan's prices` : ""}; from ${origin}${xit.actions.some((a) => a.type === "CX Buy") ? ", bought there first" : ""}. Paste the json into XIT ACT (Refined PrUn) in the game to run it.`,
			data: {
				json,
				package: xit,
				materials: rows,
				totals: {
					weight_t: amount(sum((r) => r.weight_t)),
					volume_m3: amount(sum((r) => r.volume_m3)),
					...(setup && { cost: money(sum((r) => r.cost)) }),
				},
				origin,
				buy_first: xit.actions.some((a) => a.type === "CX Buy"),
				note: notes.join(" ") || null,
				...(setup && {
					plan: {
						uuid: setup.plan.uuid,
						name: setup.plan.plan_name,
						url: planUrl(appUrl, setup.plan),
					},
				}),
			},
		};
	},
});
