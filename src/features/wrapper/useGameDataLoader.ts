import { computed, ref, type Ref, watch, watchEffect } from "vue";

import { useI18n } from "vue-i18n";

// Stores & Repository
import { useQueryStore } from "@/lib/query_cache/queryStore";

// Util
import { step } from "@/features/wrapper/dataLoader.util";

// Types & Interfaces
import type {
	GameDataLoaderEmits,
	GameDataLoaderProps,
	GameDataSteps,
} from "@/features/wrapper/gameDataLoader.types";
import type { StepState } from "@/features/wrapper/dataLoader.types";
import type {
	Building,
	Exchange,
	Material,
	Planet,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";

export function useGameDataLoader(
	props: GameDataLoaderProps,
	emits: GameDataLoaderEmits
) {
	const { t } = useI18n();

	const queryStore = useQueryStore();
	const done: Ref<boolean> = ref(false);
	// mount to all data loaded, a performance measure for the lab runs
	const loadStart = performance.now();

	const steps: GameDataSteps = {
		material: step({
			name: t("wrapper.gamedata.material_data"),
			enabled: () => !!props.loadMaterials,
			load: () => {
				return queryStore.execute("GetMaterials", undefined);
			},
			onSuccess: (d: Material[]) => emits("data:materials", d),
		}),
		exchange: step({
			name: t("wrapper.gamedata.exchange_data"),
			enabled: () => !!props.loadExchanges,
			load: () => {
				return queryStore.execute("GetExchanges", undefined);
			},
			onSuccess: (d: Exchange[]) => emits("data:exchanges", d),
		}),
		building: step({
			name: t("wrapper.gamedata.building_data"),
			enabled: () => !!props.loadBuildings,
			load: () => {
				return queryStore.execute("GetBuildings", undefined);
			},
			onSuccess: (d: Building[]) => emits("data:buildings", d),
		}),
		recipe: step({
			name: t("wrapper.gamedata.recipe_data"),
			enabled: () => !!props.loadRecipes,
			load: () => {
				return queryStore.execute("GetRecipes", undefined);
			},
			onSuccess: (d: Recipe[]) => emits("data:recipes", d),
		}),
		planet: step({
			get name() {
				return t("wrapper.gamedata.planet_data", {
					name: props.loadPlanet ?? "",
				});
			},
			enabled: () => !!props.loadPlanet,
			load: () => {
				return queryStore.execute("GetPlanet", {
					planetNaturalId: props.loadPlanet!,
				});
			},
			onSuccess: (d: Planet) => emits("data:planet", d),
		}),
		planetMultiple: step({
			get name() {
				return t("wrapper.gamedata.planet_multiple_data", {
					names: props.loadPlanetMultiple?.join(", ") ?? "",
				});
			},
			enabled: () => !!props.loadPlanetMultiple,
			load: () => {
				return queryStore.execute("GetMultiplePlanets", {
					planetNaturalIds: props.loadPlanetMultiple!,
				});
			},
			onSuccess: (d: Planet[]) => emits("data:planet:multiple", d),
		}),
	};
	const all: StepState<unknown>[] = Object.values(steps);

	// Orchestrator
	watchEffect(() => {
		all.forEach((s) => {
			if (!s.triggered && s.cfg.enabled()) {
				s.triggered = true;
				s.loading = true;
				s.error = null;
				s.cfg
					.load()
					.then((d) => {
						s.data = d;
						s.cfg.onSuccess(d);
					})
					.catch((e) => {
						console.error(e);
						s.error = e instanceof Error ? e : new Error(String(e));
					})
					.finally(() => {
						s.loading = false;
					});
			}
		});
	});

	const loadingSteps = computed(() =>
		all
			.filter((s) => s.cfg.enabled())
			.map((s) => ({
				name: s.cfg.name,
				loading: s.loading,
				error: s.error,
			}))
	);

	const hasError = computed(() =>
		loadingSteps.value.some((l) => l.error != null)
	);

	// failed steps run again through the orchestrator
	function retry(): void {
		all
			.filter((s) => s.error != null)
			.forEach((s) => {
				s.error = null;
				s.triggered = false;
			});
	}

	const allLoaded = computed(() =>
		all
			.filter((s) => s.cfg.enabled())
			.every((s) => !s.loading && s.error == null && s.data != null)
	);

	watch(
		allLoaded,
		(ok) => {
			if (ok) {
				if (!done.value)
					performance.measure("loader:game", { start: loadStart });
				emits("complete");
				done.value = true;
			}
		},
		{ immediate: true }
	);

	const results = computed(() => ({
		materialData: steps.material.data,
		exchangeData: steps.exchange.data,
		buildingData: steps.building.data,
		recipeData: steps.recipe.data,
		planetData: steps.planet.data,
		planetMultipleData: steps.planetMultiple.data,
	}));

	return {
		done,
		allLoaded,
		hasError,
		loadingSteps,
		results,
		retry,
	};
}
