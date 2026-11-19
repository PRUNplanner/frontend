import { z } from "zod";

// Util
import { getPlanet as loadPlanet } from "@/mcp/gameData";
import { planetPlots } from "@/features/planet_search/planetPlots.util";
import {
	amount,
	cogcBoost,
	defineTool,
	lastProgram,
	nearestExchanges,
} from "@/mcp/tools/shared";
import { loadGameData } from "@/mcp/gameData";
import { mapPlanetToPlanType } from "@/features/planning_data/planCOGC.util";

export const getPlanet = defineTool({
	name: "get_planet",
	title: "Planet details",
	description:
		"One planet's data: resources with daily extraction per extractor, environment, infrastructure, COGC programs, production fees and plots.",
	inputSchema: z.object({
		planet_natural_id: z
			.string()
			.describe("Planet id (OT-580b) or name (Etherwind)"),
	}),
	async run({ planet_natural_id }, { backend }) {
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
		const data = {
			...p,
			nearest_exchanges: nearest,
			cogc_boost: cogc,
			last_cogc_program: last ?? undefined,
			plots: planetPlots(p),
			resources: p.resources.map((r) => ({
				...r,
				daily_extraction: amount(r.daily_extraction),
			})),
		};
		return {
			text: `${p.planet_name} (${p.planet_natural_id}): ${p.resources.map((r) => r.material_ticker).join(", ") || "no resources"}; COGC ${cogc ? `${cogc.program} (+${cogc.bonus_pct} % for ${cogc.lifts})` : last ? `none now, last ${last.program} (ended ${last.ended_days_ago} days ago)` : "none"}; nearest exchange ${nearest[0].exchange} (${nearest[0].jumps ?? "?"} jumps).`,
			data,
		};
	},
});
