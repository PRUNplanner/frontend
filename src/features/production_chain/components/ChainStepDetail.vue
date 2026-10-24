<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import {
		formatMoney,
		formatQty,
		formatShare,
	} from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		IChainResult,
		IChainRow,
	} from "@/features/production_chain/engine/chainSolver.types";

	const { row, result } = defineProps<{
		row: IChainRow;
		result: IChainResult;
	}>();

	const money = (v: number) =>
		t("production_chains.money", { value: formatMoney(v) });
	const gross = (r: IChainRow) => r.perDay + r.covered;

	const takes = computed(() =>
		result.links
			.filter((l) => l.consumer === row.ticker)
			.map((l) => ({
				ticker: l.input,
				perDay: l.perDay,
				note: t("production_chains.detail.of_all", {
					pct: formatShare(l.perDay / gross(result.rows[l.input])),
					ticker: l.input,
				}),
			}))
	);

	const goesTo = computed(() => {
		const total = gross(row);
		const list = result.links
			.filter((l) => l.input === row.ticker)
			.map((l) => ({
				ticker: l.consumer,
				perDay: l.perDay,
				note: t("production_chains.detail.of_this", {
					pct: formatShare(l.perDay / total),
					ticker: row.ticker,
				}),
			}));
		if (row.target)
			list.push({
				ticker: row.ticker,
				perDay: row.targetPerDay,
				note: t("production_chains.detail.sold_share", {
					pct: formatShare(row.targetPerDay / total),
				}),
			});
		return list;
	});

	const building = computed(() => {
		if (!row.buildingTicker || row.buildings <= 1e-9) return null;
		const type = result.buildingTypes.find(
			(b) => b.ticker === row.buildingTicker
		);
		if (!type) return null;
		const spare = type.built - type.exact;
		return {
			ticker: type.ticker,
			built: type.built,
			spare,
			upTo: (spare / row.buildings) * row.perDay,
		};
	});
</script>

<template>
	<div
		class="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 px-4 py-3 bg-surface-sunken"
		data-testid="chain-step-detail">
		<div v-if="takes.length">
			<h3 class="text-xs uppercase tracking-wide text-muted pb-2">
				{{ $t("production_chains.detail.takes") }}
			</h3>
			<ul class="flex flex-col gap-1">
				<li
					v-for="i in takes"
					:key="i.ticker"
					class="flex items-center gap-2">
					<MaterialTile :key="i.ticker" :ticker="i.ticker" />
					<span class="tabular-nums">
						{{ $t("production_chains.detail.per_day", { n: formatQty(i.perDay) }) }}
					</span>
					<span class="text-xs text-muted">{{ i.note }}</span>
				</li>
			</ul>
		</div>
		<div>
			<h3 class="text-xs uppercase tracking-wide text-muted pb-2">
				{{ $t("production_chains.detail.goes_to") }}
			</h3>
			<ul class="flex flex-col gap-1">
				<li
					v-for="o in goesTo"
					:key="o.ticker"
					class="flex items-center gap-2">
					<MaterialTile :key="o.ticker" :ticker="o.ticker" />
					<span class="tabular-nums">
						{{ $t("production_chains.detail.per_day", { n: formatQty(o.perDay) }) }}
					</span>
					<span class="text-xs text-muted">{{ o.note }}</span>
				</li>
				<li v-if="!goesTo.length" class="text-muted">
					{{ $t("production_chains.detail.nothing") }}
				</li>
			</ul>
		</div>
		<div v-if="row.costParts">
			<h3 class="text-xs uppercase tracking-wide text-muted pb-2">
				{{ $t("production_chains.detail.per_unit") }}
			</h3>
			<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
				<template v-if="row.source === 'make'">
					<dt>{{ $t("production_chains.detail.inputs") }}</dt>
					<dd class="text-right">{{ money(row.costParts.inputs) }}</dd>
				</template>
				<dt>{{ $t("production_chains.detail.upkeep_wear") }}</dt>
				<dd class="text-right">{{ money(row.costParts.upkeepWear) }}</dd>
				<dt class="font-bold border-t border-line pt-1">
					{{ $t("production_chains.detail.chain_cost") }}
				</dt>
				<dd class="text-right font-bold border-t border-line pt-1">
					{{ money(row.unitCost) }}
				</dd>
				<dt>{{ $t("production_chains.detail.cx_price") }}</dt>
				<dd class="text-right">
					{{ row.price ? money(row.price) : "—" }}
				</dd>
			</dl>
			<p v-if="row.costParts.share < 0.999" class="text-xs text-muted pt-1">
				{{
					$t("production_chains.detail.joint_share", {
						pct: formatShare(row.costParts.share),
					})
				}}
			</p>
		</div>
		<div v-if="building">
			<h3 class="text-xs uppercase tracking-wide text-muted pb-2">
				{{ $t("production_chains.detail.buildings") }}
			</h3>
			<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
				<dt>
					{{
						$t("production_chains.detail.for_material", {
							building: building.ticker,
							ticker: row.ticker,
						})
					}}
				</dt>
				<dd class="text-right">{{ formatNumber(row.buildings, 2) }}</dd>
				<dt>
					{{
						$t("production_chains.detail.built", {
							building: building.ticker,
						})
					}}
				</dt>
				<dd class="text-right">{{ building.built }}</dd>
				<template v-if="building.spare > 0.01">
					<dt class="text-positive">
						{{
							$t("production_chains.detail.spare", {
								n: formatNumber(building.spare, 2),
								building: building.ticker,
							})
						}}
					</dt>
					<dd class="text-right text-positive" data-testid="chain-spare">
						{{
							$t("production_chains.detail.spare_up_to", {
								n: formatQty(building.upTo),
								ticker: row.ticker,
							})
						}}
					</dd>
				</template>
				<dt v-else class="text-muted col-span-2">
					{{ $t("production_chains.detail.no_spare") }}
				</dt>
			</dl>
		</div>
	</div>
</template>
