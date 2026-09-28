<script setup lang="ts">
	import { watch, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { planetNames, loadPlanetNames } = usePlanetData();

	// Types & Interfaces
	import type { IEmpirePlanListData } from "@/features/empire/empire.types";
	import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
	import { cogcTextMapping } from "@/features/planning_data/usePlan";

	// UI
	import {
		XNDataTable,
		XNDataTableColumn,
		XNDataTableSummaryRow,
		XNDataTableSummaryCell,
	} from "@skit/x.naive-ui";
	import { PValue } from "@/ui";

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
</script>

<template>
	<XNDataTable :data="planListData" striped>
		<XNDataTableColumn
			key="name"
			:title="t('terms.plan')"
			sorter="default"
			default-sort-order="ascend">
			<template #render-cell="{ rowData }">
				<div class="text-wrap">
					<router-link
						:to="`/plan/${rowData.planet}/${rowData.uuid}`"
						class="text-link-primary font-bold hover:underline">
						{{ rowData.name }}
					</router-link>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="planet"
			:title="t('terms.planets')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-wrap">
					{{ planetNames.get(rowData.planet) || "Loading..." }}
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="cogc" :title="t('terms.cogc')" sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-nowrap">
					{{ $t(cogcTextMapping[rowData.cogc as PlanCOGCProgram]) }}
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="permits"
			:title="t('terms.permits', 2)"
			sorter="default">
			<template #title>
				<div class="text-nowrap">#</div>
			</template>
			<template #render-cell="{ rowData }">
				<div class="text-center">{{ rowData.permits }}</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="profit"
			:title="t('terms.profit')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-nowrap text-end">
					<PValue :value="rowData.profit" />
					<span class="pl-1 font-light text-muted">ȼ</span>
				</div>
			</template>
		</XNDataTableColumn>
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
			<XNDataTableSummaryRow>
				<XNDataTableSummaryCell key="name" :col-span="5">
					<template #default>
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
				</XNDataTableSummaryCell>
			</XNDataTableSummaryRow>
		</template>
	</XNDataTable>
</template>
