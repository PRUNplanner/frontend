<script setup lang="ts">
	import { computed, onBeforeUnmount, type PropType, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	import { usePreferences } from "@/features/preferences/usePreferences";
	const { getBurnDisplayClass, burnDaysRed, burnDaysYellow } =
		usePreferences();
	const { planetName } = usePlanetData();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import XITBurnActionButton from "@/features/xit/components/XITBurnActionButton.vue";

	// Util
	import { formatNumber, formatAmount } from "@/util/numbers";
	import { burnAxisMax, burnSummary } from "@/features/fio/fioBurn.util";

	// Type & Interfaces
	import type {
		IFIOBurnTableElement,
		IFIOBurnTableElementMaterial,
	} from "@/features/fio/useFIOBurn.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable } from "@/ui";
	import PRunwayBar from "@/ui/charts/PRunwayBar.vue";

	const props = defineProps({
		burnTable: {
			type: Array as PropType<IFIOBurnTableElement[]>,
			required: true,
		},
	});

	const columns = computed<PDataTableColumn<IFIOBurnTableElement>[]>(() => [
		{ key: "planName", title: t("fio.burn.components.plans.table.plan") },
	]);

	// below 1600 px the side-by-side panel has no room for all 7 columns:
	// consumption and production go, the delta stays
	const wideQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(min-width: 1600px)")
			: null;
	const isWide = ref(wideQuery?.matches ?? true);
	const onMedia = (e: MediaQueryListEvent) => (isWide.value = e.matches);
	wideQuery?.addEventListener("change", onMedia);
	onBeforeUnmount(() => wideQuery?.removeEventListener("change", onMedia));
	const NARROW_HIDDEN = new Set(["input", "output"]);

	const materialColumns = computed<
		PDataTableColumn<IFIOBurnTableElementMaterial>[]
	>(() =>
		(
			[
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
					key: "runway",
					title: t("fio.burn.components.plans.table.runway"),
					minWidth: 120,
				},
				{
					key: "exhaustion",
					title: t("fio.burn.components.plans.table.burn"),
					sorter: true,
				},
			] satisfies PDataTableColumn<IFIOBurnTableElementMaterial>[]
		).filter((c) => isWide.value || !NARROW_HIDDEN.has(c.key))
	);

	// stable, inline functions re-render the whole table
	const rowKey = (row: IFIOBurnTableElement) => row.key;
	const expandLabel = (row: IFIOBurnTableElement) =>
		t("fio.burn.components.plans.expand_row", { plan_name: row.planName });

	const axis = computed(() => burnAxisMax(burnDaysYellow.value));

	// per plan, for the line above its materials
	const summaries = computed(() =>
		Object.fromEntries(
			props.burnTable.map((p) => [
				p.key,
				burnSummary(
					p.burnMaterials,
					burnDaysRed.value,
					burnDaysYellow.value
				),
			])
		)
	);

	// "2 more under 10 d · 3 produced here", zero counts left out
	function summaryRest(s: ReturnType<typeof burnSummary>): string {
		const prefix = "fio.burn.components.plans";
		return [
			s.moreUnderYellow
				? t(`${prefix}.more_under`, {
						n: s.moreUnderYellow,
						days: burnDaysYellow.value,
					})
				: "",
			s.produced ? t(`${prefix}.produced`, { n: s.produced }) : "",
		]
			.filter(Boolean)
			.join(" · ");
	}
</script>

<template>
	<PDataTable
		:columns="columns"
		:data="props.burnTable"
		:row-key="rowKey"
		:expand-label="expandLabel"
		striped>
		<template #expand="{ row }">
			<div
				class="flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 text-sm">
				<template v-if="summaries[row.key].first">
					<MaterialTile :ticker="summaries[row.key].first!.ticker" />
					<i18n-t
						keypath="fio.burn.components.plans.runs_out_first"
						tag="span"
						scope="global">
						<template #days>
							<span class="font-bold">
								{{
									formatNumber(
										summaries[row.key].first!.exhaustion,
										1
									)
								}}
							</span>
						</template>
					</i18n-t>
				</template>
				<span class="text-muted">
					{{ summaryRest(summaries[row.key]) }}
				</span>
			</div>
			<PDataTable
				class="whitespace-nowrap"
				:columns="materialColumns"
				:data="row.burnMaterials"
				striped>
				<template #cell-ticker="{ row: material }">
					<MaterialTile
						:key="material.ticker"
						:ticker="material.ticker" />
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
							material.delta >= 0
								? 'text-positive'
								: 'text-negative'
						">
						{{ formatNumber(material.delta) }}
					</span>
				</template>
				<template #cell-stock="{ row: material }">
					{{ formatAmount(material.stock) }}
				</template>
				<template #header-runway>
					{{ $t("fio.burn.components.plans.table.runway") }}
					<span class="font-normal text-muted">
						{{
							$t("fio.burn.components.overview.axis", {
								max: axis,
							})
						}}
					</span>
				</template>
				<template #cell-runway="{ row: material }">
					<PRunwayBar
						:value="material.exhaustion"
						:axis="axis"
						:red="burnDaysRed"
						:yellow="burnDaysYellow"
						:label="
							t('fio.burn.components.plans.runway_label', {
								ticker: material.ticker,
								days: formatNumber(material.exhaustion, 1),
							})
						"
						:note="
							Number.isFinite(material.exhaustion)
								? undefined
								: t('fio.burn.components.plans.produced_here')
						" />
				</template>
				<template #cell-exhaustion="{ row: material }">
					<span
						:class="getBurnDisplayClass(material.exhaustion).value"
						class="py-1 px-2 whitespace-nowrap">
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
							class="py-1 px-2 whitespace-nowrap"
							:class="getBurnDisplayClass(row.minDays).value">
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
