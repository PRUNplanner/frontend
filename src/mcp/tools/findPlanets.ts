import { basisText } from "@/mcp/priceBasis";
import { z } from "zod";

// Engine
import {
	activeProgram,
	defaultFilter,
	defaultSort,
	filterPlanets,
	MAX_JUMPS,
	refKey,
	SEARCH_EXTRAS,
	planetInfrastructure,
	sortPlanets,
} from "@/features/planet_search/planetSearch.engine";
import { encodeSearch } from "@/features/planet_search/planetSearchUrl.util";
import {
	getBuildingRecipes,
	resourceBuildingTicker,
} from "@/features/planning/engine/buildings";
import { planetPlots } from "@/features/planet_search/planetPlots.util";

// Util
import { getPlanetSearchIndex, loadGameData } from "@/mcp/gameData";
import { mapPlanetToPlanType } from "@/features/planning_data/planCOGC.util";
import { loadPlanSetup } from "@/mcp/context";
import { buildVariant } from "@/mcp/variant";
import { ToolError } from "@/mcp/backend";
import {
	amount,
	cogcBoost,
	defineTool,
	detailArg,
	exchangeJumps,
	figures,
	nearestExchanges,
	plural,
	uuidArg,
} from "@/mcp/tools/shared";

// Schemas
import { PlanetCOGCProgramTypeSchema } from "@/features/api/schemas/gameData.schemas";
import {
	PlanetSearchCXSchema,
	PlanetSearchExtraSchema,
	PlanetSearchInfrastructureSchema,
	PlanetSearchSurfaceSchema,
} from "@/features/planet_search/planetSearch.schemas";

// Types & Interfaces
import type {
	PlanetSearchFilter,
	PlanetSearchReference,
} from "@/features/planet_search/planetSearch.schemas";

const FIND_FULL =
	"fertility, gravity, pressure, temperature and the COGC boost per planet";

export const findPlanets = defineTool({
	name: "find_planets",
	title: "Find planets",
	description:
		"Planet Search: planets with given resources, COGC program, infrastructure and conditions, as the app's Planet Search filters them. By default only rocky planets that need no special construction materials (MGC, BL, SEA, HSE, INS, TSH); list the ones you accept in accepted_extras. Sorted like Planet Search: by the first requested resource's daily extraction, highest first (or by jumps to near_exchange, nearest first, with sort \"jumps\"; plan_uuid keeps only planets where the plan's extraction can run and ranks them by profit instead). near_exchange with max_jumps keeps planets within that many jumps of the exchange, as Planet Search's exchange distance filter. Returns resources, active COGC program, fees, plots and a link to the same search in the app. To compare a setup on candidate planets, run calculate_new_plan on each.",
	inputSchema: z.object({
		name: z
			.string()
			.optional()
			.describe(
				"Planet name, id or system name, or part of one (as Planet Search's text box), e.g. Etherwind"
			),
		resources: z
			.array(
				z.object({
					ticker: z.string(),
					min_daily: z
						.number()
						.min(0)
						.optional()
						.describe("Minimum daily extraction per extractor"),
				})
			)
			.optional(),
		resources_match: z
			.enum(["all", "any"])
			.optional()
			.describe("Planet needs all listed resources (default) or any"),
		cogc: z.array(PlanetCOGCProgramTypeSchema).optional(),
		infrastructure: z
			.array(PlanetSearchInfrastructureSchema)
			.optional()
			.describe(
				"LM local market, COGC chamber of commerce, WAR warehouse, ADM administration center, SHY shipyard"
			),
		fertile: z.boolean().optional(),
		surface: z.array(PlanetSearchSurfaceSchema).optional(),
		accepted_extras: z.array(PlanetSearchExtraSchema).optional(),
		free_plots: z
			.number()
			.int()
			.min(1)
			.optional()
			.describe("At least this many free plots (when known)"),
		near_exchange: PlanetSearchCXSchema.optional().describe(
			"Exchange to measure jumps from, for max_jumps and sort"
		),
		max_jumps: z
			.number()
			.int()
			.min(0)
			.max(MAX_JUMPS)
			.optional()
			.describe("At most this many jumps from near_exchange"),
		sort: z
			.enum(["resource", "jumps"])
			.optional()
			.describe(
				'"resource" (default): the first requested resource\'s daily extraction, highest first; "jumps": jumps to near_exchange, nearest first, ties by resource'
			),
		limit: z.number().int().min(1).max(100).optional(),
		detail: detailArg(FIND_FULL),
		plan_uuid: uuidArg()
			.optional()
			.describe(
				"Rank the matching planets by what this saved plan would earn on each (its buildings and recipes moved there; up to 30 planets, in Planet Search order first). Only planets where all its extraction recipes can run are kept (RIG needs the resource as liquid, COL gaseous, EXT mineral); the others are counted in not_possible_for_plan"
			),
		empire_uuid: uuidArg()
			.optional()
			.describe(
				"Empire the plan is calculated in (default the one its plan page opens with)"
			),
	}),
	async run(args, { backend, appUrl }) {
		if (
			!args.near_exchange &&
			(args.max_jumps !== undefined || args.sort === "jumps")
		)
			throw new ToolError(
				'max_jumps and sort "jumps" need near_exchange.'
			);
		const [index, gameData] = await Promise.all([
			getPlanetSearchIndex(backend),
			loadGameData(backend),
		]);
		const tickers = (args.resources ?? []).map((r) =>
			r.ticker.toUpperCase()
		);
		const filter: PlanetSearchFilter = {
			...defaultFilter(),
			text: args.name ?? "",
			materialGroups: [
				{ op: args.resources_match ?? "all", materials: tickers },
			],
			minDaily: Object.fromEntries(
				(args.resources ?? [])
					.filter((r) => r.min_daily)
					.map((r) => [r.ticker.toUpperCase(), r.min_daily!])
			),
			cogc: args.cogc ?? [],
			infrastructure: args.infrastructure ?? [],
			fertile: args.fertile ?? false,
			surface: args.surface ?? ["rocky"],
			acceptedExtras: args.accepted_extras ?? [],
			references: args.near_exchange
				? [{ kind: "cx", code: args.near_exchange }]
				: [],
			// near an exchange without a cap: every distance (the app's default otherwise)
			maxJumps:
				args.max_jumps ??
				(args.near_exchange ? MAX_JUMPS : defaultFilter().maxJumps),
		};
		const now = Date.now();
		const ctx = {
			now,
			refJumps: (ref: PlanetSearchReference) =>
				ref.kind === "cx" ? exchangeJumps(ref.code) : undefined,
		};
		// Planet Search's order: the first resource's daily extraction, highest
		// first; by jumps, the resource order breaks the ties
		const bySort = defaultSort(filter);
		const byJumps =
			args.sort === "jumps"
				? [
						{
							key: `ref:${refKey(filter.references[0])}`,
							dir: "asc" as const,
						},
					]
				: [];
		let found = sortPlanets(
			filterPlanets(index, filter, ctx),
			[...byJumps, bySort],
			ctx
		);
		// what the default filter hid, so an empty search can say why
		const countWith = (f: PlanetSearchFilter) =>
			filterPlanets(index, f, ctx).length;
		const hidden = {
			needing_special_materials:
				countWith({ ...filter, acceptedExtras: [...SEARCH_EXTRAS] }) -
				found.length,
			gaseous: filter.surface.includes("gaseous")
				? 0
				: countWith({ ...filter, surface: ["rocky", "gaseous"] }) -
					found.length,
		};
		if (args.free_plots)
			found = found.filter(
				(p) => (planetPlots(p)?.free ?? 0) >= args.free_plots!
			);
		const limit = args.limit ?? 20;
		let shown = found.slice(0, limit);
		const earnings = new Map<string, Record<string, unknown>>();
		let priceBasis: ReturnType<typeof basisText> | undefined;
		let planNote: string | undefined;
		let notPossible: { count: number; needs: string[] } | undefined;
		if (args.plan_uuid) {
			const setup = await loadPlanSetup(
				backend,
				args.plan_uuid,
				args.empire_uuid
			);
			priceBasis = basisText(setup.basis, setup.cx);
			planNote = setup.resolved.note;
			// only planets where every extraction recipe can run (RIG liquid,
			// COL gaseous, EXT mineral), the check moving the plan applies
			// (dropUnavailableRecipes); other recipes don't depend on the planet
			const extraction = setup.plan.plan_data.buildings
				.filter((b) => b.name in resourceBuildingTicker)
				.flatMap((b) =>
					b.active_recipes.map((r) => ({
						building: b.name,
						recipe: r.recipeid,
					}))
				);
			const canHost = (p: (typeof found)[number]) =>
				extraction.every(({ building, recipe }) =>
					getBuildingRecipes(
						setup.gameData.recipesByBuilding,
						building,
						p.resources
					).some((r) => r.recipe_id === recipe)
				);
			const hostable = found.filter(canHost);
			notPossible = {
				count: found.length - hostable.length,
				needs: extraction.map(
					({ building, recipe }) =>
						`${recipe} (${resourceBuildingTicker[building].toLowerCase()})`
				),
			};
			shown = hostable.slice(0, Math.min(limit, 30));
			for (const p of shown) {
				const v = await buildVariant(backend, setup, {
					planet_natural_id: p.planet_natural_id,
				});
				const f = figures(v.calc);
				earnings.set(p.planet_natural_id, {
					profit_per_day: f.profit,
					construction_cost: f.construction_cost,
					roi_days: f.roi_days,
					area_left: amount(v.calc.result.area.areaLeft),
					note: v.notes.join(" ") || undefined,
				});
			}
			const profit = (id: string) =>
				earnings.get(id)!.profit_per_day as number;
			shown.sort(
				(a, b) =>
					profit(b.planet_natural_id) - profit(a.planet_natural_id)
			);
		}
		const query = new URLSearchParams(
			// the jumps order goes into the link too
			encodeSearch({ filter, sort: byJumps, view: "list", pins: [] })
		).toString();

		return {
			text: `${plural(found.length, "planet")} match${hidden.needing_special_materials || hidden.gaseous ? ` (the default filter hid ${hidden.needing_special_materials} needing special construction materials and ${hidden.gaseous} gaseous; pass accepted_extras or surface to include them)` : ""}${notPossible?.count ? `; ${notPossible.count} of them can't run the plan's extraction (${notPossible.needs.join(", ")}) and are left out` : ""}${found.length > shown.length ? `, showing ${shown.length}` : ""}${args.plan_uuid ? `${shown.length ? ", ranked by the plan's profit there" : ", none can host the plan"}` : ""}.`,
			data: {
				count: found.length,
				not_possible_for_plan: notPossible?.count,
				hidden_by_default_filter: hidden,
				price_basis: priceBasis,
				plan_note: planNote,
				url: `${appUrl}/search${query ? `?${query}` : ""}`,
				planets: shown.map((p) => {
					const full = args.detail === "full";
					return {
						plan_there: earnings.get(p.planet_natural_id),
						planet_natural_id: p.planet_natural_id,
						name: p.planet_name,
						resources: p.resources.map((r) => ({
							ticker: r.material_ticker,
							type: r.resource_type,
							daily_extraction: amount(r.daily_extraction),
						})),
						surface: p.surface ? "rocky" : "gaseous",
						...(full && {
							fertility: p.fertility,
							gravity: p.gravity_type,
							pressure: p.pressure_type,
							temperature: p.temperature_type,
						}),
						infrastructure: planetInfrastructure(p),
						exchange_jumps: Object.fromEntries(
							nearestExchanges(p.system_id).map((e) => [
								e.exchange,
								e.jumps,
							])
						),
						cogc_program: activeProgram(p, now),
						...(full && {
							cogc_boost: (() => {
								const b = cogcBoost(
									mapPlanetToPlanType(activeProgram(p, now)),
									gameData.buildings
								);
								return b
									? `+${b.bonus_pct} % for ${b.lifts}`
									: null;
							})(),
						}),
						production_fees: p.production_fees,
						plots: planetPlots(p),
					};
				}),
				detail:
					args.detail === "full"
						? undefined
						: `summary; detail "full" adds ${FIND_FULL}`,
			},
		};
	},
});
