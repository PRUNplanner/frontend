import { ref, Ref } from "vue";
import pLimit from "p-limit";

// API
import { useQuery } from "@/lib/query_cache/useQuery";

// Composables
import {
	boundaryGravityHigh,
	boundaryGravityLow,
	boundaryPressureHigh,
	boundaryPressureLow,
	boundaryTemperatureHigh,
	boundaryTemperatureLow,
} from "@/database/services/usePlanetData";
import { usePlan } from "@/features/planning_data/usePlan";
import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
import { usePlanetData } from "@/database/services/usePlanetData";

// Static
import { optimalProduction } from "@/features/roi_overview/assets/optimalProduction";

// Util
import { boundaryDescriptor } from "@/util/numbers";

// Types & Interfaces
import { IPlanet } from "@/features/api/gameData.types";
import { IResourceROIResult } from "@/features/resource_roi_overview/useResourceROIOverview.types";
import { IStaticOptimalProduction } from "../roi_overview/useROIOverview.types";

export function useResourceROIOverview(cxUuid: Ref<string | undefined>) {
	const { createBlankDefinition } = usePlan();
	const { planetNames, loadPlanetNames } = usePlanetData();

	const planetResults: Ref<IPlanet[]> = ref([]);
	const resultData: Ref<IResourceROIResult[]> = ref([]);

	const progressSearchingPlanets = ref(false);
	const progressCurrent = ref(0);
	const progressTotal = ref(0);

	const calculatePLimit: number = 64;

	// Filter for all extraction buildings
	const filteredOptimalProduction = optimalProduction.filter((e) =>
		["RIG", "EXT", "COL"].includes(e.ticker)
	);

	async function searchPlanets(materialTicker: string): Promise<IPlanet[]> {
		progressSearchingPlanets.value = true;

		await useQuery("PostPlanetSearch", {
			searchData: {
				materials: [materialTicker],
				cogc_programs: [],
				environment_rocky: true,
				environment_gaseous: true,
				environment_low_gravity: true,
				environment_high_gravity: true,
				environment_low_pressure: true,
				environment_high_pressure: true,
				environment_low_temperature: true,
				environment_high_temperature: true,
				must_be_fertile: false,
				must_have_localmarket: false,
				must_have_chamberofcommerce: false,
				must_have_warehouse: false,
				must_have_administrationcenter: false,
				must_have_shipyard: false,
			},
		})
			.execute()
			.then((data: IPlanet[]) => {
				planetResults.value = data;
			});

		// reset total + current
		progressCurrent.value = 0;
		progressTotal.value = planetResults.value.length;
		progressSearchingPlanets.value = false;

		return planetResults.value;
	}

	function getPlanetEnvironment(planet: IPlanet) {
		const surface = planet.surface ? ["MCG"] : ["AEF"];

		const gravityType = boundaryDescriptor(
			planet.gravity,
			boundaryGravityLow,
			boundaryGravityHigh
		);
		const gravity =
			gravityType === "LOW"
				? ["MGC"]
				: gravityType === "HIGH"
					? ["BL"]
					: [];

		const pressureType = boundaryDescriptor(
			planet.pressure,
			boundaryPressureLow,
			boundaryPressureHigh
		);
		const pressure =
			pressureType === "LOW"
				? ["SEA"]
				: pressureType === "HIGH"
					? ["HSE"]
					: [];

		const temperatureType = boundaryDescriptor(
			planet.temperature,
			boundaryTemperatureLow,
			boundaryTemperatureHigh
		);
		const temperature =
			temperatureType === "LOW"
				? ["INS"]
				: temperatureType === "HIGH"
					? ["TSH"]
					: [];

		// infrastructures
		const infrastructures: string[] = [];

		if (planet.has_localmarket) infrastructures.push("LM");
		if (planet.has_chamberofcommerce) infrastructures.push("COGC");
		if (planet.has_warehouse) infrastructures.push("WAR");
		if (planet.has_administrationcenter) infrastructures.push("ADM");
		if (planet.has_shipyard) infrastructures.push("SHY");

		infrastructures.sort((a, b) => (a > b ? 1 : -1));

		return { surface, gravity, pressure, temperature, infrastructures };
	}

	async function calculateOptimal(
		planet: IPlanet,
		optimal: IStaticOptimalProduction,
		materialTicker: string,
		surface: string[],
		gravity: string[],
		pressure: string[],
		temperature: string[],
		infrastructures: string[]
	): Promise<IResourceROIResult[]> {
		const results: IResourceROIResult[] = [];

		const definition = ref(
			createBlankDefinition(
				planet.planet_natural_id,
				planet.active_cogc_program_type
			)
		);

		// set all the experts to 5
		definition.value.plan_data.experts.forEach(
			(expert) => (expert.amount = 5)
		);

		// set infrastructure
		definition.value.plan_data.infrastructure = [
			{ building: "HB1", amount: optimal.HB1 },
			{ building: "HB2", amount: optimal.HB2 },
			{ building: "HB3", amount: optimal.HB3 },
			{ building: "HB4", amount: optimal.HB4 },
			{ building: "HB5", amount: optimal.HB5 },
			{ building: "HBB", amount: optimal.HBB },
			{ building: "HBC", amount: optimal.HBC },
			{ building: "HBM", amount: optimal.HBM },
			{ building: "HBL", amount: optimal.HBL },
			{ building: "STO", amount: optimal.sto },
		];

		// artificially set cogc to resource extraction
		definition.value.plan_cogc = "RESOURCE_EXTRACTION";

		const { handleCreateBuilding, calculateOverview, calculate } =
			await usePlanCalculation(definition, undefined, undefined, cxUuid);

		// create building
		await handleCreateBuilding(optimal.ticker);
		const resultData = await calculate();

		for (const productionBuilding of resultData.production.buildings) {
			if (
				productionBuilding.recipeOptions
					.map((e) => e.outputs.map((m) => m.material_ticker))
					.flat()
					.includes(materialTicker)
			) {
				// manipulate definition daata

				definition.value.plan_data.buildings[0].amount = optimal.amount;
				definition.value.plan_data.buildings[0].active_recipes = [
					{
						recipeid: `${productionBuilding.name}#${materialTicker}`,
						amount: 1,
					},
				];

				const newResult = await calculate();

				// find daily yield from material i/o for given materialticker
				const dailyYield: number =
					newResult.materialio.find(
						(f) => f.ticker === materialTicker
					)?.output ?? 0;

				const overviewData = await calculateOverview(
					newResult.materialio,
					newResult.production,
					newResult.infrastructure
				);

				// all matches, push the result
				results.push({
					planetNaturalId: planet.planet_natural_id,
					planetName: planetNames.value[planet.planet_natural_id],
					buildingTicker: productionBuilding.name,
					dailyYield,
					percentMaxDailyYield: 0,
					cogm: newResult.production.buildings[0].activeRecipes[0]
						.cogm,
					outputProfit:
						newResult.production.buildings[0].activeRecipes[0].cogm
							?.totalProfit ?? 0,
					dailyProfit: overviewData.profit,
					planCost: overviewData.totalConstructionCost,
					planROI: overviewData.roi,
					planArea: newResult.area.areaUsed,
					planProfitArea:
						overviewData.profit / newResult.area.areaUsed,
					planetSurface: surface,
					planetGravity: gravity,
					planetPressure: pressure,
					planetTemperature: temperature,
					planetCOGC: planet.active_cogc_program_type,
					planetInfrastructures: infrastructures,
				});
			}
		}

		return results;
	}

	async function calculatePlanet(
		planet: IPlanet,
		materialTicker: string
	): Promise<IResourceROIResult[]> {
		const allResults: IResourceROIResult[] = [];

		const { surface, gravity, pressure, temperature, infrastructures } =
			getPlanetEnvironment(planet);

		for (const optimal of filteredOptimalProduction) {
			const results = await calculateOptimal(
				planet,
				optimal,
				materialTicker,
				surface,
				gravity,
				pressure,
				temperature,
				infrastructures
			);
			allResults.push(...results);
		}

		progressCurrent.value++;
		await new Promise((r) => setTimeout(r, 0));

		return allResults;
	}

	async function calculate(
		materialTicker: string
	): Promise<IResourceROIResult[]> {
		// fetch planets
		const planets: IPlanet[] = await searchPlanets(materialTicker);
		const localResults: IResourceROIResult[] = [];

		progressCurrent.value = 0;
		progressTotal.value = planets.length;

		// trigger planet name loading and wait on it
		await loadPlanetNames(planets.map((p) => p.planet_natural_id));

		// limit parallel execution
		const limit = pLimit(calculatePLimit);

		const promises = planets.map((planet) =>
			limit(() => calculatePlanet(planet, materialTicker))
		);

		const allResults = await Promise.all(promises);
		localResults.push(...allResults.flat());

		// calculate the max yield of all, then set the percent of max yield
		const maxDailyYield: number = Math.max(
			...localResults.map((e) => e.dailyYield)
		);

		localResults.map(
			(r) => (r.percentMaxDailyYield = r.dailyYield / maxDailyYield)
		);

		// sort by dailyYield, descending
		localResults.sort((a, b) => (a.dailyYield > b.dailyYield ? -1 : 1));

		resultData.value = localResults;
		return resultData.value;
	}

	return {
		searchPlanets,
		calculate,
		getPlanetEnvironment,
		planetResults,
		resultData,
		// progress
		progressCurrent,
		progressTotal,
		progressSearchingPlanets,
	};
}
