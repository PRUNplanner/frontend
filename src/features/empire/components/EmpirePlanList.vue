<script setup lang="ts">
	import { computed, watch, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { planetNames, loadPlanetNames } = usePlanetData();

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IEmpirePlanListData } from "@/features/empire/empire.types";
	import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
	import { cogcTextMapping } from "@/features/planning_data/usePlan";

	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable, PValue } from "@/ui";
	import PDivergingBar from "@/ui/charts/PDivergingBar.vue";

	const props = defineProps({
		planListData: {
			type: Array as PropType<IEmpirePlanListData[]>,
			required: true,
		},
	});

	watch(
		() => props.planListData,
		() => loadPlanetNames(props.planListData.map((p) => p.planet)),
		{ immediate: true }
	);

	// one zero line for all rows: gains right, losses left
	const profitExtent = computed(() => ({
		maxAbs: Math.max(0, ...props.planListData.map((p) => p.profit)),
		negAbs: Math.max(0, ...props.planListData.map((p) => -p.profit)),
	}));

	const planetLabel = (id: string) => planetNames.value.get(id) || "Loading...";

	const columns = computed<PDataTableColumn<IEmpirePlanListData>[]>(() => [
		{
			key: "name",
			title: t("terms.plan"),
			sorter: true,
			defaultSortOrder: "ascend",
		},
		{
			key: "planet",
			title: t("terms.planets"),
			// by the name shown, not the id
			sorter: (a, b) =>
				planetLabel(a.planet).localeCompare(planetLabel(b.planet)),
		},
		{ key: "cogc", title: t("terms.cogc"), sorter: true },
		{
			key: "permits",
			title: t("terms.permits", 2),
			align: "right",
			sorter: true,
		},
		{
			key: "profit",
			title: t("empire.plan_list.profit"),
			align: "right",
			sorter: true,
		},
	]);
</script>

<template>
	<PDataTable :columns="columns" :data="planListData" striped>
		<template #cell-name="{ row }">
			<div class="text-wrap">
				<router-link
					:to="`/plan/${row.planet}/${row.uuid}`"
					class="text-link-primary font-bold hover:underline">
					{{ row.name }}
				</router-link>
			</div>
		</template>
		<template #cell-planet="{ row }">
			<div class="text-wrap">
				{{ planetLabel(row.planet) }}
			</div>
		</template>
		<template #cell-cogc="{ row }">
			<div class="text-nowrap">
				{{ $t(cogcTextMapping[row.cogc as PlanCOGCProgram]) }}
			</div>
		</template>
		<template #header-permits>
			<div class="text-nowrap">#</div>
		</template>
		<template #cell-profit="{ row }">
			<div class="flex items-center gap-x-2">
				<PDivergingBar
					class="grow min-w-20"
					:value="row.profit"
					:max-abs="profitExtent.maxAbs"
					:neg-abs="profitExtent.negAbs"
					:label="`${row.name || row.planet}: ${formatNumber(row.profit)}`" />
				<PValue
					class="text-nowrap w-28 shrink-0 text-right tabular-nums"
					:value="row.profit" />
			</div>
		</template>
		<template #empty>
			<div class="flex flex-col gap-y-3">
				<div class="text-center">
					{{ t("empire.plan_list.no_plans") }}
				</div>
				<div class="text-center">
					<i18n-t keypath="empire.plan_list.setup_prompt" tag="span">
						<template #management>
							<router-link
								to="/manage"
								class="text-link-primary hover:underline">
								{{ t("empire.plan_list.links.management") }}
							</router-link>
						</template>

						<template #search>
							<router-link
								to="/search"
								class="text-link-primary hover:underline">
								{{ t("empire.plan_list.links.planet_search") }}
							</router-link>
						</template>
					</i18n-t>
				</div>
			</div>
		</template>
		<template #summary>
			<strong class="text-white/80">
				{{
					t("empire.plan_list.permits_planned", {
						permits: planListData.reduce(
							(sum, elem) => sum + elem.permits,
							0
						),
					})
				}}
			</strong>
		</template>
	</PDataTable>
</template>
