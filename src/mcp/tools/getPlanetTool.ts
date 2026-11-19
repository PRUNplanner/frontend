import { z } from "zod";

// Util
import { getPlanet as loadPlanet } from "@/mcp/gameData";
import { planetPlots } from "@/features/planet_search/planetPlots.util";
import {
	environmentExtras,
	planetBuckets,
} from "@/features/planet_search/environmentExtras.util";
import {
	amount,
	cogcBoost,
	defineTool,
	detailArg,
	lastProgram,
	nearestExchanges,
} from "@/mcp/tools/shared";
import { loadGameData } from "@/mcp/gameData";
import { mapPlanetToPlanType } from "@/features/planning_data/planCOGC.util";

const FULL = "the raw planet record (COGC history, environment values, ids)";

export const getPlanet = defineTool({
	name: "get_planet",
	title: "Planet details",
	description:
		"One planet: active COGC program (else the last one), resources with type and daily extraction per extractor, production fees, plots, jumps to the exchanges, infrastructure, environment and the extra construction materials it needs.",
	inputSchema: z.object({
		planet_natural_id: z
			.string()
			.describe("Planet id (OT-580b) or name (Etherwind)"),
		detail: detailArg(FULL),
	}),
	async run({ planet_natural_id, detail }, { backend }) {
		const [p, gameData] = await Promise.all([
			loadPlanet(backend, planet_natural_id),
			loadGameData(backend),
		]);
		const cogc = cogcBoost(
			mapPlanetToPlanType(p.active_cogc_program_type),
			gameData.buildings
		);
		const last = cogc ? null : lastProgram(p);
		const nearest = nearestExchanges(p.system_id);
		const resources = p.resources.map((r) => ({
			ticker: r.material_ticker,
			type: r.resource_type,
			daily_extraction: amount(r.daily_extraction),
		}));
		const buckets = planetBuckets(p);
		const text = `${p.planet_name} (${p.planet_natural_id}): ${p.resources.map((r) => r.material_ticker).join(", ") || "no resources"}; COGC ${cogc ? `${cogc.program} (+${cogc.bonus_pct} % for ${cogc.lifts})` : last ? `none now, last ${last.program} (ended ${last.ended_days_ago} days ago)` : "none"}; nearest exchange ${nearest[0].exchange} (${nearest[0].jumps ?? "?"} jumps).`;
		if (detail === "full")
			return {
				text,
				data: {
					...p,
					nearest_exchanges: nearest,
					cogc_boost: cogc,
					last_cogc_program: last ?? undefined,
					plots: planetPlots(p),
					resources: p.resources.map((r) => ({
						...r,
						daily_extraction: amount(r.daily_extraction),
					})),
				},
			};
		return {
			text,
			data: {
				planet_natural_id: p.planet_natural_id,
				name: p.planet_name,
				faction: p.faction_name,
				cogc_boost: cogc,
				last_cogc_program: last ?? undefined,
				resources,
				production_fees: p.production_fees,
				plots: planetPlots(p),
				nearest_exchanges: nearest,
				infrastructure: (
					[
						[p.has_localmarket, "LM"],
						[p.has_chamberofcommerce, "COGC"],
						[p.has_warehouse, "WAR"],
						[p.has_administrationcenter, "ADM"],
						[p.has_shipyard, "SHY"],
					] as const
				)
					.filter(([has]) => has)
					.map(([, code]) => code),
				environment: {
					surface: buckets.surface ? "rocky" : "gaseous",
					gravity: buckets.gravity_type,
					pressure: buckets.pressure_type,
					temperature: buckets.temperature_type,
					fertility: p.fertility > -1 ? amount(p.fertility) : null,
				},
				construction_extras: environmentExtras(buckets),
				detail: `summary; detail "full" adds ${FULL}`,
			},
		};
	},
});
