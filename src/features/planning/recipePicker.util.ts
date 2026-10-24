import type {
	IMaterialIO,
	IProductionBuilding,
	IRecipeBuildingOption,
} from "@/features/planning/usePlanCalculation.types";

export type PickerMode = "change" | "add";
// within one building ȼ/area and payback order the recipes like ȼ/day:
// same area and construction cost
export type PickerSort = "daily" | "popular";

export interface IPickerOption {
	recipe: IRecipeBuildingOption;
	// change: the recipe being replaced
	current: boolean;
	// already ordered in this building: not selectable, it would be a
	// second order of the same recipe
	inPlan: boolean;
	disabled: boolean;
}

export interface IDependencyNote {
	ticker: string;
	// Material I/O In of the ticker, per day
	amount: number;
	// plan buildings that use it, with what they make of it
	consumers: { building: string; outputs: string[] }[];
}

/**
 * The recipe picker's rows: in change mode the current recipe first; in
 * add mode the recipes already ordered last. Ordered ones are disabled
 *
 * @author jplacht
 *
 * @param {PickerMode} mode Change a recipe or add an order
 * @param {IRecipeBuildingOption[]} options The building's recipes
 * @param {string[]} activeIds Recipe ids the building already runs
 * @param {string | undefined} currentId Recipe being replaced (change)
 * @param {PickerSort} sort Sort of the other rows
 * @param {(id: string) => number | undefined} popularity Plans here, %
 * @returns {IPickerOption[]} Rows in display order
 */
export function pickerOptions(
	mode: PickerMode,
	options: IRecipeBuildingOption[],
	activeIds: string[],
	currentId: string | undefined,
	sort: PickerSort,
	popularity: (id: string) => number | undefined
): IPickerOption[] {
	const key: Record<PickerSort, (r: IRecipeBuildingOption) => number> = {
		daily: (r) => -r.dailyRevenue,
		popular: (r) => -(popularity(r.recipe_id) ?? -1),
	};
	const sorted = [...options].sort((a, b) => key[sort](a) - key[sort](b));

	if (mode === "change") {
		const current = sorted.find((r) => r.recipe_id === currentId);
		return [
			...(current
				? [{ recipe: current, current: true, inPlan: true, disabled: true }]
				: []),
			...sorted
				.filter((r) => r !== current)
				.map((recipe) => {
					const inPlan = activeIds.includes(recipe.recipe_id);
					return { recipe, current: false, inPlan, disabled: inPlan };
				}),
		];
	}

	const row = (recipe: IRecipeBuildingOption): IPickerOption => {
		const inPlan = activeIds.includes(recipe.recipe_id);
		return { recipe, current: false, inPlan, disabled: inPlan };
	};
	return [
		...sorted.filter((r) => !activeIds.includes(r.recipe_id)).map(row),
		...sorted.filter((r) => activeIds.includes(r.recipe_id)).map(row),
	];
}

/**
 * Plan buildings that use one of the recipe's outputs
 *
 * @author jplacht
 *
 * @param {IRecipeBuildingOption} recipe Recipe
 * @param {IProductionBuilding[]} buildings Production buildings
 * @returns {{ building: string; outputs: string[] }[]} Users and what they make
 */
export function recipeConsumers(
	recipe: IRecipeBuildingOption,
	buildings: IProductionBuilding[]
): { building: string; outputs: string[] }[] {
	const made = new Set(recipe.outputs.map((o) => o.material_ticker));
	return buildings
		.map((b) => {
			const users = b.activeRecipes.filter((r) =>
				r.recipe.inputs.some((i) => made.has(i.material_ticker))
			);
			return {
				building: b.name,
				outputs: [
					...new Set(
						users.flatMap((r) =>
							r.recipe.outputs.map((o) => o.material_ticker)
						)
					),
				],
				used: users.length > 0,
			};
		})
		.filter((c) => c.used)
		.map(({ building, outputs }) => ({ building, outputs }));
}

/**
 * What replacing a recipe costs the plan: shown only when one of its
 * outputs is used in the plan, i.e. has an In amount in Material I/O
 *
 * @author jplacht
 *
 * @param {IRecipeBuildingOption} recipe Recipe being replaced
 * @param {IMaterialIO[]} materialIO The plan's Material I/O
 * @param {IProductionBuilding[]} buildings Production buildings
 * @returns {IDependencyNote | undefined} Note, undefined without a use
 */
export function dependencyNote(
	recipe: IRecipeBuildingOption,
	materialIO: IMaterialIO[],
	buildings: IProductionBuilding[]
): IDependencyNote | undefined {
	for (const output of recipe.outputs) {
		const row = materialIO.find((m) => m.ticker === output.material_ticker);
		if (!row || row.input <= 0) continue;
		return {
			ticker: row.ticker,
			amount: row.input,
			consumers: recipeConsumers(
				{ ...recipe, outputs: [output] },
				buildings
			),
		};
	}
	return undefined;
}

/**
 * Whether the plan makes an input itself or buys it
 *
 * @author jplacht
 *
 * @param {string} ticker Input ticker
 * @param {IMaterialIO[]} materialIO The plan's Material I/O
 * @returns {"made" | "bought"} Source
 */
export function inputSource(
	ticker: string,
	materialIO: IMaterialIO[]
): "made" | "bought" {
	return (materialIO.find((m) => m.ticker === ticker)?.output ?? 0) > 0
		? "made"
		: "bought";
}
