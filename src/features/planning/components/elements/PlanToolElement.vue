<script setup lang="ts">
	import { type Component, computed, defineAsyncComponent } from "vue";

	// Composables
	import { usePlanView } from "@/features/planning/usePlanView";

	// Types & Interfaces
	import type { PlanTool } from "@/features/planning/planView.util";

	// Components
	import PlanToolFallback from "@/features/planning/components/PlanToolFallback.vue";

	/**
	 * A plan tool, loaded when first shown, with what it needs of the plan
	 *
	 * @author jplacht
	 */
	const { tool } = defineProps<{ tool: PlanTool }>();

	const TOOLS: Record<PlanTool, Component> = {
		"visitation-frequency": defineAsyncComponent(
			() =>
				import("@/features/planning/components/tools/PlanVisitationFrequency.vue")
		),
		"repair-analysis": defineAsyncComponent(
			() =>
				import("@/features/planning/components/tools/PlanRepairAnalysis.vue")
		),
		popr: defineAsyncComponent(
			() => import("@/features/planning/components/tools/PlanPOPR.vue")
		),
		"supply-cart": defineAsyncComponent(
			() =>
				import("@/features/planning/components/tools/PlanSupplyCart.vue")
		),
		"construction-cart": defineAsyncComponent(
			() =>
				import("@/features/planning/components/tools/PlanConstructionCart.vue")
		),
		"profit-breakdown": defineAsyncComponent(
			() =>
				import("@/features/planning/components/tools/PlanProfitBreakdown.vue")
		),
		"plan-check": defineAsyncComponent(
			() => import("@/features/planning/components/tools/PlanCheck.vue")
		),
	};

	const {
		calculation,
		planData,
		planet,
		readOnly,
		empire,
		shared,
		isOwnPlan,
	} = usePlanView();
	const { result, overviewData, computedActiveEmpire } = calculation;

	// props change with every recalculation, the component only with the tool
	const toolProps = computed((): Record<string, unknown> => {
		const r = result.value;
		switch (tool) {
			case "visitation-frequency":
				return {
					storage: r.storage,
					materialIO: r.materialio,
					disabled: readOnly.value,
					planUuid: planData.value.uuid,
				};
			case "repair-analysis":
				return {
					data: r.production.buildings.map((b) => ({
						name: b.name,
						amount: b.amount,
						dailyRevenue: b.dailyRevenue,
						workforceDailyCost: b.workforceDailyCost,
						constructionCost: b.constructionCost,
						constructionMaterials: b.constructionMaterials,
					})),
					cxUuid: empire.cxUuid.value,
					planetNaturalId: planet.planet_natural_id,
					shared,
				};
			case "popr":
				return {
					planetNaturalId: planet.planet_natural_id,
					workforceData: r.workforce,
				};
			case "supply-cart":
				return {
					planetNaturalId: planet.planet_natural_id,
					materialIO: r.materialio,
					workforceMaterialIO: r.workforceMaterialIO,
					productionMaterialIO: r.productionMaterialIO,
				};
			case "construction-cart":
				return {
					planetNaturalId: planet.planet_natural_id,
					planUuid: planData.value.uuid,
					disabled: readOnly.value,
					cxUuid: empire.cxUuid.value,
					constructionData: r.constructionMaterials,
					productionBuildingData: r.production.buildings,
					infrastructureData: r.infrastructure,
				};
			case "profit-breakdown":
				return {
					materialIO: r.materialio,
					workforceMaterialIO: r.workforceMaterialIO,
					buildings: r.production.buildings,
					overview: overviewData.value,
				};
			default:
				return {
					plan: planData.value,
					planUuid: planData.value.uuid,
					empire: computedActiveEmpire.value,
					cxUuid: empire.cxUuid.value,
					planet,
					own: isOwnPlan.value,
				};
		}
	});
</script>

<template>
	<div class="px-3" :data-tool="tool">
		<Suspense :timeout="200">
			<template #default>
				<component :is="TOOLS[tool]" v-bind="toolProps" />
			</template>
			<template #fallback>
				<PlanToolFallback />
			</template>
		</Suspense>
	</div>
</template>
