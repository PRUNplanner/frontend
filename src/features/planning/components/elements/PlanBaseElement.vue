<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanView } from "@/features/planning/usePlanView";
	import { usePlanetInsights } from "@/features/plan_analytics/usePlanetInsights";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { PlanetResourceType } from "@/features/api/schemas/gameData.schemas";
	import type { BaseSection } from "@/features/planning/planView.util";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanConfiguration from "@/features/planning/components/PlanConfiguration.vue";
	import PlanBonuses from "@/features/planning/components/PlanBonuses.vue";
	import PlanArea from "@/features/planning/components/PlanArea.vue";
	import PlanWorkforce from "@/features/planning/components/PlanWorkforce.vue";
	import PlanInfrastructure from "@/features/planning/components/PlanInfrastructure.vue";
	import PlanExperts from "@/features/planning/components/PlanExperts.vue";

	// UI
	import { PTooltip } from "@/ui";

	/**
	 * One part of the base setup: empire and prices, planet, workforce,
	 * infrastructure or experts; each lays out for its own width
	 *
	 * @author jplacht
	 */
	const { section } = defineProps<{ section: BaseSection }>();

	const {
		calculation,
		planet,
		readOnly,
		empire,
		priceSource,
		autoOptimizeHabs,
		setAutoOptimizeHabs,
		edits,
		openInsights,
		layoutEditing,
	} = usePlanView();
	const {
		result,
		computedActiveEmpire,
		planEmpires,
		handleUpdateCorpHQ,
		handleUpdateCOGC,
		handleUpdatePermits,
		handleUpdateWorkforceLux,
		handleUpdateInfrastructure,
		handleUpdateExpert,
		handleCreateBuildingAndRecipe,
	} = calculation;

	const { isAvailable: hasInsights, totalPlans } = usePlanetInsights(
		() => planet.planet_natural_id
	);

	const extractor = (type: PlanetResourceType): string =>
		type === "MINERAL" ? "EXT" : type === "GASEOUS" ? "COL" : "RIG";

	const productionBuildings = computed(() =>
		result.value.production.buildings.map((b) => ({
			name: b.name,
			expertise: b.expertise,
		}))
	);
</script>

<template>
	<div class="px-3 text-sm" :data-section="section">
		<PlanConfiguration
			v-if="section === 'empire'"
			:disabled="readOnly"
			:empire-options="empire.list.value"
			:active-empire="computedActiveEmpire"
			:plan-empires="planEmpires"
			:cx-uuid="empire.cxUuid.value"
			:planet-id="planet.planet_natural_id"
			:price-source="priceSource"
			@update:active-empire="
				(uuid: string) => (empire.uuid.value = uuid)
			" />

		<div v-else-if="section === 'planet'" class="flex flex-col gap-3">
			<!-- COGC, HQ and permits side by side from 520 px -->
			<div
				class="grid grid-cols-1 gap-3 @min-[520px]:grid-cols-2 @min-[520px]:gap-x-6">
				<PlanBonuses
					:disabled="readOnly"
					:corphq="result.corphq"
					:cogc="result.cogc"
					:planet-natural-id="planet.planet_natural_id"
					@update:corphq="handleUpdateCorpHQ"
					@update:cogc="handleUpdateCOGC" />
				<PlanArea
					:disabled="readOnly"
					:area-data="result.area"
					:planet-natural-id="planet.planet_natural_id"
					@update:permits="handleUpdatePermits" />
			</div>
			<div
				v-if="planet.resources.length"
				class="flex flex-wrap items-center gap-1 text-xs text-muted-strong">
				<span class="pr-1">
					{{ t("plan.base.planet.resources") }}
				</span>
				<PTooltip
					v-for="resource in planet.resources"
					:key="`PLANET#RESOURCE#${resource.material_ticker}`">
					<template #trigger>
						<button
							type="button"
							class="inline-flex min-h-6 pointer-coarse:min-h-11 items-center cursor-pointer disabled:cursor-default"
							:disabled="readOnly"
							:aria-label="
								t('plan.base.planet.add_extractor', {
									building: extractor(resource.resource_type),
									ticker: resource.material_ticker,
								})
							"
							@click="
								handleCreateBuildingAndRecipe(
									extractor(resource.resource_type),
									`${extractor(resource.resource_type)}#${resource.material_ticker}`
								)
							">
							<MaterialTile
								:key="resource.material_ticker"
								:ticker="resource.material_ticker"
								:amount="
									parseFloat(
										formatNumber(resource.daily_extraction)
									)
								"
								disable-drawer
								:enable-popover="false" />
						</button>
					</template>
					{{
						t("plan.base.planet.add_extractor", {
							building: extractor(resource.resource_type),
							ticker: resource.material_ticker,
						})
					}}
				</PTooltip>
			</div>
			<button
				v-if="hasInsights"
				type="button"
				class="self-start min-h-6 pointer-coarse:min-h-11 text-xs text-link hover:underline cursor-pointer text-left"
				@click="openInsights">
				{{
					t("plan.base.planet.insights", {
						n: totalPlans,
						planet: planet.planet_natural_id,
					})
				}}
			</button>
		</div>

		<PlanWorkforce
			v-else-if="section === 'workforce'"
			:disabled="readOnly"
			:workforce-data="result.workforce"
			:planet-natural-id="planet.planet_natural_id"
			:show-all="layoutEditing.showAll.value"
			@update:lux="handleUpdateWorkforceLux" />

		<PlanInfrastructure
			v-else-if="section === 'housing'"
			:disabled="readOnly"
			:infrastructure-data="result.infrastructure"
			:auto-optimize-habs="autoOptimizeHabs"
			:planet-natural-id="planet.planet_natural_id"
			:show-all="layoutEditing.showAll.value"
			@update:infrastructure="handleUpdateInfrastructure"
			@update:auto-optimize-habs="setAutoOptimizeHabs"
			@optimize-habs="(goal) => edits.applyOptimizeHabs(goal, true)" />

		<PlanExperts
			v-else
			:disabled="readOnly"
			:expert-data="result.experts"
			:buildings="productionBuildings"
			:planet-natural-id="planet.planet_natural_id"
			:show-all="layoutEditing.showAll.value"
			@update:expert="handleUpdateExpert" />
	</div>
</template>
