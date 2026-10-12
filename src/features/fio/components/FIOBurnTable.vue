<script setup lang="ts">
	import { computed, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	import { usePreferences } from "@/features/preferences/usePreferences";
	const { getBurnDisplayClass } = usePreferences();
	const { planetName } = usePlanetData();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import XITBurnActionButton from "@/features/xit/components/XITBurnActionButton.vue";

	// Util
	import { formatNumber, formatAmount } from "@/util/numbers";

	// Type & Interfaces
	import type {
		IFIOBurnTableElement,
		IFIOBurnTableElementMaterial,
	} from "@/features/fio/useFIOBurn.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable } from "@/ui";

	const props = defineProps({
		burnTable: {
			type: Array as PropType<IFIOBurnTableElement[]>,
			required: true,
		},
	});

	const columns = computed<PDataTableColumn<IFIOBurnTableElement>[]>(() => [
		{ key: "planName", title: t("fio.burn.components.plans.table.plan") },
	]);

	const materialColumns = computed<
		PDataTableColumn<IFIOBurnTableElementMaterial>[]
	>(() => [
		{
			key: "ticker",
			title: t("fio.burn.components.plans.table.ticker"),
			sorter: true,
		},
		{
			key: "input",
			title: t("fio.burn.components.plans.table.consumption"),
			sorter: true,
		},
		{
			key: "output",
			title: t("fio.burn.components.plans.table.production"),
			sorter: true,
		},
		{
			key: "delta",
			title: t("fio.burn.components.plans.table.delta"),
			sorter: true,
		},
		{
			key: "stock",
			title: t("fio.burn.components.plans.table.stock"),
			sorter: true,
		},
		{
			key: "exhaustion",
			title: t("fio.burn.components.plans.table.burn"),
			sorter: true,
		},
	]);

	// stable, inline functions re-render the whole table
	const rowKey = (row: IFIOBurnTableElement) => row.key;
	const expandLabel = (row: IFIOBurnTableElement) =>
		t("fio.burn.components.plans.expand_row", { plan_name: row.planName });
</script>

<template>
	<PDataTable
		:columns="columns"
		:data="props.burnTable"
		:row-key="rowKey"
		:expand-label="expandLabel"
		striped>
		<template #expand="{ row }">
			<PDataTable :columns="materialColumns" :data="row.burnMaterials" striped>
				<template #cell-ticker="{ row: material }">
					<MaterialTile :key="material.ticker" :ticker="material.ticker" />
				</template>
				<template #cell-input="{ row: material }">
					<span :class="material.input <= 0 ? 'text-muted' : ''">
						{{ formatNumber(material.input) }}
					</span>
				</template>
				<template #cell-output="{ row: material }">
					<span :class="material.output <= 0 ? 'text-muted' : ''">
						{{ formatNumber(material.output) }}
					</span>
				</template>
				<template #cell-delta="{ row: material }">
					<span
						:class="
							material.delta >= 0 ? 'text-positive' : 'text-negative'
						">
						{{ formatNumber(material.delta) }}
					</span>
				</template>
				<template #cell-stock="{ row: material }">
					{{ formatAmount(material.stock) }}
				</template>
				<template #cell-exhaustion="{ row: material }">
					<span
						:class="getBurnDisplayClass(material.exhaustion).value"
						class="py-1 px-2">
						{{ formatNumber(material.exhaustion) }}
					</span>
				</template>
			</PDataTable>
		</template>
		<template #header-planName>
			<div class="flex flex-row justify-between">
				<div>{{ $t("fio.burn.components.plans.table.plan") }}</div>
				<div>
					{{ $t("fio.burn.components.plans.table.exhaustion") }}
				</div>
			</div>
		</template>
		<template #cell-planName="{ row }">
			<div class="flex flex-row justify-between">
				<div class="my-auto">
					<span class="font-bold">
						{{ row.planName }}
					</span>
					<span class="text-muted!">
						&mdash;
						{{ planetName(row.planetId) }}
					</span>
				</div>
				<div class="flex flex-row items-center gap-x-3">
					<div>
						<span
							class="py-1 px-2"
							:class="
								getBurnDisplayClass(row.minDays).value
							">
							{{ formatNumber(row.minDays) }}
						</span>
					</div>
					<div>
						<XITBurnActionButton
							:drawer-title="
								t('fio.burn.components.plans.xit_title', {
									plan_name: row.planName,
								})
							"
							:elements="
								row.burnMaterials.map(
									(e: IFIOBurnTableElementMaterial) => {
										return {
											ticker: e.ticker,
											stock: e.stock,
											delta: e.delta,
										};
									}
								)
							" />
					</div>
				</div>
			</div>
		</template>
	</PDataTable>
</template>
