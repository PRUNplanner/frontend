import { computed, ComputedRef } from "vue";

import { materialsStore } from "@/database/stores";
import { useDB } from "@/database/composables/useDB";

import type { Material } from "@/features/api/schemas/gameData.schemas";
import { PSelectOption } from "@/ui/ui.types";

const materialCache = new Map<string, Material>();
const materialClassCache = new Map<string, string>();

export function useMaterialData() {
	const { allData, get, preload } = useDB(materialsStore);

	// reactive caches
	const materialsMap = computed((): Record<string, Material> => {
		return allData.value
			? allData.value.reduce(
					(acc, mat) => {
						acc[mat.ticker] = mat;
						return acc;
					},
					{} as Record<string, Material>
				)
			: {};
	});

	async function getMaterial(ticker: string): Promise<Material> {
		if (materialCache.has(ticker)) return materialCache.get(ticker)!;

		const material = await get(ticker);

		if (!material) {
			throw new Error(`Material ${ticker} not available.`);
		}

		materialCache.set(ticker, material);
		return material;
	}

	const materialSelectOptions: ComputedRef<PSelectOption[]> = computed(() =>
		allData.value
			? allData.value.map((m) => ({ label: m.ticker, value: m.ticker }))
			: []
	);

	function getMaterialClass(ticker: string): string {
		if (materialClassCache.has(ticker))
			return materialClassCache.get(ticker)!;

		const material = materialsMap.value[ticker];

		if (!material)
			throw new Error(`Material ${ticker} not available. Preload.`);

		const classString = `material-category-${material.category_name
			.replaceAll(" ", "-")
			.replaceAll("(", "")
			.replaceAll(")", "")}`;

		materialClassCache.set(ticker, classString);
		return classString;
	}

	return {
		preload,
		materials: allData,
		materialsMap,
		materialSelectOptions,
		getMaterial,
		getMaterialClass,
	};
}
