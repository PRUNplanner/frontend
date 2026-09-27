import { computed, reactive, ref, Ref, watch, watchEffect } from "vue";

import { useI18n } from "vue-i18n";

// Stores & Repository
import { useQueryStore } from "@/lib/query_cache/queryStore";

// Util
import { inertClone } from "@/util/data";

// Types & Interfaces
import {
	GameDataLoaderEmits,
	GameDataLoaderProps,
	GameDataStepConfigsType,
} from "@/features/wrapper/gameDataLoader.types";
import { StepState } from "@/features/wrapper/dataLoader.types";
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

	const stepConfigs: GameDataStepConfigsType = [
		{
			key: "material",
			name: t("wrapper.gamedata.material_data"),
			enabled: () => !!props.loadMaterials,
			load: () => {
				return queryStore.execute("GetMaterials", undefined);
			},
			onSuccess: (d: Material[]) => emits("data:materials", d),
		},
		{
			key: "exchange",
			name: t("wrapper.gamedata.exchange_data"),
			enabled: () => !!props.loadExchanges,
			load: () => {
				return queryStore.execute("GetExchanges", undefined);
			},
			onSuccess: (d: Exchange[]) => emits("data:exchanges", d),
		},
		{
			key: "building",
			name: t("wrapper.gamedata.building_data"),
			enabled: () => !!props.loadBuildings,
			load: () => {
				return queryStore.execute("GetBuildings", undefined);
			},
			onSuccess: (d: Building[]) => emits("data:buildings", d),
		},
		{
			key: "recipe",
			name: t("wrapper.gamedata.recipe_data"),
			enabled: () => !!props.loadRecipes,
			load: () => {
				return queryStore.execute("GetRecipes", undefined);
			},
			onSuccess: (d: Recipe[]) => emits("data:recipes", d),
		},
		{
			key: "planet",
			name: t("wrapper.gamedata.planet_data", { name: props.loadPlanet }),
			enabled: () => !!props.loadPlanet,
			load: () => {
				return queryStore.execute("GetPlanet", {
					planetNaturalId: props.loadPlanet!,
				});
			},
			onSuccess: (d: Planet) => emits("data:planet", d),
		},
		{
			key: "planetMultiple",
			name: t("wrapper.gamedata.planet_multiple_data", {
				names: props.loadPlanetMultiple?.join(", "),
			}),
			enabled: () => !!props.loadPlanetMultiple,
			load: () => {
				return queryStore.execute("GetMultiplePlanets", {
					planetNaturalIds: props.loadPlanetMultiple!,
				});
			},
			onSuccess: (d: Planet[]) => emits("data:planet:multiple", d),
		},
	];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const steps = reactive<StepState<any>[]>(
		stepConfigs.map((cfg) => ({
			cfg,
			data: null,
			loading: false,
			error: null,
			triggered: false,
		}))
	);

	// Orchestrator
	watchEffect(() => {
		steps.forEach((s) => {
			if (!s.triggered && s.cfg.enabled()) {
				const dep = s.cfg.dependsOn
					? steps.find((p) => p.cfg.key === s.cfg.dependsOn)
					: null;
				if (!dep || dep.data != null) {
					s.triggered = true;
					s.loading = true;
					s.error = null;
					s.cfg
						.load()
						.then((d) => {
							const shallowData = inertClone(d);
							s.data = shallowData;
							s.cfg.onSuccess(shallowData);
						})
						.catch((e) => {
							console.error(e);
							s.error =
								e instanceof Error ? e : new Error(String(e));
						})
						.finally(() => {
							s.loading = false;
						});
				}
			}
		});
	});

	const loadingSteps = computed(() =>
		steps
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

	const allLoaded = computed(() =>
		steps
			.filter((s) => s.cfg.enabled())
			.every((s) => !s.loading && s.error == null && s.data != null)
	);

	watch(
		allLoaded,
		(ok) => {
			if (ok) {
				emits("complete");
				done.value = true;
			}
		},
		{ immediate: true }
	);

	const results = computed(() => {
		const data = {
			materialData: steps.find((s) => s.cfg.key === "material")
				?.data as Material[],
			exchangeData: steps.find((s) => s.cfg.key === "exchange")
				?.data as Exchange[],
			buildingData: steps.find((s) => s.cfg.key === "building")
				?.data as Building[],
			recipeData: steps.find((s) => s.cfg.key === "recipe")
				?.data as Recipe[],
			planetData: steps.find((s) => s.cfg.key === "planet")
				?.data as Planet,
			planetMultipleData: steps.find(
				(s) => s.cfg.key === "planetMultiple"
			)?.data as Planet[],
		};

		return data;
	});

	return {
		done,
		allLoaded,
		hasError,
		loadingSteps,
		results,
	};
}
