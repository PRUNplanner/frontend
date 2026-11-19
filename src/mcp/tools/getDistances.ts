import { z } from "zod";

// Util
import { pathfinder } from "@/features/pathfinding/pathfinder";
import { getPlan } from "@/mcp/context";
import { getPlanet } from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import {
	defineTool,
	EXCHANGE_SYSTEMS,
	nearestExchanges,
	UUID,
} from "@/mcp/tools/shared";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";

type ExchangeCode = keyof typeof EXCHANGE_SYSTEMS;

interface IPlace {
	given: string;
	kind: "planet" | "plan" | "exchange";
	label: string;
	planet: string | null;
	system: string;
	system_name: string | null;
}

/** a place by exchange code, plan uuid, or planet id or name */
async function resolvePlace(b: IBackend, given: string): Promise<IPlace> {
	const pf = pathfinder();
	const code = given.trim().toUpperCase();
	if (code in EXCHANGE_SYSTEMS) {
		const system = EXCHANGE_SYSTEMS[code as ExchangeCode];
		return {
			given,
			kind: "exchange",
			label: code,
			planet: null,
			system,
			system_name: pf.getSystemName(system),
		};
	}
	if (UUID.test(given.trim())) {
		const plan = await getPlan(b, given.trim()).catch((e: unknown) => {
			// only "not found" means no such plan; key or backend errors pass
			if (e instanceof ToolError && e.message.startsWith("Not found"))
				throw new ToolError(`No plan ${given.trim()} in your account.`);
			throw e;
		});
		const planet = await getPlanet(b, plan.planet_natural_id);
		return {
			given,
			kind: "plan",
			label: `${plan.plan_name} (${planet.planet_natural_id})`,
			planet: planet.planet_natural_id,
			system: planet.system_id,
			system_name: pf.getSystemName(planet.system_id),
		};
	}
	const planet = await getPlanet(b, given);
	return {
		given,
		kind: "planet",
		// an unnamed planet's name is its id
		label:
			planet.planet_name === planet.planet_natural_id
				? planet.planet_natural_id
				: `${planet.planet_name} (${planet.planet_natural_id})`,
		planet: planet.planet_natural_id,
		system: planet.system_id,
		system_name: pf.getSystemName(planet.system_id),
	};
}

export const getDistances = defineTool({
	name: "get_distances",
	title: "Distances between planets, bases and exchanges",
	description:
		"Jumps between places, as PRUNplanner's pathfinder counts them (Planet Search's exchange distance): each place is a planet (id OT-580b or name), a plan uuid (its planet) or an exchange (AI1, CI1, IC1, NC1). Returns every pair's jumps (0 within one system), each place's nearest exchanges, the jumps to visit the places in the order given (order_jumps, one way), and with path the star systems along each pair's shortest route. Planning information for where bases sit relative to each other and to the exchanges; it doesn't plan ship routes, fuel or flight time.",
	inputSchema: z.object({
		places: z
			.array(z.string())
			.min(2)
			.max(20)
			.describe("Planets (id or name), plan uuids or exchange codes"),
		path: z
			.boolean()
			.optional()
			.describe(
				"Add the star systems along each pair's route (up to 6 places)"
			),
	}),
	async run({ places, path }, { backend }) {
		if (path && places.length > 6)
			throw new ToolError(
				"path works for up to 6 places; leave it out for more."
			);
		const resolved = await Promise.all(
			places.map((p) => resolvePlace(backend, p))
		);
		const pf = pathfinder();
		const jumps = (a: IPlace, b: IPlace): number | null =>
			pf.getJumpsFrom(a.system).get(b.system) ?? null;

		const pairs = resolved.flatMap((a, i) =>
			resolved.slice(i + 1).map((b) => ({
				from: a.label,
				to: b.label,
				jumps: jumps(a, b),
				...(path && {
					route: (pf.getPathBetween(a.system, b.system) ?? []).map(
						(s) => pf.getSystemName(s) ?? s
					),
				}),
			}))
		);
		const legs = resolved.slice(1).map((b, i) => jumps(resolved[i], b));
		const orderJumps = legs.every((l) => l != null)
			? legs.reduce((s, l) => s + l!, 0)
			: null;
		const nearest = (p: IPlace) =>
			nearestExchanges(p.system)
				.slice(0, 2)
				.map((e) => ({ exchange: e.exchange, jumps: e.jumps }));

		const far = pairs.reduce(
			(m, p) => (p.jumps != null && p.jumps > (m?.jumps ?? -1) ? p : m),
			undefined as (typeof pairs)[number] | undefined
		);
		return {
			text: `${resolved.length} places: ${pairs.length} pairs${far ? `, farthest ${far.from} ↔ ${far.to} ${far.jumps} jumps` : ""}; in the order given ${orderJumps ?? "–"} jumps.`,
			data: {
				places: resolved.map((p) => ({
					given: p.given,
					kind: p.kind,
					name: p.label,
					planet: p.planet,
					system: p.system_name,
					nearest_exchanges: nearest(p),
				})),
				pairs,
				order_jumps: orderJumps,
				note: "Jumps between star systems along the jump gates' graph (FIO), as Planet Search counts them; no fuel, flight time or ship routing.",
			},
		};
	},
});
