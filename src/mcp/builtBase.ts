// Util
import { REPAIR_DAY_MAX } from "@/features/repair_analysis/repairAnalysis.util";
import { amount, money } from "@/mcp/tools/shared";

// Schemas
import { FIOStorageSchema } from "@/features/api/schemas/gameData.schemas";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { IPriceBook } from "@/features/cx/priceBook";
import type { IPlanCalculation } from "@/features/planning/engine/engine.types";
import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";
import type { FIOSitePlanet } from "@/features/api/schemas/gameData.schemas";

type Reclaim = "fio" | "age" | "none";

/**
 * What demolishing `count` buildings of one ticker gives back, per
 * material, and where that came from: FIO's reclaimable materials for the
 * buildings on the site (the ones that give back least first), else an
 * estimate from their age on the app's repair curve (what is still intact:
 * the construction materials a repair at that age wouldn't need,
 * repairAnalysis.util), else nothing
 * @author jplacht
 */
export function reclaimed(
	ticker: string,
	count: number,
	perUnit: IMaterialIOMinimal[],
	site: FIOSitePlanet | undefined,
	ageDays: number | undefined
): { materials: Map<string, number>; source: Reclaim[] } {
	const materials = new Map<string, number>();
	const add = (t: string, n: number) =>
		materials.set(t, (materials.get(t) ?? 0) + n);
	const source: Reclaim[] = [];
	const onSite = (site?.Buildings ?? [])
		.filter((b) => b.BuildingTicker === ticker)
		.map((b) => ({
			materials: b.ReclaimableMaterials,
			total: b.ReclaimableMaterials.reduce(
				(s, m) => s + m.MaterialAmount,
				0
			),
		}))
		.sort((a, b) => a.total - b.total)
		.slice(0, count);
	for (const b of onSite)
		for (const m of b.materials) add(m.MaterialTicker, m.MaterialAmount);
	if (onSite.length) source.push("fio");
	const rest = count - onSite.length;
	if (rest > 0 && ageDays !== undefined) {
		const intact =
			(REPAIR_DAY_MAX - Math.min(REPAIR_DAY_MAX, ageDays)) /
			REPAIR_DAY_MAX;
		for (const m of perUnit)
			add(m.ticker, Math.floor(m.input * intact) * rest);
		source.push("age");
	} else if (rest > 0) source.push("none");
	return { materials, source };
}

/** the user's FIO site on a planet, undefined without FIO or a site */
export async function fioSite(
	backend: IBackend,
	planetNaturalId: string
): Promise<FIOSitePlanet | undefined> {
	const storage = await backend
		.get("/data/storage/", FIOStorageSchema)
		.catch(() => undefined);
	return Object.values(storage?.sites_data ?? {}).find(
		(s) => s.PlanetIdentifier === planetNaturalId
	);
}

/**
 * A change to a base that's built: the buildings that stay are paid for,
 * so it costs the added buildings' construction materials at buy prices
 * minus what demolishing the removed ones reclaims (not their full value,
 * as for a plan that isn't built)
 * @author jplacht
 */
export function builtChange(
	before: IPlanCalculation,
	after: IPlanCalculation,
	book: IPriceBook,
	site: FIOSitePlanet | undefined,
	ageDays: number | undefined
) {
	const was = new Map(
		before.result.constructionMaterials.map((c) => [c.ticker, c])
	);
	const is = new Map(
		after.result.constructionMaterials.map((c) => [c.ticker, c])
	);
	const buy = new Map<string, number>();
	const back = new Map<string, number>();
	const sources = new Set<Reclaim>();
	const add = (map: Map<string, number>, t: string, n: number) =>
		map.set(t, (map.get(t) ?? 0) + n);
	for (const ticker of new Set([...was.keys(), ...is.keys()])) {
		const change =
			(is.get(ticker)?.amount ?? 0) - (was.get(ticker)?.amount ?? 0);
		if (change > 0)
			for (const m of is.get(ticker)!.materials)
				add(buy, m.ticker, m.input * change);
		if (change < 0) {
			const r = reclaimed(
				ticker,
				-change,
				was.get(ticker)!.materials,
				site,
				ageDays
			);
			r.source.forEach((s) => sources.add(s));
			for (const [t, n] of r.materials) add(back, t, n);
		}
	}
	const lines = (map: Map<string, number>) =>
		[...map]
			.filter(([, n]) => n > 0)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([ticker, n]) => {
				const unit = book.getPrice(ticker, "BUY");
				return {
					ticker,
					amount: amount(n),
					unit_price: money(unit),
					value: money(unit * n),
				};
			});
	const toBuy = lines(buy);
	const back_ = lines(back);
	const sum = (l: { value: number }[]) => l.reduce((s, x) => s + x.value, 0);
	const used = [...sources];
	return {
		to_buy: toBuy,
		reclaimed: back_,
		net_cost: money(sum(toBuy) - sum(back_)),
		reclaim_from: used,
		note: [
			"Built base: buildings that stay are already paid for; removed ones give back what demolishing reclaims, valued at buy prices.",
			used.includes("fio") &&
				"Reclaimed materials from your FIO site data (the buildings that give back least first).",
			used.includes("age") &&
				`Estimated for ${ageDays} days since built or repaired: the share of construction materials a repair at that age wouldn't need.`,
			used.includes("none") &&
				"Some removed buildings have no FIO site data and no age_days: counted as giving nothing back. Pass age_days for an estimate.",
		]
			.filter(Boolean)
			.join(" "),
	};
}
