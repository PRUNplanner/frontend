// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { calculateVisitation } from "@/features/planning/engine/visitation";
import { calculateWorkforce } from "@/features/planning/engine/workforce";
import {
	calculateExpertBonus,
	MAP_BUILDING_EXPERTISE_EXPERTS,
} from "@/features/planning/engine/efficiency";
import {
	getBuilding,
	getPlanetSpecialMaterials,
	resourceBuildingTicker,
} from "@/features/planning/engine/buildings";
import {
	calculateAvailableArea,
	optimizeHabs,
} from "@/features/planning/calculations/habOptimization";
import {
	getVolumeOfAllStorages,
	getWeightOfAllStorages,
} from "@/features/planning/calculations/infrastructureCalculations";

// Static
import { optimalProduction } from "@/features/roi_overview/assets/optimalProduction";
import {
	FARM_BUILDINGS,
	RESOURCE_BUILDINGS,
} from "@/features/base_roi/baseROI.constants";

// Types & Interfaces
import {
	ExpertTypeSchema,
	HabTypeSchema,
	InfrastructureTypeSchema,
	WorkforceTypeSchema,
	type PlanCOGCProgram,
	type PlanData,
} from "@/features/api/schemas/planningData.schemas";
import type {
	Exchange,
	PlanetSearchIndexEntry,
} from "@/features/api/schemas/gameData.schemas";
import type {
	IGameData,
	IPlanCalculation,
	IPlanContext,
	IPlanInput,
} from "@/features/planning/engine/engine.types";
import type { PriceType } from "@/features/cx/priceBook";
import type { IStaticOptimalProduction } from "@/features/roi_overview/useROIOverview.types";
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
import type {
	IBaseCalculation,
	IBaseROICandidate,
	IBaseROIMaterial,
	IBaseROIOutput,
	IBaseROIRowInput,
} from "@/features/base_roi/baseROI.types";
import type { IInfrastructureRecord } from "@/features/planning/usePlanCalculation.types";

/**
 * # Base ROI rows
 *
 * Which bases the table lists and what the plan engine says about each:
 * the static layout of `optimalProduction.ts`, the storage a stock buffer
 * needs on top, and the row's daily money, cargo and materials.
 */

type RowSettings = Pick<BaseROISettings, "cogc" | "experts" | "bufferDays">;

const layoutOf = (ticker: string): IStaticOptimalProduction | undefined =>
	optimalProduction.find((e) => e.ticker === ticker);

/**
 * Recipe rows: every recipe of every production building with a static
 * layout, except extraction and farming, which are planet rows
 *
 * @param {IGameData} gameData Game data
 * @returns {IBaseROICandidate[]} Candidates
 */
export function recipeCandidates(gameData: IGameData): IBaseROICandidate[] {
	return optimalProduction
		.filter(
			(o) =>
				!RESOURCE_BUILDINGS.includes(o.ticker) &&
				!FARM_BUILDINGS.includes(o.ticker) &&
				gameData.buildings.has(o.ticker)
		)
		.flatMap((o) =>
			(gameData.recipesByBuilding[o.ticker] ?? []).map((recipe) => ({
				key: recipe.recipe_id,
				kind: "recipe" as const,
				building: o.ticker,
				expertise: getBuilding(gameData.buildings, o.ticker).expertise,
				recipeId: recipe.recipe_id,
				planetNaturalId: null,
				planetName: null,
				jumps: null,
			}))
		);
}

const extractorOf: Record<string, string> = Object.fromEntries(
	Object.entries(resourceBuildingTicker).map(([b, type]) => [type, b])
);

/**
 * Planet rows from the search index: one per resource on each planet, one
 * per farming recipe on each fertile planet. Planets without a route count
 * as beyond max jumps.
 *
 * @param {PlanetSearchIndexEntry[]} index Planet search index
 * @param {IGameData} gameData Game data
 * @param {(systemId: string) => number} jumpsOf Jumps to the exchange, -1 = no route
 * @param {number} maxJumps Max jumps
 * @returns {{ within: IBaseROICandidate[]; beyond: IBaseROICandidate[] }} Candidates
 */
export function planetCandidates(
	index: PlanetSearchIndexEntry[],
	gameData: IGameData,
	jumpsOf: (systemId: string) => number,
	maxJumps: number
): { within: IBaseROICandidate[]; beyond: IBaseROICandidate[] } {
	const within: IBaseROICandidate[] = [];
	const beyond: IBaseROICandidate[] = [];
	const expertise = (b: string) => gameData.buildings.get(b)?.expertise ?? null;

	for (const planet of index) {
		const jumps = jumpsOf(planet.system_id);
		const list = jumps >= 0 && jumps <= maxJumps ? within : beyond;
		const row = (
			kind: "resource" | "farming",
			building: string,
			recipeId: string
		): IBaseROICandidate => ({
			key: `${planet.planet_natural_id}#${recipeId}`,
			kind,
			building,
			expertise: expertise(building),
			recipeId,
			planetNaturalId: planet.planet_natural_id,
			planetName: planet.planet_name,
			jumps: jumps >= 0 ? jumps : null,
		});

		for (const resource of planet.resources) {
			const building = extractorOf[resource.resource_type];
			if (resource.daily_extraction > 0 && building && layoutOf(building))
				list.push(
					row(
						"resource",
						building,
						`${building}#${resource.material_ticker}`
					)
				);
		}

		if (planet.fertility !== -1)
			for (const building of FARM_BUILDINGS) {
				if (!layoutOf(building)) continue;
				for (const recipe of gameData.recipesByBuilding[building] ?? [])
					list.push(row("farming", building, recipe.recipe_id));
			}
	}

	return { within, beyond };
}

/** the static layout's habs and storage as an infrastructure record */
function layoutInfrastructure(
	layout: IStaticOptimalProduction
): IInfrastructureRecord {
	return {
		HB1: layout.HB1,
		HB2: layout.HB2,
		HB3: layout.HB3,
		HB4: layout.HB4,
		HB5: layout.HB5,
		HBB: layout.HBB,
		HBC: layout.HBC,
		HBM: layout.HBM,
		HBL: layout.HBL,
		STO: layout.sto,
		STA: layout.sta,
		STE: layout.ste,
		STV: layout.stv,
		STW: layout.stw,
	};
}

/**
 * The plan for one base: the row's building and recipe, the layout's
 * infrastructure, COGC and experts from the settings
 */
export function basePlan(
	candidate: Pick<IBaseROICandidate, "building" | "recipeId" | "expertise">,
	amount: number,
	infrastructure: IInfrastructureRecord,
	settings: Pick<RowSettings, "cogc" | "experts">
): IPlanInput["plan"] {
	const experts = settings.experts === "ramp" ? 5 : settings.experts;
	// only the building's own experts count
	const expert = candidate.expertise
		? MAP_BUILDING_EXPERTISE_EXPERTS[candidate.expertise]
		: undefined;
	const data: PlanData = {
		experts: ExpertTypeSchema.options.map((type) => ({
			type,
			amount: type === expert ? experts : 0,
		})),
		workforce: WorkforceTypeSchema.options.map((type) => ({
			type,
			lux1: true,
			lux2: true,
		})),
		infrastructure: InfrastructureTypeSchema.options.map((building) => ({
			building,
			amount: infrastructure[building],
		})),
		buildings: [
			{
				name: candidate.building,
				amount,
				active_recipes: [{ recipeid: candidate.recipeId, amount: 1 }],
			},
		],
	};
	return {
		plan_data: data,
		plan_cogc:
			settings.cogc === "matching" && candidate.expertise
				? (candidate.expertise as PlanCOGCProgram)
				: "---",
		plan_corphq: false,
		plan_permits_used: 1,
	};
}

/** storage capacity: the lower of t and m³ */
function storageCapacity(calc: IPlanCalculation): number {
	return Math.min(
		getWeightOfAllStorages(calc.result.storage),
		getVolumeOfAllStorages(calc.result.storage)
	);
}

/** the larger of the daily cargo in and out, t or m³ */
function dailyCargo(calc: IPlanCalculation): number {
	const v = calculateVisitation(calc.result);
	return Math.max(v.dailyWeight, v.dailyVolume);
}

/**
 * Runs the plan engine for one row. With a stock buffer, adds STO (or STA
 * for the rest) until storage holds buffer days of the larger of the daily
 * cargo in and out; while the area exceeds the permit, drops one production
 * building, refits the habs and fits the storage again.
 *
 * @param {IBaseROICandidate} candidate Row
 * @param {IPlanContext} ctx Game data, the row's planet and prices
 * @param {RowSettings} settings Settings
 * @param {string | undefined} cxUuid CX preference
 * @returns {IBaseCalculation} Engine result and the layout
 */
export function calculateBase(
	candidate: IBaseROICandidate,
	ctx: IPlanContext,
	settings: RowSettings,
	cxUuid: string | undefined
): IBaseCalculation {
	const layout = layoutOf(candidate.building);
	if (!layout) throw new Error(`No layout for ${candidate.building}`);

	let amount = layout.amount;
	const infrastructure = layoutInfrastructure(layout);
	const storageAdded = { STO: 0, STA: 0 };

	const run = (): IPlanCalculation =>
		calculatePlan(
			{
				plan: basePlan(candidate, amount, infrastructure, settings),
				empire: undefined,
				cxUuid,
				recipeOptions: false,
			},
			ctx
		);

	let calc = run();

	while (settings.bufferDays > 0) {
		const needed = dailyCargo(calc) * settings.bufferDays;
		let capacity = storageCapacity(calc);
		let added = false;
		while (capacity < needed) {
			const sta = needed - capacity <= 2500;
			storageAdded[sta ? "STA" : "STO"]++;
			infrastructure[sta ? "STA" : "STO"]++;
			capacity += sta ? 2500 : 5000;
			added = true;
		}
		if (added) calc = run();

		const { areaUsed, areaTotal } = calc.result.area;
		if (areaUsed <= areaTotal || amount <= 1) break;

		// too large: one production building less, its own storage again
		amount--;
		infrastructure.STO -= storageAdded.STO;
		infrastructure.STA -= storageAdded.STA;
		storageAdded.STO = 0;
		storageAdded.STA = 0;
		calc = run();
		const workforce = calculateWorkforce(
			basePlan(candidate, amount, infrastructure, settings).plan_data,
			ctx.buildings
		);
		const solution = optimizeHabs(
			"auto",
			calc.result.infrastructureCosts,
			workforce,
			calculateAvailableArea(
				areaTotal,
				calc.result.area.areaUsed,
				infrastructure
			)
		);
		const habs = new Map(solution.variables);
		for (const hab of HabTypeSchema.options)
			infrastructure[hab] = habs.get(hab) ?? 0;
		calc = run();
	}

	return { ...calc, amount, infrastructure, storageAdded };
}

/**
 * A row's engine numbers: daily money split into revenue, inputs,
 * consumables and degradation, cargo, materials with their price sources,
 * outputs with their traded volume and the required workforce
 *
 * @param {IBaseROICandidate} candidate Row
 * @param {IBaseCalculation} base Engine result of calculateBase
 * @param {IPlanContext} ctx Context the base ran with
 * @param {(tickerId: string) => Exchange} getExchange Exchange data, throws without
 * @returns {IBaseROIRowInput} Row input
 */
export function toRowInput(
	candidate: IBaseROICandidate,
	base: IBaseCalculation,
	ctx: IPlanContext,
	getExchange: (tickerId: string) => Exchange
): IBaseROIRowInput {
	const { result, overview } = base;
	const exchange = (tickerId: string): Exchange | undefined => {
		try {
			return getExchange(tickerId);
		} catch {
			return undefined;
		}
	};

	const materials: IBaseROIMaterial[] = [];
	const outputs: IBaseROIOutput[] = [];
	for (const m of result.materialio) {
		if (m.delta === 0) continue;
		const side: PriceType = m.delta > 0 ? "SELL" : "BUY";
		const source = ctx.prices.getPriceSource(m.ticker, side);
		const data = source.exchange
			? exchange(`${m.ticker}.${source.exchange}`)
			: undefined;
		materials.push({
			ticker: m.ticker,
			amount: m.delta,
			price: ctx.prices.getPrice(m.ticker, side),
			source,
			bid: data?.bid ?? 0,
			ask: data?.ask ?? 0,
		});
		if (m.delta > 0)
			outputs.push({
				ticker: m.ticker,
				amount: m.delta,
				traded:
					exchange(`${m.ticker}.${source.volume}`)?.avg_traded_7d ?? 0,
			});
	}

	// bought for the workforce, at most what the base buys in total
	const bought = overview.dailyCost;
	const consumables = Math.min(
		result.workforceMaterialIO.reduce(
			(s, m) => s + (m.delta < 0 ? -m.price : 0),
			0
		),
		bought
	);

	const buy = (ticker: string) => ctx.prices.getPrice(ticker, "BUY");
	const buildingCosts = result.constructionMaterials.map((b) => ({
		ticker: b.ticker,
		amount: b.amount,
		unitCost: b.materials.reduce((s, m) => s + m.input * buy(m.ticker), 0),
	}));
	const envAmounts = new Map<string, number>();
	for (const b of result.constructionMaterials)
		for (const m of getPlanetSpecialMaterials(
			ctx.planet,
			getBuilding(ctx.buildings, b.ticker).area_cost
		))
			envAmounts.set(
				m.ticker,
				(envAmounts.get(m.ticker) ?? 0) + m.input * b.amount
			);
	const environmentMaterials = [...envAmounts].map(([ticker, amount]) => ({
		ticker,
		amount,
		price: buy(ticker),
	}));

	const visitation = calculateVisitation(result);
	const expert = candidate.expertise
		? result.experts[MAP_BUILDING_EXPERTISE_EXPERTS[candidate.expertise]]
				.amount
		: 0;

	return {
		...candidate,
		productionBuildings: base.amount,
		infrastructure: base.infrastructure,
		storageAdded: base.storageAdded,
		areaUsed: result.area.areaUsed,
		areaTotal: result.area.areaTotal,
		revenue: overview.dailyProfit,
		inputs: bought - consumables,
		consumables,
		degradation: Math.abs(overview.dailyDegradationCost),
		construction: overview.totalConstructionCost,
		planetCOGC: ctx.planet.active_cogc_program_type,
		environment: environmentMaterials.reduce(
			(sum, m) => sum + m.amount * m.price,
			0
		),
		environmentMaterials,
		buildingCosts,
		weightIn: visitation.dailyWeightImport,
		weightOut: visitation.dailyWeightExport,
		volumeIn: visitation.dailyVolumeImport,
		volumeOut: visitation.dailyVolumeExport,
		storageWeight: getWeightOfAllStorages(result.storage),
		storageVolume: getVolumeOfAllStorages(result.storage),
		expertBonus: calculateExpertBonus(expert),
		materials,
		outputs,
		workforce: WorkforceTypeSchema.options
			.map((tier) => ({ tier, required: result.workforce[tier].required }))
			.filter((w) => w.required > 0),
		result,
	};
}
