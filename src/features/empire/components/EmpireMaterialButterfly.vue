<script setup lang="ts">
	import { computed, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber } from "@/util/numbers";
	import { materialButterfly } from "@/features/empire/empireAnalysis.util";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PDivergingBar from "@/ui/charts/PDivergingBar.vue";

	// Types & Interfaces
	import type {
		EmpireButterflyMetric,
		IEmpireMaterialIO,
	} from "@/features/empire/empire.types";

	// UI
	import { PButton, PButtonGroup, PTooltip } from "@/ui";

	const TOP = 10;

	const { materialIO } = defineProps<{ materialIO: IEmpireMaterialIO[] }>();
	const emit = defineEmits<{ "open:material": [ticker: string] }>();

	const metric = ref<EmpireButterflyMetric>("price");

	const rows = computed(() =>
		materialButterfly(materialIO, metric.value, TOP)
	);
	const maxAbs = computed(() =>
		Math.max(0, ...rows.value.map((r) => Math.abs(r.value)))
	);
	const moving = computed(
		() => materialIO.filter((m) => m.deltaPrice !== 0).length
	);

	const valueText = (v: number) =>
		formatNumber(Math.abs(v), metric.value === "price" ? 0 : 2, true);
	const unit = computed(() => t(`empire.analysis.butterfly.${metric.value}`));
	const rowLabel = (ticker: string, value: number) =>
		t("empire.analysis.butterfly.row_label", {
			ticker,
			direction: t(
				`empire.analysis.butterfly.${value < 0 ? "bought" : "sold"}`
			),
			value: `${valueText(value)} ${unit.value}`,
		});
</script>

<template>
	<section class="border rounded-[3px] border-white/15 p-3">
		<div class="flex flex-wrap items-center justify-between gap-3 pb-3">
			<h2 class="text-base font-bold">
				{{ $t("empire.analysis.butterfly.title") }}
			</h2>
			<PButtonGroup>
				<PButton
					:pressed="metric === 'price'"
					@click="metric = 'price'">
					{{ $t("empire.analysis.butterfly.price") }}
				</PButton>
				<PButton
					:pressed="metric === 'amount'"
					@click="metric = 'amount'">
					{{ $t("empire.analysis.butterfly.amount") }}
				</PButton>
			</PButtonGroup>
		</div>
		<div v-if="rows.length === 0" class="text-sm text-muted">
			{{ $t("empire.analysis.butterfly.empty") }}
		</div>
		<template v-else>
			<div
				class="grid grid-cols-[1fr_auto_1fr] gap-x-2 pb-1 text-xs text-muted"
				aria-hidden="true">
				<span class="text-right">
					{{ $t("empire.analysis.butterfly.buy") }}
				</span>
				<span class="w-14" />
				<span>{{ $t("empire.analysis.butterfly.sell") }}</span>
			</div>
			<ul class="flex flex-col">
				<li v-for="row in rows" :key="row.ticker">
					<PTooltip>
						<template #trigger>
							<button
								type="button"
								class="w-full flex items-center min-h-7 pointer-coarse:min-h-11 rounded-[3px] hover:bg-white/5 focus-visible:bg-white/5"
								:aria-label="rowLabel(row.ticker, row.value)"
								@click="emit('open:material', row.ticker)">
								<PDivergingBar
									class="w-full"
									:value="row.value"
									:max-abs="maxAbs"
									:label="rowLabel(row.ticker, row.value)"
									:text="valueText(row.value)">
									<template #center>
										<MaterialTile
											class="w-14"
											:ticker="row.ticker"
											:enable-popover="false" />
									</template>
								</PDivergingBar>
							</button>
						</template>
						<span class="tabular-nums">
							{{ rowLabel(row.ticker, row.value) }}
						</span>
					</PTooltip>
				</li>
			</ul>
			<div class="pt-3 text-xs text-muted">
				{{
					$t("empire.analysis.butterfly.caption", {
						top: Math.min(TOP, moving),
						n: moving,
					})
				}}
			</div>
		</template>
	</section>
</template>
