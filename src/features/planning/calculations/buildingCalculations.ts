// Composables
import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";

// Types & Interfaces
import {
	IMaterialIOMinimal,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";

export const TOTALMSDAY: number = 24 * 60 * 60 * 1000;

export async function useBuildingCalculation() {
	const { combineMaterialIOMinimal } = await useMaterialIOUtil();

	/**
	 * Calculates a plans production buildings total material io based
	 * on their running active recipe batches
	 * @author jplacht
	 *
	 * @param {IProductionBuilding[]} data Production Buildings
	 * @returns {IMaterialIOMinimal[]} Material IO
	 */
	function calculateMaterialIO(
		data: IProductionBuilding[]
	): IMaterialIOMinimal[] {
		const materialIO: IMaterialIOMinimal[][] = [];

		data.forEach((building) => {
			const batchRuns: number =
				(TOTALMSDAY * building.amount) / building.totalBatchTime;

			let buildingMaterialIOInput: IMaterialIOMinimal[] = [];
			let buildingMaterialIOOutput: IMaterialIOMinimal[] = [];

			// iterate over active_recipes
			building.activeRecipes.forEach((ar) => {
				// skip if the recipes amount is set to 0
				if (ar.amount === 0) {
					return;
				}

				// handle inputs
				ar.recipe.inputs.forEach((arInput) => {
					buildingMaterialIOInput = combineMaterialIOMinimal([
						buildingMaterialIOInput,
						[
							{
								ticker: arInput.material_ticker,
								input:
									arInput.material_amount *
									ar.amount *
									batchRuns,
								output: 0,
							},
						],
					]);
				});
				// handle outputs
				ar.recipe.outputs.forEach((arOutput) => {
					buildingMaterialIOOutput = combineMaterialIOMinimal([
						buildingMaterialIOOutput,
						[
							{
								ticker: arOutput.material_ticker,
								input: 0,
								output:
									arOutput.material_amount *
									ar.amount *
									batchRuns,
							},
						],
					]);
				});
			});

			materialIO.push(
				combineMaterialIOMinimal([
					buildingMaterialIOInput,
					buildingMaterialIOOutput,
				])
			);
		});

		return combineMaterialIOMinimal(materialIO);
	}

	return {
		calculateMaterialIO,
	};
}
