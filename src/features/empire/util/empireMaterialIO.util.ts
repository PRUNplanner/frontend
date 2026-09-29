// Types & Interfaces
import type {
	IEmpireMaterialIO,
	IEmpireMaterialIONet,
	IEmpireMaterialIONetEntry,
	IEmpireMaterialIOPlanet,
	IEmpireMaterialIOSide,
} from "@/features/empire/empire.types";

const round2 = (v: number): number => Math.round(v * 100) / 100 || 0;

/**
 * Summarizes one side (producers or consumers) of an empire material row:
 * plans sorted by amount, their share of the side and how full the side's
 * bar is against the row's larger side
 * @author jplacht
 *
 * @param {IEmpireMaterialIOPlanet[]} planets Plans on this side
 * @param {"output" | "input"} side Which amount to read
 * @param {number} scale max(row production, row consumption)
 * @returns {IEmpireMaterialIOSide} Side summary
 */
export function summarizeSide(
	planets: IEmpireMaterialIOPlanet[],
	side: "output" | "input",
	scale: number
): IEmpireMaterialIOSide {
	const total = planets.reduce((sum, p) => sum + p[side], 0);
	const entries = planets
		.map((p) => ({
			planetId: p.planetId,
			planUuid: p.planUuid,
			planName: p.planName,
			amount: p[side],
			share: total > 0 ? p[side] / total : 0,
		}))
		.sort((a, b) => b.amount - a.amount);

	return {
		entries,
		total,
		top: entries[0],
		more: Math.max(entries.length - 1, 0),
		fillPct: scale > 0 ? (total / scale) * 100 : 0,
	};
}

/**
 * Nets an empire material row per planet (summing all plans on it) and
 * splits planets into surplus (balanced last) and needs
 * @author jplacht
 *
 * @param {IEmpireMaterialIO} row Empire material row
 * @returns {IEmpireMaterialIONet} Net per planet
 */
export function netPerPlanet(row: IEmpireMaterialIO): IEmpireMaterialIONet {
	const planets = new Map<
		string,
		{
			produces: number;
			consumes: number;
			plans: Map<string, { planName: string; volume: number }>;
		}
	>();

	const add = (p: IEmpireMaterialIOPlanet, side: "output" | "input") => {
		const planet = planets.get(p.planetId) ?? {
			produces: 0,
			consumes: 0,
			plans: new Map(),
		};
		if (side === "output") planet.produces += p.output;
		else planet.consumes += p.input;
		const plan = planet.plans.get(p.planUuid) ?? {
			planName: p.planName,
			volume: 0,
		};
		plan.volume += p[side];
		planet.plans.set(p.planUuid, plan);
		planets.set(p.planetId, planet);
	};
	row.outputPlanets.forEach((p) => add(p, "output"));
	row.inputPlanets.forEach((p) => add(p, "input"));

	const entries = [...planets.entries()].map(([planetId, p]) => {
		const raw = p.produces - p.consumes;
		return {
			raw,
			entry: {
				planetId,
				produces: round2(p.produces),
				consumes: round2(p.consumes),
				net: round2(raw),
				balanced: round2(raw) === 0,
				plans: [...p.plans.entries()]
					.map(([planUuid, plan]) => ({ planUuid, ...plan }))
					.sort((a, b) => b.volume - a.volume),
			} satisfies IEmpireMaterialIONetEntry,
		};
	});

	const surplus = entries.filter((e) => e.entry.net > 0);
	const balanced = entries.filter((e) => e.entry.balanced);
	const needs = entries.filter((e) => e.entry.net < 0);
	const sum = (list: typeof entries) =>
		round2(list.reduce((s, e) => s + e.raw, 0));

	return {
		surplus: [
			...surplus.sort((a, b) => b.raw - a.raw),
			...balanced,
		].map((e) => e.entry),
		needs: needs.sort((a, b) => a.raw - b.raw).map((e) => e.entry),
		// balanced planets' leftovers count to surplus, so the totals add up to the row delta
		surplusTotal: sum([...surplus, ...balanced]),
		needsTotal: sum(needs),
	};
}

/**
 * Planet name without the "(ID)" suffix `usePlanetData` adds to named
 * planets, the id stays in the link title
 * @author jplacht
 *
 * @param {Map<string, string>} planetNames Loaded planet names
 * @param {string} planetId Planet natural id
 * @returns {string} Plain planet name, or the id while it loads
 */
export function shortPlanetName(
	planetNames: Map<string, string>,
	planetId: string
): string {
	return (planetNames.get(planetId) ?? planetId).replace(` (${planetId})`, "");
}
