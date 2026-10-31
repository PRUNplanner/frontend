<script setup lang="ts">
	import { computed, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePreferences } from "@/features/preferences/usePreferences";

	const { getBurnDisplayClass, burnDaysRed, burnDaysYellow } =
		usePreferences();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { burnAxisMax, burnSummary } from "@/features/fio/fioBurn.util";

	// Types & Interfaces
	import type { IFIOBurnPlanetTableElement } from "@/features/fio/useFIOBurn.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable } from "@/ui";
	import PStripPlot from "@/ui/charts/PStripPlot.vue";

	defineProps({
		planTable: {
			type: Array as PropType<IFIOBurnPlanetTableElement[]>,
			required: true,
		},
	});

	const axis = computed(() => burnAxisMax(burnDaysYellow.value));

	const columns = computed<PDataTableColumn<IFIOBurnPlanetTableElement>[]>(
		() => [
			{
				key: "planUuid",
				title: t("fio.burn.components.overview.table.plan"),
				// by the name shown, not the id
				sorter: (a, b) => a.planName.localeCompare(b.planName),
				minWidth: 120,
			},
			{
				key: "strip",
				title: t("fio.burn.components.overview.table.strip"),
				minWidth: 180,
			},
			{
				key: "minDays",
				title: t("fio.burn.components.overview.table.burn"),
				sorter: true,
			},
		]
	);

	// "1 red · 2 yellow · 10 materials", zero counts left out
	function summary(row: IFIOBurnPlanetTableElement): string[] {
		const s = burnSummary(
			row.burnMaterials,
			burnDaysRed.value,
			burnDaysYellow.value
		);
		const prefix = "fio.burn.components.overview.summary";
		return [
			s.red ? t(`${prefix}.red`, { n: s.red }) : "",
			s.yellow ? t(`${prefix}.yellow`, { n: s.yellow }) : "",
			t(`${prefix}.materials`, s.consumed),
		].filter(Boolean);
	}

	const stripItems = (row: IFIOBurnPlanetTableElement) =>
		row.burnMaterials.map((m) => ({ key: m.ticker, value: m.exhaustion }));
</script>

<template>
	<PDataTable :columns="columns" :data="planTable" striped>
		<template #header-strip>
			{{ $t("fio.burn.components.overview.table.strip") }}
			<!-- own line: headers never wrap, and the column must fit at 1280 -->
			<span class="block font-normal text-muted">
				{{ $t("fio.burn.components.overview.axis", { max: axis }) }}
			</span>
		</template>
		<template #cell-planUuid="{ row }">
			<router-link
				:to="`/plan/${row.planetId}/${row.planUuid}`"
				class="text-link-primary font-bold hover:underline">
				{{ row.planName }}
			</router-link>
			<!-- wraps between the parts only -->
			<div class="text-xs text-muted">
				<span v-for="(part, i) in summary(row)" :key="part">
					<span v-if="i"> · </span>
					<span class="whitespace-nowrap">{{ part }}</span>
				</span>
			</div>
		</template>
		<template #cell-strip="{ row }">
			<PStripPlot
				:items="stripItems(row)"
				:axis="axis"
				:red="burnDaysRed"
				:yellow="burnDaysYellow"
				:label="
					t('fio.burn.components.overview.strip_label', {
						plan_name: row.planName,
					})
				">
				<template #tooltip="{ items }">
					<!-- long "+n" lists in columns, so they fit the viewport -->
					<div
						:class="
							items.length > 6
								? 'grid grid-cols-2 md:grid-cols-3 gap-x-4'
								: ''
						">
						<div
							v-for="item in items"
							:key="item.key"
							class="flex items-center gap-x-2 py-0.5">
							<MaterialTile :ticker="item.key" />
							<span class="whitespace-nowrap">
								{{
									$t("fio.burn.components.plans.days_left", {
										days: formatNumber(item.value, 1),
									})
								}}
							</span>
						</div>
					</div>
				</template>
			</PStripPlot>
		</template>
		<template #cell-minDays="{ row }">
			<div class="text-center">
				<span
					:class="getBurnDisplayClass(row.minDays).value"
					class="py-1 px-2 whitespace-nowrap">
					{{ formatNumber(row.minDays) }}
				</span>
			</div>
		</template>
	</PDataTable>
	<p class="pt-2 text-xs text-muted">
		{{ $t("fio.burn.components.overview.caption") }}
	</p>
</template>
